-- 036_artist_depth: sourced depth for artist pages (videos, influences, sound tags, tracklists).
-- Additive only. Every row carries a source. Public read only for approved artists.
-- Already applied to project jybloszaucgqlbkzquqw via the Supabase MCP (recorded there as "035_artist_depth"; renamed 036 in the repo because 035_fk_indexes landed first).

create table if not exists artist_videos (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references artists(slug) on update cascade on delete cascade,
  title text not null,
  url text not null,
  kind text not null check (kind in ('live_set','music_video','interview','mix')),
  platform text,
  note text,
  created_at timestamptz not null default now(),
  unique (artist_slug, url)
);

create table if not exists artist_influences (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references artists(slug) on update cascade on delete cascade,
  statement text not null,
  speaker text,
  paraphrase boolean not null default false,
  source_url text not null,
  created_at timestamptz not null default now(),
  unique (artist_slug, statement)
);

create table if not exists artist_sound_tags (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references artists(slug) on update cascade on delete cascade,
  tag text not null,
  source_url text,
  created_at timestamptz not null default now(),
  unique (artist_slug, tag)
);

create table if not exists artist_tracklists (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references artists(slug) on update cascade on delete cascade,
  mix_title text not null,
  url text not null,
  tracks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (artist_slug, url)
);

create index if not exists artist_videos_slug_idx on artist_videos(artist_slug);
create index if not exists artist_influences_slug_idx on artist_influences(artist_slug);
create index if not exists artist_sound_tags_slug_idx on artist_sound_tags(artist_slug);
create index if not exists artist_tracklists_slug_idx on artist_tracklists(artist_slug);

alter table artist_videos enable row level security;
alter table artist_influences enable row level security;
alter table artist_sound_tags enable row level security;
alter table artist_tracklists enable row level security;

create policy artist_videos_public_read on artist_videos for select
  using (exists (select 1 from artists a where a.slug = artist_videos.artist_slug and a.status = 'approved'));
create policy artist_influences_public_read on artist_influences for select
  using (exists (select 1 from artists a where a.slug = artist_influences.artist_slug and a.status = 'approved'));
create policy artist_sound_tags_public_read on artist_sound_tags for select
  using (exists (select 1 from artists a where a.slug = artist_sound_tags.artist_slug and a.status = 'approved'));
create policy artist_tracklists_public_read on artist_tracklists for select
  using (exists (select 1 from artists a where a.slug = artist_tracklists.artist_slug and a.status = 'approved'));
