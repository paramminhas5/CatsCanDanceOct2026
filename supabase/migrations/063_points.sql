-- 063: CCD points (Param, 9 Nov 2026: "like your credit card, every gig you go to or every gig ticket
-- you upload or use adds points which help you buy free tickets. Loyalty for all events.")
--
-- Design
-- * Points are earned only for things the door or the site can prove, and are DERIVED from those facts
--   (ticket / RSVP / Gate check-ins, crews, ratings, referrals). Nothing to backfill: everyone's past
--   check-ins count from day one, and an undone check-in removes its points automatically.
-- * Spending is the only thing written: points_redemptions (and ops adjustments). Spends lock per member.
-- * Status (Stray, Regular, Resident) comes from verified nights in the last 365 days.
-- * Values live in points_rules and points_perks so Param can change them without a migration.
-- Additive only. Does not depend on 062.

-- ── referral codes ──────────────────────────────────────────────────────────
alter table public.members add column if not exists ref_code text;
alter table public.members add column if not exists referred_by uuid references public.members(id) on delete set null;
alter table public.members add column if not exists referred_at timestamptz;
update public.members set ref_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) where ref_code is null;
alter table public.members alter column ref_code set default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
create unique index if not exists members_ref_code_key on public.members (ref_code);

-- ── rules and perks (editable) ──────────────────────────────────────────────
create table if not exists public.points_rules (
  key text primary key,
  points int not null,
  note text not null
);
insert into public.points_rules (key, points, note) values
  ('night', 100, 'Checked in at a night: CCD ticket or RSVP, or any ticket scanned at a Gate door'),
  ('referral_inviter', 150, 'A friend you invited comes to their first night'),
  ('referral_friend', 50, 'Bonus on your first night when a friend invited you'),
  ('crew_mate', 20, 'Captain: each crew mate checked in on the night'),
  ('rating', 10, 'Rated a night you were checked in at')
on conflict (key) do nothing;

create table if not exists public.points_tiers (
  key text primary key,
  title text not null,
  min_nights int not null,
  perks text not null,
  sort int not null
);
insert into public.points_tiers (key, title, min_nights, perks, sort) values
  ('stray', 'Stray', 0, 'Earn on every night.', 1),
  ('regular', 'Regular', 3, 'Early RSVP for Episodes and early access to drops.', 2),
  ('resident', 'Resident', 10, 'A guaranteed spot at every Episode, a standing +1 and the fast lane at the door.', 3)
on conflict (key) do nothing;

create table if not exists public.points_perks (
  id text primary key,
  title text not null,
  description text not null,
  cost int not null check (cost > 0),
  kind text not null check (kind in ('guaranteed_spot', 'plus_one', 'free_ticket')),
  event_slug text,            -- null: any eligible CCD night
  max_per_event int,          -- null: no cap
  min_tier text not null default 'stray' references public.points_tiers(key),
  active boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now()
);
insert into public.points_perks (id, title, description, cost, kind, max_per_event, sort) values
  ('spot', 'Guaranteed spot', 'Your name on the list for an Episode, even when it is full.', 300, 'guaranteed_spot', 20, 1),
  ('plus1', 'Bring a +1', 'Add one more to your RSVP.', 200, 'plus_one', 30, 2),
  ('ticket', 'Free ticket', 'One free ticket to a paid CCD night.', 800, 'free_ticket', 10, 3)
on conflict (id) do nothing;

create table if not exists public.points_redemptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  perk_id text not null references public.points_perks(id),
  event_slug text,
  cost int not null check (cost > 0),
  result jsonb not null default '{}'::jsonb,
  status text not null default 'done' check (status in ('done', 'void')),
  created_at timestamptz not null default now()
);
create index if not exists points_redemptions_member_idx on public.points_redemptions (member_id, created_at desc);
create index if not exists points_redemptions_perk_idx on public.points_redemptions (perk_id, event_slug) where status = 'done';

create table if not exists public.points_adjustments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  delta int not null check (delta <> 0),
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.points_rules enable row level security;
alter table public.points_tiers enable row level security;
alter table public.points_perks enable row level security;
alter table public.points_redemptions enable row level security;
alter table public.points_adjustments enable row level security;
revoke all on public.points_redemptions, public.points_adjustments from anon, authenticated;
-- rules, tiers and active perks are public reading (the "how it works" page)
revoke all on public.points_rules, public.points_tiers, public.points_perks from anon, authenticated;
grant select on public.points_rules, public.points_tiers to anon, authenticated;
grant select on public.points_perks to anon, authenticated;
drop policy if exists points_rules_read on public.points_rules;
create policy points_rules_read on public.points_rules for select using (true);
drop policy if exists points_tiers_read on public.points_tiers;
create policy points_tiers_read on public.points_tiers for select using (true);
drop policy if exists points_perks_read on public.points_perks;
create policy points_perks_read on public.points_perks for select using (active);

-- ── verified nights: the only source of earning ─────────────────────────────
create or replace function public._points_nights(p_member uuid)
returns table (event_slug text, at timestamptz, via text)
language sql stable security definer set search_path = public as $$
  with me as (select id, lower(email) as email from members where id = p_member and banned_at is null),
  x as (
    select t.event_slug, t.checked_in_at as at, 'ticket'::text as via
    from tickets t join ticket_orders o on o.id = t.order_id, me
    where t.checked_in_at is not null and lower(o.buyer_email) = me.email
    union all
    select r.event_slug, r.checked_in_at, 'rsvp' from event_rsvps r, me
    where r.checked_in_at is not null and lower(r.email) = me.email
    union all
    select g.event_slug, g.checked_in_at, 'gate' from door_guests g, me
    where g.checked_in_at is not null and (g.member_id = me.id or lower(g.email) = me.email)
  )
  select x.event_slug, min(x.at), (array_agg(x.via order by x.at))[1] from x group by x.event_slug;
$$;
revoke all on function public._points_nights(uuid) from public, anon, authenticated;

create or replace function public._points_rule(p_key text) returns int
language sql stable security definer set search_path = public as $$ select coalesce((select points from points_rules where key = p_key), 0) $$;
revoke all on function public._points_rule(text) from public, anon, authenticated;

-- Every line of a member's points, newest first. status: confirmed counts, pending shows what's coming.
create or replace function public._points_ledger(p_member uuid)
returns table (at timestamptz, kind text, label text, ref text, points int, status text)
language sql stable security definer set search_path = public as $$
  with nights as (select * from _points_nights(p_member)),
  titles as (
    select e.slug, coalesce(e.title, e.slug) as title from events e
  ),
  first_night as (select min(at) as at from nights),
  me as (select * from members where id = p_member and banned_at is null)
  -- nights
  select n.at, 'night', 'Night: ' || coalesce((select title from titles where slug = n.event_slug limit 1), n.event_slug), n.event_slug, _points_rule('night'), 'confirmed'
  from nights n
  -- outside tickets uploaded, waiting for the door
  union all
  select g.created_at, 'night', 'Ticket uploaded: ' || coalesce((select title from titles where slug = g.event_slug limit 1), g.event_slug), g.event_slug, _points_rule('night'), 'pending'
  from door_guests g, me
  where g.member_id = me.id and g.status = 'uploaded' and g.checked_in_at is null
    and not exists (select 1 from nights n where n.event_slug = g.event_slug)
  -- friends you invited who came
  union all
  select (select min(at) from _points_nights(f.id)), 'referral', 'Friend came: ' || coalesce(f.display_name, 'a friend'), f.id::text, _points_rule('referral_inviter'),
         case when exists (select 1 from _points_nights(f.id)) then 'confirmed' else 'pending' end
  from members f, me where f.referred_by = me.id and f.banned_at is null
  -- your own bonus for coming in on an invite
  union all
  select fn.at, 'referral', 'Welcome bonus: first night', null, _points_rule('referral_friend'), 'confirmed'
  from me, first_night fn where me.referred_by is not null and fn.at is not null
  -- captains: crew mates who showed up
  union all
  select n2.at, 'crew', 'Crew mate in: ' || coalesce(mm.display_name, 'a mate'), c.event_slug, _points_rule('crew_mate'), 'confirmed'
  from crews c
  join crew_pool cp on cp.crew_id = c.id and cp.member_id <> p_member
  join members mm on mm.id = cp.member_id and mm.banned_at is null
  cross join lateral (select n.at from _points_nights(cp.member_id) n where n.event_slug = c.event_slug) n2
  where c.captain_id = p_member and exists (select 1 from me)
  -- ratings of nights you were at
  union all
  select nr.created_at, 'rating', 'Rated a night', nr.night_key, _points_rule('rating'), 'confirmed'
  from night_ratings nr where nr.member_id = p_member and exists (select 1 from nights n where n.event_slug = nr.night_key)
  -- spends and adjustments
  union all
  select r.created_at, 'spend', p.title || coalesce(': ' || r.event_slug, ''), r.event_slug, -r.cost, 'confirmed'
  from points_redemptions r join points_perks p on p.id = r.perk_id where r.member_id = p_member and r.status = 'done'
  union all
  select a.created_at, 'adjustment', a.note, null, a.delta, 'confirmed' from points_adjustments a where a.member_id = p_member
  order by 1 desc nulls last;
$$;
revoke all on function public._points_ledger(uuid) from public, anon, authenticated;

create or replace function public._points_summary(p_member uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare bal int; pend int; earned int; n12 int; tier record; nxt record; m record;
begin
  select * into m from members where id = p_member;
  select coalesce(sum(points) filter (where status = 'confirmed'), 0),
         coalesce(sum(points) filter (where status = 'pending'), 0),
         coalesce(sum(points) filter (where status = 'confirmed' and points > 0), 0)
    into bal, pend, earned from _points_ledger(p_member);
  select count(*) into n12 from _points_nights(p_member) where at > now() - interval '365 days';
  select * into tier from points_tiers where min_nights <= n12 order by min_nights desc limit 1;
  select * into nxt from points_tiers where min_nights > n12 order by min_nights asc limit 1;
  return jsonb_build_object(
    'balance', bal, 'pending', pend, 'earned', earned, 'nights_12m', n12,
    'tier', tier.key, 'tier_title', tier.title, 'tier_perks', tier.perks,
    'next_tier', nxt.key, 'next_tier_title', nxt.title, 'nights_to_next', case when nxt.key is null then null else nxt.min_nights - n12 end,
    'ref_code', m.ref_code,
    'friends_joined', (select count(*) from members f where f.referred_by = p_member),
    'friends_came', (select count(*) from members f where f.referred_by = p_member and exists (select 1 from _points_nights(f.id)))
  );
end $$;
revoke all on function public._points_summary(uuid) from public, anon, authenticated;

-- ── member RPCs ─────────────────────────────────────────────────────────────
create or replace function public.my_points() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from members where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Join first.');
  end if;
  return jsonb_build_object('ok', true)
    || _points_summary(auth.uid())
    || jsonb_build_object('activity', coalesce((select jsonb_agg(to_jsonb(l)) from (select * from _points_ledger(auth.uid()) limit 40) l), '[]'::jsonb));
end $$;
grant execute on function public.my_points() to authenticated;

-- Perks for a night (or all), with whether the member can take each one.
create or replace function public.points_perks_for(p_slug text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s jsonb; tiers text[] := array['stray', 'regular', 'resident'];
begin
  s := case when auth.uid() is null then null else _points_summary(auth.uid()) end;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'title', p.title, 'description', p.description, 'cost', p.cost, 'kind', p.kind, 'min_tier', p.min_tier,
      'left', case when p.max_per_event is null or p_slug is null then null
                   else greatest(0, p.max_per_event - (select count(*) from points_redemptions r where r.perk_id = p.id and r.event_slug = p_slug and r.status = 'done')) end,
      'affordable', coalesce((s->>'balance')::int, 0) >= p.cost,
      'tier_ok', s is not null and array_position(tiers, s->>'tier') >= array_position(tiers, p.min_tier)
    ) order by p.sort)
    from points_perks p
    where p.active and (p.event_slug is null or p.event_slug = p_slug)
  ), '[]'::jsonb);
end $$;
grant execute on function public.points_perks_for(text) to anon, authenticated;

create or replace function public.redeem_perk(p_perk text, p_slug text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me members; p points_perks; ev events; s jsonb; used int; r event_rsvps; price int; code text; res jsonb;
  tiers text[] := array['stray', 'regular', 'resident'];
begin
  select * into me from members where id = auth.uid() and banned_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  perform pg_advisory_xact_lock(hashtext('points:' || me.id::text));
  select * into p from points_perks where id = p_perk and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'That perk is not available.'); end if;
  if p.event_slug is not null and p.event_slug <> p_slug then return jsonb_build_object('ok', false, 'error', 'That perk is for a different night.'); end if;
  select * into ev from events where slug = p_slug and published and coalesce(review_status, 'approved') = 'approved'
    and (event_date is null or event_date >= (now() at time zone 'Asia/Kolkata')::date);
  if not found then return jsonb_build_object('ok', false, 'error', 'This night is not open.'); end if;
  if ev.promoter_id is not null and p.event_slug is null then return jsonb_build_object('ok', false, 'error', 'Points work at this night only with the promoter''s own perks.'); end if;
  s := _points_summary(me.id);
  if array_position(tiers, s->>'tier') < array_position(tiers, p.min_tier) then return jsonb_build_object('ok', false, 'error', 'This perk unlocks at a higher status.'); end if;
  if p.kind = 'free_ticket' and not exists (select 1 from ticket_tiers where event_slug = p_slug and coalesce(active, true) and price_inr > 0) then
    return jsonb_build_object('ok', false, 'error', 'This night is free already. Use points for a guaranteed spot instead.');
  end if;
  if (s->>'balance')::int < p.cost then return jsonb_build_object('ok', false, 'error', 'Not enough points yet.'); end if;
  if p.max_per_event is not null then
    select count(*) into used from points_redemptions where perk_id = p.id and event_slug = p_slug and status = 'done';
    if used >= p.max_per_event then return jsonb_build_object('ok', false, 'error', 'All of these are taken for this night.'); end if;
  end if;
  select * into r from event_rsvps where event_slug = p_slug and lower(email) = lower(me.email) limit 1;

  if p.kind = 'guaranteed_spot' then
    if found then return jsonb_build_object('ok', false, 'error', 'You are already on the list.'); end if;
    insert into event_rsvps (event_slug, name, email, plus_ones)
    values (p_slug, coalesce(nullif(me.display_name, ''), split_part(me.email, '@', 1)), lower(me.email), 0);
    res := jsonb_build_object('on_list', true);
  elsif p.kind = 'plus_one' then
    if not found then return jsonb_build_object('ok', false, 'error', 'RSVP first, then add your +1.'); end if;
    if coalesce(r.plus_ones, 0) >= 3 then return jsonb_build_object('ok', false, 'error', 'You already have the most guests allowed.'); end if;
    update event_rsvps set plus_ones = coalesce(plus_ones, 0) + 1 where id = r.id;
    res := jsonb_build_object('plus_ones', coalesce(r.plus_ones, 0) + 1);
  elsif p.kind = 'free_ticket' then
    select max(price_inr) into price from ticket_tiers where event_slug = p_slug and coalesce(active, true) and price_inr > 0;
    if price is null then return jsonb_build_object('ok', false, 'error', 'This night is free already. Use points for a guaranteed spot instead.'); end if;
    code := 'PTS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    insert into promo_codes (code, event_slug, flat_inr, max_uses, expires_on, active)
    values (code, p_slug, price, 1, coalesce(ev.event_date, (now() + interval '60 days')::date), true);
    res := jsonb_build_object('code', code, 'worth_inr', price);
  end if;

  insert into points_redemptions (member_id, perk_id, event_slug, cost, result) values (me.id, p.id, p_slug, p.cost, res);
  return jsonb_build_object('ok', true, 'perk', p.id, 'cost', p.cost, 'result', res, 'balance', (s->>'balance')::int - p.cost);
end $$;
grant execute on function public.redeem_perk(text, text) to authenticated;

-- Upcoming CCD nights where points can be used.
create or replace function public.points_nights() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', e.slug, 'title', e.title, 'event_date', e.event_date, 'venue', e.venue,
    'full', e.capacity is not null and (select coalesce(sum(1 + coalesce(r.plus_ones, 0)), 0) from event_rsvps r where r.event_slug = e.slug) >= e.capacity,
    'paid', exists (select 1 from ticket_tiers t where t.event_slug = e.slug and coalesce(t.active, true) and t.price_inr > 0)
  ) order by e.event_date), '[]'::jsonb)
  from events e
  where e.published and e.promoter_id is null and coalesce(e.review_status, 'approved') = 'approved'
    and e.event_date >= (now() at time zone 'Asia/Kolkata')::date;
$$;
grant execute on function public.points_nights() to anon, authenticated;

-- Called after joining with a friend's link. Only for new members, never yourself, never twice.
create or replace function public.claim_referral(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me members; inviter members;
begin
  select * into me from members where id = auth.uid();
  if not found then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if me.referred_by is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  if me.created_at < now() - interval '14 days' then return jsonb_build_object('ok', false, 'error', 'Invites are for new members.'); end if;
  select * into inviter from members where ref_code = lower(trim(p_code)) and banned_at is null;
  if not found or inviter.id = me.id then return jsonb_build_object('ok', false, 'error', 'That invite does not work.'); end if;
  if inviter.referred_by = me.id then return jsonb_build_object('ok', false, 'error', 'That invite does not work.'); end if;
  update members set referred_by = inviter.id, referred_at = now() where id = me.id;
  return jsonb_build_object('ok', true, 'inviter', coalesce(inviter.display_name, 'a friend'));
end $$;
grant execute on function public.claim_referral(text) to authenticated;

-- ── ops ─────────────────────────────────────────────────────────────────────
create or replace function public.ops_points_overview(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return jsonb_build_object(
    'members_with_points', (select count(*) from members m where exists (select 1 from _points_nights(m.id))),
    'redemptions_30d', (select count(*) from points_redemptions where status = 'done' and created_at > now() - interval '30 days'),
    'points_spent_30d', (select coalesce(sum(cost), 0) from points_redemptions where status = 'done' and created_at > now() - interval '30 days'),
    'referred_members', (select count(*) from members where referred_by is not null),
    'top', coalesce((select jsonb_agg(t) from (
      select m.display_name, m.email, (x.s->>'balance')::int as balance, x.s->>'tier' as tier, (x.s->>'nights_12m')::int as nights
      from members m cross join lateral (select _points_summary(m.id) as s) x
      where m.banned_at is null and exists (select 1 from _points_nights(m.id))
      order by 3 desc limit 25) t), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(t) from (
      select r.id, r.created_at, m.email, r.perk_id, r.event_slug, r.cost, r.status from points_redemptions r join members m on m.id = r.member_id
      order by r.created_at desc limit 50) t), '[]'::jsonb)
  );
end $$;
grant execute on function public.ops_points_overview(text) to anon;

create or replace function public.ops_points_adjust(p_token text, p_email text, p_delta int, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  perform ops_check(p_token);
  select id into mid from members where lower(email) = lower(trim(p_email));
  if mid is null then return jsonb_build_object('ok', false, 'error', 'No member with that email.'); end if;
  if coalesce(p_delta, 0) = 0 or nullif(trim(p_note), '') is null then return jsonb_build_object('ok', false, 'error', 'Points and a note are required.'); end if;
  insert into points_adjustments (member_id, delta, note) values (mid, p_delta, left(trim(p_note), 200));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.ops_points_adjust(text, text, int, text) to anon;

create or replace function public.ops_points_void(p_token text, p_redemption uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  update points_redemptions set status = 'void' where id = p_redemption and status = 'done';
  return jsonb_build_object('ok', found);
end $$;
grant execute on function public.ops_points_void(text, uuid) to anon;

comment on table public.points_redemptions is 'Points spent. Earning is derived from verified check-ins in _points_ledger, so it is never written.';
