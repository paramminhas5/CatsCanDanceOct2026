-- 023: pre-filled artist profiles. Facts are proposed by us (our own data plus outside sources), each with a source and
-- a confidence, and become public only when the artist or Param approves them. Additive only.

create table if not exists public.artist_facts (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references public.artists(slug) on delete cascade on update cascade,
  section text not null check (section in ('upcoming','tours','plays','listens','expect','fans','played_with')),
  label text not null,
  detail text,
  url text,
  event_date date,
  source text not null,
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  reviewed_by text check (reviewed_by in ('artist','owner')),
  reviewed_at timestamptz,
  edited boolean not null default false,
  dedupe text not null,
  created_at timestamptz not null default now(),
  unique (artist_slug, section, dedupe)
);
create index if not exists artist_facts_status_idx on public.artist_facts(status, artist_slug);
alter table public.artist_facts enable row level security;

create table if not exists public.artist_fact_runs (
  artist_slug text primary key references public.artists(slug) on delete cascade on update cascade,
  last_run timestamptz not null default now(),
  note text
);
alter table public.artist_fact_runs enable row level security;

-- ---------- Proposals from our own data ----------
create or replace function public.build_internal_facts()
returns integer language plpgsql security definer set search_path = public as $$
declare n int := 0; c int;
begin
  -- upcoming: scene-list events with the artist in the lineup
  insert into artist_facts(artist_slug, section, label, detail, url, event_date, source, confidence, dedupe)
  select a.slug, 'upcoming', se.title, concat_ws(', ', se.venue, se.city), coalesce(se.url, se.ticket_url), se.event_date, 'CCD scene list', 'high', se.id::text
  from artists a join scraped_events se on se.event_date >= current_date and exists (select 1 from unnest(coalesce(se.lineup,'{}')) x where lower(btrim(x)) = lower(a.name))
  where a.status = 'approved'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- played with: other names on the same lineups (scene list and CCD nights)
  insert into artist_facts(artist_slug, section, label, detail, source, confidence, dedupe)
  select a.slug, 'played_with', btrim(o), 'Both on the bill: ' || se.title, 'CCD scene list', 'high', lower(btrim(o))
  from artists a
  join scraped_events se on exists (select 1 from unnest(coalesce(se.lineup,'{}')) x where lower(btrim(x)) = lower(a.name))
  cross join lateral unnest(se.lineup) o
  where a.status = 'approved' and lower(btrim(o)) <> lower(a.name) and btrim(o) <> ''
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  insert into artist_facts(artist_slug, section, label, detail, source, confidence, dedupe)
  select a.slug, 'played_with', btrim(o), 'Both on the bill: ' || e.title, 'CCD nights', 'high', lower(btrim(o))
  from artists a
  join events e on exists (select 1 from unnest(coalesce(e.lineup,'{}')) x where lower(btrim(x)) = lower(a.name))
  cross join lateral unnest(e.lineup) o
  where a.status = 'approved' and lower(btrim(o)) <> lower(a.name) and btrim(o) <> ''
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- tours: logged gigs
  insert into artist_facts(artist_slug, section, label, detail, event_date, source, confidence, dedupe)
  select g.artist_slug, case when g.event_date >= current_date then 'upcoming' else 'tours' end, g.event_name, concat_ws(', ', g.venue, g.city),
         g.event_date, coalesce(g.source, 'CCD gig log'), case when g.verified then 'high' else 'medium' end, g.id::text
  from artist_gigs g join artists a on a.slug = g.artist_slug where a.status = 'approved'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- plays: genres and labels already on the profile
  insert into artist_facts(artist_slug, section, label, detail, source, confidence, dedupe)
  select a.slug, 'plays', array_to_string(a.genres, ', '), 'Genres listed on this profile', 'CCD profile', 'medium', 'genres'
  from artists a where a.status = 'approved' and cardinality(coalesce(a.genres,'{}')) > 0
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;
  insert into artist_facts(artist_slug, section, label, detail, source, confidence, dedupe)
  select a.slug, 'plays', btrim(a.labels::text), 'Labels', 'CCD profile', 'medium', 'labels'
  from artists a where a.status = 'approved' and btrim(coalesce(a.labels::text,'')) <> ''
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;

  -- fans: only counts, and only once at least 3 members follow (no names)
  insert into artist_facts(artist_slug, section, label, detail, source, confidence, dedupe)
  select f.artist_slug, 'fans', f.cnt || ' CCD members follow ' || a.name, 'Counted from member follows on catscandance.com', 'CCD members', 'high', 'follows'
  from (select artist_slug, count(*) cnt from member_follows group by 1 having count(*) >= 3) f join artists a on a.slug = f.artist_slug where a.status = 'approved'
  on conflict do nothing;
  get diagnostics c = row_count; n := n + c;
  return n;
end $$;

-- ---------- Ops (token): propose, list, review ----------
create or replace function public.ops_build_internal_facts(p_token text)
returns json language plpgsql security definer set search_path = public as $$
begin perform ops_check(p_token); return json_build_object('ok', true, 'added', build_internal_facts()); end $$;

create or replace function public.ops_propose_facts(p_token text, p_facts jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare n int := 0; f jsonb; c int;
begin
  perform ops_check(p_token);
  for f in select * from jsonb_array_elements(coalesce(p_facts,'[]'::jsonb)) loop
    insert into artist_facts(artist_slug, section, label, detail, url, event_date, source, confidence, dedupe)
    select f->>'artist_slug', f->>'section', left(f->>'label', 200), left(f->>'detail', 400), nullif(f->>'url',''), nullif(f->>'event_date','')::date,
           coalesce(nullif(f->>'source',''), 'import'), coalesce(nullif(f->>'confidence',''), 'medium'), coalesce(nullif(f->>'dedupe',''), lower(f->>'label'))
    where exists (select 1 from artists where slug = f->>'artist_slug')
    on conflict do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return json_build_object('ok', true, 'added', n);
end $$;

create or replace function public.ops_artist_facts(p_token text, p_status text default 'proposed', p_slug text default null, p_limit int default 200)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', f.id, 'slug', f.artist_slug, 'artist', a.name, 'section', f.section, 'label', f.label, 'detail', f.detail, 'url', f.url,
      'date', f.event_date, 'source', f.source, 'confidence', f.confidence, 'status', f.status, 'by', f.reviewed_by) x
    from artist_facts f join artists a on a.slug = f.artist_slug
    where (p_status is null or f.status = p_status) and (p_slug is null or f.artist_slug = p_slug)
    order by case f.confidence when 'high' then 0 when 'medium' then 1 else 2 end, a.name, f.section limit greatest(least(p_limit, 1000), 1)) s), '[]'::jsonb);
end $$;

create or replace function public.ops_artist_facts_summary(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return jsonb_build_object(
    'artists', (select count(*) from artists where status = 'approved'),
    'artists_with_facts', (select count(distinct artist_slug) from artist_facts),
    'artists_with_approved', (select count(distinct artist_slug) from artist_facts where status = 'approved'),
    'proposed', (select count(*) from artist_facts where status = 'proposed'),
    'approved', (select count(*) from artist_facts where status = 'approved'),
    'rejected', (select count(*) from artist_facts where status = 'rejected'),
    'by_section', coalesce((select jsonb_object_agg(section, n) from (select section, count(*) n from artist_facts group by 1) s), '{}'::jsonb));
end $$;

create or replace function public.ops_review_fact(p_token text, p_id uuid, p_status text)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  if p_status not in ('approved','rejected','proposed') then raise exception 'bad status'; end if;
  update artist_facts set status = p_status, reviewed_by = case when p_status = 'proposed' then null else 'owner' end, reviewed_at = now() where id = p_id;
  return json_build_object('ok', true);
end $$;

create or replace function public.ops_approve_facts_bulk(p_token text, p_confidence text default 'high', p_section text default null)
returns json language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform ops_check(p_token);
  update artist_facts set status = 'approved', reviewed_by = 'owner', reviewed_at = now()
   where status = 'proposed' and (p_section is null or section = p_section)
     and confidence = any (case p_confidence when 'high' then array['high'] when 'medium' then array['high','medium'] else array['high','medium','low'] end);
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'approved', n);
end $$;

-- ---------- The artist (member linked to the profile) ----------
create or replace function public.my_artist_facts()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'section', f.section, 'label', f.label, 'detail', f.detail, 'url', f.url, 'date', f.event_date,
    'source', f.source, 'confidence', f.confidence, 'status', f.status) order by f.status, f.section, f.event_date nulls last, f.label), '[]'::jsonb)
  from artist_facts f join artists a on a.slug = f.artist_slug where a.owner_member = auth.uid();
$$;

create or replace function public.review_my_fact(p_id uuid, p_status text, p_label text default null, p_detail text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('approved','rejected') then return jsonb_build_object('ok', false, 'error', 'Pick approve or reject.'); end if;
  update artist_facts f set status = p_status, reviewed_by = 'artist', reviewed_at = now(),
    label = coalesce(left(nullif(btrim(p_label),''), 200), f.label), detail = case when p_detail is null then f.detail else left(nullif(btrim(p_detail),''), 400) end,
    edited = f.edited or p_label is not null or p_detail is not null
  from artists a where f.id = p_id and a.slug = f.artist_slug and a.owner_member = auth.uid();
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.approve_my_facts(p_confidence text default 'medium')
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update artist_facts f set status = 'approved', reviewed_by = 'artist', reviewed_at = now()
  from artists a where a.slug = f.artist_slug and a.owner_member = auth.uid() and f.status = 'proposed'
   and f.confidence = any (case p_confidence when 'high' then array['high'] when 'medium' then array['high','medium'] else array['high','medium','low'] end);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'approved', n);
end $$;

-- ---------- Public: approved facts only, grouped by section ----------
create or replace function public.artist_profile_public(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(section, items), '{}'::jsonb) from (
    select f.section, jsonb_agg(jsonb_build_object('label', f.label, 'detail', f.detail, 'url', f.url, 'date', f.event_date, 'source', f.source)
      order by f.event_date nulls last, f.label) items
    from artist_facts f join artists a on a.slug = f.artist_slug
    where f.artist_slug = p_slug and f.status = 'approved' and a.status = 'approved' and (f.section <> 'upcoming' or f.event_date is null or f.event_date >= current_date)
    group by f.section) s;
$$;

revoke all on function public.build_internal_facts() from public, anon, authenticated;
revoke all on function public.my_artist_facts(), public.review_my_fact(uuid, text, text, text), public.approve_my_facts(text) from public;
grant execute on function public.my_artist_facts(), public.review_my_fact(uuid, text, text, text), public.approve_my_facts(text) to authenticated;
grant execute on function public.artist_profile_public(text) to anon, authenticated;
grant execute on function public.ops_build_internal_facts(text), public.ops_propose_facts(text, jsonb), public.ops_artist_facts(text, text, text, int),
  public.ops_artist_facts_summary(text), public.ops_review_fact(text, uuid, text), public.ops_approve_facts_bulk(text, text, text) to anon, authenticated;
