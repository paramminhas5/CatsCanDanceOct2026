-- 045: let the public artist page read photos for approved artists.
-- artist_media had row level security on and no policy, so anon reads returned nothing and
-- the page only ever showed the single photo_url. Additive: one select policy, nothing else.

create policy artist_media_public_read on public.artist_media
  for select to anon, authenticated
  using (exists (select 1 from public.artists a where a.slug = artist_media.artist_slug and a.status = 'approved'));
