-- 055 Door v2 (Param, 5 Nov 2026: "make this door thing a world class product and integrate with the rest").
-- Additive. Builds on 054.
--   Per-night door team: anyone signed in with an email on a night's team can run that night's door,
--   so a venue's own door person or another promoter's crew can use it without a CCD-wide role.
--   Night settings: ID check, a note for the door, UPI id for door payments, a live count link for the venue.
--   Pass-outs: scan out, scan back in.
--   Live count (anon, by secret key) and the door report after the night.
--   guest_list now counts free-list check-ins.

alter table public.tickets add column if not exists out_at timestamptz;

create table if not exists public.door_settings (
  event_slug text primary key,
  age_check boolean not null default false,
  note text,
  upi_vpa text,
  upi_name text,
  live_key text unique,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.door_settings enable row level security;

create table if not exists public.door_team (
  event_slug text not null,
  email text not null,
  role text not null default 'door' check (role in ('door', 'lead')),
  name text,
  added_by uuid,
  created_at timestamptz not null default now(),
  primary key (event_slug, email)
);
alter table public.door_team enable row level security;

alter table public.door_log drop constraint if exists door_log_kind_check;
alter table public.door_log add constraint door_log_kind_check check (kind in ('ticket', 'rsvp', 'walkin', 'undo_ticket', 'void_walkin', 'passout', 'back'));

create or replace function public.door_me_email() returns text
language sql stable security definer set search_path = public as $$
  select lower(coalesce(nullif(auth.jwt() ->> 'email', ''), (select email from public.members where id = auth.uid())));
$$;

-- Global door roles (host, staff, owner) or this night's door team.
create or replace function public.door_can(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.door_can()
    or exists (select 1 from public.door_team d where d.event_slug = p_slug and d.email = public.door_me_email())
  ) and not exists (select 1 from public.members where id = auth.uid() and banned_at is not null);
$$;

-- Can change the night's settings and team: staff, owner, or a lead on this night's team.
create or replace function public.door_can_lead(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid() and role in ('staff', 'owner') and banned_at is null)
    or exists (select 1 from public.door_team d where d.event_slug = p_slug and d.email = public.door_me_email() and d.role = 'lead');
$$;

create or replace function public.door_nights() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  return jsonb_build_object('ok', true, 'nights', coalesce((select jsonb_agg(x order by x.event_date desc nulls last) from (
    select e.slug, e.title, e.event_date, e.date, e.start_time, e.venue, e.city, e.capacity, public.door_can_lead(e.slug) as lead,
      (select count(*) from public.tickets t where t.event_slug = e.slug and t.voided_at is null)::int
        + (select coalesce(sum(1 + coalesce(r.plus_ones, 0)), 0) from public.event_rsvps r where r.event_slug = e.slug)::int as expected,
      (select count(*) from public.tickets t where t.event_slug = e.slug and t.checked_in_at is not null and t.out_at is null and t.voided_at is null)::int
        + (select coalesce(sum(r.checked_in_count), 0) from public.event_rsvps r where r.event_slug = e.slug)::int
        + (select coalesce(sum(w.party), 0) from public.door_walkins w where w.event_slug = e.slug and w.voided_at is null)::int as inside
    from public.events e
    where e.event_date is not null and e.event_date >= current_date - 30 and e.slug not like 'test-%' and public.door_can(e.slug)
  ) x), '[]'::jsonb));
end $$;

create or replace function public.door_list(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.events; s public.door_settings;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  select * into e from public.events where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'Night not found.'); end if;
  select * into s from public.door_settings where event_slug = p_slug;
  return jsonb_build_object('ok', true,
    'night', jsonb_build_object('slug', e.slug, 'title', e.title, 'event_date', e.event_date, 'date', e.date, 'start_time', e.start_time, 'venue', e.venue, 'city', e.city, 'capacity', e.capacity),
    'settings', jsonb_build_object('age_check', coalesce(s.age_check, false), 'note', s.note, 'upi_vpa', s.upi_vpa, 'upi_name', s.upi_name, 'lead', public.door_can_lead(p_slug)),
    'tickets', coalesce((select jsonb_agg(jsonb_build_object(
        'code', t.code, 'name', coalesce(nullif(t.holder_name, ''), o.buyer_name), 'tier', ti.name,
        'in_at', t.checked_in_at, 'out_at', t.out_at, 'void', t.voided_at is not null, 'order', o.id) order by coalesce(nullif(t.holder_name, ''), o.buyer_name))
      from public.tickets t join public.ticket_orders o on o.id = t.order_id left join public.ticket_tiers ti on ti.id = t.tier_id
      where t.event_slug = p_slug and (o.status in ('paid', 'free') or t.voided_at is not null)), '[]'::jsonb),
    'rsvps', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'party', 1 + coalesce(r.plus_ones, 0), 'in_count', r.checked_in_count, 'in_at', r.checked_in_at) order by r.name)
      from public.event_rsvps r where r.event_slug = p_slug), '[]'::jsonb),
    'walkins', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'party', w.party, 'amount', w.amount_inr, 'method', w.method, 'at', w.created_at) order by w.created_at desc)
      from public.door_walkins w where w.event_slug = p_slug and w.voided_at is null), '[]'::jsonb),
    'server_time', now());
end $$;

-- Scan in. A guest on a pass-out comes back in ('back'); otherwise first check-in wins.
create or replace function public.door_checkin(p_slug text, p_code text, p_device text default null, p_client_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets; nm text; tier text; ev text; at_ts timestamptz;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  select * into t from public.tickets where code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('ok', true, 'result', 'not_found'); end if;
  select coalesce(nullif(t.holder_name, ''), o.buyer_name) into nm from public.ticket_orders o where o.id = t.order_id;
  select name into tier from public.ticket_tiers where id = t.tier_id;
  if t.event_slug <> p_slug then
    select title into ev from public.events where slug = t.event_slug;
    return jsonb_build_object('ok', true, 'result', 'wrong_night', 'name', nm, 'tier', tier, 'event', coalesce(ev, t.event_slug));
  end if;
  if t.voided_at is not null then return jsonb_build_object('ok', true, 'result', 'void', 'name', nm, 'tier', tier); end if;
  if t.checked_in_at is not null and t.out_at is not null then
    update public.tickets set out_at = null where id = t.id;
    insert into public.door_log (event_slug, kind, ref, device, by_member, client_at) values (p_slug, 'back', t.code, left(p_device, 40), auth.uid(), p_client_at);
    return jsonb_build_object('ok', true, 'result', 'back', 'name', nm, 'tier', tier, 'at', t.checked_in_at);
  end if;
  if t.checked_in_at is not null then return jsonb_build_object('ok', true, 'result', 'already', 'name', nm, 'tier', tier, 'at', t.checked_in_at); end if;
  at_ts := least(coalesce(p_client_at, now()), now());
  update public.tickets set checked_in_at = at_ts, checked_in_by = auth.uid() where id = t.id;
  insert into public.door_log (event_slug, kind, ref, device, by_member, client_at) values (p_slug, 'ticket', t.code, left(p_device, 40), auth.uid(), p_client_at);
  return jsonb_build_object('ok', true, 'result', 'admit', 'name', nm, 'tier', tier, 'at', at_ts);
end $$;

-- Pass-out: the guest steps out and keeps their place. Only for tickets already checked in.
create or replace function public.door_passout(p_slug text, p_code text, p_device text default null, p_client_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets; nm text;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  select * into t from public.tickets where code = upper(trim(p_code)) and event_slug = p_slug for update;
  if not found then return jsonb_build_object('ok', true, 'result', 'not_found'); end if;
  select coalesce(nullif(t.holder_name, ''), o.buyer_name) into nm from public.ticket_orders o where o.id = t.order_id;
  if t.checked_in_at is null then return jsonb_build_object('ok', true, 'result', 'not_in', 'name', nm); end if;
  if t.out_at is not null then return jsonb_build_object('ok', true, 'result', 'already_out', 'name', nm, 'at', t.out_at); end if;
  update public.tickets set out_at = least(coalesce(p_client_at, now()), now()) where id = t.id;
  insert into public.door_log (event_slug, kind, ref, delta, device, by_member, client_at) values (p_slug, 'passout', t.code, -1, left(p_device, 40), auth.uid(), p_client_at);
  return jsonb_build_object('ok', true, 'result', 'out', 'name', nm);
end $$;

create or replace function public.door_undo_ticket(p_slug text, p_code text, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  update public.tickets set checked_in_at = null, checked_in_by = null, out_at = null where code = upper(trim(p_code)) and event_slug = p_slug;
  insert into public.door_log (event_slug, kind, ref, delta, device, by_member) values (p_slug, 'undo_ticket', upper(trim(p_code)), -1, left(p_device, 40), auth.uid());
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.door_rsvp(p_slug text, p_id uuid, p_count int, p_device text default null, p_client_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r public.event_rsvps; n int; party int;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
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

create or replace function public.door_walkin(p_slug text, p_id uuid, p_name text, p_party int default 1, p_amount int default 0, p_method text default 'cash',
  p_phone text default null, p_note text default null, p_device text default null, p_client_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
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
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  update public.door_walkins set voided_at = now() where id = p_id and event_slug = p_slug and voided_at is null;
  insert into public.door_log (event_slug, kind, ref, delta, device, by_member) values (p_slug, 'void_walkin', p_id::text, 0, left(p_device, 40), auth.uid());
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Setup: settings, team, live link (staff, owner or the night's lead) ----------
create or replace function public.door_setup(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.door_settings;
begin
  if not public.door_can_lead(p_slug) then return jsonb_build_object('ok', false, 'error', 'Only the door lead or the CCD team can change this.'); end if;
  select * into s from public.door_settings where event_slug = p_slug;
  return jsonb_build_object('ok', true,
    'settings', jsonb_build_object('age_check', coalesce(s.age_check, false), 'note', s.note, 'upi_vpa', s.upi_vpa, 'upi_name', s.upi_name, 'live_key', s.live_key),
    'team', coalesce((select jsonb_agg(jsonb_build_object('email', d.email, 'role', d.role, 'name', d.name,
        'joined', exists (select 1 from public.members m where lower(m.email) = d.email)) order by d.role desc, d.email)
      from public.door_team d where d.event_slug = p_slug), '[]'::jsonb));
end $$;

create or replace function public.door_save_settings(p_slug text, p_age_check boolean, p_note text, p_upi_vpa text, p_upi_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.door_can_lead(p_slug) then return jsonb_build_object('ok', false, 'error', 'Only the door lead or the CCD team can change this.'); end if;
  if p_upi_vpa is not null and p_upi_vpa <> '' and p_upi_vpa !~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,64}$' then
    return jsonb_build_object('ok', false, 'error', 'That UPI id does not look right. It should look like name@bank.'); end if;
  insert into public.door_settings (event_slug, age_check, note, upi_vpa, upi_name, updated_by, updated_at)
  values (p_slug, coalesce(p_age_check, false), left(nullif(trim(p_note), ''), 280), nullif(trim(p_upi_vpa), ''), left(nullif(trim(p_upi_name), ''), 60), auth.uid(), now())
  on conflict (event_slug) do update set age_check = excluded.age_check, note = excluded.note, upi_vpa = excluded.upi_vpa,
    upi_name = excluded.upi_name, updated_by = excluded.updated_by, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.door_team_set(p_slug text, p_email text, p_role text, p_name text default null, p_remove boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(p_email));
begin
  if not public.door_can_lead(p_slug) then return jsonb_build_object('ok', false, 'error', 'Only the door lead or the CCD team can change this.'); end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'Add a real email.'); end if;
  if coalesce(p_remove, false) then
    delete from public.door_team where event_slug = p_slug and email = em;
  else
    insert into public.door_team (event_slug, email, role, name, added_by)
    values (p_slug, em, case when p_role = 'lead' then 'lead' else 'door' end, left(nullif(trim(p_name), ''), 60), auth.uid())
    on conflict (event_slug, email) do update set role = excluded.role, name = coalesce(excluded.name, public.door_team.name);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Make (or replace) the secret link for the venue's live count. Replacing it kills the old link.
create or replace function public.door_live_link(p_slug text, p_reset boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if not public.door_can_lead(p_slug) then return jsonb_build_object('ok', false, 'error', 'Only the door lead or the CCD team can change this.'); end if;
  select live_key into k from public.door_settings where event_slug = p_slug;
  if k is null or coalesce(p_reset, false) then
    k := replace(gen_random_uuid()::text, '-', '');
    insert into public.door_settings (event_slug, live_key, updated_by) values (p_slug, k, auth.uid())
    on conflict (event_slug) do update set live_key = k, updated_by = auth.uid(), updated_at = now();
  end if;
  return jsonb_build_object('ok', true, 'key', k);
end $$;

-- Public, by key: the count and nothing personal.
create or replace function public.door_live(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.door_settings; e public.events; inside int; expected int; last15 int;
begin
  if p_key is null or length(p_key) < 20 then return jsonb_build_object('ok', false); end if;
  select * into s from public.door_settings where live_key = p_key;
  if not found then return jsonb_build_object('ok', false); end if;
  select * into e from public.events where slug = s.event_slug;
  inside := (select count(*) from public.tickets t where t.event_slug = e.slug and t.checked_in_at is not null and t.out_at is null and t.voided_at is null)::int
    + (select coalesce(sum(r.checked_in_count), 0) from public.event_rsvps r where r.event_slug = e.slug)::int
    + (select coalesce(sum(w.party), 0) from public.door_walkins w where w.event_slug = e.slug and w.voided_at is null)::int;
  expected := (select count(*) from public.tickets t where t.event_slug = e.slug and t.voided_at is null)::int
    + (select coalesce(sum(1 + coalesce(r.plus_ones, 0)), 0) from public.event_rsvps r where r.event_slug = e.slug)::int;
  last15 := (select coalesce(sum(case when kind in ('ticket', 'back') then 1 when kind in ('rsvp', 'walkin') then greatest(delta, 0) else 0 end), 0)
             from public.door_log where event_slug = e.slug and at > now() - interval '15 minutes')::int;
  return jsonb_build_object('ok', true, 'title', e.title, 'venue', e.venue, 'date', e.date, 'capacity', e.capacity,
    'inside', inside, 'expected', expected, 'last15', last15, 'at', now());
end $$;

-- After the night: turnout, tiers, timing, repeat guests, takings.
create or replace function public.door_report(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.events;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  select * into e from public.events where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'Night not found.'); end if;
  return jsonb_build_object('ok', true,
    'night', jsonb_build_object('slug', e.slug, 'title', e.title, 'date', e.date, 'event_date', e.event_date, 'venue', e.venue, 'capacity', e.capacity),
    'tiers', coalesce((select jsonb_agg(jsonb_build_object('tier', x.tier, 'sold', x.sold, 'in', x.inn) order by x.sold desc) from (
        select coalesce(ti.name, 'Ticket') tier, count(*)::int sold, count(t.checked_in_at)::int inn
        from public.tickets t left join public.ticket_tiers ti on ti.id = t.tier_id
        where t.event_slug = p_slug and t.voided_at is null group by 1) x), '[]'::jsonb),
    'list', jsonb_build_object(
      'people', (select coalesce(sum(1 + coalesce(plus_ones, 0)), 0) from public.event_rsvps where event_slug = p_slug),
      'in', (select coalesce(sum(checked_in_count), 0) from public.event_rsvps where event_slug = p_slug)),
    'walkins', jsonb_build_object(
      'people', (select coalesce(sum(party), 0) from public.door_walkins where event_slug = p_slug and voided_at is null),
      'takings', coalesce((select jsonb_object_agg(method, total) from (select method, sum(amount_inr)::int total from public.door_walkins
        where event_slug = p_slug and voided_at is null group by method) m), '{}'::jsonb)),
    'arrivals', coalesce((select jsonb_agg(jsonb_build_object('t', slot, 'n', n) order by slot) from (
        select date_trunc('hour', a) + floor(extract(minute from a) / 15) * interval '15 minutes' slot, count(*)::int n from (
          select checked_in_at a from public.tickets where event_slug = p_slug and checked_in_at is not null and voided_at is null
          union all select r.checked_in_at from public.event_rsvps r, generate_series(1, r.checked_in_count) where r.event_slug = p_slug and r.checked_in_at is not null
          union all select w.created_at from public.door_walkins w, generate_series(1, w.party) where w.event_slug = p_slug and w.voided_at is null
        ) z group by 1) y), '[]'::jsonb),
    'repeat', (select count(distinct lower(o.buyer_email)) from public.tickets t join public.ticket_orders o on o.id = t.order_id
        where t.event_slug = p_slug and t.checked_in_at is not null
          and exists (select 1 from public.tickets t2 join public.ticket_orders o2 on o2.id = t2.order_id
                      where lower(o2.buyer_email) = lower(o.buyer_email) and t2.event_slug <> p_slug and t2.checked_in_at is not null)),
    'first_timers', (select count(distinct lower(o.buyer_email)) from public.tickets t join public.ticket_orders o on o.id = t.order_id
        where t.event_slug = p_slug and t.checked_in_at is not null
          and not exists (select 1 from public.tickets t2 join public.ticket_orders o2 on o2.id = t2.order_id
                      where lower(o2.buyer_email) = lower(o.buyer_email) and t2.event_slug <> p_slug and t2.checked_in_at is not null)),
    'passouts', (select count(*) from public.door_log where event_slug = p_slug and kind = 'passout'),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('device', device, 'actions', n)) from (select coalesce(device, '?') device, count(*)::int n
        from public.door_log where event_slug = p_slug group by 1 order by 2 desc) d), '[]'::jsonb));
end $$;

-- guest_list: free-list guests now show how many of their party came in.
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
    select r.name, 1 + coalesce(r.plus_ones, 0), 'rsvp', r.checked_in_count,
           (select count(distinct t.event_slug) from public.tickets t join public.ticket_orders o2 on o2.id = t.order_id
              where lower(o2.buyer_email) = lower(r.email) and t.checked_in_at is not null)::int,
           (select count(*) from public.go_again g join public.members m on m.id = g.to_member where lower(m.email) = lower(r.email))::int
    from public.event_rsvps r where r.event_slug = p_slug
  ) x), '[]'));
end $$;

revoke all on function public.door_me_email(), public.door_can(text), public.door_can_lead(text), public.door_passout(text, text, text, timestamptz),
  public.door_setup(text), public.door_save_settings(text, boolean, text, text, text), public.door_team_set(text, text, text, text, boolean),
  public.door_live_link(text, boolean), public.door_report(text), public.door_live(text) from public, anon;
grant execute on function public.door_me_email(), public.door_can(text), public.door_can_lead(text), public.door_passout(text, text, text, timestamptz),
  public.door_setup(text), public.door_save_settings(text, boolean, text, text, text), public.door_team_set(text, text, text, text, boolean),
  public.door_live_link(text, boolean), public.door_report(text) to authenticated;
grant execute on function public.door_live(text) to anon, authenticated;
