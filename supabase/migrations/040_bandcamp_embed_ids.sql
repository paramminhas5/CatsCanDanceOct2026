-- 040: Bandcamp embed ids on releases, so releases that are only on Bandcamp can play on the artist page.
-- Additive only. NOT APPLIED until Param approves.
-- The id is the item_id Bandcamp shows on the release page (bc-page-properties, or album=/track= in its embed URL).
alter table public.artist_discography
  add column if not exists bandcamp_item_id bigint,
  add column if not exists bandcamp_item_type text check (bandcamp_item_type in ('album', 'track'));

comment on column public.artist_discography.bandcamp_item_id is 'Bandcamp item_id from the release page; used for bandcamp.com/EmbeddedPlayer';
comment on column public.artist_discography.bandcamp_item_type is 'album or track, as the Bandcamp page states';
