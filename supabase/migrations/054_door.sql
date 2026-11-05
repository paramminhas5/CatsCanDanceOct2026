-- 054 Door (Param, 5 Nov 2026: "build it now and make it world class").
-- Check-in for tickets, free-list RSVPs and walk-ins on one screen, with a log for undo and offline sync.
-- Additive only. Hosts, staff and owner can use the door; nobody else can read the list.

alter table public.event_rsvps add column if not exists checked_in_count int not null default 0;
alter table public.event_rsvps add column if not exists checked_in_at timestamptz;
alter table public.tickets add column if not exists checked_in_by uuid;

create table if not exists public.door_walkins (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  name text not null,
  phone text,
  party int not null default 1 check (party between 1 and 20),
  amount_inr int not null default 0 check (amount_inr >= 0),
  method text not null default 'cash' check (method in ('cash', 'upi', 'card', 'comp')),
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create index if not exists door_walkins_event_idx on public.door_walkins (event_slug);
alter table public.door_walkins enable row level security;

create table if not exists public.door_log (
  id bigserial primary key,
  event_slug text not null,
  kind text not null check (kind in ('ticket', 'rsvp', 'walkin', 'undo_ticket', 'void_walkin')),
  ref text not null,
  delta int not null default 1,
  device text,
  by_member uuid,
  at timestamptz not null default now(),
  client_at timestamptz
);
create index if not exists door_log_event_idx on public.door_log (event_slug, at desc);
alter table public.door_log enable row level security;

create or replace function public.door_can() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid() and role in ('host', 'staff', 'owner') and banned_at is null);
$$;

-- Nights the door can open: upcoming ones and the last 30 days.
create or replace function public.door_nights() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.door_can() then return jsonb_build_object('ok', false, 'error', 'Door is for hosts and the CCD team.'); end if;
  return jsonb_build_object('ok', true, 'nights', coalesce((select jsonb_agg(x order by x.event_date desc nulls last) from (
    select e.slug, e.title, e.event_date, e.date, e.start_time, e.venue, e.city, e.capacity,
      (select count(*) from public.tickets t where t.event_slug = e.slug and t.voided_at is null)::int
        + (select coalesce(sum(1 + coalesce(r.plus_ones, 0)), 0) from public.event_rsvps r where r.event_slug = e.slug)::int as expected,
      (select count(*) from public.tickets t where t.event_slug = e.slug and t.checked_in_at is not null and t.voided_at is null)::int
        + (select coalesce(sum(r.checked_in_count), 0) from public.event_rsvps r where r.event_slug = e.slug)::int
        + (select coalesce(sum(w.party), 0) from public.door_walkins w where w.event_slug = e.slug and w.voided_at is null)::int as inside
    from public.events e
    where e.event_date is not null and e.event_date >= current_date - 30 and e.slug not like 'test-%'
  ) x), '[]'::jsonb));
end $$;

-- Everything the door needs for one night. Names only: no emails or phone numbers.
create or replace function public.door_list(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.events;
begin
  if not public.door_can() then return jsonb_build_object('ok', false, 'error', 'Door is for hosts and the CCD team.'); end if;
  select * into e from public.events where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'Night not found.'); end if;
  return jsonb_build_object('ok', true,
    'night', jsonb_build_object('slug', e.slug, 'title', e.title, 'event_date', e.event_date, 'date', e.date, 'start_time', e.start_time, 'venue', e.venue, 'city', e.city, 'capacity', e.capacity),
    'tickets', coalesce((select jsonb_agg(jsonb_build_object(
        'code', t.code, 'name', coalesce(nullif(t.holder_name, ''), o.buyer_name), 'tier', ti.name,
        'in_at', t.checked_in_at, 'void', t.voided_at is not null, 'order', o.id) order by coalesce(nullif(t.holder_name, ''), o.buyer_name))
      from public.tickets t join public.ticket_orders o on o.id = t.order_id left join public.ticket_tiers ti on ti.id = t.tier_id
      where t.event_slug = p_slug and (o.status in ('paid', 'free') or t.voided_at is not null)), '[]'::jsonb),
    'rsvps', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'party', 1 + coalesce(r.plus_ones, 0), 'in_count', r.checked_in_count, 'in_at', r.checked_in_at) order by r.name)
      from public.event_rsvps r where r.event_slug = p_slug), '[]'::jsonb),
    'walkins', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'party', w.party, 'amount', w.amount_inr, 'method', w.method, 'at', w.created_at) order by w.created_at desc)
      from public.door_walkins w where w.event_slug = p_slug and w.voided_at is null), '[]'::jsonb),
    'server_time', now());
end $$;

-- Scan or tap a ticket. First check-in wins; a second scan says when the first one happened.
create or replace function public.door_checkin(p_slug text, p_code text, p_device text default null, p_client_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets; nm text; tier text; ev text; at_ts timestamptz;
begin
  if not public.door_can() then return jsonb_build_object('ok', false, 'error', 'Door is for hosts and the CCD team.'); end if;
  select * into t from public.tickets where code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('ok', true, 'result', 'not_found'); end if;
  select coalesce(nullif(t.holder_name, ''), o.buyer_name) into nm from public.ticket_orders o where o.id = t.order_id;
  select name into tier from public.ticket_tiers where id = t.tier_id;
  if t.event_slug <> p_slug then
    select title into ev from public.events where slug = t.event_slug;
    return jsonb_build_object('ok', true, 'result', 'wrong_night', 'name', nm, 'tier', tier, 'event', coalesce(ev, t.event_slug));
  end if;
  if t.voided_at is not null then return jsonb_build_object('ok', true, 'result', 'void', 'name', nm, 'tier', tier); end if;
  if t.checked_in_at is not null then return jsonb_build_object('ok', true, 'result', 'already', 'name', nm, 'tier', tier, 'at', t.checked_in_at); end if;
  at_ts := least(coalesce(p_client_at, now()), now());
  update public.tickets set checked_in_at = at_ts, checked_in_by = auth.uid() where id = t.id;
  insert into public.door_log (event_slug, kind, ref, device, by_member, client_at) values (p_slug, 'ticket', t.code, left(p_device, 40), auth.uid(), p_client_at);
  return jsonb_build_object('ok', true, 'result', 'admit', 'name', nm, 'tier', tier, 'at', at_ts);
end $$;

create or replace function public.door_undo_ticket(p_slug text, p_code text, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.door_can() then return jsonb_build_object('ok', false, 'error', 'Door is for hosts and the CCD team.'); end if;
  update public.tickets set checked_in_at = null, checked_in_by = null where code = upper(trim(p_code)) and event_slug = p_slug;
  insert into public.door_log (event_slug, kind, ref, delta, device, by_member) values (p_slug, 'undo_ticket', upper(trim(p_code)), -1, left(p_device, 40), auth.uid());
  return jsonb_build_object('ok', true);
end $$;

-- Free list: set how many of the party are in. Setting a number (not adding one) keeps offline sync safe to replay.
create or replace function public.door_rsvp(p_slug text, p_id uuid, p_count int, p_device text default null, p_client_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.event_rsvps; n int; party int;
begin
  if not public.door_can() then return jsonb_build_object('ok', false, 'error', 'Door is for hosts and the CCD team.'); end if;
  select * into r from public.event_rsvps where id = p_id and event_slug = p_slug for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Not on this list.'); end if;
  party := 1 + coalesce(r.plus_ones, 0);
  n := greatest(0, least(party, coalesce(p_count, 0)));
  update public.event_rsvps set checked_in_count = n,
    checked_in_at = case when n = 0 then null else coalesce(checked_in_at, least(coalesce(p_client_at, now()), now())) end
  where id = r.id;
  insert into public.door_log (event_slug, kind, ref, delta, device, by_member, client_at) values (p_slug, 'rsvp', r.id::text, n - r.checked_in_count, left(p_device, 40), auth.uid(), p_client_at);
  return jsonb_build_object('ok', true, 'in_count', n, 'party', party, 'name', r.name);
end $$;

-- Walk-in or door sale. The client makes the id, so a replayed offline request is a no-op.
create or replace function public.door_walkin(p_slug text, p_id uuid, p_name text, p_party int default 1, p_amount int default 0, p_method text default 'cash',
  p_phone text default null, p_note text default null, p_device text default null, p_client_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.door_can() then return jsonb_build_object('ok', false, 'error', 'Door is for hosts and the CCD team.'); end if;
  if coalesce(trim(p_name), '') = '' then return jsonb_build_object('ok', false, 'error', 'Add a name.'); end if;
  if not exists (select 1 from public.events where slug = p_slug) then return jsonb_build_object('ok', false, 'error', 'Night not found.'); end if;
  insert into public.door_walkins (id, event_slug, name, phone, party, amount_inr, method, note, created_by, created_at)
  values (p_id, p_slug, left(trim(p_name), 80), left(p_phone, 20), greatest(1, least(20, coalesce(p_party, 1))), greatest(0, coalesce(p_amount, 0)),
    case when p_method in ('cash', 'upi', 'card', 'comp') then p_method else 'cash' end, left(p_note, 200), auth.uid(), least(coalesce(p_client_at, now()), now()))
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.door_log (event_slug, kind, ref, delta, device, by_member, client_at) values (p_slug, 'walkin', p_id::text, greatest(1, least(20, coalesce(p_party, 1))), left(p_device, 40), auth.uid(), p_client_at);
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.door_void_walkin(p_slug text, p_id uuid, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.door_can() then return jsonb_build_object('ok', false, 'error', 'Door is for hosts and the CCD team.'); end if;
  update public.door_walkins set voided_at = now() where id = p_id and event_slug = p_slug and voided_at is null;
  insert into public.door_log (event_slug, kind, ref, delta, device, by_member) values (p_slug, 'void_walkin', p_id::text, 0, left(p_device, 40), auth.uid());
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.door_can(), public.door_nights(), public.door_list(text), public.door_checkin(text, text, text, timestamptz),
  public.door_undo_ticket(text, text, text), public.door_rsvp(text, uuid, int, text, timestamptz),
  public.door_walkin(text, uuid, text, int, int, text, text, text, text, timestamptz), public.door_void_walkin(text, uuid, text) from public, anon;
grant execute on function public.door_can(), public.door_nights(), public.door_list(text), public.door_checkin(text, text, text, timestamptz),
  public.door_undo_ticket(text, text, text), public.door_rsvp(text, uuid, int, text, timestamptz),
  public.door_walkin(text, uuid, text, int, int, text, text, text, text, timestamptz), public.door_void_walkin(text, uuid, text) to authenticated;
