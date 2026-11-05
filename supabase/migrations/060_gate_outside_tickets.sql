-- 060 Gate: outside tickets, guest uploads and plans (Param, 5 Nov 2026).
-- "make everyone use gate ... integrate with other QRs ... incentivise users to upload their ticket ... subscription for artists and promoters".
-- Applied in pieces 060a to 060e. Additive only.

-- 060a: tables and the billing switch ------------------------------------------------------------
-- A guest on the door list who holds a ticket from somewhere else (District, BookMyShow, Skillbox, Insider, any CSV),
-- either imported by the night's team or added by the guest before the night (status 'uploaded').
create table if not exists public.door_guests (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  source text not null default 'other',
  code text,
  name text,
  email text,
  party int not null default 1 check (party between 1 and 20),
  checked_in_count int not null default 0,
  checked_in_at timestamptz,
  member_id uuid,
  proof_path text,
  status text not null default 'listed' check (status in ('listed', 'uploaded')),
  batch uuid,
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create unique index if not exists door_guests_code on public.door_guests (event_slug, code) where code is not null and voided_at is null;
create index if not exists door_guests_slug on public.door_guests (event_slug);
alter table public.door_guests enable row level security;  -- no policies: reached only through the RPCs below

-- Gate plan per promoter. Billing is off until Param turns on flag gate_billing; until then everyone gets Pro.
create table if not exists public.gate_plans (
  promoter_id uuid primary key,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  pro_until date,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.gate_plans enable row level security;

insert into public.feature_flags (key, enabled, note)
values ('gate_billing', false, 'Gate Free and Pro limits. Off: everyone gets Pro. Param turns on when billing starts.')
on conflict (key) do nothing;

-- 060b to 060d: see the functions below (door_check_guest, door_guest_set, door_guests_list, door_import_guests,
-- door_void_import, guest_add_ticket, my_outside_ticket, gate_limits, ops_set_gate_plan; door_live and door_report count outside guests;
-- storage policies for door/<slug>/<member>/ in ticket-proofs).

-- 060b: door functions for outside tickets ------------------------------------------------------
alter table public.door_log drop constraint if exists door_log_kind_check;
alter table public.door_log add constraint door_log_kind_check
  check (kind in ('ticket', 'rsvp', 'walkin', 'undo_ticket', 'void_walkin', 'passout', 'back', 'guest', 'import'));

-- Booking codes compared on letters and digits only, any case (060e dropped hyphens too).
create or replace function public.gate_code(t text) returns text
language sql immutable as $$ select nullif(upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')), '') $$;

create or replace function public.gate_limits(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  with e as (select promoter_id from public.events where slug = p_slug),
  b as (select coalesce((select enabled from public.feature_flags where key = 'gate_billing'), false) as on_),
  pl as (select case
      when (select promoter_id from e) is null then 'pro'
      when exists (select 1 from public.gate_plans g where g.promoter_id = (select promoter_id from e) and g.plan = 'pro'
                   and (g.pro_until is null or g.pro_until >= current_date)) then 'pro'
      else 'free' end as p)
  select jsonb_build_object('billing', b.on_, 'plan', case when b.on_ then pl.p else 'pro' end, 'plan_if_billing', pl.p,
    'import_cap', case when b.on_ and pl.p = 'free' then 100 else 5000 end)
  from b, pl;
$$;

create or replace function public.door_check_guest(p_slug text, p_code text, p_device text default null, p_client_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.door_guests; c text := public.gate_code(p_code); other text; at_ts timestamptz;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  if c is null then return jsonb_build_object('ok', true, 'result', 'not_found'); end if;
  select * into g from public.door_guests where event_slug = p_slug and code = c and voided_at is null for update;
  if not found then
    -- Some platforms put the booking code inside a longer QR (a link or a string). Match a known code of 6+ characters inside it.
    select * into g from public.door_guests where event_slug = p_slug and voided_at is null and code is not null and length(code) >= 6
      and position(code in c) > 0 order by length(code) desc limit 1 for update;
  end if;
  if not found then
    select e.title into other from public.door_guests d join public.events e on e.slug = d.event_slug
      where d.code = c and d.voided_at is null and d.event_slug <> p_slug limit 1;
    if other is not null then return jsonb_build_object('ok', true, 'result', 'wrong_night', 'event', other); end if;
    return jsonb_build_object('ok', true, 'result', 'not_found');
  end if;
  if g.checked_in_count >= g.party then
    return jsonb_build_object('ok', true, 'result', 'already', 'name', g.name, 'tier', g.source, 'party', g.party, 'at', g.checked_in_at, 'guest', g.id);
  end if;
  at_ts := least(coalesce(p_client_at, now()), now());
  update public.door_guests set checked_in_count = party, checked_in_at = coalesce(checked_in_at, at_ts) where id = g.id;
  insert into public.door_log (event_slug, kind, ref, delta, device, by_member, client_at)
    values (p_slug, 'guest', g.id::text, g.party - g.checked_in_count, left(p_device, 40), auth.uid(), p_client_at);
  return jsonb_build_object('ok', true, 'result', 'admit', 'name', g.name, 'tier', g.source, 'party', g.party, 'at', at_ts,
    'guest', g.id, 'uploaded', g.status = 'uploaded');
end $$;

-- Set how many of an outside guest's party are in (absolute, so a replay from the offline queue is safe).
create or replace function public.door_guest_set(p_slug text, p_id uuid, p_count int, p_device text default null, p_client_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.door_guests; n int;
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  select * into g from public.door_guests where id = p_id and event_slug = p_slug and voided_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Not on the list.'); end if;
  n := greatest(0, least(coalesce(p_count, 0), g.party));
  update public.door_guests set checked_in_count = n,
    checked_in_at = case when n = 0 then null else coalesce(checked_in_at, least(coalesce(p_client_at, now()), now())) end where id = g.id;
  if n <> g.checked_in_count then
    insert into public.door_log (event_slug, kind, ref, delta, device, by_member, client_at)
      values (p_slug, 'guest', g.id::text, n - g.checked_in_count, left(p_device, 40), auth.uid(), p_client_at);
  end if;
  return jsonb_build_object('ok', true, 'in_count', n);
end $$;

create or replace function public.door_guests_list(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.door_can(p_slug) then return jsonb_build_object('ok', false, 'error', 'You are not on the door for this night.'); end if;
  return jsonb_build_object('ok', true, 'limits', public.gate_limits(p_slug),
    'guests', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'code', g.code, 'name', g.name, 'source', g.source, 'party', g.party,
        'in_count', g.checked_in_count, 'in_at', g.checked_in_at, 'uploaded', g.status = 'uploaded', 'proof', g.proof_path, 'batch', g.batch)
        order by g.name nulls last)
      from public.door_guests g where g.event_slug = p_slug and g.voided_at is null), '[]'::jsonb),
    'imports', coalesce((select jsonb_agg(jsonb_build_object('batch', x.batch, 'source', x.source, 'rows', x.n, 'at', x.at) order by x.at desc) from (
        select batch, min(source) source, count(*)::int n, min(created_at) at from public.door_guests
        where event_slug = p_slug and voided_at is null and batch is not null group by batch) x), '[]'::jsonb));
end $$;

-- Import an outside guest list. Rows: [{code, name, email, party}]. Same code again updates the row. Door lead or promoter team only.
create or replace function public.door_import_guests(p_slug text, p_source text, p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim jsonb; cap int; have int; b uuid := gen_random_uuid(); r jsonb; c text; added int := 0; updated int := 0; skipped int := 0; src text;
begin
  if not public.door_can_lead(p_slug) then return jsonb_build_object('ok', false, 'error', 'Only the door lead, the promoter team or the CCD team can import a list.'); end if;
  if not exists (select 1 from public.events where slug = p_slug) then return jsonb_build_object('ok', false, 'error', 'Night not found.'); end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then return jsonb_build_object('ok', false, 'error', 'No rows to import.'); end if;
  src := case when lower(p_source) in ('district', 'bookmyshow', 'skillbox', 'insider', 'highape', 'ra', 'other') then lower(p_source) else 'other' end;
  lim := public.gate_limits(p_slug); cap := (lim->>'import_cap')::int;
  select count(*) into have from public.door_guests where event_slug = p_slug and voided_at is null and status = 'listed';
  for r in select * from jsonb_array_elements(p_rows) loop
    c := public.gate_code(r->>'code');
    if c is null and nullif(trim(r->>'name'), '') is null then skipped := skipped + 1; continue; end if;
    if c is not null and exists (select 1 from public.door_guests where event_slug = p_slug and code = c and voided_at is null) then
      update public.door_guests set name = coalesce(nullif(left(trim(r->>'name'), 120), ''), name), email = coalesce(nullif(lower(trim(r->>'email')), ''), email),
        party = greatest(1, least(20, coalesce(nullif(r->>'party', '')::int, party))), status = 'listed', source = src
        where event_slug = p_slug and code = c and voided_at is null;
      updated := updated + 1;
    else
      if have + added >= cap then skipped := skipped + 1; continue; end if;
      insert into public.door_guests (event_slug, source, code, name, email, party, batch)
        values (p_slug, src, c, nullif(left(trim(r->>'name'), 120), ''), nullif(lower(trim(r->>'email')), ''),
                greatest(1, least(20, coalesce(nullif(r->>'party', '')::int, 1))), b);
      added := added + 1;
    end if;
  end loop;
  insert into public.door_log (event_slug, kind, ref, delta, by_member) values (p_slug, 'import', b::text, added, auth.uid());
  return jsonb_build_object('ok', true, 'batch', b, 'added', added, 'updated', updated, 'skipped', skipped, 'cap', cap, 'plan', lim->>'plan');
exception when invalid_text_representation then
  return jsonb_build_object('ok', false, 'error', 'A party size is not a number.');
end $$;

-- Undo an import (rows are kept with voided_at, guests already in stay counted in the log).
create or replace function public.door_void_import(p_slug text, p_batch uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.door_can_lead(p_slug) then return jsonb_build_object('ok', false, 'error', 'Only the door lead can undo an import.'); end if;
  update public.door_guests set voided_at = now() where event_slug = p_slug and batch = p_batch and voided_at is null and checked_in_count = 0;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'removed', n);
end $$;

-- 060c: guests add their own outside ticket, plans, counts ---------------------------------------
-- A signed-in guest adds the ticket they bought elsewhere, before the night. If the code is already on an imported list,
-- it is matched; otherwise it goes on the door list as "uploaded" for the door to check against the screenshot.
create or replace function public.guest_add_ticket(p_slug text, p_source text, p_code text, p_party int default 1, p_path text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.members; c text := public.gate_code(p_code); e public.events; g public.door_guests; src text; n int;
begin
  if me is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  select * into m from public.members where id = me;
  if m.banned_at is not null then return jsonb_build_object('ok', false, 'error', 'Not allowed.'); end if;
  select * into e from public.events where slug = p_slug and published;
  if not found or (e.event_date is not null and e.event_date < current_date - 1) then return jsonb_build_object('ok', false, 'error', 'That night is not open.'); end if;
  if c is null and p_path is null then return jsonb_build_object('ok', false, 'error', 'Add the booking code or a screenshot.'); end if;
  if p_path is not null and p_path not like 'door/' || p_slug || '/' || me::text || '/%' then return jsonb_build_object('ok', false, 'error', 'Bad file.'); end if;
  src := case when lower(p_source) in ('district', 'bookmyshow', 'skillbox', 'insider', 'highape', 'ra', 'other') then lower(p_source) else 'other' end;
  if c is not null then
    select * into g from public.door_guests where event_slug = p_slug and code = c and voided_at is null;
    if found then
      if g.status = 'uploaded' and g.member_id is distinct from me then return jsonb_build_object('ok', false, 'error', 'That booking code is already on the list.'); end if;
      update public.door_guests set member_id = me, proof_path = coalesce(p_path, proof_path),
        email = coalesce(email, lower(m.email)), name = coalesce(name, m.display_name) where id = g.id;
      return jsonb_build_object('ok', true, 'matched', g.status = 'listed');
    end if;
  end if;
  select * into g from public.door_guests where event_slug = p_slug and member_id = me and status = 'uploaded' and voided_at is null limit 1;
  if found then
    update public.door_guests set code = coalesce(c, code), source = src, party = greatest(1, least(10, coalesce(p_party, party))),
      proof_path = coalesce(p_path, proof_path) where id = g.id;
    return jsonb_build_object('ok', true, 'matched', false);
  end if;
  select count(*) into n from public.door_guests where member_id = me and created_at > now() - interval '1 day';
  if n >= 10 then return jsonb_build_object('ok', false, 'error', 'Too many tickets added today.'); end if;
  insert into public.door_guests (event_slug, source, code, name, email, party, member_id, proof_path, status)
    values (p_slug, src, c, coalesce(m.display_name, split_part(m.email, '@', 1)), lower(m.email), greatest(1, least(10, coalesce(p_party, 1))), me, p_path, 'uploaded');
  return jsonb_build_object('ok', true, 'matched', false);
end $$;

create or replace function public.my_outside_ticket(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('source', g.source, 'code', g.code, 'party', g.party, 'proof', g.proof_path is not null,
      'matched', g.status = 'listed', 'in', g.checked_in_count > 0)
    from public.door_guests g where g.event_slug = p_slug and g.member_id = auth.uid() and g.voided_at is null limit 1), 'null'::jsonb);
$$;

create or replace function public.ops_set_gate_plan(p_token text, p_promoter uuid, p_plan text, p_until date default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  if p_plan not in ('free', 'pro') then return jsonb_build_object('ok', false, 'error', 'Plan is free or pro.'); end if;
  insert into public.gate_plans (promoter_id, plan, pro_until, note) values (p_promoter, p_plan, p_until, left(p_note, 300))
  on conflict (promoter_id) do update set plan = excluded.plan, pro_until = excluded.pro_until, note = excluded.note, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

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
    + (select coalesce(sum(w.party), 0) from public.door_walkins w where w.event_slug = e.slug and w.voided_at is null)::int
    + (select coalesce(sum(g.checked_in_count), 0) from public.door_guests g where g.event_slug = e.slug and g.voided_at is null)::int;
  expected := (select count(*) from public.tickets t where t.event_slug = e.slug and t.voided_at is null)::int
    + (select coalesce(sum(1 + coalesce(r.plus_ones, 0)), 0) from public.event_rsvps r where r.event_slug = e.slug)::int
    + (select coalesce(sum(g.party), 0) from public.door_guests g where g.event_slug = e.slug and g.voided_at is null)::int;
  last15 := (select coalesce(sum(case when kind in ('ticket', 'back') then 1 when kind in ('rsvp', 'walkin', 'guest') then greatest(delta, 0) else 0 end), 0)
             from public.door_log where event_slug = e.slug and at > now() - interval '15 minutes')::int;
  return jsonb_build_object('ok', true, 'title', e.title, 'venue', e.venue, 'date', e.date, 'capacity', e.capacity,
    'inside', inside, 'expected', expected, 'last15', last15, 'at', now());
end $$;

-- 060d: report counts outside guests; proof screenshots; promoter email data --------------------
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
    'outside', coalesce((select jsonb_agg(jsonb_build_object('source', x.source, 'people', x.people, 'in', x.inn, 'uploaded', x.up) order by x.people desc) from (
        select source, sum(party)::int people, sum(checked_in_count)::int inn, count(*) filter (where member_id is not null)::int up
        from public.door_guests where event_slug = p_slug and voided_at is null group by source) x), '[]'::jsonb),
    'walkins', jsonb_build_object(
      'people', (select coalesce(sum(party), 0) from public.door_walkins where event_slug = p_slug and voided_at is null),
      'takings', coalesce((select jsonb_object_agg(method, total) from (select method, sum(amount_inr)::int total from public.door_walkins
        where event_slug = p_slug and voided_at is null group by method) m), '{}'::jsonb)),
    'arrivals', coalesce((select jsonb_agg(jsonb_build_object('t', slot, 'n', n) order by slot) from (
        select date_trunc('hour', a) + floor(extract(minute from a) / 15) * interval '15 minutes' slot, count(*)::int n from (
          select checked_in_at a from public.tickets where event_slug = p_slug and checked_in_at is not null and voided_at is null
          union all select r.checked_in_at from public.event_rsvps r, generate_series(1, r.checked_in_count) where r.event_slug = p_slug and r.checked_in_at is not null
          union all select w.created_at from public.door_walkins w, generate_series(1, w.party) where w.event_slug = p_slug and w.voided_at is null
          union all select g.checked_in_at from public.door_guests g, generate_series(1, g.checked_in_count) where g.event_slug = p_slug and g.checked_in_at is not null and g.voided_at is null
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

-- Ticket screenshots for the door: ticket-proofs/door/<night slug>/<member id>/<file>. The guest uploads and reads their own; the night's door reads them.
create policy "door proofs: guest uploads own" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-proofs' and (storage.foldername(name))[1] = 'door' and (storage.foldername(name))[3] = auth.uid()::text);
create policy "door proofs: guest or door reads" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-proofs' and (storage.foldername(name))[1] = 'door'
    and ((storage.foldername(name))[3] = auth.uid()::text or public.door_can((storage.foldername(name))[2])));

-- Who to email when CCD reviews a promoter or one of their nights (ops token only).
create or replace function public.ops_promoter_mail_data(p_token text, p_promoter uuid default null, p_night text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.promoters; e public.events;
begin
  perform public.ops_check(p_token);
  if p_night is not null then
    select * into e from public.events where slug = p_night;
    select * into p from public.promoters where id = e.promoter_id;
  else
    select * into p from public.promoters where id = p_promoter;
  end if;
  if p.id is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'promoter', p.name, 'promoter_slug', p.slug, 'status', p.status, 'note', coalesce(e.review_note, p.review_note),
    'night', case when e.slug is null then null else jsonb_build_object('slug', e.slug, 'title', e.title, 'date', e.date, 'published', e.published) end,
    'emails', coalesce((select jsonb_agg(distinct t.email) from public.promoter_team t where t.promoter_id = p.id and t.removed_at is null), '[]'::jsonb));
end $$;
