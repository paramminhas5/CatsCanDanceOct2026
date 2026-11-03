-- 046: social media engine (Param approved 3 Nov 2026). One row per CCD Instagram post: the record and the image upload gate.
create table if not exists public.social_posts (
  id text primary key,
  planned_for timestamptz,
  bucket text not null,
  format text not null default 'carousel',
  title text,
  caption text,
  media jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  upload_key uuid default gen_random_uuid(),
  status text not null default 'draft',
  ig jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.social_posts enable row level security;
-- No policies on purpose: only the service role (edge function social-upload) and SQL read or write it.
comment on table public.social_posts is 'CCD social engine: one row per Instagram post. Images in artist-media/social/<id>/. Queue and approvals in the Social Desk artifact. See ccd/social-engine.md';
