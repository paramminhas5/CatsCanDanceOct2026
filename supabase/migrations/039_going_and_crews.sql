-- 039: Going on any night, who's going, crews for any night, ticket proofs, venue entry, set times, ratings, curation keywords.
-- Additive. Night keys: CCD nights use their events.slug; scene nights use 'scene:' || scraped_events.id.
-- crew_pool, crews, go_again and crew_reports key on event_slug text with no foreign key, so scene keys fit as they are.

-- ── 1. Curation: Bollywood and desi commercial nights sink to the bottom of the queue ──
insert into public.scoring_keywords(keyword, weight, genre) values
  ('bollywood', -12, null), ('bollytech', -12, null), ('bolly', -10, null), ('desi night', -10, null),
  ('desi sunday', -10, null), ('kollywood', -10, null), ('tollywood', -10, null), ('punjabi night', -10, null),
  ('sufi', -8, null), ('qawwali', -8, null), ('garba', -8, null), ('dandiya', -8, null)
on conflict do nothing;

-- ── 2. One way to read any night ──
create or replace function public.night_info(p_key text)
returns table(night_key text, kind text, title text, city text, venue text, event_date date, open boolean)
language sql stable security definer set search_path to 'public' as $$
  select p_key, 'scene', e.title, public.city_norm(e.city), e.venue, e.event_date,
         e.status = 'published' and (e.event_date is null or e.event_date >= current_date)
  from public.scraped_events e where p_key like 'scene:%' and e.id::text = substr(p_key, 7)
  union all
  select p_key, 'ccd', e.title, public.city_norm(e.city), e.venue, e.event_date,
         e.published and (e.event_date is null or e.event_date >= current_date)
  from public.events e where p_key not like 'scene:%' and e.slug = p_key;
$$;
grant execute on function public.night_info(text) to anon, authenticated;

-- ── 3. Going / Interested on any night, with an opt-in guest list ──
create table if not exists public.night_plans (
  member_id uuid not null references public.members(id) on delete cascade,
  night_key text not null,
  state text not null check (state in ('going','interested')),
  show_name boolean not null default false,
  has_ticket boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, night_key)
);
alter table public.night_plans enable row level security;
create index if not exists night_plans_key_idx on public.night_plans(night_key);

create or replace function public.set_plan(p_key text, p_state text, p_show_name boolean default false, p_has_ticket boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_open boolean; v_kind text;
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.', 'need', 'join'); end if;
  select open, kind into v_open, v_kind from public.night_info(p_key);
  if v_open is distinct from true then return jsonb_build_object('ok', false, 'error', 'This night is not open.'); end if;
  if p_state is null or p_state = '' then
    delete from public.night_plans where member_id = auth.uid() and night_key = p_key;
    delete from public.crew_pool where member_id = auth.uid() and event_slug = p_key and crew_id is null;
  elsif p_state in ('going','interested') then
    insert into public.night_plans(member_id, night_key, state, show_name, has_ticket)
    values (auth.uid(), p_key, p_state, coalesce(p_show_name,false), coalesce(p_has_ticket,false))
    on conflict (member_id, night_key) do update set state = excluded.state, show_name = excluded.show_name,
      has_ticket = excluded.has_ticket, updated_at = now();
  else return jsonb_build_object('ok', false, 'error', 'Unknown state.'); end if;
  -- keep the older per-kind tables in step, so existing counts and feeds still work
  if v_kind = 'scene' then
    if p_state = 'going' then
      insert into public.event_going(member_id, event_id, show_name) values (auth.uid(), substr(p_key, 7)::uuid, coalesce(p_show_name,false))
      on conflict (member_id, event_id) do update set show_name = excluded.show_name;
    else delete from public.event_going where member_id = auth.uid() and event_id = substr(p_key, 7)::uuid; end if;
  else
    if p_state = 'going' then
      insert into public.night_going(member_id, event_slug, show_name) values (auth.uid(), p_key, coalesce(p_show_name,false))
      on conflict (member_id, event_slug) do update set show_name = excluded.show_name;
    else delete from public.night_going where member_id = auth.uid() and event_slug = p_key; end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.set_plan(text, text, boolean, boolean) to authenticated;

-- Counts and opt-in first names for a set of nights (public). Ticket holders who switched on the guest list count too.
create or replace function public.night_crowd(p_keys text[])
returns table(night_key text, going bigint, interested bigint, names text[])
language sql stable security definer set search_path to 'public' as $$
  select k,
    (select count(*) from public.night_plans p where p.night_key = k and p.state = 'going')
      + (select count(*) from public.event_going g where k like 'scene:%' and g.event_id::text = substr(k, 7)
           and not exists (select 1 from public.night_plans p2 where p2.member_id = g.member_id and p2.night_key = k))
      + (select count(*) from public.night_going g where k not like 'scene:%' and g.event_slug = k
           and not exists (select 1 from public.night_plans p2 where p2.member_id = g.member_id and p2.night_key = k)),
    (select count(*) from public.night_plans p where p.night_key = k and p.state = 'interested'),
    coalesce((select array_agg(n order by n) from (
      select distinct split_part(coalesce(m.display_name, ''), ' ', 1) n
      from public.night_plans p join public.members m on m.id = p.member_id
      where p.night_key = k and p.state = 'going' and p.show_name and m.banned_at is null and coalesce(m.display_name, '') <> ''
      limit 24) x), '{}')
  from unnest(p_keys) k;
$$;
grant execute on function public.night_crowd(text[]) to anon, authenticated;

create or replace function public.my_plans()
returns table(night_key text, state text, show_name boolean, has_ticket boolean, title text, city text, venue text, event_date date, kind text)
language sql stable security definer set search_path to 'public' as $$
  select p.night_key, p.state, p.show_name, p.has_ticket, i.title, i.city, i.venue, i.event_date, i.kind
  from public.night_plans p cross join lateral public.night_info(p.night_key) i
  where p.member_id = auth.uid()
  order by i.event_date nulls last;
$$;
grant execute on function public.my_plans() to authenticated;

-- Nights your people are going to: members you and they both tapped "go again" for. Counts only, no names.
create or replace function public.my_people_going()
returns table(night_key text, people bigint)
language sql stable security definer set search_path to 'public' as $$
  select p.night_key, count(distinct p.member_id)
  from public.night_plans p
  where p.state = 'going' and p.member_id in (
    select g.to_member from public.go_again g join public.go_again g2 on g2.from_member = g.to_member and g2.to_member = g.from_member
    where g.from_member = auth.uid())
  group by p.night_key;
$$;
grant execute on function public.my_people_going() to authenticated;

-- ── 4. Crews for any night ──
-- Joining: CCD nights need a ticket or RSVP (unchanged rule); scene nights need "going". Proof of ticket comes after matching.
create or replace function public.join_crew_pool_any(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_email text; v_phone text; v_ban timestamptz; v_kind text; v_open boolean;
begin
  if p_key not like 'scene:%' then return public.join_crew_pool(p_key); end if;
  select email, phone, banned_at into v_email, v_phone, v_ban from public.members where id = auth.uid();
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'Join first.', 'need', 'join'); end if;
  if v_ban is not null then return jsonb_build_object('ok', false, 'error', 'Crews are not available for this account.'); end if;
  if length(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g')) < 10 then
    return jsonb_build_object('ok', false, 'error', 'Add your phone number first.', 'need', 'phone'); end if;
  select kind, open into v_kind, v_open from public.night_info(p_key);
  if v_open is distinct from true then return jsonb_build_object('ok', false, 'error', 'This night is not open.'); end if;
  if not exists (select 1 from public.night_plans where member_id = auth.uid() and night_key = p_key and state = 'going') then
    return jsonb_build_object('ok', false, 'error', 'Tap Going first, then join a crew.', 'need', 'going'); end if;
  insert into public.crew_pool(event_slug, member_id) values (p_key, auth.uid()) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.join_crew_pool_any(text) to authenticated;

create or replace function public.leave_crew_pool(p_key text)
returns jsonb language sql security definer set search_path to 'public' as $$
  delete from public.crew_pool where event_slug = p_key and member_id = auth.uid() and crew_id is null;
  select jsonb_build_object('ok', true);
$$;
grant execute on function public.leave_crew_pool(text) to authenticated;

-- City for crew matching now comes from night_info, so scene nights match by city too.
create or replace function public.my_crew_status(p_slug text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_city text; v_mine text; v_in boolean; v_crew uuid; v_wait int;
begin
  select city into v_city from public.night_info(p_slug);
  select public.city_norm(city) into v_mine from public.members where id = auth.uid();
  select true, crew_id into v_in, v_crew from public.crew_pool where event_slug = p_slug and member_id = auth.uid();
  if not coalesce(v_in, false) then return jsonb_build_object('state', 'not_joined'); end if;
  if v_crew is not null then return jsonb_build_object('state', 'placed'); end if;
  if v_city is not null and v_mine is not null and v_mine <> v_city then
    return jsonb_build_object('state', 'other_city', 'event_city', v_city, 'your_city', v_mine); end if;
  select count(*) into v_wait from public.crew_pool p join public.members m on m.id = p.member_id
    where p.event_slug = p_slug and p.crew_id is null
      and (v_city is null or m.city is null or public.city_norm(m.city) = v_city);
  return jsonb_build_object('state', 'waiting', 'waiting', v_wait, 'need', greatest(0, 3 - v_wait));
end $$;

create or replace function public.ops_form_crews(p_token text, p_slug text, p_pre_spot text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare ids uuid[]; n int; k int; i int; sz int; pos int; v_crew uuid; v_cap uuid; made int := 0; v_city text;
begin
  perform public.ops_check(p_token);
  select city into v_city from public.night_info(p_slug);
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

-- Crew card extras set by the captain
alter table public.crews add column if not exists meet_point text;
alter table public.crews add column if not exists meet_time text;
alter table public.crews add column if not exists whatsapp_link text;
alter table public.crews add column if not exists lost_point text;
alter table public.crews add column if not exists entry_sent_at timestamptz;

create or replace function public.captain_set_crew(p_key text, p_meet_point text, p_meet_time text, p_whatsapp text, p_lost_point text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_crew uuid;
begin
  select c.id into v_crew from public.crew_pool me join public.crews c on c.id = me.crew_id
  where me.event_slug = p_key and me.member_id = auth.uid() and c.captain_id = auth.uid();
  if v_crew is null then return jsonb_build_object('ok', false, 'error', 'Only the captain can change this.'); end if;
  if nullif(trim(p_whatsapp), '') is not null and trim(p_whatsapp) !~ '^https://chat\.whatsapp\.com/' then
    return jsonb_build_object('ok', false, 'error', 'Paste a WhatsApp group invite link (chat.whatsapp.com).'); end if;
  update public.crews set meet_point = nullif(left(trim(p_meet_point), 120), ''), meet_time = nullif(left(trim(p_meet_time), 40), ''),
    whatsapp_link = nullif(trim(p_whatsapp), ''), lost_point = nullif(left(trim(coalesce(p_lost_point, '')), 120), '')
  where id = v_crew;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.captain_set_crew(text, text, text, text, text) to authenticated;

-- "I'm in": scene nights have no door scan of ours, so members tap it. CCD door scans count automatically.
create table if not exists public.crew_checkins (
  night_key text not null,
  member_id uuid not null references public.members(id) on delete cascade,
  at timestamptz not null default now(),
  primary key (night_key, member_id)
);
alter table public.crew_checkins enable row level security;

create or replace function public.mark_im_in(p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_date date;
begin
  if not exists (select 1 from public.crew_pool where event_slug = p_key and member_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Join the crew for this night first.'); end if;
  select event_date into v_date from public.night_info(p_key);
  if v_date is not null and v_date <> (now() at time zone 'Asia/Kolkata')::date
     and v_date <> ((now() at time zone 'Asia/Kolkata') - interval '6 hours')::date then
    return jsonb_build_object('ok', false, 'error', 'You can say you are in on the night itself.'); end if;
  insert into public.crew_checkins(night_key, member_id) values (p_key, auth.uid()) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.mark_im_in(text) to authenticated;

-- ── 5. Ticket proof (scene nights): upload after matching so CCD and the venue can plan crew entry ──
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-proofs', 'ticket-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "ticket proofs: members upload own folder" on storage.objects;
drop policy if exists "ticket proofs: owner or staff read" on storage.objects;
create policy "ticket proofs: members upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ticket proofs: owner or staff read" on storage.objects for select to authenticated
  using (bucket_id = 'ticket-proofs' and ((storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.members where id = auth.uid() and role in ('staff','owner'))));

create table if not exists public.ticket_proofs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  night_key text not null,
  booking_ref text,
  file_path text,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (member_id, night_key)
);
alter table public.ticket_proofs enable row level security;

create or replace function public.submit_ticket_proof(p_key text, p_ref text, p_path text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from public.crew_pool where event_slug = p_key and member_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Join the crew pool for this night first.'); end if;
  if nullif(trim(coalesce(p_ref, '')), '') is null and nullif(trim(coalesce(p_path, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Add a booking ID or a screenshot of your ticket.'); end if;
  if p_path is not null and p_path not like auth.uid()::text || '/%' then
    return jsonb_build_object('ok', false, 'error', 'Upload failed. Try again.'); end if;
  insert into public.ticket_proofs(member_id, night_key, booking_ref, file_path)
  values (auth.uid(), p_key, nullif(left(trim(p_ref), 80), ''), p_path)
  on conflict (member_id, night_key) do update set booking_ref = excluded.booking_ref,
    file_path = coalesce(excluded.file_path, ticket_proofs.file_path), status = 'pending', reviewed_at = null;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.submit_ticket_proof(text, text, text) to authenticated;

-- Staff review (signed in as staff or owner on /club, so the private screenshots can be opened)
create or replace function public.staff_ticket_proofs(p_key text default null)
returns table(id uuid, night_key text, title text, member_name text, booking_ref text, file_path text, status text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select t.id, t.night_key, i.title, m.display_name, t.booking_ref, t.file_path, t.status, t.created_at
  from public.ticket_proofs t join public.members m on m.id = t.member_id cross join lateral public.night_info(t.night_key) i
  where exists (select 1 from public.members s where s.id = auth.uid() and s.role in ('staff','owner'))
    and (p_key is null or t.night_key = p_key)
  order by t.status = 'pending' desc, t.created_at desc limit 200;
$$;
grant execute on function public.staff_ticket_proofs(text) to authenticated;

create or replace function public.staff_set_ticket_proof(p_id uuid, p_status text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from public.members where id = auth.uid() and role in ('staff','owner')) then
    return jsonb_build_object('ok', false, 'error', 'Staff only.'); end if;
  if p_status not in ('verified','rejected','pending') then return jsonb_build_object('ok', false, 'error', 'Unknown status.'); end if;
  update public.ticket_proofs set status = p_status, note = p_note, reviewed_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.staff_set_ticket_proof(uuid, text, text) to authenticated;

-- ── 6. The crew card ──
create or replace function public.my_crew_card(p_key text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare c public.crews; i record; v_me uuid := auth.uid();
begin
  select cr.* into c from public.crew_pool me join public.crews cr on cr.id = me.crew_id where me.event_slug = p_key and me.member_id = v_me;
  select * into i from public.night_info(p_key);
  if c.id is null then return jsonb_build_object('placed', false, 'status', public.my_crew_status(p_key), 'night', to_jsonb(i)); end if;
  return jsonb_build_object('placed', true, 'night', to_jsonb(i),
    'crew', jsonb_build_object('name', c.name, 'pre_spot', c.pre_spot, 'meet_point', c.meet_point, 'meet_time', c.meet_time,
      'whatsapp_link', c.whatsapp_link, 'lost_point', c.lost_point, 'you_are_captain', c.captain_id = v_me),
    'mates', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'first_name', split_part(coalesce(m.display_name, 'Someone'), ' ', 1),
        'tags', coalesce(m.genres[1:2], '{}'), 'captain', m.id = c.captain_id, 'you', m.id = v_me,
        'ticket', case when i.kind = 'ccd' then (case when exists (select 1 from public.ticket_orders o where o.event_slug = p_key
                         and o.status in ('paid','free') and lower(o.buyer_email) = lower(m.email)) then 'verified' else 'pending' end)
                       else coalesce((select t.status from public.ticket_proofs t where t.member_id = m.id and t.night_key = p_key), 'missing') end,
        'in', exists (select 1 from public.crew_checkins k where k.night_key = p_key and k.member_id = m.id)
              or exists (select 1 from public.tickets k join public.ticket_orders o on o.id = k.order_id
                         where k.event_slug = p_key and k.checked_in_at is not null and lower(o.buyer_email) = lower(m.email)))
        order by m.id = c.captain_id desc, m.display_name)
      from public.crew_pool p join public.members m on m.id = p.member_id where p.crew_id = c.id), '[]'::jsonb));
end $$;
grant execute on function public.my_crew_card(text) to authenticated;

-- ── 7. Venue partners and the crew entry list ──
create table if not exists public.venue_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  venue_match text not null,           -- lower-case text that appears in the venue field, e.g. 'humming tree'
  contact_name text,
  contact_email text,
  contact_phone text,
  entry_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (venue_match)
);
alter table public.venue_partners enable row level security;
-- No partners are seeded. Add venues on /ops once they agree to crew entry.

create or replace function public.crew_friendly_venues()
returns table(name text, city text, venue_match text)
language sql stable security definer set search_path to 'public' as $$
  select name, city, venue_match from public.venue_partners where active order by name;
$$;
grant execute on function public.crew_friendly_venues() to anon, authenticated;

create or replace function public.ops_venue_partners(p_token text)
returns setof public.venue_partners language plpgsql stable security definer set search_path to 'public' as $$
begin perform public.ops_check(p_token); return query select * from public.venue_partners order by name; end $$;
grant execute on function public.ops_venue_partners(text) to anon, authenticated;

create or replace function public.ops_upsert_venue_partner(p_token text, p_id uuid, p_name text, p_city text, p_match text,
  p_contact_name text, p_contact_email text, p_contact_phone text, p_entry_notes text, p_active boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid;
begin
  perform public.ops_check(p_token);
  if p_id is null then
    insert into public.venue_partners(name, city, venue_match, contact_name, contact_email, contact_phone, entry_notes, active)
    values (p_name, p_city, lower(trim(p_match)), p_contact_name, p_contact_email, p_contact_phone, p_entry_notes, coalesce(p_active, true)) returning id into v_id;
  else
    update public.venue_partners set name = p_name, city = p_city, venue_match = lower(trim(p_match)), contact_name = p_contact_name,
      contact_email = p_contact_email, contact_phone = p_contact_phone, entry_notes = p_entry_notes, active = coalesce(p_active, true)
    where id = p_id returning id into v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
grant execute on function public.ops_upsert_venue_partner(text, uuid, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- Crews for upcoming nights with their partner venue (if any) and entry readiness
create or replace function public.ops_crew_nights(p_token text)
returns table(night_key text, title text, city text, venue text, event_date date, crews bigint, members bigint, verified bigint,
              pool_waiting bigint, partner text, partner_email text, entry_sent_at timestamptz)
language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform public.ops_check(p_token);
  return query
  select k.night_key, i.title, i.city, i.venue, i.event_date,
    (select count(*) from public.crews c where c.event_slug = k.night_key),
    (select count(*) from public.crew_pool p where p.event_slug = k.night_key and p.crew_id is not null),
    (select count(*) from public.ticket_proofs t where t.night_key = k.night_key and t.status = 'verified'),
    (select count(*) from public.crew_pool p where p.event_slug = k.night_key and p.crew_id is null),
    vp.name, vp.contact_email,
    (select max(c.entry_sent_at) from public.crews c where c.event_slug = k.night_key)
  from (select distinct event_slug as night_key from public.crew_pool) k
  cross join lateral public.night_info(k.night_key) i
  left join lateral (select v.name, v.contact_email from public.venue_partners v
                     where v.active and lower(coalesce(i.venue, '')) like '%' || v.venue_match || '%' limit 1) vp on true
  where i.event_date is null or i.event_date >= current_date - 1
  order by i.event_date nulls last;
end $$;
grant execute on function public.ops_crew_nights(text) to anon, authenticated;

-- The list sent to the venue: crew, captain, first and last name as given, ticket status and booking reference. No phone numbers.
create or replace function public.ops_crew_entry_list(p_token text, p_key text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare i record; vp record;
begin
  perform public.ops_check(p_token);
  select * into i from public.night_info(p_key);
  select * into vp from public.venue_partners v where v.active and lower(coalesce(i.venue, '')) like '%' || v.venue_match || '%' limit 1;
  return jsonb_build_object('night', to_jsonb(i), 'partner', to_jsonb(vp),
    'crews', coalesce((select jsonb_agg(jsonb_build_object('name', c.name, 'meet_time', c.meet_time,
       'people', (select jsonb_agg(jsonb_build_object('name', m.display_name, 'captain', m.id = c.captain_id,
          'ticket', case when i.kind = 'ccd' then 'CCD ticket' else coalesce(t.status, 'missing') end, 'ref', t.booking_ref) order by m.display_name)
          from public.crew_pool p join public.members m on m.id = p.member_id
          left join public.ticket_proofs t on t.member_id = m.id and t.night_key = p_key
          where p.crew_id = c.id)) order by c.name)
      from public.crews c where c.event_slug = p_key), '[]'::jsonb));
end $$;
grant execute on function public.ops_crew_entry_list(text, text) to anon, authenticated;

create or replace function public.ops_mark_entry_sent(p_token text, p_key text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform public.ops_check(p_token);
  update public.crews set entry_sent_at = now() where event_slug = p_key;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.ops_mark_entry_sent(text, text) to anon, authenticated;

-- ── 8. Set times for Tonight mode ──
create table if not exists public.set_times (
  id uuid primary key default gen_random_uuid(),
  night_key text not null,
  artist_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.set_times enable row level security;
create index if not exists set_times_key_idx on public.set_times(night_key, starts_at);

create or replace function public.night_set_times(p_key text)
returns table(artist_name text, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select artist_name, starts_at, ends_at from public.set_times where night_key = p_key order by starts_at;
$$;
grant execute on function public.night_set_times(text) to anon, authenticated;

create or replace function public.ops_set_times(p_token text, p_key text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform public.ops_check(p_token);
  delete from public.set_times where night_key = p_key;
  insert into public.set_times(night_key, artist_name, starts_at, ends_at)
  select p_key, r->>'artist', (r->>'starts_at')::timestamptz, nullif(r->>'ends_at', '')::timestamptz
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r where nullif(trim(r->>'artist'), '') is not null;
  return jsonb_build_object('ok', true, 'rows', (select count(*) from public.set_times where night_key = p_key));
end $$;
grant execute on function public.ops_set_times(text, text, jsonb) to anon, authenticated;

-- ── 9. Rate the night (after) ──
create table if not exists public.night_ratings (
  member_id uuid not null references public.members(id) on delete cascade,
  night_key text not null,
  rating int not null check (rating between 1 and 3),
  note text,
  created_at timestamptz not null default now(),
  primary key (member_id, night_key)
);
alter table public.night_ratings enable row level security;

create or replace function public.rate_night(p_key text, p_rating int, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from public.night_plans where member_id = auth.uid() and night_key = p_key)
     and not exists (select 1 from public.crew_pool where member_id = auth.uid() and event_slug = p_key) then
    return jsonb_build_object('ok', false, 'error', 'Only people who went can rate this night.'); end if;
  insert into public.night_ratings(member_id, night_key, rating, note) values (auth.uid(), p_key, p_rating, nullif(left(trim(coalesce(p_note, '')), 280), ''))
  on conflict (member_id, night_key) do update set rating = excluded.rating, note = excluded.note;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.rate_night(text, int, text) to authenticated;

-- ── 10. Past crews include scene nights (for "go again") ──
create or replace function public.my_past_crews()
returns table(event_slug text, title text, event_date date)
language sql stable security definer set search_path = public as $$
  select me.event_slug, i.title, i.event_date
  from public.crew_pool me cross join lateral public.night_info(me.event_slug) i
  where me.member_id = auth.uid() and me.crew_id is not null and i.event_date < current_date
  order by i.event_date desc
  limit 10;
$$;
