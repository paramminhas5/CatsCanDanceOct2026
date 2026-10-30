-- 021: ops list of recent ticket orders (for refunds) and ticket summary that ignores voided tickets.
create or replace function public.ops_recent_orders(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select jsonb_agg(x) from (
    select id, event_slug, buyer_name, buyer_email, amount_inr, status, source, promo_code, discount_inr, razorpay_payment_id, emailed_at, created_at
    from public.ticket_orders order by created_at desc limit 40) x), '[]');
end $$;

create or replace function public.ops_ticket_summary(p_token text)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(x) from (
    select o.event_slug, count(distinct o.id) filter (where o.status in ('paid','free')) orders,
      count(k.id) filter (where k.voided_at is null) tickets, count(k.id) filter (where k.checked_in_at is not null) checked_in,
      coalesce(sum(o.amount_inr) filter (where o.status = 'paid'), 0) revenue_inr
    from public.ticket_orders o left join public.tickets k on k.order_id = o.id group by o.event_slug) x), '[]');
end $$;
