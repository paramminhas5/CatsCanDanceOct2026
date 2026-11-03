-- 044: a short name for each artist era, shown on the artist page rail ("Piano and glitch").
-- Additive: one nullable column. When it is empty the page names the era from its first two sound tags.
-- The name is a summary of the era's sourced sound line (source_url on the same row).

alter table public.artist_eras add column if not exists label text;

comment on column public.artist_eras.label is
  'Short era name for the artist page rail, summarising the sourced sound line. Null: the page uses the first two tags.';

update public.artist_eras set label = 'Piano and glitch'
  where artist_slug = 'sandunes' and from_year = 2012 and label is null;
update public.artist_eras set label = 'Dreamy pop'
  where artist_slug = 'sandunes' and from_year = 2019 and label is null;
update public.artist_eras set label = 'Clarinet and strings'
  where artist_slug = 'sandunes' and from_year = 2023 and label is null;
