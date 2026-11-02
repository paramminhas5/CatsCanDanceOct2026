-- 033: artist graph ("South Asian MusicBrainz"). Additive only.
-- Adds lane, stable external ids, aliases, discography, press, milestones, connections,
-- social stats, packages, and photo licence columns. Public reads only for published artists.

alter table public.artists
  add column if not exists lane text not null default 'core',
  add column if not exists lane_reason text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='artists_lane_check') then
    alter table public.artists add constraint artists_lane_check check (lane in ('core','parallel'));
  end if;
end $$;

-- Photo provenance
alter table public.artist_media
  add column if not exists author text,
  add column if not exists license text,
  add column if not exists license_url text,
  add column if not exists source_url text;

create table if not exists public.artist_external_ids (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  scheme text not null,           -- musicbrainz, wikidata, discogs, ra, bandcamp, wildcity, nts, boilerroom, rinse, mixcloud, youtube
  value text not null,
  url text,
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  evidence text,
  created_at timestamptz not null default now(),
  unique (artist_slug, scheme)
);
create table if not exists public.artist_aliases (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  alias text not null,
  kind text not null default 'also_known_as',
  source_url text,
  unique (artist_slug, alias)
);
create table if not exists public.artist_discography (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid, artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  title text not null, release_type text not null default 'single',
  release_date date, year int, label text, artwork_url text,
  spotify_url text, soundcloud_url text, bandcamp_url text, youtube_url text, source_url text,
  description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (artist_slug, title, year)
);
create table if not exists public.artist_press (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid, artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  title text not null, publication text not null, author text, excerpt text, url text,
  type text not null default 'mention', date_published date, is_featured boolean not null default false,
  quote_for_epk text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (artist_slug, url)
);
create table if not exists public.artist_milestones (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid, artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  type text not null default 'milestone', title text not null, description text,
  date date not null default current_date, year int, city text, venue text,
  is_featured boolean not null default false, importance int not null default 5,
  related_artist_slug text, related_artist_name text, source_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (artist_slug, title)
);
create table if not exists public.artist_connections (
  id uuid primary key default gen_random_uuid(),
  artist_a_slug text not null references public.artists(slug) on update cascade on delete cascade,
  artist_b_slug text not null references public.artists(slug) on update cascade on delete cascade,
  connection_type text not null default 'collab', strength int not null default 3 check (strength between 1 and 10),
  shared_events text[] not null default '{}', shared_venues text[] not null default '{}',
  notes text, source_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (artist_a_slug, artist_b_slug, connection_type), check (artist_a_slug <> artist_b_slug)
);
create table if not exists public.artist_social_stats (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid, artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  instagram_followers int, soundcloud_followers int, spotify_followers int, spotify_monthly_listeners int,
  youtube_subscribers int, bandcamp_followers int,
  source text not null default 'manual', captured_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.artist_packages (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null, artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  name text not null, description text, suitable_for text[] not null default '{}',
  price_inr int not null default 0, price_is_minimum boolean not null default true,
  travel_included boolean not null default false, travel_note text, set_duration_min int,
  set_type text not null default 'solo', tech_rider text, is_active boolean not null default true,
  sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- event_appearances: the profile code reads this name. Backed by verified artist_gigs, RLS applies.
create or replace view public.event_appearances with (security_invoker = true) as
select g.id, null::uuid as artist_id, g.artist_slug, g.event_name, g.venue, g.city, g.event_date,
       extract(year from g.event_date)::int as year, coalesce(g.role,'performer') as role, g.created_at
from public.artist_gigs g;

-- RLS: public read for published artists only. No anon writes.
do $$ declare t text; begin
  foreach t in array array['artist_external_ids','artist_aliases','artist_discography','artist_press','artist_milestones','artist_social_stats'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read published" on public.%I', t);
    execute format('create policy "public read published" on public.%I for select using (exists (select 1 from public.artists a where a.slug = %I.artist_slug and a.status = ''approved''))', t, t);
  end loop;
end $$;
alter table public.artist_connections enable row level security;
drop policy if exists "public read published" on public.artist_connections;
create policy "public read published" on public.artist_connections for select using (
  exists (select 1 from public.artists a where a.slug = artist_a_slug and a.status='approved')
  and exists (select 1 from public.artists b where b.slug = artist_b_slug and b.status='approved'));
alter table public.artist_packages enable row level security;
drop policy if exists "public read active packages" on public.artist_packages;
create policy "public read active packages" on public.artist_packages for select using (
  is_active and exists (select 1 from public.artists a where a.slug = artist_slug and a.status='approved'));

create index if not exists artist_ext_ids_scheme_value on public.artist_external_ids (scheme, value);
create index if not exists artist_disco_slug on public.artist_discography (artist_slug, year desc);
create index if not exists artist_press_slug on public.artist_press (artist_slug, date_published desc);
create index if not exists artist_milestones_slug on public.artist_milestones (artist_slug, date);
create index if not exists artist_conn_b on public.artist_connections (artist_b_slug);
create index if not exists artists_lane_idx on public.artists (lane) where status='approved';
