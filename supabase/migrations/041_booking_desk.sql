-- 041: artist booking desk. Additive only. Param applies this by hand.
--
-- What it adds
--  1. booking_requests: night brief fields, a stage (sent, seen, interested, countered, declined,
--     accepted, confirmed, cancelled), fee and set terms, timestamps, group_id for one brief sent
--     to up to 3 artists, and access_key so a visitor without an account can open their thread.
--  2. artist_booking_settings: what an artist sets for bookings (formats with "rate from", notice,
--     cities they travel to, travel terms, rider, tech, auto-decline below a budget, cancellation
--     terms, reply templates). Private to the artist; the public sees only the safe columns via
--     booking_settings_public(). The auto-decline amount is never public.
--  3. artist_availability: one row per artist per day: open, booked or playing.
--  4. booking_messages: the thread. Phone numbers and emails are hidden in messages until the
--     booking is confirmed, so the conversation stays on CCD.
--  5. booking_reviews: two-sided. A review shows only when both sides have written one, or 14
--     days after the night.
--  6. RPCs for visitors, members, artists and ops. Tables have RLS on and no direct grants; all
--     access goes through SECURITY DEFINER functions, like the other public forms.
--
-- Nothing here touches private_contacts, payments or email. Deposits stay out until a flag.

-- ── 1. booking_requests: brief, stage, terms ────────────────────────────────
alter table public.booking_requests
  add column if not exists group_id        uuid,
  add column if not exists access_key      uuid not null default gen_random_uuid(),
  add column if not exists venue           text,
  add column if not exists room_size       integer,
  add column if not exists set_length      text,
  add column if not exists budget_band     text,
  add column if not exists budget_max_inr  integer,
  add column if not exists other_acts      text,
  add column if not exists stage           text not null default 'sent',
  add column if not exists fee_inr         integer,
  add column if not exists set_terms       text,
  add column if not exists last_actor      text,
  add column if not exists seen_at         timestamptz,
  add column if not exists accepted_at     timestamptz,
  add column if not exists confirmed_at    timestamptz,
  add column if not exists declined_reason text,
  add column if not exists cancelled_at    timestamptz,
  add column if not exists terms           jsonb,
  add column if not exists notified_at     timestamptz,
  add column if not exists updated_at      timestamptz not null default now();

do $$ begin
  alter table public.booking_requests add constraint booking_requests_stage_chk
    check (stage in ('sent','seen','interested','countered','declined','accepted','confirmed','cancelled'));
exception when duplicate_object then null; end $$;

-- Old rows: carry the artist's answer over to the stage.
update public.booking_requests set stage = case artist_response when 'interested' then 'interested' when 'declined' then 'declined' else stage end
where artist_response is not null and stage = 'sent';
-- Old rows are already with ops; do not email anyone about them again.
update public.booking_requests set notified_at = coalesce(notified_at, created_at) where notified_at is null;

create unique index if not exists booking_requests_access_key_idx on public.booking_requests (access_key);
create index if not exists booking_requests_artist_idx on public.booking_requests (artist_slug, created_at desc);
create index if not exists booking_requests_group_idx  on public.booking_requests (group_id) where group_id is not null;
create index if not exists booking_requests_member_idx on public.booking_requests (member_id) where member_id is not null;
create index if not exists booking_requests_email_idx  on public.booking_requests (lower(email));
create index if not exists booking_requests_stage_idx  on public.booking_requests (stage, created_at);

-- ── 2. artist_booking_settings ──────────────────────────────────────────────
create table if not exists public.artist_booking_settings (
  artist_slug          text primary key references public.artists(slug) on update cascade on delete cascade,
  act_types            text[] not null default '{}',     -- dj, live, band, producer_live, vj
  formats              jsonb  not null default '[]'::jsonb, -- [{kind, label, minutes_min, minutes_max, band_size, rate_from_inr}]
  min_notice_days      integer,
  travel_cities        text[] not null default '{}',
  travels_anywhere     boolean not null default false,
  travel_terms         text,
  rider                text,
  tech                 text,
  included             text,
  cancellation_terms   text,
  auto_decline_below_inr integer,
  templates            jsonb  not null default '[]'::jsonb, -- [{name, body}]
  updated_at           timestamptz not null default now()
);
alter table public.artist_booking_settings enable row level security;
revoke all on public.artist_booking_settings from anon, authenticated;

-- ── 3. artist_availability ──────────────────────────────────────────────────
create table if not exists public.artist_availability (
  artist_slug text not null references public.artists(slug) on update cascade on delete cascade,
  day         date not null,
  state       text not null check (state in ('open','booked','playing')),
  city        text,
  note        text,
  updated_at  timestamptz not null default now(),
  primary key (artist_slug, day)
);
create index if not exists artist_availability_day_idx on public.artist_availability (day);
alter table public.artist_availability enable row level security;
revoke all on public.artist_availability from anon, authenticated;

-- ── 4. booking_messages ─────────────────────────────────────────────────────
create table if not exists public.booking_messages (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.booking_requests(id) on delete cascade,
  author_role text not null check (author_role in ('requester','artist','system','ops')),
  kind        text not null default 'message' check (kind in ('message','interested','counter','declined','accepted','confirmed','cancelled','seen','note')),
  body        text,
  fee_inr     integer,
  set_terms   text,
  created_at  timestamptz not null default now()
);
create index if not exists booking_messages_req_idx on public.booking_messages (request_id, created_at);
alter table public.booking_messages enable row level security;
revoke all on public.booking_messages from anon, authenticated;

-- ── 5. booking_reviews ──────────────────────────────────────────────────────
create table if not exists public.booking_reviews (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.booking_requests(id) on delete cascade,
  author_role text not null check (author_role in ('requester','artist')),
  rating      integer not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now(),
  unique (request_id, author_role)
);
alter table public.booking_reviews enable row level security;
revoke all on public.booking_reviews from anon, authenticated;

-- ── helpers ─────────────────────────────────────────────────────────────────
-- Hide phone numbers and emails in thread messages until the booking is confirmed.
create or replace function public._booking_mask(t text)
returns text language sql immutable set search_path to 'public' as $$
  select regexp_replace(
           regexp_replace(coalesce(t,''), '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email hidden until confirmed]', 'g'),
           '(\+?\d[\d\s-]{8,}\d)', '[number hidden until confirmed]', 'g')
$$;

-- Who is looking at this request: 'artist', 'requester' or null.
create or replace function public._booking_role(p_id uuid, p_key uuid)
returns text language sql stable security definer set search_path to 'public' as $$
  select case
    when exists (select 1 from booking_requests b join artists a on a.slug = b.artist_slug
                 where b.id = p_id and a.owner_member is not null and a.owner_member = auth.uid()) then 'artist'
    when exists (select 1 from booking_requests b where b.id = p_id and (
                   (p_key is not null and b.access_key = p_key)
                   or (auth.uid() is not null and b.member_id = auth.uid())
                   or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(b.email) = lower(auth.jwt() ->> 'email')))) then 'requester'
  end
$$;

create or replace function public._booking_reviews_open(p_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select (select count(*) from booking_reviews where request_id = p_id) >= 2
      or coalesce((select event_date + 14 <= current_date from booking_requests where id = p_id), false)
$$;

-- ── 6a. request: one brief to up to 3 artists ───────────────────────────────
create or replace function public.request_booking_v2(
  p_artist_slugs text[], p_name text, p_email text, p_org text, p_city text, p_date date,
  p_venue text default null, p_room_size integer default null, p_set_length text default null,
  p_budget_band text default null, p_budget_max_inr integer default null, p_other_acts text default null,
  p_message text default null, p_hp text default null, p_event_slug text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_group uuid := gen_random_uuid();
  v_slug text; v_id uuid; v_key uuid; v_out jsonb := '[]'::jsonb; v_floor integer; v_stage text;
begin
  if coalesce(p_hp, '') <> '' then return jsonb_build_object('ok', true, 'group_id', v_group, 'requests', '[]'::jsonb); end if; -- honeypot
  if not _email_ok(p_email) then return jsonb_build_object('ok', false, 'error', 'Enter a valid email.'); end if;
  if _clean(p_name, 80) is null then return jsonb_build_object('ok', false, 'error', 'Add your name.'); end if;
  if p_date is null or p_date < current_date then return jsonb_build_object('ok', false, 'error', 'Pick a date for the night, today or later.'); end if;
  if _clean(p_city, 60) is null then return jsonb_build_object('ok', false, 'error', 'Add the city.'); end if;
  if p_artist_slugs is null or cardinality(p_artist_slugs) < 1 then return jsonb_build_object('ok', false, 'error', 'Pick at least one artist.'); end if;
  if cardinality(p_artist_slugs) > 3 then return jsonb_build_object('ok', false, 'error', 'Send to 3 artists at most.'); end if;
  perform _throttle(p_email, 'booking', 9);

  foreach v_slug in array (select array_agg(distinct s) from unnest(p_artist_slugs) s) loop
    if not exists (select 1 from artists where slug = v_slug and status = 'approved') then continue; end if;
    select auto_decline_below_inr into v_floor from artist_booking_settings where artist_slug = v_slug;
    v_stage := case when v_floor is not null and p_budget_max_inr is not null and p_budget_max_inr < v_floor then 'declined' else 'sent' end;
    insert into booking_requests(artist_slug, name, email, org, city, event_date, budget_inr, message, member_id, event_slug,
      group_id, venue, room_size, set_length, budget_band, budget_max_inr, other_acts, stage, declined_reason, last_actor,
      artist_response, responded_at)
    values (v_slug, _clean(p_name, 80), lower(p_email), _clean(p_org, 120), _clean(p_city, 60), p_date, _clean(p_budget_band, 40),
      _clean(p_message, 1500), auth.uid(),
      case when p_event_slug is not null and exists (select 1 from events where slug = p_event_slug) then p_event_slug end,
      v_group, _clean(p_venue, 120), case when p_room_size between 1 and 100000 then p_room_size end, _clean(p_set_length, 40),
      _clean(p_budget_band, 40), case when p_budget_max_inr between 0 and 100000000 then p_budget_max_inr end, _clean(p_other_acts, 300),
      v_stage, case when v_stage = 'declined' then 'Budget is below what this artist takes.' end, 'requester',
      case when v_stage = 'declined' then 'declined' end, case when v_stage = 'declined' then now() end)
    returning id, access_key into v_id, v_key;
    if v_stage = 'declined' then
      insert into booking_messages(request_id, author_role, kind, body) values (v_id, 'system', 'declined', 'Declined automatically: the budget is below what this artist takes.');
    end if;
    v_out := v_out || jsonb_build_object('id', v_id, 'key', v_key, 'artist_slug', v_slug, 'stage', v_stage);
  end loop;
  if jsonb_array_length(v_out) = 0 then return jsonb_build_object('ok', false, 'error', 'Those artists are not listed.'); end if;
  return jsonb_build_object('ok', true, 'group_id', v_group, 'requests', v_out);
end $$;

-- ── 6b. thread ──────────────────────────────────────────────────────────────
create or replace function public.booking_thread(p_id uuid, p_key uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_role text := _booking_role(p_id, p_key); b booking_requests; v_conf boolean; v_rev_open boolean;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This request is not yours, or the link is wrong.'); end if;
  if v_role = 'artist' then
    update booking_requests set seen_at = coalesce(seen_at, now()), stage = case when stage = 'sent' then 'seen' else stage end, updated_at = now()
    where id = p_id and seen_at is null;
  end if;
  select * into b from booking_requests where id = p_id;
  v_conf := b.stage = 'confirmed';
  v_rev_open := _booking_reviews_open(p_id);
  return jsonb_build_object('ok', true, 'role', v_role,
    'request', jsonb_build_object('id', b.id, 'group_id', b.group_id, 'stage', b.stage, 'created_at', b.created_at, 'updated_at', b.updated_at,
      'seen_at', b.seen_at, 'accepted_at', b.accepted_at, 'confirmed_at', b.confirmed_at, 'cancelled_at', b.cancelled_at,
      'name', b.name, 'org', b.org, 'email', case when v_conf or v_role = 'requester' then b.email end,
      'city', b.city, 'event_date', b.event_date, 'venue', b.venue, 'room_size', b.room_size, 'set_length', b.set_length,
      'budget_band', b.budget_band, 'budget_max_inr', b.budget_max_inr, 'other_acts', b.other_acts, 'message', case when v_conf or v_role = 'requester' then b.message else _booking_mask(b.message) end,
      'fee_inr', b.fee_inr, 'set_terms', b.set_terms, 'last_actor', b.last_actor, 'declined_reason', b.declined_reason, 'terms', b.terms),
    'artist', (select jsonb_build_object('slug', a.slug, 'name', a.name, 'photo_url', a.photo_url, 'based_city', coalesce(a.based_city, a.from_city),
      'genres', a.genres, 'verified', a.owner_member is not null, 'played_ccd', coalesce(a.played_ccd, false)) from artists a where a.slug = b.artist_slug),
    'settings', (select jsonb_build_object('formats', s.formats, 'min_notice_days', s.min_notice_days, 'travel_cities', s.travel_cities,
      'travels_anywhere', s.travels_anywhere, 'travel_terms', s.travel_terms, 'rider', s.rider, 'tech', s.tech, 'included', s.included,
      'cancellation_terms', s.cancellation_terms, 'templates', case when v_role = 'artist' then s.templates end)
      from artist_booking_settings s where s.artist_slug = b.artist_slug),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'author_role', m.author_role, 'kind', m.kind,
      'body', case when v_conf then m.body else _booking_mask(m.body) end, 'fee_inr', m.fee_inr, 'set_terms', m.set_terms, 'created_at', m.created_at) order by m.created_at)
      from booking_messages m where m.request_id = p_id), '[]'::jsonb),
    'reviews', jsonb_build_object('open', v_rev_open,
      'mine', (select jsonb_build_object('rating', r.rating, 'body', r.body) from booking_reviews r where r.request_id = p_id and r.author_role = v_role),
      'theirs', case when v_rev_open then (select jsonb_build_object('rating', r.rating, 'body', r.body) from booking_reviews r where r.request_id = p_id and r.author_role <> v_role) end,
      'theirs_written', exists (select 1 from booking_reviews r where r.request_id = p_id and r.author_role <> v_role)));
end $$;

create or replace function public.booking_post(p_id uuid, p_key uuid, p_body text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_role text := _booking_role(p_id, p_key); v_email text;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This request is not yours.'); end if;
  if _clean(p_body, 2000) is null then return jsonb_build_object('ok', false, 'error', 'Write a message first.'); end if;
  select email into v_email from booking_requests where id = p_id;
  perform _throttle(coalesce(auth.jwt() ->> 'email', v_email), 'booking_msg', 40);
  insert into booking_messages(request_id, author_role, kind, body) values (p_id, v_role, 'message', _clean(p_body, 2000));
  update booking_requests set updated_at = now(), last_actor = v_role where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Actions. Artist: interested, counter, decline, confirm. Requester: accept, decline (withdraw), cancel.
create or replace function public.booking_act(p_id uuid, p_key uuid, p_action text, p_fee_inr integer default null, p_set_terms text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_role text := _booking_role(p_id, p_key); b booking_requests; v_kind text; v_terms jsonb;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This request is not yours.'); end if;
  select * into b from booking_requests where id = p_id for update;
  if b.stage in ('declined','cancelled') then return jsonb_build_object('ok', false, 'error', 'This request is closed.'); end if;
  if p_fee_inr is not null and (p_fee_inr < 0 or p_fee_inr > 100000000) then return jsonb_build_object('ok', false, 'error', 'Check the fee.'); end if;

  if v_role = 'artist' and p_action in ('interested','counter') then
    if b.stage = 'confirmed' then return jsonb_build_object('ok', false, 'error', 'Already confirmed.'); end if;
    if p_action = 'counter' and p_fee_inr is null and _clean(p_set_terms, 200) is null then return jsonb_build_object('ok', false, 'error', 'Add a fee or set to counter with.'); end if;
    update booking_requests set stage = case when p_action = 'counter' then 'countered' else 'interested' end,
      fee_inr = coalesce(p_fee_inr, fee_inr), set_terms = coalesce(_clean(p_set_terms, 200), set_terms),
      artist_response = 'interested', artist_note = left(_clean(p_note, 600), 600), responded_at = coalesce(responded_at, now()),
      seen_at = coalesce(seen_at, now()), accepted_at = null, last_actor = 'artist', updated_at = now(), status = case when status = 'new' then 'sent' else status end
    where id = p_id;
    v_kind := case when p_action = 'counter' then 'counter' else 'interested' end;
  elsif v_role = 'artist' and p_action = 'decline' then
    update booking_requests set stage = 'declined', declined_reason = _clean(p_note, 300), artist_response = 'declined', artist_note = left(_clean(p_note, 600), 600),
      responded_at = coalesce(responded_at, now()), last_actor = 'artist', updated_at = now(), status = 'closed' where id = p_id;
    v_kind := 'declined';
  elsif v_role = 'artist' and p_action = 'confirm' then
    if b.stage <> 'accepted' then return jsonb_build_object('ok', false, 'error', 'The organiser has to accept your terms first.'); end if;
    select jsonb_build_object('tech', s.tech, 'rider', s.rider, 'travel_terms', s.travel_terms, 'included', s.included, 'cancellation_terms', s.cancellation_terms)
      into v_terms from artist_booking_settings s where s.artist_slug = b.artist_slug;
    update booking_requests set stage = 'confirmed', confirmed_at = now(), terms = coalesce(v_terms, '{}'::jsonb), last_actor = 'artist', updated_at = now() where id = p_id;
    insert into artist_availability(artist_slug, day, state, city) values (b.artist_slug, b.event_date, 'playing', b.city)
      on conflict (artist_slug, day) do update set state = 'playing', city = excluded.city, updated_at = now();
    v_kind := 'confirmed';
  elsif v_role = 'requester' and p_action = 'accept' then
    if b.stage not in ('interested','countered') then return jsonb_build_object('ok', false, 'error', 'Wait for the artist to reply first.'); end if;
    if b.fee_inr is null then return jsonb_build_object('ok', false, 'error', 'Agree a fee in the thread first. The artist adds it with Counter.'); end if;
    update booking_requests set stage = 'accepted', accepted_at = now(), last_actor = 'requester', updated_at = now() where id = p_id;
    v_kind := 'accepted';
  elsif v_role = 'requester' and p_action in ('decline','cancel') then
    update booking_requests set stage = 'cancelled', cancelled_at = now(), declined_reason = _clean(p_note, 300), last_actor = 'requester', updated_at = now(), status = 'closed' where id = p_id;
    if b.stage = 'confirmed' then delete from artist_availability where artist_slug = b.artist_slug and day = b.event_date and state = 'playing'; end if;
    v_kind := 'cancelled';
  else
    return jsonb_build_object('ok', false, 'error', 'That action is not available here.');
  end if;

  insert into booking_messages(request_id, author_role, kind, body, fee_inr, set_terms)
  values (p_id, v_role, v_kind, _clean(p_note, 1000), case when v_kind in ('counter','interested') then p_fee_inr end, case when v_kind in ('counter','interested') then _clean(p_set_terms, 200) end);
  return jsonb_build_object('ok', true, 'stage', (select stage from booking_requests where id = p_id));
end $$;

create or replace function public.booking_review(p_id uuid, p_key uuid, p_rating integer, p_body text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_role text := _booking_role(p_id, p_key); b booking_requests;
begin
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'This request is not yours.'); end if;
  select * into b from booking_requests where id = p_id;
  if b.stage <> 'confirmed' or b.event_date > current_date then return jsonb_build_object('ok', false, 'error', 'Reviews open after the night.'); end if;
  if p_rating not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'Pick 1 to 5.'); end if;
  insert into booking_reviews(request_id, author_role, rating, body) values (p_id, v_role, p_rating, _clean(p_body, 1500))
  on conflict (request_id, author_role) do nothing;
  return jsonb_build_object('ok', found);
end $$;

-- ── 6c. lists ───────────────────────────────────────────────────────────────
create or replace function public._booking_row(b booking_requests, v_role text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id', b.id, 'group_id', b.group_id, 'role', v_role, 'stage', b.stage, 'artist_slug', b.artist_slug,
    'artist', (select name from artists where slug = b.artist_slug), 'photo_url', (select photo_url from artists where slug = b.artist_slug),
    'name', b.name, 'org', b.org, 'city', b.city, 'event_date', b.event_date, 'venue', b.venue, 'room_size', b.room_size,
    'set_length', b.set_length, 'budget_band', b.budget_band, 'budget_max_inr', b.budget_max_inr, 'fee_inr', b.fee_inr,
    'last_actor', b.last_actor, 'created_at', b.created_at, 'updated_at', b.updated_at,
    'last_message', (select _booking_mask(m.body) from booking_messages m where m.request_id = b.id and m.body is not null order by m.created_at desc limit 1))
$$;

create or replace function public.my_booking_threads()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(r order by (r->>'updated_at') desc), '[]'::jsonb) from (
    select _booking_row(b, 'artist') r from booking_requests b join artists a on a.slug = b.artist_slug where auth.uid() is not null and a.owner_member = auth.uid()
    union all
    select _booking_row(b, 'requester') from booking_requests b
    where (auth.uid() is not null and b.member_id = auth.uid()) or (coalesce(auth.jwt() ->> 'email', '') <> '' and lower(b.email) = lower(auth.jwt() ->> 'email'))
  ) x
$$;

create or replace function public.booking_threads_by_keys(p_keys uuid[])
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(_booking_row(b, 'requester') || jsonb_build_object('key', b.access_key) order by b.updated_at desc), '[]'::jsonb)
  from booking_requests b where b.access_key = any ((coalesce(p_keys, '{}'::uuid[]))[1:30])
$$;

-- ── 6d. artist settings and calendar ────────────────────────────────────────
create or replace function public.booking_settings_public()
returns table(artist_slug text, act_types text[], formats jsonb, min_notice_days integer, travel_cities text[], travels_anywhere boolean,
              travel_terms text, rider text, tech text, included text, cancellation_terms text)
language sql stable security definer set search_path to 'public' as $$
  select s.artist_slug, s.act_types, s.formats, s.min_notice_days, s.travel_cities, s.travels_anywhere, s.travel_terms, s.rider, s.tech, s.included, s.cancellation_terms
  from artist_booking_settings s join artists a on a.slug = s.artist_slug where a.status = 'approved'
$$;

create or replace function public.my_booking_settings()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce((select to_jsonb(s) from artist_booking_settings s join artists a on a.slug = s.artist_slug where a.owner_member = auth.uid() limit 1), 'null'::jsonb)
$$;

create or replace function public.save_my_booking_settings(p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_slug text;
begin
  select slug into v_slug from artists where owner_member = auth.uid() and auth.uid() is not null limit 1;
  if v_slug is null then return jsonb_build_object('ok', false, 'error', 'Claim your artist page first.'); end if;
  if jsonb_typeof(coalesce(p->'formats', '[]')) <> 'array' or jsonb_array_length(coalesce(p->'formats', '[]')) > 8 then return jsonb_build_object('ok', false, 'error', 'Up to 8 formats.'); end if;
  if jsonb_typeof(coalesce(p->'templates', '[]')) <> 'array' or jsonb_array_length(coalesce(p->'templates', '[]')) > 8 then return jsonb_build_object('ok', false, 'error', 'Up to 8 templates.'); end if;
  insert into artist_booking_settings as s (artist_slug, act_types, formats, min_notice_days, travel_cities, travels_anywhere, travel_terms, rider, tech, included,
    cancellation_terms, auto_decline_below_inr, templates, updated_at)
  values (v_slug,
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'act_types','[]')) x where x in ('dj','live','band','producer_live','vj')), '{}'),
    coalesce(p->'formats', '[]'), nullif(p->>'min_notice_days','')::int,
    coalesce((select array_agg(left(btrim(x), 40)) from jsonb_array_elements_text(coalesce(p->'travel_cities','[]')) x where btrim(x) <> ''), '{}'),
    coalesce((p->>'travels_anywhere')::boolean, false),
    _clean(p->>'travel_terms', 600), _clean(p->>'rider', 1000), _clean(p->>'tech', 1000), _clean(p->>'included', 600), _clean(p->>'cancellation_terms', 1000),
    nullif(p->>'auto_decline_below_inr','')::int, coalesce(p->'templates', '[]'), now())
  on conflict (artist_slug) do update set act_types = excluded.act_types, formats = excluded.formats, min_notice_days = excluded.min_notice_days,
    travel_cities = excluded.travel_cities, travels_anywhere = excluded.travels_anywhere, travel_terms = excluded.travel_terms, rider = excluded.rider,
    tech = excluded.tech, included = excluded.included, cancellation_terms = excluded.cancellation_terms,
    auto_decline_below_inr = excluded.auto_decline_below_inr, templates = excluded.templates, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.artist_availability_public(p_from date, p_to date)
returns table(artist_slug text, day date, state text, city text)
language sql stable security definer set search_path to 'public' as $$
  select v.artist_slug, v.day, v.state, v.city from artist_availability v join artists a on a.slug = v.artist_slug
  where a.status = 'approved' and v.day between greatest(p_from, current_date) and least(p_to, current_date + 400)
$$;

create or replace function public.my_calendar(p_from date, p_to date)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', v.day, 'state', v.state, 'city', v.city, 'note', v.note) order by v.day), '[]'::jsonb)
  from artist_availability v join artists a on a.slug = v.artist_slug
  where a.owner_member = auth.uid() and auth.uid() is not null and v.day between p_from and p_to
$$;

create or replace function public.set_my_day(p_day date, p_state text, p_city text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_slug text;
begin
  select slug into v_slug from artists where owner_member = auth.uid() and auth.uid() is not null limit 1;
  if v_slug is null then return jsonb_build_object('ok', false, 'error', 'Claim your artist page first.'); end if;
  if p_day is null or p_day < current_date - 1 or p_day > current_date + 400 then return jsonb_build_object('ok', false, 'error', 'Pick a day in the next year.'); end if;
  if p_state is null or p_state = '' then
    delete from artist_availability where artist_slug = v_slug and day = p_day;
  elsif p_state in ('open','booked','playing') then
    insert into artist_availability(artist_slug, day, state, city, note) values (v_slug, p_day, p_state, _clean(p_city, 60), _clean(p_note, 200))
    on conflict (artist_slug, day) do update set state = excluded.state, city = excluded.city, note = excluded.note, updated_at = now();
  else
    return jsonb_build_object('ok', false, 'error', 'Use open, booked or playing.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Response time and confirmed count per artist, for listings. Only artists with 2+ answers get a response time.
create or replace function public.artist_booking_stats()
returns table(artist_slug text, answered integer, median_reply_hours numeric, confirmed integer)
language sql stable security definer set search_path to 'public' as $$
  select b.artist_slug, count(b.responded_at)::int,
    case when count(b.responded_at) >= 2 then round((percentile_cont(0.5) within group (order by extract(epoch from (b.responded_at - b.created_at)) / 3600))::numeric, 1) end,
    count(*) filter (where b.stage = 'confirmed')::int
  from booking_requests b join artists a on a.slug = b.artist_slug where a.status = 'approved'
  group by b.artist_slug
$$;

create or replace function public.artist_reviews_public(p_slug text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object('rating', r.rating, 'body', r.body, 'event_date', b.event_date, 'city', b.city) order by r.created_at desc), '[]'::jsonb)
  from booking_reviews r join booking_requests b on b.id = r.request_id
  where b.artist_slug = p_slug and r.author_role = 'requester' and _booking_reviews_open(b.id)
$$;

-- ── 6e. ops ─────────────────────────────────────────────────────────────────
create or replace function public.ops_booking_pipeline(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  return jsonb_build_object(
    'counts', (select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb) from (select stage, count(*) n from booking_requests group by stage) x),
    'rows', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select b.id, b.group_id, b.stage, b.artist_slug, a.name artist, a.owner_member is not null claimed, b.name, b.email, b.org, b.city, b.event_date,
             b.venue, b.room_size, b.set_length, b.budget_band, b.fee_inr, b.created_at, b.updated_at, b.seen_at, b.last_actor,
             (select count(*) from booking_messages m where m.request_id = b.id) messages
      from booking_requests b left join artists a on a.slug = b.artist_slug
      where b.created_at > now() - interval '180 days' limit 400) x), '[]'::jsonb),
    'nudges', coalesce((select jsonb_agg(x order by x.waiting_since) from (
      select b.id, b.stage, a.name artist, b.artist_slug, a.owner_member is not null claimed, b.name, b.email, b.city, b.event_date, b.updated_at waiting_since,
             case when b.stage in ('sent','seen') then 'artist' else 'organiser' end waiting_on
      from booking_requests b left join artists a on a.slug = b.artist_slug
      where b.updated_at < now() - interval '48 hours' and (b.event_date is null or b.event_date >= current_date)
        and (b.stage in ('sent','seen') or (b.stage in ('interested','countered') and b.last_actor = 'artist') or b.stage = 'accepted')) x), '[]'::jsonb));
end $$;

create or replace function public.ops_booking_set_stage(p_token text, p_id uuid, p_stage text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  if p_stage not in ('sent','seen','interested','countered','declined','accepted','confirmed','cancelled') then return jsonb_build_object('ok', false); end if;
  update booking_requests set stage = p_stage, updated_at = now(), last_actor = 'ops',
    confirmed_at = case when p_stage = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
    cancelled_at = case when p_stage = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end
  where id = p_id;
  insert into booking_messages(request_id, author_role, kind, body) values (p_id, 'ops', 'note', coalesce(_clean(p_note, 600), 'CCD set this to ' || p_stage || '.'));
  return jsonb_build_object('ok', true);
end $$;

-- New requests the server has not told the team about yet. Marks them as told.
create or replace function public.ops_booking_unnotified(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v jsonb;
begin
  perform ops_check(p_token);
  with x as (
    update booking_requests b set notified_at = now() where b.notified_at is null and b.created_at > now() - interval '2 days'
    returning b.id, b.artist_slug, b.name, b.email, b.city, b.event_date, b.budget_band, b.stage)
  select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('artist', (select name from artists where slug = x.artist_slug))), '[]'::jsonb) into v from x;
  return v;
end $$;

-- ── grants ──────────────────────────────────────────────────────────────────
revoke all on function public._booking_mask(text), public._booking_role(uuid, uuid), public._booking_reviews_open(uuid),
  public._booking_row(public.booking_requests, text) from public, anon, authenticated;
grant execute on function
  public.request_booking_v2(text[], text, text, text, text, date, text, integer, text, text, integer, text, text, text, text),
  public.booking_thread(uuid, uuid), public.booking_post(uuid, uuid, text), public.booking_act(uuid, uuid, text, integer, text, text),
  public.booking_review(uuid, uuid, integer, text), public.my_booking_threads(), public.booking_threads_by_keys(uuid[]),
  public.booking_settings_public(), public.my_booking_settings(), public.save_my_booking_settings(jsonb),
  public.artist_availability_public(date, date), public.my_calendar(date, date), public.set_my_day(date, text, text, text),
  public.artist_booking_stats(), public.artist_reviews_public(text),
  public.ops_booking_pipeline(text), public.ops_booking_set_stage(text, uuid, text, text), public.ops_booking_unnotified(text)
to anon, authenticated;
