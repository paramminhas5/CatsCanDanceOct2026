-- NOT APPLIED YET: waiting for Param to approve it in Supabase (10 Nov). Apply with apply_migration before using it.
-- 067: booking contracts and deposits (plan ccd/v2-plan.md section 8). Additive only.
-- Once the organiser has accepted the artist's terms, either side drafts the contract from the thread:
-- parties, date, venue, set, fee with the deposit and balance split, rider, tech, travel and cancellation.
-- Each side signs by typing their name and a one-time code sent to their email (issued and checked
-- through the server with the ops token, so the code never reaches a browser). The signed version's
-- hash, time and IP are kept. Any change after a signature makes a new version and clears both.
-- Deposits: the organiser pays through Razorpay (test mode until the CA signs off); the server verifies
-- the payment and marks it here. The artist can mark the balance paid on the night.

create table if not exists public.booking_contracts (
  request_id uuid primary key references public.booking_requests(id) on delete cascade,
  version integer not null default 1,
  kind text not null default 'club' check (kind in ('club', 'festival', 'private')),
  body jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'signed', 'void')),
  body_hash text,
  artist_signed_name text, artist_signed_at timestamptz, artist_signed_ip text,
  requester_signed_name text, requester_signed_at timestamptz, requester_signed_ip text,
  deposit_rzp_order text, deposit_payment_id text, deposit_paid_at timestamptz,
  balance_paid_at timestamptz, balance_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists booking_contracts_rzp on public.booking_contracts (deposit_rzp_order) where deposit_rzp_order is not null;
alter table public.booking_contracts enable row level security;

create table if not exists public.booking_contract_codes (
  request_id uuid not null references public.booking_requests(id) on delete cascade,
  role text not null check (role in ('artist', 'requester')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (request_id, role)
);
alter table public.booking_contract_codes enable row level security;
revoke all on table public.booking_contracts, public.booking_contract_codes from anon, authenticated;

create or replace function public._contract_json(c public.booking_contracts, v_role text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('version', c.version, 'kind', c.kind, 'body', c.body, 'status', c.status, 'body_hash', c.body_hash,
    'artist_signed', case when c.artist_signed_at is not null then jsonb_build_object('name', c.artist_signed_name, 'at', c.artist_signed_at) end,
    'requester_signed', case when c.requester_signed_at is not null then jsonb_build_object('name', c.requester_signed_name, 'at', c.requester_signed_at) end,
    'deposit_paid_at', c.deposit_paid_at, 'balance_paid_at', c.balance_paid_at, 'balance_method', c.balance_method, 'updated_at', c.updated_at, 'role', v_role);
$$;

-- Draft (or redraft) the contract. Either side, once the organiser has accepted; clears signatures.
create or replace function public.contract_draft(p_id uuid, p_key uuid, p_kind text default 'club', p_deposit_pct integer default 50, p_set_time text default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text := _booking_role(p_id, p_key); b booking_requests; s artist_booking_settings; a artists; c booking_contracts; v_body jsonb; v_dep integer; v_ccd integer;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This booking is not yours.'); end if;
  select * into b from booking_requests where id = p_id;
  if b.stage not in ('accepted', 'confirmed') then return jsonb_build_object('ok', false, 'error', 'The contract comes once the organiser accepts the terms.'); end if;
  if b.fee_inr is null or b.fee_inr <= 0 then return jsonb_build_object('ok', false, 'error', 'Agree a fee in the thread first.'); end if;
  if p_kind not in ('club', 'festival', 'private') then return jsonb_build_object('ok', false, 'error', 'Pick club, festival or private.'); end if;
  if p_deposit_pct is null or p_deposit_pct < 0 or p_deposit_pct > 100 then return jsonb_build_object('ok', false, 'error', 'The deposit is a share from 0 to 100.'); end if;
  select * into s from artist_booking_settings where artist_slug = b.artist_slug;
  select * into a from artists where slug = b.artist_slug;
  v_dep := round(b.fee_inr * p_deposit_pct / 100.0);
  v_ccd := round(b.fee_inr * 0.10);
  v_body := jsonb_build_object(
    'artist', jsonb_build_object('slug', a.slug, 'name', a.name),
    'organiser', jsonb_build_object('name', b.name, 'org', b.org),
    'date', b.event_date, 'city', b.city, 'venue', b.venue, 'room_size', b.room_size,
    'set_length', coalesce(b.set_terms, b.set_length), 'set_time', left(_clean(p_set_time, 60), 60),
    'fee_inr', b.fee_inr, 'deposit_pct', p_deposit_pct, 'deposit_inr', v_dep, 'balance_inr', b.fee_inr - v_dep,
    'ccd_fee_inr', v_ccd, 'artist_gets_inr', b.fee_inr - v_ccd,
    'rider', s.rider, 'tech', s.tech, 'travel_terms', s.travel_terms, 'included', s.included,
    'cancellation_terms', s.cancellation_terms, 'notes', left(_clean(p_notes, 1000), 1000));
  select * into c from booking_contracts where request_id = p_id;
  if found then
    update booking_contracts set version = version + 1, kind = p_kind, body = v_body, status = 'draft', body_hash = null,
      artist_signed_name = null, artist_signed_at = null, artist_signed_ip = null,
      requester_signed_name = null, requester_signed_at = null, requester_signed_ip = null, updated_at = now()
    where request_id = p_id returning * into c;
  else
    insert into booking_contracts (request_id, kind, body) values (p_id, p_kind, v_body) returning * into c;
  end if;
  delete from booking_contract_codes where request_id = p_id;
  insert into booking_messages (request_id, author_role, kind, body)
  values (p_id, 'system', 'note', format('Contract drafted (version %s) by the %s. Both sides sign it in the thread.', c.version, case when v_role = 'artist' then 'artist' else 'organiser' end));
  return jsonb_build_object('ok', true, 'contract', _contract_json(c, v_role));
end $$;

create or replace function public.contract_get(p_id uuid, p_key uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_role text := _booking_role(p_id, p_key); c booking_contracts;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This booking is not yours.'); end if;
  select * into c from booking_contracts where request_id = p_id;
  if not found then return jsonb_build_object('ok', true, 'contract', null, 'role', v_role); end if;
  return jsonb_build_object('ok', true, 'contract', _contract_json(c, v_role), 'role', v_role);
end $$;

-- Server only (ops token): make a one-time code for the caller's side and return it with the address to send it to.
create or replace function public.contract_code_issue(p_token text, p_id uuid, p_key uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text; b booking_requests; v_code text; v_email text; v_name text;
begin
  perform ops_check(p_token);
  v_role := _booking_role(p_id, p_key);
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This booking is not yours.'); end if;
  if not exists (select 1 from booking_contracts where request_id = p_id and status = 'draft') then return jsonb_build_object('ok', false, 'error', 'There is no contract waiting to be signed.'); end if;
  if exists (select 1 from booking_contract_codes where request_id = p_id and role = v_role and created_at > now() - interval '60 seconds') then
    return jsonb_build_object('ok', false, 'error', 'We just sent a code. Give it a minute.');
  end if;
  select * into b from booking_requests where id = p_id;
  if v_role = 'artist' then
    select m.email, a.name into v_email, v_name from artists a join members m on m.id = a.owner_member where a.slug = b.artist_slug;
  else
    v_email := b.email; v_name := b.name;
  end if;
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'No email on file for your side.'); end if;
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into booking_contract_codes (request_id, role, code_hash, expires_at)
  values (p_id, v_role, encode(extensions.digest(p_id::text || ':' || v_role || ':' || v_code, 'sha256'), 'hex'), now() + interval '15 minutes')
  on conflict (request_id, role) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, used_at = null, created_at = now();
  return jsonb_build_object('ok', true, 'code', v_code, 'email', v_email, 'name', v_name, 'role', v_role, 'artist', (select name from artists where slug = b.artist_slug), 'date', b.event_date);
end $$;

-- Server only (ops token): sign with the typed name and the code. Both signatures make it signed and confirm the booking.
create or replace function public.contract_sign(p_token text, p_id uuid, p_key uuid, p_name text, p_code text, p_ip text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text; c booking_contracts; k booking_contract_codes; b booking_requests; v_name text := left(_clean(p_name, 120), 120); v_terms jsonb;
begin
  perform ops_check(p_token);
  v_role := _booking_role(p_id, p_key);
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This booking is not yours.'); end if;
  if v_name is null or char_length(v_name) < 2 then return jsonb_build_object('ok', false, 'error', 'Type your full name to sign.'); end if;
  select * into c from booking_contracts where request_id = p_id for update;
  if not found or c.status <> 'draft' then return jsonb_build_object('ok', false, 'error', 'There is no contract waiting to be signed.'); end if;
  select * into k from booking_contract_codes where request_id = p_id and role = v_role for update;
  if not found or k.used_at is not null or k.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'The code has run out. Ask for a new one.'); end if;
  if k.attempts >= 5 then return jsonb_build_object('ok', false, 'error', 'Too many tries. Ask for a new code.'); end if;
  if k.code_hash <> encode(extensions.digest(p_id::text || ':' || v_role || ':' || btrim(coalesce(p_code, '')), 'sha256'), 'hex') then
    update booking_contract_codes set attempts = attempts + 1 where request_id = p_id and role = v_role;
    return jsonb_build_object('ok', false, 'error', 'That code is not right.');
  end if;
  update booking_contract_codes set used_at = now() where request_id = p_id and role = v_role;
  if v_role = 'artist' then
    update booking_contracts set artist_signed_name = v_name, artist_signed_at = now(), artist_signed_ip = left(p_ip, 64), updated_at = now() where request_id = p_id returning * into c;
  else
    update booking_contracts set requester_signed_name = v_name, requester_signed_at = now(), requester_signed_ip = left(p_ip, 64), updated_at = now() where request_id = p_id returning * into c;
  end if;
  insert into booking_messages (request_id, author_role, kind, body) values (p_id, 'system', 'note', format('%s signed the contract (version %s).', v_name, c.version));
  if c.artist_signed_at is not null and c.requester_signed_at is not null then
    update booking_contracts set status = 'signed', body_hash = encode(extensions.digest(c.body::text || ':v' || c.version, 'sha256'), 'hex'), updated_at = now() where request_id = p_id returning * into c;
    select * into b from booking_requests where id = p_id;
    if b.stage = 'accepted' then
      select jsonb_build_object('tech', s.tech, 'rider', s.rider, 'travel_terms', s.travel_terms, 'included', s.included, 'cancellation_terms', s.cancellation_terms)
        into v_terms from artist_booking_settings s where s.artist_slug = b.artist_slug;
      update booking_requests set stage = 'confirmed', confirmed_at = now(), terms = coalesce(v_terms, '{}'::jsonb), last_actor = v_role, updated_at = now() where id = p_id;
      insert into artist_availability (artist_slug, day, state, city) values (b.artist_slug, b.event_date, 'playing', b.city)
        on conflict (artist_slug, day) do update set state = 'playing', city = excluded.city, updated_at = now();
    end if;
    insert into booking_messages (request_id, author_role, kind, body) values (p_id, 'system', 'note', 'Both sides signed. The booking is confirmed.');
  end if;
  return jsonb_build_object('ok', true, 'contract', _contract_json(c, v_role));
end $$;

-- Server only: remember the Razorpay order made for the deposit (the organiser's side, signed contract).
create or replace function public.contract_deposit_order(p_token text, p_id uuid, p_key uuid, p_rzp_order text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text; c booking_contracts;
begin
  perform ops_check(p_token);
  v_role := _booking_role(p_id, p_key);
  if v_role is distinct from 'requester' then return jsonb_build_object('ok', false, 'error', 'Only the organiser pays the deposit.'); end if;
  select * into c from booking_contracts where request_id = p_id;
  if not found or c.status <> 'signed' then return jsonb_build_object('ok', false, 'error', 'Sign the contract first.'); end if;
  if c.deposit_paid_at is not null then return jsonb_build_object('ok', false, 'error', 'The deposit is already paid.'); end if;
  update booking_contracts set deposit_rzp_order = p_rzp_order, updated_at = now() where request_id = p_id;
  return jsonb_build_object('ok', true, 'amount_inr', (c.body ->> 'deposit_inr')::int, 'artist', c.body -> 'artist' ->> 'name', 'date', c.body ->> 'date');
end $$;

-- Server only, after the payment signature checks out.
create or replace function public.ops_contract_deposit_paid(p_token text, p_rzp_order text, p_payment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c booking_contracts;
begin
  perform ops_check(p_token);
  select * into c from booking_contracts where deposit_rzp_order = p_rzp_order for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'order not found'); end if;
  if c.deposit_paid_at is null then
    update booking_contracts set deposit_payment_id = p_payment, deposit_paid_at = now(), updated_at = now() where request_id = c.request_id;
    insert into booking_messages (request_id, author_role, kind, body) values (c.request_id, 'system', 'note', format('Deposit of Rs %s paid. We hold it until after the show.', c.body ->> 'deposit_inr'));
  end if;
  return jsonb_build_object('ok', true, 'request_id', c.request_id);
end $$;

-- The artist marks the balance paid (for example in cash on the night).
create or replace function public.contract_balance_paid(p_id uuid, p_key uuid, p_method text default 'cash')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text := _booking_role(p_id, p_key);
begin
  if v_role is distinct from 'artist' then return jsonb_build_object('ok', false, 'error', 'Only the artist marks the balance paid.'); end if;
  update booking_contracts set balance_paid_at = now(), balance_method = left(coalesce(_clean(p_method, 40), 'cash'), 40), updated_at = now()
  where request_id = p_id and status = 'signed' and balance_paid_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'Nothing to mark.'); end if;
  insert into booking_messages (request_id, author_role, kind, body) values (p_id, 'system', 'note', 'The artist marked the balance paid.');
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public._contract_json(public.booking_contracts, text) from public, anon, authenticated;
revoke all on function public.contract_code_issue(text, uuid, uuid) from public;
revoke all on function public.contract_sign(text, uuid, uuid, text, text, text) from public;
revoke all on function public.contract_deposit_order(text, uuid, uuid, text) from public;
revoke all on function public.ops_contract_deposit_paid(text, text, text) from public;
grant execute on function public.contract_draft(uuid, uuid, text, integer, text, text) to anon, authenticated;
grant execute on function public.contract_get(uuid, uuid) to anon, authenticated;
grant execute on function public.contract_balance_paid(uuid, uuid, text) to anon, authenticated;
grant execute on function public.contract_code_issue(text, uuid, uuid) to anon, authenticated;
grant execute on function public.contract_sign(text, uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.contract_deposit_order(text, uuid, uuid, text) to anon, authenticated;
grant execute on function public.ops_contract_deposit_paid(text, text, text) to anon, authenticated;
