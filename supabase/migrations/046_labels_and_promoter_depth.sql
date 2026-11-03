-- 046: Indian and South Asian labels, and more depth on promoters. Additive only.
-- Every row carries sources; nothing shows publicly until status = 'approved' (Param decides).

create table if not exists public.labels (
  slug text primary key,
  name text not null,
  city text,
  country text,
  founded int,
  founders text,
  genres text[] not null default '{}',
  website text,
  instagram text,
  bandcamp text,
  soundcloud text,
  discogs_url text,
  musicbrainz_url text,
  description text,
  roster_artist_slugs text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  confidence text check (confidence in ('high','medium','low')),
  status text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.labels enable row level security;
drop policy if exists labels_public_read on public.labels;
create policy labels_public_read on public.labels for select to anon, authenticated using (status = 'approved');

-- Promoters: kind, founding facts and sources (all optional).
alter table public.promoters add column if not exists kind text;
alter table public.promoters add column if not exists founded int;
alter table public.promoters add column if not exists founders text;
alter table public.promoters add column if not exists country text;
alter table public.promoters add column if not exists related_artist_slugs text[] not null default '{}';
alter table public.promoters add column if not exists sources jsonb not null default '[]'::jsonb;
alter table public.promoters add column if not exists confidence text;
