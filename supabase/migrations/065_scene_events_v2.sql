-- 065: scene_events_v2, the published scene nights with their cover image (migration 064 fills it).
-- Additive: scene_events stays as it is for anything still calling it.
create or replace function public.scene_events_v2(p_kind text default null)
returns table(id uuid, title text, url text, ticket_url text, source text, city text, venue text, event_date date,
  event_time text, genres text[], lineup text[], kind text, featured boolean, image_url text)
language sql stable security definer set search_path to 'public' as $$
  select e.id, e.title, e.url, e.ticket_url, e.source, e.city, e.venue, e.event_date, e.event_time,
         e.genres, e.lineup, e.kind, e.featured, e.image_url
  from public.scraped_events e
  where e.status = 'published'
    and (e.event_date is null or e.event_date >= current_date)
    and (p_kind is null or e.kind = p_kind)
  order by e.featured desc, e.event_date asc nulls last
  limit 200;
$$;
grant execute on function public.scene_events_v2(text) to anon, authenticated;
