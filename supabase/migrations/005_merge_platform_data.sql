-- 005: Merge the old platform's data into this database (one database for everything).
-- Source: data/import/*.json in this repo, pinned to commit f339f34 and pulled with the http extension.
-- Additive: new columns/tables only; existing artist rows are filled in, never overwritten.

create extension if not exists http with schema extensions;

-- ── Litter: artists ────────────────────────────────────────────────────────
alter table public.artists add column if not exists rank int;
alter table public.artists add column if not exists tier text;
alter table public.artists add column if not exists boiler_room text;

-- Private contact and money fields live here, never on a publicly readable table.
-- No RLS policies: invisible to anon, readable only via security definer ops RPCs.
create table if not exists public.private_contacts (
  kind text not null check (kind in ('artist','promoter')),
  slug text not null,
  booking_email text, management text, fee_text text, claimed_email text,
  updated_at timestamptz default now(),
  primary key (kind, slug)
);
alter table public.private_contacts enable row level security;
revoke all on public.private_contacts from anon, authenticated;

-- ── Litter: gig history (unverified until reviewed) ────────────────────────
create table if not exists public.artist_gigs (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null,
  event_name text not null,
  venue text, city text, event_date date,
  role text default 'dj',
  b2b_with text,
  verified boolean not null default false,
  source text default 'manual',
  created_at timestamptz default now(),
  unique (artist_slug, event_name, event_date)
);
alter table public.artist_gigs enable row level security;
drop policy if exists "public read verified gigs" on public.artist_gigs;
create policy "public read verified gigs" on public.artist_gigs for select using (verified);

-- CCD's own gigs come straight from Episode lineups, so they are always right.
create or replace view public.ccd_gigs with (security_invoker = true) as
  select a.slug as artist_slug, e.slug as event_slug, e.title as event_name, e.venue, e.city, e.event_date, e.episode_no
  from public.events e
  cross join lateral unnest(e.lineup) as l(name)
  join public.artists a on upper(a.name) = upper(l.name)
  where e.published and e.status <> 'cancelled';
grant select on public.ccd_gigs to anon, authenticated;

-- ── Promoters (used by Tour + Litter) ──────────────────────────────────────
create table if not exists public.promoters (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text, cities text[] default '{}', genres text[] default '{}',
  blurb text, instagram text, website text,
  status text not null default 'approved' check (status in ('pending','approved','hidden')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.promoters enable row level security;
drop policy if exists "public read promoters" on public.promoters;
create policy "public read promoters" on public.promoters for select using (status = 'approved');

-- ── Nine Lives: animal welfare NGOs ────────────────────────────────────────
create table if not exists public.ngos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  rank int, name text not null, founded text, founded_by text, location text, city text,
  focus text[] default '{}', categories text[] default '{}',
  donation text, impact text, website text,
  status text not null default 'approved' check (status in ('pending','approved','hidden')),
  created_at timestamptz default now()
);
alter table public.ngos enable row level security;
drop policy if exists "public read ngos" on public.ngos;
create policy "public read ngos" on public.ngos for select using (status = 'approved');

-- ── Prowl: scene guides and posts ──────────────────────────────────────────
create table if not exists public.scenes (
  kind text not null check (kind in ('city','genre','global')),
  slug text not null,
  name text not null,
  tagline text,
  data jsonb not null default '{}',
  primary key (kind, slug)
);
alter table public.scenes enable row level security;
drop policy if exists "public read scenes" on public.scenes;
create policy "public read scenes" on public.scenes for select using (true);

create table if not exists public.posts (
  slug text primary key,
  title text not null,
  cover_title text, category text, excerpt text, tag text,
  published_on text, author text, tldr text,
  body jsonb not null default '[]',
  extra jsonb not null default '{}',
  published boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.posts enable row level security;
drop policy if exists "public read published posts" on public.posts;
create policy "public read published posts" on public.posts for select using (published);

-- ── Import ─────────────────────────────────────────────────────────────────
do $$
declare
  base text := 'https://raw.githubusercontent.com/paramminhas5/CatsCanDanceOct2026/f339f3402d5cac1caa4db0082496b5a85aad869d/data/import/';
  j jsonb;
begin
  -- artists: insert new, fill blanks on existing
  select content::jsonb into j from extensions.http_get(base || 'artists_top100.json');
  insert into public.private_contacts (kind, slug, booking_email, management, fee_text)
  select 'artist', x.slug, x.booking_email, x.management, x.fee_text
  from jsonb_to_recordset(j) as x(slug text, booking_email text, management text, fee_text text)
  on conflict (kind, slug) do nothing;

  insert into public.artists (slug, name, rank, tier, members, from_city, based_city, genres, festivals, boiler_room, labels,
                              why, instagram, website, status, source)
  select x.slug, x.name, x.rank, x.tier, x.members, x.from_city, x.based_city, x.genres, x.festivals, x.boiler_room, x.labels,
         x.why, x.instagram, x.website, 'approved', 'top100-list'
  from jsonb_to_recordset(j) as x(slug text, name text, rank int, tier text, members text, from_city text, based_city text,
       genres text[], festivals text[], boiler_room text, labels text, why text, management text, instagram text,
       website text, booking_email text, fee_text text)
  on conflict (slug) do update set
    rank = coalesce(artists.rank, excluded.rank),
    tier = coalesce(artists.tier, excluded.tier),
    members = coalesce(artists.members, excluded.members),
    from_city = coalesce(artists.from_city, excluded.from_city),
    boiler_room = coalesce(artists.boiler_room, excluded.boiler_room),
    labels = coalesce(artists.labels, excluded.labels),
    why = coalesce(artists.why, excluded.why),
    instagram = coalesce(artists.instagram, excluded.instagram),
    website = coalesce(artists.website, excluded.website),
    festivals = case when coalesce(array_length(artists.festivals,1),0) = 0 then excluded.festivals else artists.festivals end,
    updated_at = now();

  select content::jsonb into j from extensions.http_get(base || 'gigs_unverified.json');
  insert into public.artist_gigs (artist_slug, event_name, venue, city, event_date, role, b2b_with, verified, source)
  select x.artist_slug, x.event_name, x.venue, x.city, x.event_date, x.role, x.b2b_with, false, 'platform-seed'
  from jsonb_to_recordset(j) as x(artist_slug text, event_name text, venue text, city text, event_date date, role text, b2b_with text)
  on conflict do nothing;

  select content::jsonb into j from extensions.http_get(base || 'promoters.json');
  insert into public.promoters (slug, name, city, cities, genres, blurb, instagram, website)
  select x.slug, x.name, x.city, x.cities, x.genres, x.blurb, x.instagram, x.website
  from jsonb_to_recordset(j) as x(slug text, name text, city text, cities text[], genres text[], blurb text, instagram text, website text)
  on conflict (slug) do nothing;
  insert into public.private_contacts (kind, slug, booking_email)
  select 'promoter', x.slug, x.booking_email from jsonb_to_recordset(j) as x(slug text, booking_email text)
  where x.booking_email is not null
  on conflict (kind, slug) do nothing;

  select content::jsonb into j from extensions.http_get(base || 'ngos.json');
  insert into public.ngos (slug, rank, name, founded, founded_by, location, city, focus, categories, donation, impact, website)
  select * from jsonb_to_recordset(j) as x(slug text, rank int, name text, founded text, founded_by text, location text,
       city text, focus text[], categories text[], donation text, impact text, website text)
  on conflict (slug) do nothing;

  select content::jsonb into j from extensions.http_get(base || 'scenes.json');
  insert into public.scenes (kind, slug, name, tagline, data)
  select * from jsonb_to_recordset(j) as x(kind text, slug text, name text, tagline text, data jsonb)
  on conflict (kind, slug) do nothing;

  select content::jsonb into j from extensions.http_get(base || 'posts.json');
  insert into public.posts (slug, title, cover_title, category, excerpt, tag, published_on, author, tldr, extra, body)
  select x.slug, x.title, x.cover_title, x.category, x.excerpt, x.tag, x.published_on, x.author, x.tldr,
         coalesce(x.extra,'{}'::jsonb), coalesce(x.body,'[]'::jsonb)
  from jsonb_to_recordset(j) as x(slug text, title text, cover_title text, category text, excerpt text, tag text,
       published_on text, author text, tldr text, extra jsonb, body jsonb)
  on conflict (slug) do nothing;
end $$;

-- Move existing private fields off the public artists table into private_contacts.
insert into public.private_contacts (kind, slug, booking_email, claimed_email)
select 'artist', slug, booking_email, claimed_email from public.artists
where booking_email is not null or claimed_email is not null
on conflict (kind, slug) do update set
  booking_email = coalesce(private_contacts.booking_email, excluded.booking_email),
  claimed_email = coalesce(excluded.claimed_email, private_contacts.claimed_email);
-- booking_email / fee columns stay on artists for now (additive rule) but are blanked so nothing private is readable.
update public.artists set booking_email = null, claimed_email = null, fee_min_inr = null, fee_max_inr = null
where booking_email is not null or claimed_email is not null or fee_min_inr is not null or fee_max_inr is not null;

-- Claims now record the email privately.
create or replace function public.ops_review(p_token text, p_kind text, p_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $f$
declare s record; v_slug text;
begin
  perform ops_check(p_token);
  if p_kind = 'artist_submission' then
    select * into s from artist_submissions where id = p_id;
    if not found then raise exception 'not found'; end if;
    if p_action = 'approve' then
      if s.kind = 'claim' then
        v_slug := s.artist_slug;
        update artists set claimed_at = now(),
          instagram = coalesce(s.instagram, instagram), soundcloud = coalesce(s.soundcloud, soundcloud),
          mix_url = coalesce(s.mix_url, mix_url), bio = coalesce(s.bio, bio),
          genres = case when array_length(s.genres,1) > 0 then s.genres else genres end,
          based_city = coalesce(s.based_city, based_city), updated_at = now()
        where slug = v_slug;
      else
        v_slug := trim(both '-' from regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g'));
        if exists (select 1 from artists where slug = v_slug) then v_slug := v_slug || '-' || left(p_id::text, 4); end if;
        insert into artists(slug, name, based_city, genres, instagram, soundcloud, mix_url, bio, claimed_at, source, status)
        values (v_slug, upper(s.name), s.based_city, s.genres, s.instagram, s.soundcloud, s.mix_url, s.bio, now(), 'submitted', 'approved');
      end if;
      insert into private_contacts(kind, slug, claimed_email) values ('artist', v_slug, s.email)
      on conflict (kind, slug) do update set claimed_email = excluded.claimed_email, updated_at = now();
      update artist_submissions set status='approved', reviewed_at=now() where id = p_id;
    else
      update artist_submissions set status='rejected', reviewed_at=now() where id = p_id;
    end if;
  elsif p_kind = 'artist_date' then
    update artist_dates set status = case when p_action='approve' then 'approved' else 'rejected' end where id = p_id;
  elsif p_kind = 'booking' then
    update booking_requests set status = case when p_action='approve' then 'sent' else 'closed' end where id = p_id;
  elsif p_kind = 'gig' then
    if p_action = 'approve' then update artist_gigs set verified = true where id = p_id;
    else delete from artist_gigs where id = p_id; end if;
  else
    raise exception 'bad kind';
  end if;
end $f$;

create or replace function public.ops_export(p_token text) returns json
language plpgsql security definer set search_path = public as $f$
begin
  perform ops_check(p_token);
  return json_build_object(
    'artists', coalesce((select json_agg(a) from (
        select ar.slug, ar.name, ar.kind, ar.based_city, ar.genres, ar.instagram, pc.booking_email,
               ar.is_resident, ar.featured, ar.status, ar.updated_at
        from artists ar left join private_contacts pc on pc.kind = 'artist' and pc.slug = ar.slug
        order by ar.name) a), '[]'),
    'scene_events', coalesce((select json_agg(e) from (
        select id, title, event_date, venue, city, source, score, status, genres, url from scraped_events
        where (event_date is null or event_date >= current_date) and status in ('pending','published')
        order by score desc limit 300) e), '[]'),
    'ccd_events', coalesce((select json_agg(e) from (select slug, title, event_date, date, venue, city, published from events) e), '[]')
  );
end $f$;

insert into public.build_log (area, title, status, detail) values
  ('data', 'Merge platform data into one database', 'shipped',
   'Top-100 artists, promoters, 100 NGOs, scene guides and posts loaded. Platform gig history loaded as unverified (hidden until reviewed). Old CCD Supabase project was empty and is paused.');
