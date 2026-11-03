-- 038: artist page v2 (board I). Additive only.
-- 1. Deezer ids on artist_discography so the page can load covers and 30s previews at runtime.
-- 2. artist_eras: the sound line per period of a career, each with its source.
-- 3. event_artists: links gig radar events (scraped_events) to artists, filled by a rule-based
--    trigger on lineup names and aliases (no AI). Links start as 'proposed'; ops confirms or rejects.
--    The public RPC artist_upcoming returns only confirmed links on published, future events.
-- 4. Feature flag artist_page_v2 (off).

-- 1. Discography: Deezer ids ------------------------------------------------------------
alter table public.artist_discography add column if not exists deezer_album_id text;
alter table public.artist_discography add column if not exists deezer_track_id text;
alter table public.artist_discography add column if not exists deezer_track_title text;
create unique index if not exists artist_discography_deezer_uniq
  on public.artist_discography (artist_slug, deezer_album_id) where deezer_album_id is not null;

-- 2. Eras --------------------------------------------------------------------------------
create table if not exists public.artist_eras (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  from_year int not null,
  to_year int,
  sound text,
  tags text[] not null default '{}',
  source_url text,
  source_name text,
  palette text not null default 'night' check (palette in ('night','blush','ink','cream')),
  created_at timestamptz not null default now()
);
create index if not exists artist_eras_slug_idx on public.artist_eras (artist_slug, from_year);
alter table public.artist_eras enable row level security;
drop policy if exists "public read published" on public.artist_eras;
create policy "public read published" on public.artist_eras for select using (
  exists (select 1 from public.artists a where a.slug = artist_eras.artist_slug and a.status = 'approved'));
revoke insert, update, delete, truncate on public.artist_eras from anon, authenticated;

-- 3. Event to artist links ---------------------------------------------------------------
create table if not exists public.event_artists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.scraped_events(id) on delete cascade,
  artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  match_method text not null check (match_method in ('name','alias','manual')),
  matched_text text,
  status text not null default 'proposed' check (status in ('proposed','confirmed','rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, artist_slug)
);
create index if not exists event_artists_slug_idx on public.event_artists (artist_slug, status);
alter table public.event_artists enable row level security;
-- No public policy: the site reads through artist_upcoming(), ops through token RPCs.
revoke all on public.event_artists from anon, authenticated;

-- Normalise a name for matching: lower case, no bracketed notes, no "live"/"dj set", letters and digits only.
create or replace function public.lineup_norm(p text) returns text
language sql immutable set search_path = public as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(lower(coalesce(p, '')), '\([^)]*\)|\[[^\]]*\]', '', 'g'),
             '\m(live|dj set|live set|hybrid set)\M', '', 'g'),
           '[^a-z0-9]', '', 'g')
$$;

-- Split one lineup entry on b2b, vs, x, &, comma and slash.
create or replace function public.lineup_parts(p text) returns setof text
language sql immutable set search_path = public as $$
  select trim(x) from regexp_split_to_table(coalesce(p, ''), '\s+(b2b|vs\.?|x|&|and)\s+|,|/', 'i') x
  where trim(x) <> ''
$$;

-- Rule-based matcher for one event. Exact match on the normalised artist name or alias,
-- approved artists only, names of 3 or more characters. Keeps confirmed and rejected links,
-- drops proposed links whose name is no longer in the lineup.
create or replace function public.match_event_artists(p_event uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_lineup text[]; n int := 0;
begin
  select lineup into v_lineup from public.scraped_events where id = p_event;
  with parts as (
    select distinct e as raw, public.lineup_norm(pt) as k
    from unnest(coalesce(v_lineup, '{}')) e, public.lineup_parts(e) pt
  ),
  hits as (
    select distinct on (a.slug) a.slug, 'name'::text as how, p.raw
    from parts p join public.artists a
      on a.status = 'approved' and length(p.k) >= 3 and public.lineup_norm(a.name) = p.k
    union
    select distinct on (al.artist_slug) al.artist_slug, 'alias', p.raw
    from parts p join public.artist_aliases al on length(p.k) >= 3 and public.lineup_norm(al.alias) = p.k
    join public.artists a on a.slug = al.artist_slug and a.status = 'approved'
  ),
  one as (select distinct on (slug) slug, how, raw from hits order by slug, (how = 'name') desc),
  ins as (
    insert into public.event_artists (event_id, artist_slug, match_method, matched_text)
    select p_event, slug, how, raw from one
    on conflict (event_id, artist_slug) do nothing
    returning 1
  )
  select count(*) into n from ins;

  delete from public.event_artists ea
  where ea.event_id = p_event and ea.status = 'proposed' and ea.match_method <> 'manual'
    and not exists (
      select 1 from unnest(coalesce(v_lineup, '{}')) e, public.lineup_parts(e) pt
      left join public.artists a on a.slug = ea.artist_slug
      where length(public.lineup_norm(pt)) >= 3 and (
        public.lineup_norm(pt) = public.lineup_norm(a.name)
        or exists (select 1 from public.artist_aliases al
                   where al.artist_slug = ea.artist_slug and public.lineup_norm(al.alias) = public.lineup_norm(pt))));
  return n;
end $$;
revoke execute on function public.match_event_artists(uuid) from anon, authenticated;

create or replace function public.trg_match_event_artists() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.match_event_artists(new.id);
  return new;
end $$;

drop trigger if exists scraped_events_match_artists on public.scraped_events;
create trigger scraped_events_match_artists
  after insert or update of lineup on public.scraped_events
  for each row execute function public.trg_match_event_artists();

-- Backfill every event that has a lineup.
do $$ declare r record; begin
  for r in select id from public.scraped_events where lineup is not null and cardinality(lineup) > 0 loop
    perform public.match_event_artists(r.id);
  end loop;
end $$;

-- Public: confirmed links on published, future events for one approved artist.
create or replace function public.artist_upcoming(p_slug text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.event_date, x.title), '[]'::json) from (
    select e.id, e.title, e.city, e.venue, e.event_date, e.event_time,
           coalesce(e.ticket_url, e.url) as ticket_url, e.url
    from public.event_artists ea
    join public.scraped_events e on e.id = ea.event_id
    join public.artists a on a.slug = ea.artist_slug and a.status = 'approved'
    where ea.artist_slug = p_slug and ea.status = 'confirmed'
      and e.status = 'published' and e.event_date >= current_date
    limit 20) x
$$;
grant execute on function public.artist_upcoming(text) to anon, authenticated;

-- Ops: list, review, add by hand, rematch.
create or replace function public.ops_event_artists(p_token text, p_status text default 'proposed', p_future boolean default true)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(r) from (
    select ea.id, ea.artist_slug, a.name as artist_name, ea.match_method, ea.matched_text, ea.status,
           e.id as event_id, e.title, e.event_date, e.city, e.venue, e.url, e.status as event_status
    from public.event_artists ea
    join public.scraped_events e on e.id = ea.event_id
    join public.artists a on a.slug = ea.artist_slug
    where (p_status is null or p_status = '' or ea.status = p_status)
      and (not coalesce(p_future, true) or e.event_date >= current_date)
    order by e.event_date nulls last, a.name
    limit 500) r), '[]'::json);
end $$;

create or replace function public.ops_set_event_artist(p_token text, p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  if p_status not in ('proposed','confirmed','rejected') then
    return jsonb_build_object('ok', false, 'error', 'status must be proposed, confirmed or rejected');
  end if;
  update public.event_artists set status = p_status, reviewed_at = now() where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ops_add_event_artist(p_token text, p_event uuid, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  insert into public.event_artists (event_id, artist_slug, match_method, status, reviewed_at)
  values (p_event, p_slug, 'manual', 'confirmed', now())
  on conflict (event_id, artist_slug) do update set status = 'confirmed', reviewed_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ops_rematch_event_artists(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  perform public.ops_check(p_token);
  for r in select id from public.scraped_events where lineup is not null and cardinality(lineup) > 0 loop
    n := n + public.match_event_artists(r.id);
  end loop;
  return jsonb_build_object('ok', true, 'added', n);
end $$;

-- 4. Feature flag ------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, note) values
  ('artist_page_v2', false, 'New artist page (board I) for the pilot artists. Previews always show it.')
on conflict (key) do nothing;
