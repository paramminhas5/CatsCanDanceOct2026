-- 053: clean scraped titles at the source, with the same rules the site uses on display (tidyTitle in src/lib/find.ts),
-- so share cards and emails read cleanly too. Param approved, 5 Nov 2026.
-- Rules: spaced dashes become " · " (as in 052), three or more dots become one ellipsis (two stay: "Fred again.." is a name),
-- "Housed- Featuring" becomes "Housed: Featuring", no space before punctuation, single spaces.
-- Also drops research notes in brackets from four mix and video titles.
-- Additive: one new function, the trigger function gains one call, and existing rows are cleaned once.

create or replace function public.tidy_scene_title(t text)
returns text language sql immutable set search_path to 'public' as $$
  select btrim(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(t,
      '\s+[—–]\s+|[—]', ' · ', 'g'),
      '\.{3,}|…', '…', 'g'),
      '(\w)-\s+(\S)', '\1: \2', 'g'),
      '\s+([,.:;!?…])', '\1', 'g'),
      '\s{2,}', ' ', 'g'),
    ' :,-');
$$;

create or replace function public.scraped_events_set_credible()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare d uuid;
begin
  new.title := tidy_scene_title(new.title);
  new.credible := scene_credibility(new.title, new.lineup, new.description, new.venue, new.genres);
  if new.status = 'pending' and new.event_date is not null then
    d := scene_dupe_of(new.id, new.title, new.event_date, new.city);
    if d is not null then new.credible := new.credible || ('dupe:' || d::text); end if;
  end if;
  if scene_should_autopublish(new) then
    new.status := 'published';
    new.published_at := now();
  end if;
  return new;
end $$;

-- Clean upcoming titles once. Pending rows are left to the next scrape, so this update cannot publish anything.
update public.scraped_events set title = title
where event_date >= current_date - 1 and status <> 'pending' and title is distinct from tidy_scene_title(title);

-- Research notes that slipped into display titles.
update public.artist_tracklists set mix_title = 'Kohra | Boiler Room: Bengaluru' where id = 'f902c709-4fb6-45d3-8bdb-a239f8b3d421';
update public.artist_tracklists set mix_title = 'Monophonik | Boiler Room: Mumbai' where id = '262deb3f-cfc2-42f5-bd73-6a4e7c38ed6f';
update public.artist_tracklists set mix_title = 'Prabh Deep | Boiler Room x Ballantine''s True Music Studios: Delhi NCR (Gurgaon)' where id = '1017b9ab-f217-47de-b90e-c54fde194cb0';
update public.artist_videos set title = 'Monophonik (Live) at The Lab Delhi' where id = 'c7181cbd-4d08-4bb0-b6fa-353f11a4f484';
