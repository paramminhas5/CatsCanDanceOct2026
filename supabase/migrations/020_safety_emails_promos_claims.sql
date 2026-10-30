-- 020: crew safety, phone requirement, go-again aware crews, guest list with reputation,
-- promo codes, refunds, email bookkeeping, city waitlist notices, artist claim linking.
-- Additive only (new columns, tables, functions). create_ticket_order gains an optional promo argument.

-- ---------- Safety ----------
alter table public.members add column if not exists banned_at timestamptz;

create table if not exists public.crew_reports (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  reporter uuid not null references public.members(id) on delete cascade,
  reported uuid not null references public.members(id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open','banned','dismissed')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  unique (event_slug, reporter, reported)
);
alter table public.crew_reports enable row level security;

create or replace function public.set_my_phone(p_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if length(regexp_replace(d, '\D', '', 'g')) < 10 then return jsonb_build_object('ok', false, 'error', 'Enter a phone number with at least 10 digits.'); end if;
  update public.members set phone = d where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.join_crew_pool(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text; v_phone text; v_ban timestamptz;
begin
  select email, phone, banned_at into v_email, v_phone, v_ban from public.members where id = auth.uid();
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if v_ban is not null then return jsonb_build_object('ok', false, 'error', 'Crews are not available for this account.'); end if;
  if length(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g')) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Add your phone number first.', 'need', 'phone'); end if;
  if not exists (select 1 from public.events where slug = p_slug and published and (event_date is null or event_date >= current_date)) then
    return jsonb_build_object('ok', false, 'error', 'This event is not open.'); end if;
  if not exists (select 1 from public.ticket_orders o where o.event_slug = p_slug and o.status in ('paid','free') and lower(o.buyer_email) = lower(v_email))
     and not exists (select 1 from public.event_rsvps r where r.event_slug = p_slug and lower(r.email) = lower(v_email)) then
    return jsonb_build_object('ok', false, 'error', 'Get a ticket or RSVP with this email first, then join a crew.'); end if;
  insert into public.crew_pool(event_slug, member_id) values (p_slug, auth.uid()) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.report_crew_mate(p_slug text, p_member uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if not exists (select 1 from public.crew_pool a join public.crew_pool b on b.crew_id = a.crew_id
                 where a.event_slug = p_slug and a.member_id = auth.uid() and b.member_id = p_member and p_member <> auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'You can only report someone from your crew.'); end if;
  insert into public.crew_reports(event_slug, reporter, reported, reason)
  values (p_slug, auth.uid(), p_member, left(nullif(trim(p_reason), ''), 500)) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ops_crew_reports(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select jsonb_agg(x) from (
    select r.id, r.event_slug, r.reason, r.created_at,
           a.display_name as reporter_name, b.display_name as reported_name, b.email as reported_email, (b.banned_at is not null) as already_banned,
           (select count(*) from public.crew_reports z where z.reported = r.reported) as times_reported
    from public.crew_reports r join public.members a on a.id = r.reporter join public.members b on b.id = r.reported
    where r.status = 'open' order by r.created_at desc limit 50) x), '[]');
end $$;

create or replace function public.ops_resolve_report(p_token text, p_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_to uuid;
begin
  perform public.ops_check(p_token);
  if p_action not in ('ban','dismiss') then raise exception 'bad action'; end if;
  select reported into v_to from public.crew_reports where id = p_id;
  if v_to is null then return jsonb_build_object('ok', false, 'error', 'not found'); end if;
  if p_action = 'ban' then
    update public.members set banned_at = now() where id = v_to;
    delete from public.crew_pool where member_id = v_to and crew_id is null;
    update public.crew_reports set status = 'banned', handled_at = now() where id = p_id;
  else
    update public.crew_reports set status = 'dismissed', handled_at = now() where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Crews: skip banned, keep mutual go-again pairs together ----------
create or replace function public.ops_form_crews(p_token text, p_slug text, p_pre_spot text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ids uuid[]; n int; k int; i int; sz int; pos int; v_crew uuid; v_cap uuid; made int := 0; v_city text;
begin
  perform public.ops_check(p_token);
  select public.city_norm(city) into v_city from public.events where slug = p_slug;
  select array_agg(q.member_id order by q.k1, q.k2, q.k3, q.leader::text, q.genres, q.created_at) into ids from (
    select p.member_id, p.created_at, m.genres, l.leader,
           coalesce(ml.quiz->>'good_night', '') k1, coalesce(ml.quiz->>'when', '') k2, coalesce(ml.quiz->>'arrive', '') k3
    from public.crew_pool p
    join public.members m on m.id = p.member_id
    cross join lateral (
      select (array_agg(x order by x::text))[1] as leader from (
        select p.member_id as x
        union
        select g.to_member from public.go_again g
          join public.go_again g2 on g2.from_member = g.to_member and g2.to_member = g.from_member
          where g.from_member = p.member_id) s) l
    left join public.members ml on ml.id = l.leader
    where p.event_slug = p_slug and p.crew_id is null and m.banned_at is null
      and (v_city is null or m.city is null or public.city_norm(m.city) = v_city)
  ) q;
  n := coalesce(array_length(ids, 1), 0);
  if n >= 3 then
    k := ceil(n / 6.0)::int; pos := 1;
    for i in 1..k loop
      sz := n / k + (case when i <= n % k then 1 else 0 end);
      made := made + 1;
      select x into v_cap from unnest(ids[pos:pos + sz - 1]) as x
        order by (select count(*) from public.go_again g where g.to_member = x) desc limit 1;
      insert into public.crews(event_slug, name, pre_spot, captain_id)
        values (p_slug, 'Crew ' || made || coalesce(' ' || v_city, ''), p_pre_spot, v_cap) returning id into v_crew;
      update public.crew_pool set crew_id = v_crew where event_slug = p_slug and member_id = any(ids[pos:pos + sz - 1]);
      pos := pos + sz;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'crews', made,
    'unplaced', (select count(*) from public.crew_pool where event_slug = p_slug and crew_id is null));
end $$;

-- ---------- Guest list with reputation (hosts, staff, owner) ----------
create or replace function public.guest_list(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where id = auth.uid() and role in ('host','staff','owner')) then
    return jsonb_build_object('ok', false, 'error', 'Hosts and staff only.'); end if;
  return jsonb_build_object('ok', true, 'guests', coalesce((select jsonb_agg(x order by x.name) from (
    select o.buyer_name as name, sum((i->>'qty')::int)::int as tickets, 'ticket' as via,
           (select count(*) from public.tickets t where t.order_id = o.id and t.checked_in_at is not null)::int as checked_in,
           (select count(distinct t.event_slug) from public.tickets t join public.ticket_orders o2 on o2.id = t.order_id
              where lower(o2.buyer_email) = lower(o.buyer_email) and t.checked_in_at is not null and t.event_slug <> p_slug)::int as nights_before,
           (select count(*) from public.go_again g join public.members m on m.id = g.to_member where lower(m.email) = lower(o.buyer_email))::int as go_again_received
    from public.ticket_orders o, jsonb_array_elements(o.items) i
    where o.event_slug = p_slug and o.status in ('paid','free') group by o.id
    union all
    select r.name, 1 + coalesce(r.plus_ones, 0), 'rsvp', 0,
           (select count(distinct t.event_slug) from public.tickets t join public.ticket_orders o2 on o2.id = t.order_id
              where lower(o2.buyer_email) = lower(r.email) and t.checked_in_at is not null)::int,
           (select count(*) from public.go_again g join public.members m on m.id = g.to_member where lower(m.email) = lower(r.email))::int
    from public.event_rsvps r where r.event_slug = p_slug
  ) x), '[]'));
end $$;

-- ---------- Promo codes, +1 via max_per_order, refunds ----------
create table if not exists public.promo_codes (
  code text primary key,
  event_slug text,
  percent int check (percent between 1 and 100),
  flat_inr int check (flat_inr > 0),
  max_uses int,
  uses int not null default 0,
  expires_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (percent is not null or flat_inr is not null)
);
alter table public.promo_codes enable row level security;

alter table public.ticket_orders add column if not exists promo_code text;
alter table public.ticket_orders add column if not exists discount_inr int not null default 0;
alter table public.ticket_orders add column if not exists emailed_at timestamptz;
alter table public.ticket_orders add column if not exists refunded_at timestamptz;
alter table public.ticket_orders add column if not exists refund_note text;
alter table public.tickets add column if not exists voided_at timestamptz;
alter table public.crews add column if not exists emailed_at timestamptz;
alter table public.early_access_signups add column if not exists notified_at timestamptz;

create or replace function public.ops_upsert_promo(p_token text, p_code text, p_slug text, p_percent int, p_flat int, p_max int, p_expires date, p_active boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  insert into public.promo_codes(code, event_slug, percent, flat_inr, max_uses, expires_on, active)
  values (upper(trim(p_code)), nullif(trim(p_slug), ''), p_percent, p_flat, p_max, p_expires, p_active)
  on conflict (code) do update set event_slug = excluded.event_slug, percent = excluded.percent, flat_inr = excluded.flat_inr,
    max_uses = excluded.max_uses, expires_on = excluded.expires_on, active = excluded.active;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ops_promos(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select jsonb_agg(p order by p.created_at desc) from public.promo_codes p), '[]');
end $$;

drop function if exists public.create_ticket_order(text, text, text, text, jsonb, text);
create or replace function public.create_ticket_order(p_slug text, p_name text, p_email text, p_phone text, p_items jsonb, p_source text default 'platform', p_promo text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; t public.ticket_tiers; v_total int := 0; v_qty int; v_id uuid; v_items jsonb := '[]'; v_left int;
        pc public.promo_codes; v_disc int := 0; v_code text := null;
begin
  if not exists (select 1 from public.events where slug = p_slug and published and (event_date is null or event_date >= current_date)) then
    return jsonb_build_object('ok', false, 'error', 'This event is not on sale.');
  end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(trim(p_name)) < 2 then return jsonb_build_object('ok', false, 'error', 'Enter your name and a valid email.'); end if;
  if (select count(*) from public.ticket_orders where lower(buyer_email) = lower(p_email) and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'Too many orders. Try again later.');
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into t from public.ticket_tiers where id = (it->>'tier')::uuid and event_slug = p_slug and active;
    if not found then return jsonb_build_object('ok', false, 'error', 'Ticket type not found.'); end if;
    v_qty := (it->>'qty')::int;
    if v_qty < 1 or v_qty > t.max_per_order then return jsonb_build_object('ok', false, 'error', 'Pick 1 to ' || t.max_per_order || ' tickets.'); end if;
    select remaining into v_left from public.public_tiers(p_slug) where id = t.id;
    if v_left < v_qty then return jsonb_build_object('ok', false, 'error', t.name || ' has ' || v_left || ' left.'); end if;
    v_total := v_total + t.price_inr * v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object('tier', t.id, 'qty', v_qty, 'name', t.name, 'price', t.price_inr));
  end loop;
  if jsonb_array_length(v_items) = 0 then return jsonb_build_object('ok', false, 'error', 'Pick a ticket.'); end if;

  if nullif(trim(coalesce(p_promo, '')), '') is not null and v_total > 0 then
    select * into pc from public.promo_codes where code = upper(trim(p_promo)) for update;
    if not found or not pc.active or (pc.event_slug is not null and pc.event_slug <> p_slug)
       or (pc.expires_on is not null and pc.expires_on < current_date) or (pc.max_uses is not null and pc.uses >= pc.max_uses) then
      return jsonb_build_object('ok', false, 'error', 'That code does not work.');
    end if;
    v_disc := least(v_total, coalesce(v_total * pc.percent / 100, 0) + coalesce(pc.flat_inr, 0));
    v_total := v_total - v_disc; v_code := pc.code;
    update public.promo_codes set uses = uses + 1 where code = pc.code;
  end if;

  insert into public.ticket_orders(event_slug, buyer_name, buyer_email, buyer_phone, amount_inr, status, items, source, paid_at, promo_code, discount_inr)
  values (p_slug, trim(p_name), lower(trim(p_email)), nullif(trim(p_phone),''), v_total, case when v_total = 0 then 'free' else 'pending' end, v_items,
          case when p_source = 'own' then 'own' else 'platform' end, case when v_total = 0 then now() end, v_code, v_disc)
  returning id into v_id;
  if v_total = 0 then perform public._issue_tickets(v_id); end if;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'amount_inr', v_total, 'free', v_total = 0, 'discount_inr', v_disc);
end $$;
revoke all on function public.create_ticket_order(text, text, text, text, jsonb, text, text) from public;
grant execute on function public.create_ticket_order(text, text, text, text, jsonb, text, text) to anon, authenticated;

create or replace function public.ops_refund_order(p_token text, p_order uuid, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.ticket_orders;
begin
  perform public.ops_check(p_token);
  select * into o from public.ticket_orders where id = p_order;
  if not found then return jsonb_build_object('ok', false, 'error', 'order not found'); end if;
  if o.status not in ('paid','free') then return jsonb_build_object('ok', false, 'error', 'Only paid or free orders can be refunded or cancelled.'); end if;
  update public.ticket_orders set status = 'refunded', refunded_at = now(), refund_note = left(p_note, 300) where id = p_order;
  update public.tickets set voided_at = now() where order_id = p_order and voided_at is null;
  if o.promo_code is not null then update public.promo_codes set uses = greatest(0, uses - 1) where code = o.promo_code; end if;
  return jsonb_build_object('ok', true, 'razorpay_payment_id', o.razorpay_payment_id, 'amount_inr', o.amount_inr);
end $$;

create or replace function public.checkin_ticket(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k public.tickets;
begin
  if not exists (select 1 from public.members where id = auth.uid() and role in ('staff','owner')) then return jsonb_build_object('ok', false, 'error', 'Staff only.'); end if;
  select * into k from public.tickets where code = upper(trim(p_code));
  if not found then return jsonb_build_object('ok', false, 'error', 'Ticket not found.'); end if;
  if k.voided_at is not null then return jsonb_build_object('ok', false, 'error', 'Ticket was refunded or cancelled.'); end if;
  if k.checked_in_at is not null then return jsonb_build_object('ok', false, 'error', 'Already checked in at ' || to_char(k.checked_in_at at time zone 'Asia/Kolkata', 'HH24:MI') || '.'); end if;
  update public.tickets set checked_in_at = now() where id = k.id;
  return jsonb_build_object('ok', true, 'holder', k.holder_name, 'event', k.event_slug);
end $$;

-- ---------- Email bookkeeping (the Next.js server sends, these only read and mark) ----------
create or replace function public.ops_order_email_data(p_token text, p_order uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.ticket_orders; e public.events;
begin
  perform public.ops_check(p_token);
  select * into o from public.ticket_orders where id = p_order;
  if not found or o.status not in ('paid','free') or o.emailed_at is not null then return jsonb_build_object('ok', false); end if;
  select * into e from public.events where slug = o.event_slug;
  return jsonb_build_object('ok', true, 'name', o.buyer_name, 'email', o.buyer_email, 'amount_inr', o.amount_inr,
    'event_title', e.title, 'event_date', e.date, 'venue', e.venue, 'city', e.city,
    'codes', coalesce((select jsonb_agg(code order by created_at) from public.tickets where order_id = o.id), '[]'));
end $$;

create or replace function public.ops_mark_order_emailed(p_token text, p_order uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public.ops_check(p_token); update public.ticket_orders set emailed_at = now() where id = p_order; return jsonb_build_object('ok', true); end $$;

create or replace function public.ops_crew_email_list(p_token text, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return jsonb_build_object('event', (select jsonb_build_object('title', title, 'date', date, 'venue', venue, 'city', city) from public.events where slug = p_slug),
    'members', coalesce((select jsonb_agg(jsonb_build_object('email', m.email, 'name', m.display_name, 'crew', c.name, 'pre_spot', c.pre_spot, 'crew_id', c.id,
        'mates', (select coalesce(jsonb_agg(m2.display_name), '[]') from public.crew_pool p2 join public.members m2 on m2.id = p2.member_id where p2.crew_id = c.id and p2.member_id <> m.id)))
      from public.crews c join public.crew_pool p on p.crew_id = c.id join public.members m on m.id = p.member_id
      where c.event_slug = p_slug and c.emailed_at is null), '[]'));
end $$;

create or replace function public.ops_mark_crews_emailed(p_token text, p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public.ops_check(p_token); update public.crews set emailed_at = now() where event_slug = p_slug and emailed_at is null; return jsonb_build_object('ok', true); end $$;

-- ---------- City waitlist: people who asked to hear when a night is on in their city ----------
create or replace function public.ops_city_waitlist(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select jsonb_agg(x) from (
    select substr(source, 6) as city, count(*) as waiting, jsonb_agg(email) as emails
    from public.early_access_signups where source like 'city:%' and notified_at is null group by 1 order by 2 desc) x), '[]');
end $$;

create or replace function public.ops_city_waitlist_done(p_token text, p_city text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin perform public.ops_check(p_token);
  update public.early_access_signups set notified_at = now() where lower(source) = lower('city:' || p_city) and notified_at is null;
  return jsonb_build_object('ok', true); end $$;

-- ---------- Artist claims: approving a claim links the profile to the member with that email ----------
alter table public.artists add column if not exists owner_member uuid references public.members(id) on delete set null;

create or replace function public.ops_set_inbox_status(p_token text, p_kind text, p_id uuid, p_status text)
returns json language plpgsql security definer set search_path = public as $$
declare s public.artist_submissions;
begin
  perform ops_check(p_token);
  if p_kind = 'contact' then
    update contact_messages set handled_at = case when p_status = 'handled' then now() else null end where id = p_id;
  elsif p_kind = 'promoter' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update promoter_applications set status = p_status, reviewed_at = now() where id = p_id;
  elsif p_kind = 'artist' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update artist_submissions set status = p_status, reviewed_at = now() where id = p_id returning * into s;
    if p_status = 'approved' and s.kind = 'claim' and s.artist_slug is not null then
      update artists set claimed_email = s.email, claimed_at = now(),
             owner_member = (select id from members where lower(email) = lower(s.email) limit 1)
        where slug = s.artist_slug;
    end if;
  elsif p_kind = 'dates' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update artist_dates set status = p_status where id = p_id;
  elsif p_kind = 'booking' then
    if p_status not in ('new','sent','closed') then raise exception 'bad status'; end if;
    update booking_requests set status = p_status where id = p_id;
  else
    raise exception 'bad kind';
  end if;
  return json_build_object('ok', true);
end $$;

-- A member who signs up after their claim was approved gets linked on arrival.
create or replace function public.link_claimed_artists() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.artists set owner_member = new.id where lower(claimed_email) = lower(new.email) and owner_member is null;
  return new;
end $$;
drop trigger if exists members_link_artists on public.members;
create trigger members_link_artists after insert on public.members for each row execute function public.link_claimed_artists();

create or replace function public.my_artist()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('slug', slug, 'name', name, 'bio', bio, 'based_city', based_city, 'genres', genres,
           'instagram', instagram, 'soundcloud', soundcloud, 'website', website, 'mix_url', mix_url, 'photo_url', photo_url)
    from public.artists where owner_member = auth.uid() limit 1), 'null'::jsonb);
$$;

create or replace function public.update_my_artist(p_bio text, p_city text, p_genres text, p_instagram text, p_soundcloud text, p_website text, p_mix_url text, p_photo_url text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.artists where owner_member = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'No artist profile is linked to your account.'); end if;
  update public.artists set
    bio = left(coalesce(nullif(trim(p_bio), ''), bio), 1500),
    based_city = coalesce(nullif(trim(p_city), ''), based_city),
    genres = case when nullif(trim(p_genres), '') is null then genres
                  else (select array_agg(distinct btrim(g)) from unnest(string_to_array(p_genres, ',')) g where btrim(g) <> '') end,
    instagram = coalesce(nullif(trim(p_instagram), ''), instagram),
    soundcloud = coalesce(nullif(trim(p_soundcloud), ''), soundcloud),
    website = coalesce(nullif(trim(p_website), ''), website),
    mix_url = coalesce(nullif(trim(p_mix_url), ''), mix_url),
    photo_url = coalesce(nullif(trim(p_photo_url), ''), photo_url),
    updated_at = now()
  where owner_member = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Grants ----------
revoke all on function public.set_my_phone(text), public.report_crew_mate(text, uuid, text), public.guest_list(text),
  public.my_artist(), public.update_my_artist(text, text, text, text, text, text, text, text) from public;
grant execute on function public.set_my_phone(text), public.report_crew_mate(text, uuid, text), public.guest_list(text),
  public.my_artist(), public.update_my_artist(text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.join_crew_pool(text) from public; grant execute on function public.join_crew_pool(text) to authenticated;
-- ops_* functions check the token inside; keep them callable by the anon key like the others.
