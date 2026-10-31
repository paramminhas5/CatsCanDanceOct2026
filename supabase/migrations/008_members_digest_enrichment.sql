-- 008: members (personalised feed, follows, event vouching), weekly scene digest, artist enrichment tracking.
-- Additive only. Staff (CCD team) approve listings; blog auto-publish is OFF so digests land as drafts.

-- ---- artist enrichment tracking ----
alter table public.artists
  add column if not exists mbid text,
  add column if not exists enriched_at timestamptz,
  add column if not exists enrich_sources jsonb;

-- ---- members (Supabase Auth user = member) ----
create table if not exists public.members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  city text,
  genres text[] not null default '{}',
  role text not null default 'member' check (role in ('member','staff')),
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;
revoke all on public.members from anon;
drop policy if exists members_own on public.members;
create policy members_own on public.members for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Members cannot change their own role.
create or replace function public.members_lock_role() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.role := 'member';
  elsif new.role is distinct from old.role and coalesce(current_setting('ccd.allow_role_change', true), '') <> '1' then new.role := old.role; end if;
  return new;
end $$;
drop trigger if exists members_lock_role on public.members;
create trigger members_lock_role before insert or update on public.members for each row execute function public.members_lock_role();

create table if not exists public.member_follows (
  member_id uuid not null references public.members(id) on delete cascade,
  artist_slug text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, artist_slug)
);
alter table public.member_follows enable row level security;
revoke all on public.member_follows from anon;
drop policy if exists follows_own on public.member_follows;
create policy follows_own on public.member_follows for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

create table if not exists public.event_vouches (
  member_id uuid not null references public.members(id) on delete cascade,
  event_id uuid not null references public.scraped_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, event_id)
);
alter table public.event_vouches enable row level security;
revoke all on public.event_vouches from anon;
drop policy if exists vouches_own on public.event_vouches;
create policy vouches_own on public.event_vouches for select to authenticated using (member_id = auth.uid());

insert into public.feature_flags(key, enabled, note) values
  ('blog_autopublish', false, 'Weekly scene digest publishes itself instead of landing as a draft')
on conflict (key) do nothing;
insert into public.site_settings(key, value) values ('staff_vouch_threshold', '1'::jsonb) on conflict (key) do nothing;

-- Become a member (called after the magic link sign in).
create or replace function public.join_member(p_name text, p_city text, p_genres text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null or v_email is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  insert into public.members(id, email, display_name, city, genres)
  values (auth.uid(), v_email, nullif(left(trim(p_name),60),''), nullif(trim(p_city),''), coalesce(p_genres,'{}'))
  on conflict (id) do update set display_name = coalesce(excluded.display_name, members.display_name),
    city = coalesce(excluded.city, members.city), genres = case when cardinality(excluded.genres) > 0 then excluded.genres else members.genres end;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.follow_artist(p_slug text, p_follow boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if p_follow then insert into public.member_follows(member_id, artist_slug) values (auth.uid(), p_slug) on conflict do nothing;
  else delete from public.member_follows where member_id = auth.uid() and artist_slug = p_slug; end if;
  return jsonb_build_object('ok', true);
end $$;

-- Personalised feed: city, followed artists in the lineup, and genre overlap.
create or replace function public.my_feed()
returns table (id uuid, title text, url text, ticket_url text, city text, venue text, event_date date, event_time text,
               lineup text[], genres text[], kind text, match_score int, why text)
language sql stable security definer set search_path = public as $$
  with me as (select * from public.members where id = auth.uid()),
  followed as (select lower(a.name) n from public.member_follows f join public.artists a on a.slug = f.artist_slug where f.member_id = auth.uid()),
  scored as (
    select e.*,
      (me.city is not null and e.city = me.city) as c_hit,
      exists (select 1 from unnest(coalesce(e.lineup,'{}')) l where lower(l) in (select n from followed)) as a_hit,
      exists (select 1 from unnest(coalesce(e.genres,'{}')) g, unnest(me.genres) mg where g ilike '%'||mg||'%') as g_hit
    from public.scraped_events e, me
    where e.status = 'published' and (e.event_date is null or e.event_date >= current_date)
  )
  select s.id, s.title, s.url, s.ticket_url, s.city, s.venue, s.event_date, s.event_time, s.lineup, s.genres, s.kind,
    (case when s.a_hit then 5 else 0 end + case when s.c_hit then 3 else 0 end + case when s.g_hit then 2 else 0 end) as match_score,
    nullif(concat_ws(' · ', case when s.a_hit then 'Artist you follow' end, case when s.c_hit then 'In your city' end, case when s.g_hit then 'Your genres' end), '') as why
  from scored s order by match_score desc, s.event_date asc nulls last limit 60;
$$;

-- Events members can vouch for (pending, upcoming, not junk). No submitter details.
create or replace function public.vouchable_events()
returns table (id uuid, title text, city text, venue text, event_date date, lineup text[], source text, url text, vouches bigint, vouched boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.city, e.venue, e.event_date, e.lineup, e.source, e.url,
    (select count(*) from public.event_vouches v where v.event_id = e.id),
    exists (select 1 from public.event_vouches v where v.event_id = e.id and v.member_id = auth.uid())
  from public.scraped_events e
  where exists (select 1 from public.members m where m.id = auth.uid() and m.role = 'staff')
    and e.status = 'pending' and e.score >= 1 and e.event_date >= current_date
  order by e.event_date asc limit 80;
$$;

-- Staff (CCD team) vouch for pending events; enough staff vouches publish them.
create or replace function public.member_vouch(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int; v_need int; v_pub boolean := false;
begin
  if not exists (select 1 from public.members where id = auth.uid() and role = 'staff') then
    return jsonb_build_object('ok', false, 'error', 'Only the CCD team can approve listings.');
  end if;
  if not exists (select 1 from public.scraped_events where id = p_event_id and status = 'pending' and score >= 1) then
    return jsonb_build_object('ok', false, 'error', 'This listing cannot be approved.');
  end if;
  insert into public.event_vouches(member_id, event_id) values (auth.uid(), p_event_id) on conflict do nothing;
  select count(*) into v_n from public.event_vouches where event_id = p_event_id;
  v_need := coalesce((select (value #>> '{}')::int from public.site_settings where key = 'staff_vouch_threshold'), 1);
  if v_n >= v_need then
    update public.scraped_events set status = 'published', published_at = now() where id = p_event_id and status = 'pending';
    v_pub := true;
  end if;
  return jsonb_build_object('ok', true, 'vouches', v_n, 'needed', v_need, 'published', v_pub);
end $$;

-- ---- member voting (likes), going, who is going ----
create table if not exists public.event_likes (
  member_id uuid not null references public.members(id) on delete cascade,
  event_id uuid not null references public.scraped_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, event_id)
);
create table if not exists public.event_going (
  member_id uuid not null references public.members(id) on delete cascade,
  event_id uuid not null references public.scraped_events(id) on delete cascade,
  show_name boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (member_id, event_id)
);
alter table public.event_likes enable row level security;
alter table public.event_going enable row level security;
revoke all on public.event_likes, public.event_going from anon;

create or replace function public.toggle_like(p_event_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_on boolean;
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if exists (select 1 from public.event_likes where member_id = auth.uid() and event_id = p_event_id) then
    delete from public.event_likes where member_id = auth.uid() and event_id = p_event_id; v_on := false;
  else
    insert into public.event_likes(member_id, event_id) select auth.uid(), id from public.scraped_events where id = p_event_id and status = 'published'; v_on := true;
  end if;
  return jsonb_build_object('ok', true, 'liked', v_on, 'likes', (select count(*) from public.event_likes where event_id = p_event_id));
end $$;

create or replace function public.set_going(p_event_id uuid, p_going boolean, p_show_name boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if p_going then
    insert into public.event_going(member_id, event_id, show_name) select auth.uid(), id, coalesce(p_show_name,false) from public.scraped_events where id = p_event_id and status = 'published'
    on conflict (member_id, event_id) do update set show_name = excluded.show_name;
  else delete from public.event_going where member_id = auth.uid() and event_id = p_event_id; end if;
  return jsonb_build_object('ok', true, 'going', (select count(*) from public.event_going where event_id = p_event_id));
end $$;

-- Public counts for published events (likes = member votes).
create or replace function public.event_counts() returns table (event_id uuid, likes bigint, going bigint)
language sql stable security definer set search_path = public as $$
  select e.id, (select count(*) from public.event_likes l where l.event_id = e.id), (select count(*) from public.event_going g where g.event_id = e.id)
  from public.scraped_events e where e.status = 'published' and (e.event_date is null or e.event_date >= current_date);
$$;

-- What the signed in member has liked or is going to.
create or replace function public.my_event_state() returns table (event_id uuid, liked boolean, going boolean, show_name boolean)
language sql stable security definer set search_path = public as $$
  select e, exists (select 1 from public.event_likes l where l.member_id = auth.uid() and l.event_id = e),
    exists (select 1 from public.event_going g where g.member_id = auth.uid() and g.event_id = e),
    coalesce((select g.show_name from public.event_going g where g.member_id = auth.uid() and g.event_id = e), false)
  from (select event_id e from public.event_likes where member_id = auth.uid() union select event_id from public.event_going where member_id = auth.uid()) x;
$$;

-- Members see who else is going. Only people who chose to show their name are named.
create or replace function public.event_attendees(p_event_id uuid) returns table (display_name text, city text, total bigint)
language sql stable security definer set search_path = public as $$
  select m.display_name, m.city, (select count(*) from public.event_going where event_id = p_event_id)
  from public.event_going g join public.members m on m.id = g.member_id
  where g.event_id = p_event_id and g.show_name and m.display_name is not null
    and exists (select 1 from public.members me where me.id = auth.uid())
  order by g.created_at limit 100;
$$;

-- ---- members host events; CCD staff approve ----
create table if not exists public.hosted_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.members(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  event_date date not null,
  event_time text check (event_time is null or char_length(event_time) <= 20),
  city text not null, venue text check (venue is null or char_length(venue) <= 120),
  genres text[] not null default '{}',
  lineup text[] not null default '{}',
  ticket_url text check (ticket_url is null or ticket_url ~* '^https?://'),
  about text check (about is null or char_length(about) <= 600),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  published_event_id uuid references public.scraped_events(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.hosted_events enable row level security;
revoke all on public.hosted_events from anon;
drop policy if exists hosted_own on public.hosted_events;
create policy hosted_own on public.hosted_events for select to authenticated using (host_id = auth.uid());

create or replace function public.submit_hosted_event(p_title text, p_date date, p_time text, p_city text, p_venue text, p_genres text[], p_lineup text[], p_ticket_url text, p_about text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if (select count(*) from public.hosted_events where host_id = auth.uid() and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'Three submissions a day is the limit.');
  end if;
  if p_date is null or p_date < current_date then return jsonb_build_object('ok', false, 'error', 'Pick a date in the future.'); end if;
  insert into public.hosted_events(host_id, title, event_date, event_time, city, venue, genres, lineup, ticket_url, about)
  values (auth.uid(), trim(p_title), p_date, nullif(trim(p_time),''), trim(p_city), nullif(trim(p_venue),''), coalesce(p_genres,'{}'), coalesce(p_lineup,'{}'), nullif(trim(p_ticket_url),''), nullif(trim(p_about),''));
  return jsonb_build_object('ok', true);
exception when check_violation then return jsonb_build_object('ok', false, 'error', 'Check the date, link and field lengths.');
end $$;

create or replace function public.pending_hosted_events()
returns table (id uuid, title text, event_date date, city text, venue text, lineup text[], ticket_url text, about text, host_name text, host_email text)
language sql stable security definer set search_path = public as $$
  select h.id, h.title, h.event_date, h.city, h.venue, h.lineup, h.ticket_url, h.about, m.display_name, m.email
  from public.hosted_events h join public.members m on m.id = h.host_id
  where h.status = 'pending' and exists (select 1 from public.members me where me.id = auth.uid() and me.role = 'staff')
  order by h.created_at;
$$;

create or replace function public.review_hosted_event(p_id uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h public.hosted_events; v_ev uuid;
begin
  if not exists (select 1 from public.members where id = auth.uid() and role = 'staff') then return jsonb_build_object('ok', false, 'error', 'Only the CCD team can review.'); end if;
  select * into h from public.hosted_events where id = p_id and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'Not found.'); end if;
  if p_approve then
    insert into public.scraped_events(title, url, source, city, venue, event_date, event_time, genres, lineup, ticket_url, kind, status, published_at, submitter_email)
    values (h.title, 'https://catscandance.com/whats-on#host-' || h.id, 'member', h.city, h.venue, h.event_date, h.event_time, h.genres, h.lineup, h.ticket_url, 'club', 'published', now(), (select email from public.members where id = h.host_id))
    returning id into v_ev;
    update public.scraped_events set status = 'published', published_at = now() where id = v_ev;
    update public.hosted_events set status = 'approved', published_event_id = v_ev where id = p_id;
  else update public.hosted_events set status = 'rejected' where id = p_id; end if;
  return jsonb_build_object('ok', true);
end $$;

-- Upcoming gigs for an artist, matched from published lineups.
create or replace function public.artist_gigs(p_slug text)
returns table (event_id uuid, title text, city text, venue text, event_date date, ticket_url text, url text)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.city, e.venue, e.event_date, e.ticket_url, e.url
  from public.scraped_events e join public.artists a on a.slug = p_slug
  where e.status = 'published' and e.event_date >= current_date
    and exists (select 1 from unnest(coalesce(e.lineup,'{}')) l where lower(l) = lower(a.name))
  order by e.event_date limit 20;
$$;

-- ---- to-dos for Param OS (token guarded, like the other ops RPCs) ----
create or replace function public.ops_todos(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return jsonb_build_object(
    'generated_at', now(),
    'events_to_review', (select count(*) from public.scraped_events where status = 'pending' and score >= 1 and event_date >= current_date),
    'blog_drafts', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'title', title)) from public.posts where published = false), '[]'::jsonb),
    'hosted_events_pending', (select count(*) from public.hosted_events where status = 'pending'),
    'ticket_swaps_pending', (select count(*) from public.ticket_swaps where status = 'pending'),
    'artist_claims_pending', 0,
    'artists_missing_bio', (select count(*) from public.artists where status = 'approved' and (bio is null or bio = '')),
    'artists_never_enriched', (select count(*) from public.artists where status = 'approved' and enriched_at is null)
  );
end $$;

create or replace function public.ops_set_member_role(p_token text, p_email text, p_role text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  if p_role not in ('member','staff') then return jsonb_build_object('ok', false, 'error', 'bad role'); end if;
  perform set_config('ccd.allow_role_change', '1', true);
  update public.members set role = p_role where lower(email) = lower(p_email);
  return jsonb_build_object('ok', found);
end $$;

-- Junk values that are not links (for example "gmail.com" in website) are cleared.
update public.artists set website = null where website is not null and website !~* '^https?://';

revoke execute on function public.join_member(text,text,text[]), public.follow_artist(text,boolean), public.my_feed(),
  public.vouchable_events(), public.member_vouch(uuid), public.toggle_like(uuid), public.set_going(uuid,boolean,boolean),
  public.my_event_state(), public.event_attendees(uuid), public.submit_hosted_event(text,date,text,text,text,text[],text[],text,text),
  public.pending_hosted_events(), public.review_hosted_event(uuid,boolean) from public, anon;
grant execute on function public.join_member(text,text,text[]), public.follow_artist(text,boolean), public.my_feed(),
  public.vouchable_events(), public.member_vouch(uuid), public.toggle_like(uuid), public.set_going(uuid,boolean,boolean),
  public.my_event_state(), public.event_attendees(uuid), public.submit_hosted_event(text,date,text,text,text,text[],text[],text,text),
  public.pending_hosted_events(), public.review_hosted_event(uuid,boolean) to authenticated;
grant execute on function public.event_counts(), public.artist_gigs(text) to anon, authenticated;
revoke execute on function public.ops_todos(text), public.ops_set_member_role(text,text,text) from public;
grant execute on function public.ops_todos(text), public.ops_set_member_role(text,text,text) to anon, authenticated;

-- ---- weekly scene digest (rule based, no AI) ----
create or replace function public.generate_weekly_digest()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_slug text := 'india-electronic-music-this-week-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD');
  v_title text; v_body jsonb := '[]'::jsonb; v_tldr jsonb := '[]'::jsonb; v_pub boolean;
  r record; v_n int; v_line text; v_next record;
begin
  if exists (select 1 from public.posts where slug = v_slug) then return v_slug; end if;
  select count(*) into v_n from public.scraped_events where status = 'published' and event_date between current_date and current_date + 7;
  if v_n = 0 then return null; end if;
  v_title := 'This week in Indian electronic music: ' || to_char(current_date, 'FMDD Mon') || ' to ' || to_char(current_date + 7, 'FMDD Mon YYYY');
  v_tldr := jsonb_build_array(v_n || ' hand checked electronic and underground events in India over the next 7 days.');
  v_body := v_body || to_jsonb('Here is what is on in India from ' || to_char(current_date, 'FMDD Month') || ' to ' || to_char(current_date + 7, 'FMDD Month') || '. Every listing was checked by hand. Dates, venues and lineups come from public sources and ticket sellers, so confirm with the seller before you travel.');
  for r in
    select city, jsonb_agg(jsonb_build_object('t', title, 'd', event_date, 'v', venue, 'l', lineup) order by event_date) items
    from public.scraped_events where status = 'published' and event_date between current_date and current_date + 7 group by city order by count(*) desc
  loop
    v_line := coalesce(r.city, 'Elsewhere') || ': ' || (
      select string_agg(to_char((i->>'d')::date, 'FMDy DD Mon') || ', ' || (i->>'t') || coalesce(' at ' || (i->>'v'), '') ||
        case when jsonb_typeof(i->'l') = 'array' and jsonb_array_length(i->'l') > 0 then ' (' || (select string_agg(x, ', ') from (select jsonb_array_elements_text(i->'l') x limit 4) q) || ')' else '' end, '. ')
      from jsonb_array_elements(r.items) i) || '.';
    v_body := v_body || to_jsonb(v_line);
  end loop;
  select string_agg(title || ' (' || coalesce(city,'India') || ', ' || to_char(event_date, 'FMDD Mon') || ')', '; ' order by event_date) into v_line
    from (select * from public.scraped_events where status = 'published' and kind in ('concert','festival') and event_date > current_date + 7 order by event_date limit 6) x;
  if v_line is not null then v_body := v_body || to_jsonb('Worth planning ahead for: ' || v_line || '.'); v_tldr := v_tldr || to_jsonb('Big shows coming up: ' || v_line || '.'); end if;
  select string_agg(artist_name || ' in ' || city, '; ') into v_line from (select artist_name, city from public.touring_now order by from_date limit 6) t;
  if v_line is not null then v_body := v_body || to_jsonb('Touring India now: ' || v_line || '. See the full list on the Tour page.'); end if;
  v_body := v_body || to_jsonb('Want this tailored to your city and the artists you follow? Join Cats Can Dance and get a personal feed. Know a night we missed? Submit it on the site.'::text);
  v_pub := coalesce((select enabled from public.feature_flags where key = 'blog_autopublish'), false);
  insert into public.posts(slug, title, cover_title, category, excerpt, tag, published_on, author, tldr, body, published)
  values (v_slug, v_title, upper(v_title), 'SCENE REPORT', v_tldr ->> 0, 'WEEKLY', upper(to_char(now() at time zone 'Asia/Kolkata', 'Mon DD, YYYY')), 'The Pack', v_tldr, v_body, v_pub);
  return v_slug;
end $$;
revoke execute on function public.generate_weekly_digest() from public, anon, authenticated;

select cron.schedule('ccd-weekly-digest', '30 21 * * 0', $$ select public.generate_weekly_digest(); $$);
select cron.schedule('ccd-refresh-artists', '0 22 * * *', $$
  select net.http_post(
    url := 'https://jybloszaucgqlbkzquqw.supabase.co/functions/v1/refresh-artists',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.ops_config where id=1)),
    body := '{}'::jsonb, timeout_milliseconds := 150000);
$$);
