-- 058 Crew card counts the free list (5 Nov 2026).
-- A crew mate on the free list for a CCD night shows as having a ticket, and shows as "in" once the door checks them in.
create or replace function public.my_crew_card(p_key text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare c public.crews; i record; v_me uuid := auth.uid();
begin
  select cr.* into c from public.crew_pool me join public.crews cr on cr.id = me.crew_id where me.event_slug = p_key and me.member_id = v_me;
  select * into i from public.night_info(p_key);
  if c.id is null then return jsonb_build_object('placed', false, 'status', public.my_crew_status(p_key), 'night', to_jsonb(i)); end if;
  return jsonb_build_object('placed', true, 'night', to_jsonb(i),
    'crew', jsonb_build_object('name', c.name, 'pre_spot', c.pre_spot, 'meet_point', c.meet_point, 'meet_time', c.meet_time,
      'whatsapp_link', c.whatsapp_link, 'lost_point', c.lost_point, 'you_are_captain', c.captain_id = v_me),
    'mates', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'first_name', split_part(coalesce(m.display_name, 'Someone'), ' ', 1),
        'tags', coalesce(m.genres[1:2], '{}'), 'captain', m.id = c.captain_id, 'you', m.id = v_me,
        'ticket', case when i.kind = 'ccd' then (case when exists (select 1 from public.ticket_orders o where o.event_slug = p_key
                         and o.status in ('paid','free') and lower(o.buyer_email) = lower(m.email))
                       or exists (select 1 from public.event_rsvps r where r.event_slug = p_key and lower(r.email) = lower(m.email))
                       then 'verified' else 'pending' end)
                       else coalesce((select t.status from public.ticket_proofs t where t.member_id = m.id and t.night_key = p_key), 'missing') end,
        'in', exists (select 1 from public.crew_checkins k where k.night_key = p_key and k.member_id = m.id)
              or exists (select 1 from public.tickets k join public.ticket_orders o on o.id = k.order_id
                         where k.event_slug = p_key and k.checked_in_at is not null and lower(o.buyer_email) = lower(m.email))
              or exists (select 1 from public.event_rsvps r where r.event_slug = p_key and r.checked_in_at is not null and lower(r.email) = lower(m.email)))
        order by m.id = c.captain_id desc, m.display_name)
      from public.crew_pool p join public.members m on m.id = p.member_id where p.crew_id = c.id), '[]'::jsonb));
end $function$;
