-- 034: labels, collectives, residencies, promoters an artist is attached to. Additive only.
-- artist_connections stays artist-to-artist; this table holds named non-artist entities.
create table if not exists public.artist_affiliations (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  name text not null,
  kind text not null check (kind in ('label','collective','venue','promoter','collaborator')),
  source_url text,
  created_at timestamptz not null default now(),
  unique (artist_slug, name, kind)
);
create index if not exists artist_affiliations_slug_idx on public.artist_affiliations(artist_slug);
alter table public.artist_affiliations enable row level security;
drop policy if exists artist_affiliations_public_read on public.artist_affiliations;
create policy artist_affiliations_public_read on public.artist_affiliations for select
  using (exists (select 1 from public.artists a where a.slug = artist_affiliations.artist_slug and a.status = 'approved'));
