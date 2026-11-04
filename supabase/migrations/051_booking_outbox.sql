-- 051: booking emails (Param, 5 Nov 2026). Additive only.
-- ops_booking_outbox: new requests to artists who own their page, and every reply to the other side, once each.
-- Called by /api/booking-desk/notify after a request, a message or an action. Emails go out from the Next.js server.
alter table public.booking_messages add column if not exists emailed_at timestamptz;
alter table public.booking_requests add column if not exists artist_emailed_at timestamptz;

create or replace function public.ops_booking_outbox(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v jsonb;
begin
  perform ops_check(p_token);
  with fresh as (
    update booking_requests b set artist_emailed_at = now()
    from artists a
    where a.slug = b.artist_slug and a.owner_member is not null and coalesce(a.claimed_email, '') <> ''
      and b.artist_emailed_at is null and b.created_at > now() - interval '3 days' and b.stage <> 'declined'
    returning b.id, 'new_request'::text kind, a.claimed_email to_email, a.name artist, b.name requester, b.city, b.event_date, b.budget_band, null::text body, null::uuid key
  ), replies as (
    update booking_messages m set emailed_at = now()
    from booking_requests b join artists a on a.slug = b.artist_slug
    where m.request_id = b.id and m.emailed_at is null and m.created_at > now() - interval '3 days'
      and m.author_role in ('artist','requester','ops')
      and (m.author_role <> 'requester' or (a.owner_member is not null and coalesce(a.claimed_email, '') <> ''))
    returning b.id, ('reply_' || m.author_role || '_' || m.kind)::text kind,
      case when m.author_role = 'requester' then a.claimed_email else b.email end to_email,
      a.name artist, b.name requester, b.city, b.event_date, b.budget_band, _booking_mask(m.body) body,
      case when m.author_role = 'requester' then null else b.access_key end key
  )
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v from (select * from fresh union all select * from replies) x;
  return v;
end $$;
grant execute on function public.ops_booking_outbox(text) to anon, authenticated;
