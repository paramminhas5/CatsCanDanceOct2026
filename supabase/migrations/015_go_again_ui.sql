-- 015: data the "go again with" screen needs. Additive only.
-- my_crew returns names without ids, so the screen could not call say_go_again.

-- Crew mates for one night, with ids and whether I already tapped them.
create or replace function public.my_crew_mates(p_slug text)
returns table(mate_id uuid, mate text, tapped boolean)
language sql stable security definer set search_path = public as $$
  select m.id,
         coalesce(nullif(m.display_name, ''), 'Crew mate'),
         exists (select 1 from public.go_again g
                 where g.event_slug = p_slug and g.from_member = auth.uid() and g.to_member = m.id)
  from public.crew_pool me
  join public.crew_pool p on p.crew_id = me.crew_id
  join public.members m on m.id = p.member_id
  where me.event_slug = p_slug and me.member_id = auth.uid() and me.crew_id is not null
    and p.member_id <> auth.uid();
$$;

-- Nights already past where I was placed in a crew.
create or replace function public.my_past_crews()
returns table(event_slug text, title text, event_date date)
language sql stable security definer set search_path = public as $$
  select e.slug, e.title, e.event_date
  from public.crew_pool me
  join public.events e on e.slug = me.event_slug
  where me.member_id = auth.uid() and me.crew_id is not null and e.event_date < current_date
  order by e.event_date desc
  limit 10;
$$;

revoke all on function public.my_crew_mates(text), public.my_past_crews() from public;
grant execute on function public.my_crew_mates(text), public.my_past_crews() to authenticated;
