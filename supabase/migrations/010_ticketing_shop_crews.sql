-- 010: ticketing, shop, solo crews, founding passes, go-again taps, check-in. Additive.
-- Money moves only through the Next API routes (Razorpay keys live in Vercel env). The database never sees card data.

-- ===== Ticketing =====
create table if not exists public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  name text not null check (char_length(name) between 2 and 60),
  price_inr int not null check (price_inr between 0 and 200000),
  capacity int not null check (capacity between 1 and 5000),
  max_per_order int not null default 4 check (max_per_order between 1 and 10),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  buyer_name text not null, buyer_email text not null, buyer_phone text,
  amount_inr int not null check (amount_inr >= 0),
  status text not null default 'pending' check (status in ('pending','paid','free','cancelled','refunded')),
  razorpay_order_id text, razorpay_payment_id text,
  source text not null default 'platform' check (source in ('own','platform')),
  items jsonb not null default '[]',
  created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.ticket_orders(id) on delete cascade,
  tier_id uuid references public.ticket_tiers(id),
  event_slug text not null,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  holder_name text,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tickets_order_idx on public.tickets(order_id);
alter table public.ticket_tiers enable row level security;
alter table public.ticket_orders enable row level security;
alter table public.tickets enable row level security;
revoke all on public.ticket_tiers, public.ticket_orders, public.tickets from anon, authenticated;

create or replace function public.public_tiers(p_slug text)
returns table (id uuid, name text, price_inr int, max_per_order int, remaining int)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.price_inr, t.max_per_order,
    greatest(0, t.capacity - coalesce((
      select sum((i->>'qty')::int) from public.ticket_orders o, jsonb_array_elements(o.items) i
      where o.event_slug = p_slug and (i->>'tier')::uuid = t.id
        and (o.status in ('paid','free') or (o.status = 'pending' and o.created_at > now() - interval '20 minutes'))), 0))::int
  from public.ticket_tiers t where t.event_slug = p_slug and t.active order by t.sort_order, t.price_inr;
$$;

-- Issues tickets for an order (internal).
create or replace function public._issue_tickets(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.ticket_orders; i jsonb; n int;
begin
  select * into o from public.ticket_orders where id = p_order;
  if exists (select 1 from public.tickets where order_id = p_order) then return; end if;
  for i in select * from jsonb_array_elements(o.items) loop
    for n in 1..(i->>'qty')::int loop
      insert into public.tickets(order_id, tier_id, event_slug, holder_name) values (p_order, (i->>'tier')::uuid, o.event_slug, o.buyer_name);
    end loop;
  end loop;
end $$;
revoke execute on function public._issue_tickets(uuid) from public, anon, authenticated;

-- Reserve tickets. Free orders confirm immediately. Paid orders stay pending until the payment route confirms them.
create or replace function public.create_ticket_order(p_slug text, p_name text, p_email text, p_phone text, p_items jsonb, p_source text default 'platform')
returns jsonb language plpgsql security definer set search_path = public as $$
declare it jsonb; t public.ticket_tiers; v_total int := 0; v_qty int; v_id uuid; v_items jsonb := '[]'; v_left int;
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
  insert into public.ticket_orders(event_slug, buyer_name, buyer_email, buyer_phone, amount_inr, status, items, source, paid_at)
  values (p_slug, trim(p_name), lower(trim(p_email)), nullif(trim(p_phone),''), v_total, case when v_total = 0 then 'free' else 'pending' end, v_items,
          case when p_source = 'own' then 'own' else 'platform' end, case when v_total = 0 then now() end)
  returning id into v_id;
  if v_total = 0 then perform public._issue_tickets(v_id); end if;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'amount_inr', v_total, 'free', v_total = 0);
end $$;

create or replace function public.ops_attach_razorpay(p_token text, p_order uuid, p_rzp text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  update public.ticket_orders set razorpay_order_id = p_rzp where id = p_order and status = 'pending';
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ops_mark_order_paid(p_token text, p_rzp_order text, p_payment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.ticket_orders;
begin
  perform public.ops_check(p_token);
  select * into o from public.ticket_orders where razorpay_order_id = p_rzp_order;
  if not found then return jsonb_build_object('ok', false, 'error', 'order not found'); end if;
  if o.status = 'pending' then
    update public.ticket_orders set status = 'paid', razorpay_payment_id = p_payment, paid_at = now() where id = o.id;
    perform public._issue_tickets(o.id);
  end if;
  return jsonb_build_object('ok', true, 'order_id', o.id);
end $$;

create or replace function public.ops_order_amount(p_token text, p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.ticket_orders;
begin
  perform public.ops_check(p_token);
  select * into o from public.ticket_orders where id = p_order and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'order not payable'); end if;
  return jsonb_build_object('ok', true, 'amount_inr', o.amount_inr, 'email', o.buyer_email);
end $$;

-- Buyer sees tickets with order id + email.
create or replace function public.my_tickets(p_order uuid, p_email text)
returns table (code text, tier text, holder_name text, event_slug text, event_title text, event_date date, venue text, checked_in boolean, status text)
language sql stable security definer set search_path = public as $$
  select k.code, (select name from public.ticket_tiers where id = k.tier_id), k.holder_name, k.event_slug, e.title, e.event_date, e.venue, k.checked_in_at is not null, o.status
  from public.tickets k join public.ticket_orders o on o.id = k.order_id left join public.events e on e.slug = k.event_slug
  where o.id = p_order and lower(o.buyer_email) = lower(p_email) and o.status in ('paid','free');
$$;

-- Door check-in. Staff and owners only.
create or replace function public.checkin_ticket(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k public.tickets;
begin
  if not exists (select 1 from public.members where id = auth.uid() and role in ('staff','owner')) then return jsonb_build_object('ok', false, 'error', 'Staff only.'); end if;
  select * into k from public.tickets where code = upper(trim(p_code));
  if not found then return jsonb_build_object('ok', false, 'error', 'Ticket not found.'); end if;
  if k.checked_in_at is not null then return jsonb_build_object('ok', false, 'error', 'Already checked in at ' || to_char(k.checked_in_at at time zone 'Asia/Kolkata', 'HH24:MI') || '.'); end if;
  update public.tickets set checked_in_at = now() where id = k.id;
  return jsonb_build_object('ok', true, 'holder', k.holder_name, 'event', k.event_slug);
end $$;

create or replace function public.ops_ticket_summary(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(x) from (
    select o.event_slug, count(distinct o.id) filter (where o.status in ('paid','free')) orders,
      count(k.id) tickets, count(k.id) filter (where k.checked_in_at is not null) checked_in,
      coalesce(sum(o.amount_inr) filter (where o.status = 'paid'), 0) revenue_inr
    from public.ticket_orders o left join public.tickets k on k.order_id = o.id group by o.event_slug) x), '[]');
end $$;

create or replace function public.ops_upsert_tier(p_token text, p_slug text, p_name text, p_price int, p_capacity int) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  insert into public.ticket_tiers(event_slug, name, price_inr, capacity) values (p_slug, p_name, p_price, p_capacity);
  return jsonb_build_object('ok', true);
end $$;

-- ===== Shop =====
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text,
  price_inr int not null check (price_inr >= 0), images text[] not null default '{}',
  sizes text[] not null default '{}', stock int not null default 0 check (stock >= 0),
  active boolean not null default false, sort_order int not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null, buyer_email text not null, buyer_phone text not null,
  address jsonb not null, items jsonb not null, amount_inr int not null,
  status text not null default 'pending' check (status in ('pending','paid','shipped','cancelled','refunded')),
  razorpay_order_id text, razorpay_payment_id text, tracking text,
  created_at timestamptz not null default now(), paid_at timestamptz
);
alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;
revoke all on public.shop_products, public.shop_orders from anon, authenticated;

create or replace function public.public_products() returns table (id uuid, slug text, name text, description text, price_inr int, images text[], sizes text[], in_stock boolean)
language sql stable security definer set search_path = public as $$
  select id, slug, name, description, price_inr, images, sizes, stock > 0 from public.shop_products where active order by sort_order, created_at desc;
$$;

create or replace function public.create_shop_order(p_name text, p_email text, p_phone text, p_address jsonb, p_items jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb; p public.shop_products; v_total int := 0; v_items jsonb := '[]'; v_id uuid; v_qty int;
begin
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(trim(p_name)) < 2 or char_length(coalesce(p_phone,'')) < 8 then return jsonb_build_object('ok', false, 'error', 'Enter name, email and phone.'); end if;
  if coalesce(p_address->>'line1','') = '' or coalesce(p_address->>'city','') = '' or coalesce(p_address->>'pin','') !~ '^[0-9]{6}$' then return jsonb_build_object('ok', false, 'error', 'Enter a full address with a 6 digit pin code.'); end if;
  if (select count(*) from public.shop_orders where lower(buyer_email) = lower(p_email) and created_at > now() - interval '1 hour') >= 5 then return jsonb_build_object('ok', false, 'error', 'Too many orders. Try again later.'); end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into p from public.shop_products where id = (it->>'product')::uuid and active;
    v_qty := (it->>'qty')::int;
    if not found or v_qty < 1 or v_qty > 5 then return jsonb_build_object('ok', false, 'error', 'Item not available.'); end if;
    if p.stock < v_qty then return jsonb_build_object('ok', false, 'error', p.name || ' is out of stock.'); end if;
    v_total := v_total + p.price_inr * v_qty;
    v_items := v_items || jsonb_build_array(jsonb_build_object('product', p.id, 'name', p.name, 'size', it->>'size', 'qty', v_qty, 'price', p.price_inr));
  end loop;
  if jsonb_array_length(v_items) = 0 then return jsonb_build_object('ok', false, 'error', 'Your bag is empty.'); end if;
  insert into public.shop_orders(buyer_name, buyer_email, buyer_phone, address, items, amount_inr)
  values (trim(p_name), lower(trim(p_email)), trim(p_phone), p_address, v_items, v_total) returning id into v_id;
  return jsonb_build_object('ok', true, 'order_id', v_id, 'amount_inr', v_total);
end $$;

create or replace function public.ops_shop_order_amount(p_token text, p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.shop_orders;
begin
  perform public.ops_check(p_token);
  select * into o from public.shop_orders where id = p_order and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'order not payable'); end if;
  return jsonb_build_object('ok', true, 'amount_inr', o.amount_inr, 'email', o.buyer_email);
end $$;
create or replace function public.ops_shop_attach_razorpay(p_token text, p_order uuid, p_rzp text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  update public.shop_orders set razorpay_order_id = p_rzp where id = p_order and status = 'pending';
  return jsonb_build_object('ok', found);
end $$;
create or replace function public.ops_shop_mark_paid(p_token text, p_rzp_order text, p_payment text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.shop_orders; i jsonb;
begin
  perform public.ops_check(p_token);
  select * into o from public.shop_orders where razorpay_order_id = p_rzp_order;
  if not found then return jsonb_build_object('ok', false, 'error', 'order not found'); end if;
  if o.status = 'pending' then
    update public.shop_orders set status = 'paid', razorpay_payment_id = p_payment, paid_at = now() where id = o.id;
    for i in select * from jsonb_array_elements(o.items) loop
      update public.shop_products set stock = greatest(0, stock - (i->>'qty')::int) where id = (i->>'product')::uuid;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'order_id', o.id);
end $$;
create or replace function public.ops_upsert_product(p_token text, p_slug text, p_name text, p_description text, p_price int, p_image text, p_sizes text[], p_stock int, p_active boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  insert into public.shop_products(slug, name, description, price_inr, images, sizes, stock, active)
  values (p_slug, p_name, p_description, p_price, case when p_image <> '' then array[p_image] else '{}' end, coalesce(p_sizes,'{}'), p_stock, p_active)
  on conflict (slug) do update set name = excluded.name, description = excluded.description, price_inr = excluded.price_inr,
    images = case when p_image <> '' then array[p_image] else public.shop_products.images end, sizes = excluded.sizes, stock = excluded.stock, active = excluded.active;
  return jsonb_build_object('ok', true);
end $$;
create or replace function public.ops_shop_orders(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(o) from (select id, buyer_name, buyer_email, buyer_phone, address, items, amount_inr, status, tracking, created_at from public.shop_orders where status in ('paid','shipped') order by created_at desc limit 100) o), '[]');
end $$;
create or replace function public.ops_shop_ship(p_token text, p_order uuid, p_tracking text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  update public.shop_orders set status = 'shipped', tracking = p_tracking where id = p_order and status = 'paid';
  return jsonb_build_object('ok', found);
end $$;

-- ===== Solo crews, founding passes, go again, reputation =====
alter table public.members add column if not exists founding_number int unique;
alter table public.members add column if not exists quiz jsonb;
alter table public.members add column if not exists phone text;

create table if not exists public.crew_pool (
  event_slug text not null, member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(), crew_id uuid, primary key (event_slug, member_id)
);
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(), event_slug text not null, name text not null,
  pre_spot text, captain_id uuid references public.members(id), created_at timestamptz not null default now()
);
create table if not exists public.go_again (
  event_slug text not null, from_member uuid not null references public.members(id) on delete cascade,
  to_member uuid not null references public.members(id) on delete cascade, created_at timestamptz not null default now(),
  primary key (event_slug, from_member, to_member), check (from_member <> to_member)
);
alter table public.crew_pool enable row level security; alter table public.crews enable row level security; alter table public.go_again enable row level security;
revoke all on public.crew_pool, public.crews, public.go_again from anon, authenticated;

create or replace function public.join_crew_pool(p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if not exists (select 1 from public.events where slug = p_slug and published and (event_date is null or event_date >= current_date)) then return jsonb_build_object('ok', false, 'error', 'This event is not open.'); end if;
  insert into public.crew_pool(event_slug, member_id) values (p_slug, auth.uid()) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- Rules first: same city, genre overlap, groups of 5 or 6, no repeats of people who already shared a crew.
create or replace function public.ops_form_crews(p_token text, p_slug text, p_pre_spot text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; g uuid[] := '{}'; n int := 0; v_crew uuid; v_total int; v_size int; v_left int; cur_city text := '__';
begin
  perform public.ops_check(p_token);
  for r in select m.id, coalesce(m.city,'') city from public.crew_pool p join public.members m on m.id = p.member_id
           where p.event_slug = p_slug and p.crew_id is null order by coalesce(m.city,''), m.genres, m.created_at
  loop
    if r.city <> cur_city then g := '{}'; cur_city := r.city; end if;
    g := g || r.id;
    select count(*) into v_left from public.crew_pool p join public.members m on m.id = p.member_id where p.event_slug = p_slug and p.crew_id is null and coalesce(m.city,'') = r.city;
    v_size := array_length(g,1);
    if v_size >= 6 or (v_size >= 5 and v_left - v_size <> 1) or (v_size = v_left and v_size >= 3) then
      n := n + 1;
      insert into public.crews(event_slug, name, pre_spot, captain_id) values (p_slug, 'Crew ' || n || ' ' || cur_city, p_pre_spot, g[1]) returning id into v_crew;
      update public.crew_pool set crew_id = v_crew where event_slug = p_slug and member_id = any(g);
      g := '{}';
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'crews', n, 'unplaced', (select count(*) from public.crew_pool where event_slug = p_slug and crew_id is null));
end $$;

create or replace function public.my_crew(p_slug text)
returns table (crew_name text, pre_spot text, mate text, is_captain boolean)
language sql stable security definer set search_path = public as $$
  select c.name, c.pre_spot, m.display_name, m.id = c.captain_id
  from public.crew_pool me join public.crews c on c.id = me.crew_id
  join public.crew_pool p on p.crew_id = c.id join public.members m on m.id = p.member_id
  where me.event_slug = p_slug and me.member_id = auth.uid();
$$;

create or replace function public.say_go_again(p_slug text, p_to uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.crew_pool a join public.crew_pool b on b.crew_id = a.crew_id where a.event_slug = p_slug and a.member_id = auth.uid() and b.member_id = p_to) then
    return jsonb_build_object('ok', false, 'error', 'You can only pick people from your crew.');
  end if;
  insert into public.go_again(event_slug, from_member, to_member) values (p_slug, auth.uid(), p_to) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.claim_founding_pass() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if exists (select 1 from public.members where id = auth.uid() and founding_number is not null) then return jsonb_build_object('ok', true, 'number', (select founding_number from public.members where id = auth.uid())); end if;
  perform pg_advisory_xact_lock(500);
  select coalesce(max(founding_number),0) + 1 into v_n from public.members;
  if v_n > 500 then return jsonb_build_object('ok', false, 'error', 'All 500 founding passes are taken.'); end if;
  update public.members set founding_number = v_n where id = auth.uid();
  return jsonb_build_object('ok', true, 'number', v_n);
end $$;

create or replace function public.my_standing() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'founding_number', (select founding_number from public.members where id = auth.uid()),
    'nights_attended', (select count(*) from public.tickets k join public.ticket_orders o on o.id = k.order_id join public.members m on lower(m.email) = lower(o.buyer_email)
                         where m.id = auth.uid() and k.checked_in_at is not null),
    'go_again_received', (select count(*) from public.go_again where to_member = auth.uid()),
    'founding_left', greatest(0, 500 - (select count(*) from public.members where founding_number is not null)));
$$;

create or replace function public.save_taste_quiz(p_answers jsonb, p_phone text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  update public.members set quiz = p_answers, phone = coalesce(nullif(trim(p_phone),''), phone) where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- Tier and ticketing data for the host/owner dashboard.
create or replace function public.ops_crew_overview(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(x) from (select event_slug, count(*) pool, count(*) filter (where crew_id is null) unplaced from public.crew_pool group by event_slug) x), '[]');
end $$;

-- WhatsApp: links only until a Business API provider is chosen.
insert into public.site_settings(key, value) values ('whatsapp_community_url', to_jsonb(''::text)), ('whatsapp_number', to_jsonb(''::text)) on conflict (key) do nothing;

revoke execute on function public.ops_attach_razorpay(text,uuid,text), public.ops_mark_order_paid(text,text,text), public.ops_order_amount(text,uuid),
  public.ops_ticket_summary(text), public.ops_upsert_tier(text,text,text,int,int), public.ops_shop_order_amount(text,uuid), public.ops_shop_attach_razorpay(text,uuid,text),
  public.ops_shop_mark_paid(text,text,text), public.ops_upsert_product(text,text,text,text,int,text,text[],int,boolean), public.ops_shop_orders(text),
  public.ops_shop_ship(text,uuid,text), public.ops_form_crews(text,text,text), public.ops_crew_overview(text) from public;
grant execute on function public.public_tiers(text), public.create_ticket_order(text,text,text,text,jsonb,text), public.my_tickets(uuid,text), public.checkin_ticket(text),
  public.public_products(), public.create_shop_order(text,text,text,jsonb,jsonb), public.join_crew_pool(text), public.my_crew(text), public.say_go_again(text,uuid),
  public.claim_founding_pass(), public.my_standing(), public.save_taste_quiz(jsonb,text),
  public.ops_attach_razorpay(text,uuid,text), public.ops_mark_order_paid(text,text,text), public.ops_order_amount(text,uuid), public.ops_ticket_summary(text),
  public.ops_upsert_tier(text,text,text,int,int), public.ops_shop_order_amount(text,uuid), public.ops_shop_attach_razorpay(text,uuid,text), public.ops_shop_mark_paid(text,text,text),
  public.ops_upsert_product(text,text,text,text,int,text,text[],int,boolean), public.ops_shop_orders(text), public.ops_shop_ship(text,uuid,text),
  public.ops_form_crews(text,text,text), public.ops_crew_overview(text) to anon, authenticated;
