-- 061 Ops list of promoters with their Gate plan (ops token only).
create or replace function public.ops_gate_plans(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return jsonb_build_object('ok', true, 'billing', coalesce((select enabled from public.feature_flags where key = 'gate_billing'), false),
    'promoters', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'plan', coalesce(g.plan, 'free'),
        'pro_until', g.pro_until, 'note', g.note,
        'nights', (select count(*) from public.events e where e.promoter_id = p.id),
        'outside', (select count(*) from public.door_guests d join public.events e on e.slug = d.event_slug where e.promoter_id = p.id and d.voided_at is null))
        order by p.name)
      from public.promoters p left join public.gate_plans g on g.promoter_id = p.id
      where p.status = 'approved' and p.applied_by is not null), '[]'::jsonb));
end $$;
