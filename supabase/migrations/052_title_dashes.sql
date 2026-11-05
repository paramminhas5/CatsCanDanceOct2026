-- 052: scene titles without em or en dashes (house style). A spaced dash becomes " · ". Additive: only the trigger
-- function changes, and upcoming titles are cleaned once.
create or replace function public.scraped_events_set_credible()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare d uuid;
begin
  new.title := btrim(regexp_replace(new.title, '\s+[—–]\s+|[—]', ' · ', 'g'));
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

update public.scraped_events set title = title where event_date >= current_date - 1 and title ~ '[—–]';
