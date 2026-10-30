-- 008: members (personalised feed, follows, event vouching), weekly scene digest, artist enrichment tracking.
-- Additive only. Member approvals and blog auto-publish are OFF until Param flips the flags.

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
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;
revoke all on public.members from anon;
drop policy if exists members_own on public.members;
create policy members_own on public.members for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

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
  ('member_approvals', false, 'Members can vouch for pending events; enough vouches publish them'),
  ('blog_autopublish', false, 'Weekly scene digest publishes itself instead of landing as a draft')
on conflict (key) do nothing;
insert into public.site_settings(key, value) values ('member_approval_threshold', '3'::jsonb) on conflict (key) do nothing;

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
  where exists (select 1 from public.members m where m.id = auth.uid())
    and e.status = 'pending' and e.score >= 1 and e.event_date >= current_date
  order by e.event_date asc limit 60;
$$;

create or replace function public.member_vouch(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int; v_need int; v_pub boolean := false;
begin
  if not coalesce((select enabled from public.feature_flags where key = 'member_approvals'), false) then
    return jsonb_build_object('ok', false, 'error', 'Member approvals are not open yet.');
  end if;
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if not exists (select 1 from public.scraped_events where id = p_event_id and status = 'pending' and score >= 1) then
    return jsonb_build_object('ok', false, 'error', 'This listing cannot be vouched for.');
  end if;
  insert into public.event_vouches(member_id, event_id) values (auth.uid(), p_event_id) on conflict do nothing;
  select count(*) into v_n from public.event_vouches where event_id = p_event_id;
  v_need := coalesce((select (value #>> '{}')::int from public.site_settings where key = 'member_approval_threshold'), 3);
  if v_n >= v_need then
    update public.scraped_events set status = 'published', published_at = now() where id = p_event_id and status = 'pending';
    v_pub := true;
  end if;
  return jsonb_build_object('ok', true, 'vouches', v_n, 'needed', v_need, 'published', v_pub);
end $$;

revoke execute on function public.join_member(text,text,text[]), public.follow_artist(text,boolean), public.my_feed(),
  public.vouchable_events(), public.member_vouch(uuid) from public, anon;
grant execute on function public.join_member(text,text,text[]), public.follow_artist(text,boolean), public.my_feed(),
  public.vouchable_events(), public.member_vouch(uuid) to authenticated;

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
        case when i->'l' is not null and jsonb_array_length(i->'l') > 0 then ' (' || (select string_agg(x, ', ') from (select jsonb_array_elements_text(i->'l') x limit 4) q) || ')' else '' end, '. ')
      from jsonb_array_elements(r.items) i) || '.';
    v_body := v_body || to_jsonb(v_line);
  end loop;
  select string_agg(title || ' (' || coalesce(city,'India') || ', ' || to_char(event_date, 'FMDD Mon') || ')', '; ' order by event_date) into v_line
    from (select * from public.scraped_events where status = 'published' and kind in ('concert','festival') and event_date > current_date + 7 order by event_date limit 6) x;
  if v_line is not null then v_body := v_body || to_jsonb('Worth planning ahead for: ' || v_line || '.'); v_tldr := v_tldr || to_jsonb('Big shows coming up: ' || v_line || '.'); end if;
  select string_agg(artist_name || ' in ' || city, '; ') into v_line from (select artist_name, city from public.touring_now order by from_date limit 6) t;
  if v_line is not null then v_body := v_body || to_jsonb('Touring India now: ' || v_line || '. See the full list on the Tour page.'); end if;
  v_body := v_body || to_jsonb('Want this tailored to your city and the artists you follow? Join Cats Can Dance and get a personal feed. Know a night we missed? Submit it on the site.');
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
