-- 037: booking flow v2. Additive only.
-- 1. events.listed: hide test nights from public lists without unpublishing them (dummy flows still use them).
-- 2. ticket_tiers.description: one line under the tier name ("Entry before 10 PM", "Includes a drink").
-- 3. event_tiers(slug): public tiers with description, capacity and sold_out, for the new ticket box.
-- 4. check_promo(slug, code, subtotal): previews a code without using it up.
-- 5. night_buzz(slug): counts for social proof (tickets issued, RSVPs, going, likes).
-- 6. event_waitlist + join_event_waitlist: sold-out waiting list, throttled, readable in /ops via ops_event_waitlist.
-- 7. ticket_resend_requests + ops_orders_for_email: "email me my tickets" lookup, sent by the server only.

alter table public.events add column if not exists listed boolean not null default true;
update public.events set listed = false where slug like 'test-night%';

alter table public.ticket_tiers add column if not exists description text;

create or replace function public.event_tiers(p_slug text)
returns table(id uuid, name text, description text, price_inr integer, max_per_order integer, remaining integer, capacity integer, sold_out boolean)
language sql stable security definer set search_path to 'public' as $$
  select t.id, t.name, t.description, t.price_inr, t.max_per_order, p.remaining, t.capacity, p.remaining < 1
  from public.ticket_tiers t join public.public_tiers(p_slug) p on p.id = t.id
  where t.event_slug = p_slug and t.active
  order by t.sort_order, t.price_inr;
$$;
grant execute on function public.event_tiers(text) to anon, authenticated;

create or replace function public.check_promo(p_slug text, p_code text, p_subtotal integer)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare pc public.promo_codes; v_disc int;
begin
  select * into pc from public.promo_codes where code = upper(trim(coalesce(p_code, '')));
  if not found or not pc.active or (pc.event_slug is not null and pc.event_slug <> p_slug)
     or (pc.expires_on is not null and pc.expires_on < current_date) or (pc.max_uses is not null and pc.uses >= pc.max_uses) then
    return jsonb_build_object('ok', false, 'error', 'That code does not work for this night.');
  end if;
  v_disc := least(greatest(coalesce(p_subtotal, 0), 0), coalesce(greatest(coalesce(p_subtotal, 0), 0) * pc.percent / 100, 0) + coalesce(pc.flat_inr, 0));
  return jsonb_build_object('ok', true, 'code', pc.code, 'percent', pc.percent, 'flat_inr', pc.flat_inr, 'discount_inr', v_disc);
end $$;
grant execute on function public.check_promo(text, text, integer) to anon, authenticated;

create or replace function public.night_buzz(p_slug text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'tickets', (select count(*) from public.tickets k join public.ticket_orders o on o.id = k.order_id
                where k.event_slug = p_slug and k.voided_at is null and o.status in ('paid','free')),
    'rsvps', coalesce((select public.rsvp_count(p_slug)), 0),
    'going', (select count(*) from public.night_going g where g.event_slug = p_slug),
    'likes', (select count(*) from public.night_likes l where l.event_slug = p_slug)
  );
$$;
grant execute on function public.night_buzz(text) to anon, authenticated;

create table if not exists public.event_waitlist (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null references public.events(slug) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (event_slug, email)
);
alter table public.event_waitlist enable row level security;
create index if not exists event_waitlist_slug_idx on public.event_waitlist(event_slug);

create or replace function public.join_event_waitlist(p_slug text, p_name text, p_email text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_pos int;
begin
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'Enter a valid email.'); end if;
  if not exists (select 1 from public.events where slug = p_slug and published and (event_date is null or event_date >= current_date)) then
    return jsonb_build_object('ok', false, 'error', 'This night is not open.');
  end if;
  if (select count(*) from public.event_waitlist where created_at > now() - interval '1 minute') > 30 then
    return jsonb_build_object('ok', false, 'error', 'Busy right now. Try again in a minute.');
  end if;
  insert into public.event_waitlist(event_slug, name, email) values (p_slug, nullif(trim(p_name), ''), lower(trim(p_email)))
  on conflict (event_slug, email) do nothing;
  select count(*) into v_pos from public.event_waitlist where event_slug = p_slug
    and created_at <= (select created_at from public.event_waitlist where event_slug = p_slug and email = lower(trim(p_email)));
  return jsonb_build_object('ok', true, 'position', v_pos);
end $$;
grant execute on function public.join_event_waitlist(text, text, text) to anon, authenticated;

create or replace function public.ops_event_waitlist(p_token text, p_slug text)
returns table(name text, email text, created_at timestamptz, notified_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform public.ops_check(p_token);
  return query select w.name, w.email, w.created_at, w.notified_at from public.event_waitlist w
    where w.event_slug = p_slug order by w.created_at;
end $$;
revoke execute on function public.ops_event_waitlist(text, text) from public;
grant execute on function public.ops_event_waitlist(text, text) to anon, authenticated;

create table if not exists public.ticket_resend_requests (
  email text primary key,
  last_at timestamptz not null default now()
);
alter table public.ticket_resend_requests enable row level security;

-- Server-only (ops token): orders for an email on nights that have not happened yet, at most one lookup per email every 10 minutes.
create or replace function public.ops_orders_for_email(p_token text, p_email text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_last timestamptz; v_ids jsonb;
begin
  perform public.ops_check(p_token);
  select last_at into v_last from public.ticket_resend_requests where email = lower(trim(p_email));
  if v_last is not null and v_last > now() - interval '10 minutes' then return jsonb_build_object('ok', false, 'throttled', true); end if;
  insert into public.ticket_resend_requests(email, last_at) values (lower(trim(p_email)), now())
  on conflict (email) do update set last_at = now();
  select coalesce(jsonb_agg(o.id order by o.created_at desc), '[]') into v_ids from (
    select o.id, o.created_at from public.ticket_orders o join public.events e on e.slug = o.event_slug
    where lower(o.buyer_email) = lower(trim(p_email)) and o.status in ('paid','free') and (e.event_date is null or e.event_date >= current_date)
    order by o.created_at desc limit 5) o;
  return jsonb_build_object('ok', true, 'orders', v_ids);
end $$;
revoke execute on function public.ops_orders_for_email(text, text) from public;
grant execute on function public.ops_orders_for_email(text, text) to anon, authenticated;

-- Same data as ops_order_email_data, but also for orders already emailed once (used by the resend lookup).
create or replace function public.ops_order_resend_data(p_token text, p_order uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare o public.ticket_orders; e public.events;
begin
  perform public.ops_check(p_token);
  select * into o from public.ticket_orders where id = p_order;
  if not found or o.status not in ('paid','free') then return jsonb_build_object('ok', false); end if;
  select * into e from public.events where slug = o.event_slug;
  return jsonb_build_object('ok', true, 'name', o.buyer_name, 'email', o.buyer_email, 'amount_inr', o.amount_inr,
    'event_title', e.title, 'event_date', e.date, 'venue', e.venue, 'city', e.city,
    'codes', coalesce((select jsonb_agg(code order by created_at) from public.tickets where order_id = o.id and voided_at is null), '[]'));
end $$;
revoke execute on function public.ops_order_resend_data(text, uuid) from public;
grant execute on function public.ops_order_resend_data(text, uuid) to anon, authenticated;

-- Signed-in members see every ticket bought with their login email (the /tickets wallet).
create or replace function public.my_member_tickets()
returns table(order_id uuid, code text, tier text, holder_name text, event_slug text, event_title text, event_date date, venue text, checked_in boolean, status text)
language sql stable security definer set search_path to 'public' as $$
  select o.id, k.code, (select name from public.ticket_tiers where id = k.tier_id), k.holder_name, k.event_slug, e.title, e.event_date, e.venue,
         k.checked_in_at is not null, o.status
  from public.tickets k join public.ticket_orders o on o.id = k.order_id left join public.events e on e.slug = k.event_slug
  where auth.uid() is not null and lower(o.buyer_email) = lower(coalesce(auth.jwt() ->> 'email', '')) and o.status in ('paid','free') and k.voided_at is null
  order by e.event_date desc nulls last, k.created_at;
$$;
revoke execute on function public.my_member_tickets() from public, anon;
grant execute on function public.my_member_tickets() to authenticated;
