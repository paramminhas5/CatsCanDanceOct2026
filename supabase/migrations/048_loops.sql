-- 048: loops (Param, 5 Nov 2026). Additive only.
--   1. Credible nights publish themselves when flag credible_auto_publish is on (off by default).
--      Festivals still wait for Param. A night that looks like one already live (same title words, same city, within 3 days) is held and marked dupe:.
--   2. submit_event_v2: promoters can send a lineup and their name, so credibility can match them.
--   3. share_events: which share cards are sent and opened (anon RPC, no personal data).
--   4. Claim invites: /ops makes a one-time link that hands an artist their page.

insert into public.feature_flags(key, enabled, note) values
  ('credible_auto_publish', false, 'Credible scene nights (roster, act or promoter, not blocked, not a festival) publish without review')
on conflict (key) do nothing;

-- ── 1. duplicates and auto-publish ─────────────────────────────────────────
create or replace function public._title_words(t text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct w), '{}') from regexp_split_to_table(lower(coalesce(t, '')), '[^a-z0-9]+') w
  where length(w) > 2 and w not in ('the','and','with','presents','pres','live','feat','night','india','tour','official')
$$;

-- The id of a published night on the same date in the same city whose title covers this one (or the reverse).
create or replace function public.scene_dupe_of(p_id uuid, p_title text, p_date date, p_city text)
returns uuid language sql stable security definer set search_path to 'public' as $$
  with me as (select _title_words(p_title) w)
  select s.id from scraped_events s, me
  where s.status = 'published' and s.event_date between p_date - 3 and p_date + 3 and s.id <> coalesce(p_id, '00000000-0000-0000-0000-000000000000')
    and (p_city is null or s.city is null or lower(s.city) = lower(p_city))
    and cardinality(me.w) > 0
    and (select count(*) from unnest(me.w) x where x = any (_title_words(s.title)))::numeric
        / least(cardinality(me.w), greatest(cardinality(_title_words(s.title)), 1)) >= 0.8
  order by abs(s.event_date - p_date)
  limit 1
$$;

create or replace function public.scene_should_autopublish(e public.scraped_events)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select enabled from feature_flags where key = 'credible_auto_publish'), false)
     and e.status = 'pending'
     and e.event_date >= (now() at time zone 'Asia/Kolkata')::date
     and scene_is_credible(e.credible)
     and coalesce(e.kind, 'club') <> 'festival'
     and scene_dupe_of(e.id, e.title, e.event_date, e.city) is null
$$;

create or replace function public.scraped_events_set_credible()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare d uuid;
begin
  new.credible := scene_credibility(new.title, new.lineup, new.description, new.venue, new.genres);
  if new.status = 'pending' and new.event_date is not null then
    d := scene_dupe_of(new.id, new.title, new.event_date, new.city);
    if d is not null then new.credible := new.credible || ('dupe:' || d::text); end if;
  end if;
  if scene_should_autopublish(new) then
    new.status := 'published';
    new.published_at := now();
  end if;
  return new;
end $$;

-- Publish every pending night that now qualifies (used after the trust list changes). Returns how many.
create or replace function public._scene_autopublish_all()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare n integer := 0; r public.scraped_events;
begin
  if not coalesce((select enabled from feature_flags where key = 'credible_auto_publish'), false) then return 0; end if;
  for r in select * from scraped_events where status = 'pending' and event_date >= (now() at time zone 'Asia/Kolkata')::date order by created_at loop
    if scene_should_autopublish(r) then
      update scraped_events set status = 'published', published_at = now() where id = r.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.ops_curation_trust_set(p_token text, p_kind text, p_pattern text, p_note text default null, p_remove boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v text := lower(trim(coalesce(p_pattern, ''))); n integer;
begin
  perform ops_check(p_token);
  if p_kind not in ('act','promoter','venue','block') or length(v) < 3 then return jsonb_build_object('ok', false, 'error', 'Pick a kind and at least 3 letters.'); end if;
  if p_remove then delete from curation_trust where kind = p_kind and pattern = v;
  else insert into curation_trust(kind, pattern, note) values (p_kind, v, left(p_note, 200)) on conflict (kind, pattern) do update set note = excluded.note;
  end if;
  update scraped_events set credible = scene_credibility(title, lineup, description, venue, genres) where event_date >= current_date - 1;
  n := _scene_autopublish_all();
  return jsonb_build_object('ok', true, 'published', n);
end $$;

-- ── 2. promoter submissions with lineup ────────────────────────────────────
create or replace function public.submit_event_v2(
  p_email text, p_title text, p_url text, p_venue text, p_city text, p_date date, p_time text default null,
  p_description text default null, p_lineup text default null, p_promoter text default null, p_hp text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_url text := _clean(p_url, 400);
begin
  if coalesce(p_hp, '') <> '' then return json_build_object('ok', true); end if;
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_title,140) is null then raise exception 'Add the event name'; end if;
  if v_url is null or v_url !~* '^https?://' then raise exception 'Add a link to the event page or tickets'; end if;
  if p_date is null or p_date < current_date then raise exception 'Add an upcoming date'; end if;
  perform _throttle(p_email, 'submit_event', 5);
  insert into scraped_events(title, url, source, city, venue, event_date, event_time, description, submitter_email, lineup, source_url)
  values (_clean(p_title,140), v_url, 'submitted', coalesce(_clean(p_city,60),'Bengaluru'), _clean(p_venue,120), p_date,
          _clean(p_time,40),
          nullif(concat_ws(E'\n', case when _clean(p_promoter,120) is not null then 'Promoter: ' || _clean(p_promoter,120) end, _clean(p_description,1000)), ''),
          lower(p_email),
          (select nullif(array_agg(btrim(x)), '{}') from unnest(string_to_array(coalesce(_clean(p_lineup, 600), ''), ',')) x where btrim(x) <> ''),
          v_url)
  on conflict (url) do nothing;
  return json_build_object('ok', true);
end $$;
grant execute on function public.submit_event_v2(text,text,text,text,text,date,text,text,text,text,text) to anon, authenticated;

-- ── 3. share log ───────────────────────────────────────────────────────────
create table if not exists public.share_events (
  id bigserial primary key,
  kind text not null check (kind in ('going','artist','tour','episode','booked','beat','night')),
  target text not null,
  action text not null check (action in ('share','open')),
  ref text,
  channel text,
  created_at timestamptz not null default now()
);
alter table public.share_events enable row level security;
revoke all on public.share_events from anon, authenticated;
create index if not exists share_events_kind_target on public.share_events(kind, target, created_at desc);

create or replace function public.log_share(p_kind text, p_target text, p_action text, p_ref text default null, p_channel text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_kind not in ('going','artist','tour','episode','booked','beat','night') or p_action not in ('share','open') then return; end if;
  if coalesce(length(p_target), 0) not between 1 and 120 then return; end if;
  insert into share_events(kind, target, action, ref, channel)
  values (p_kind, p_target, p_action, left(regexp_replace(coalesce(p_ref, ''), '[^A-Za-z0-9_-]', '', 'g'), 16), left(p_channel, 20));
end $$;
grant execute on function public.log_share(text, text, text, text, text) to anon, authenticated;

create or replace function public.ops_share_stats(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  return jsonb_build_object(
    'by_kind', coalesce((select jsonb_agg(x order by x.shares desc) from (
      select kind, count(*) filter (where action = 'share') shares, count(*) filter (where action = 'open') opens
      from share_events where created_at > now() - interval '30 days' group by kind) x), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(x order by x.opens desc) from (
      select kind, target, count(*) filter (where action = 'share') shares, count(*) filter (where action = 'open') opens
      from share_events where created_at > now() - interval '30 days' group by kind, target order by 4 desc limit 15) x), '[]'::jsonb));
end $$;
grant execute on function public.ops_share_stats(text) to anon, authenticated;

-- ── 4. claim invites ───────────────────────────────────────────────────────
create table if not exists public.artist_claim_invites (
  token uuid primary key default gen_random_uuid(),
  artist_slug text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '21 days',
  used_at timestamptz,
  used_email text
);
alter table public.artist_claim_invites enable row level security;
revoke all on public.artist_claim_invites from anon, authenticated;

create or replace function public.ops_claim_invite(p_token text, p_slug text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare t uuid;
begin
  perform ops_check(p_token);
  if not exists (select 1 from artists where slug = p_slug) then return jsonb_build_object('ok', false, 'error', 'No such artist.'); end if;
  insert into artist_claim_invites(artist_slug) values (p_slug) returning token into t;
  return jsonb_build_object('ok', true, 'token', t);
end $$;

create or replace function public.ops_claim_invites(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_agg(x order by x.created_at desc) from (
    select i.token, i.artist_slug, a.name, i.created_at, i.expires_at, i.used_at, i.used_email, a.owner_member is not null owned
    from artist_claim_invites i left join artists a on a.slug = i.artist_slug order by i.created_at desc limit 100) x), '[]'::jsonb);
end $$;

create or replace function public.claim_invite_info(p_token uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce((select jsonb_build_object('ok', true, 'slug', a.slug, 'name', a.name, 'photo_url', a.photo_url,
      'valid', i.used_at is null and i.expires_at > now() and a.owner_member is null,
      'reason', case when i.used_at is not null then 'used' when i.expires_at <= now() then 'expired' when a.owner_member is not null then 'owned' end)
    from artist_claim_invites i join artists a on a.slug = i.artist_slug where i.token = p_token), jsonb_build_object('ok', false))
$$;

create or replace function public.claim_with_invite(p_token uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare i artist_claim_invites; v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or v_email = '' then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  select * into i from artist_claim_invites where token = p_token for update;
  if i.token is null then return jsonb_build_object('ok', false, 'error', 'This link is not valid.'); end if;
  if i.used_at is not null then return jsonb_build_object('ok', false, 'error', 'This link was already used.'); end if;
  if i.expires_at <= now() then return jsonb_build_object('ok', false, 'error', 'This link has expired. Ask us for a new one.'); end if;
  if exists (select 1 from artists where slug = i.artist_slug and owner_member is not null) then
    return jsonb_build_object('ok', false, 'error', 'This page already has an owner.');
  end if;
  update artists set claimed_email = v_email, claimed_at = now(),
         owner_member = (select id from members where id = auth.uid())
   where slug = i.artist_slug;
  update artist_claim_invites set used_at = now(), used_email = v_email where token = p_token;
  return jsonb_build_object('ok', true, 'slug', i.artist_slug);
end $$;

grant execute on function public.claim_invite_info(uuid) to anon, authenticated;
grant execute on function public.claim_with_invite(uuid) to authenticated;
grant execute on function public.ops_claim_invite(text, text), public.ops_claim_invites(text) to anon, authenticated;
revoke all on function public._scene_autopublish_all() from public, anon, authenticated;
