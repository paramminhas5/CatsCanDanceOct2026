-- 018: fixes for the gaps found in the 30 Oct fake-member test. Additive.
-- 1 city_norm: "Bangalore", " bengaluru " and "BLR" all become "Bengaluru"; used by join and crews.
-- 2 going and likes for CCD's own nights (the old ones only accept scene-list events).
-- 3 join_crew_pool needs a ticket or an RSVP for that night.
-- 4 my_crew_status: tells a member why they are not in a crew yet.
-- 5 ops_form_crews compares cities through city_norm.

create or replace function public.city_norm(p text) returns text language sql immutable as $$
  select case
    when p is null or btrim(p) = '' then null
    when lower(btrim(p)) in ('bengaluru','bangalore','blr','bengalooru') then 'Bengaluru'
    when lower(btrim(p)) in ('mumbai','bombay') then 'Mumbai'
    when lower(btrim(p)) in ('delhi','new delhi','delhi ncr','ncr','gurgaon','gurugram','noida') then 'Delhi NCR'
    when lower(btrim(p)) in ('pune') then 'Pune'
    when lower(btrim(p)) in ('hyderabad') then 'Hyderabad'
    when lower(btrim(p)) in ('chennai','madras') then 'Chennai'
    when lower(btrim(p)) in ('kolkata','calcutta') then 'Kolkata'
    when lower(btrim(p)) in ('goa') then 'Goa'
    else btrim(p) end;
$$;

update public.members set city = public.city_norm(city) where city is not null and city is distinct from public.city_norm(city);

create or replace function public.join_member(p_name text, p_city text, p_genres text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null or v_email is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  insert into public.members(id, email, display_name, city, genres)
  values (auth.uid(), v_email, nullif(left(trim(p_name),60),''), public.city_norm(p_city), coalesce(p_genres,'{}'))
  on conflict (id) do update set display_name = coalesce(excluded.display_name, members.display_name),
    city = coalesce(excluded.city, members.city), genres = case when cardinality(excluded.genres) > 0 then excluded.genres else members.genres end;
  return jsonb_build_object('ok', true);
end $$;

-- going and likes for CCD nights
create table if not exists public.night_going (
  member_id uuid not null references public.members(id) on delete cascade,
  event_slug text not null,
  show_name boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (member_id, event_slug));
create table if not exists public.night_likes (
  member_id uuid not null references public.members(id) on delete cascade,
  event_slug text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, event_slug));
alter table public.night_going enable row level security;
alter table public.night_likes enable row level security;

create or replace function public.set_night_going(p_slug text, p_going boolean, p_show_name boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if p_going then
    if not exists (select 1 from public.events where slug = p_slug and published and (event_date is null or event_date >= current_date)) then
      return jsonb_build_object('ok', false, 'error', 'This night is not open.'); end if;
    insert into public.night_going(member_id, event_slug, show_name) values (auth.uid(), p_slug, coalesce(p_show_name, false))
    on conflict (member_id, event_slug) do update set show_name = excluded.show_name;
  else delete from public.night_going where member_id = auth.uid() and event_slug = p_slug; end if;
  return jsonb_build_object('ok', true, 'going', (select count(*) from public.night_going where event_slug = p_slug));
end $$;

create or replace function public.toggle_night_like(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_on boolean;
begin
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if exists (select 1 from public.night_likes where member_id = auth.uid() and event_slug = p_slug) then
    delete from public.night_likes where member_id = auth.uid() and event_slug = p_slug; v_on := false;
  else
    insert into public.night_likes(member_id, event_slug) select auth.uid(), slug from public.events where slug = p_slug and published; v_on := true;
  end if;
  return jsonb_build_object('ok', true, 'liked', coalesce(v_on, false), 'likes', (select count(*) from public.night_likes where event_slug = p_slug));
end $$;

create or replace function public.my_night_state()
returns table(event_slug text, liked boolean, going boolean, show_name boolean)
language sql stable security definer set search_path = public as $$
  select s, exists (select 1 from public.night_likes l where l.member_id = auth.uid() and l.event_slug = s),
         exists (select 1 from public.night_going g where g.member_id = auth.uid() and g.event_slug = s),
         coalesce((select g.show_name from public.night_going g where g.member_id = auth.uid() and g.event_slug = s), false)
  from (select event_slug s from public.night_likes where member_id = auth.uid() union select event_slug from public.night_going where member_id = auth.uid()) x;
$$;

create or replace function public.night_counts()
returns table(event_slug text, likes bigint, going bigint)
language sql stable security definer set search_path = public as $$
  select e.slug, (select count(*) from public.night_likes l where l.event_slug = e.slug),
         (select count(*) from public.night_going g where g.event_slug = e.slug)
  from public.events e where e.published and (e.event_date is null or e.event_date >= current_date);
$$;

-- crew pool needs a ticket or RSVP
create or replace function public.join_crew_pool(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from public.members where id = auth.uid();
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if not exists (select 1 from public.events where slug = p_slug and published and (event_date is null or event_date >= current_date)) then
    return jsonb_build_object('ok', false, 'error', 'This event is not open.'); end if;
  if not exists (select 1 from public.ticket_orders o where o.event_slug = p_slug and o.status in ('paid','free') and lower(o.buyer_email) = lower(v_email))
     and not exists (select 1 from public.event_rsvps r where r.event_slug = p_slug and lower(r.email) = lower(v_email)) then
    return jsonb_build_object('ok', false, 'error', 'Get a ticket or RSVP with this email first, then join a crew.'); end if;
  insert into public.crew_pool(event_slug, member_id) values (p_slug, auth.uid()) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- why am I not in a crew yet
create or replace function public.my_crew_status(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_city text; v_mine text; v_in boolean; v_crew uuid; v_wait int;
begin
  select public.city_norm(city) into v_city from public.events where slug = p_slug;
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

-- crews compare cities through city_norm
create or replace function public.ops_form_crews(p_token text, p_slug text, p_pre_spot text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ids uuid[]; n int; k int; i int; sz int; pos int; v_crew uuid; v_cap uuid; made int := 0; v_city text;
begin
  perform public.ops_check(p_token);
  select public.city_norm(city) into v_city from public.events where slug = p_slug;
  select array_agg(p.member_id order by
           coalesce(m.quiz->>'good_night', ''), coalesce(m.quiz->>'when', ''), coalesce(m.quiz->>'arrive', ''),
           m.genres, p.created_at) into ids
    from public.crew_pool p join public.members m on m.id = p.member_id
    where p.event_slug = p_slug and p.crew_id is null
      and (v_city is null or m.city is null or public.city_norm(m.city) = v_city);
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

revoke all on function public.set_night_going(text, boolean, boolean), public.toggle_night_like(text), public.my_night_state(), public.my_crew_status(text) from public;
grant execute on function public.set_night_going(text, boolean, boolean), public.toggle_night_like(text), public.my_night_state(), public.my_crew_status(text) to authenticated;
revoke all on function public.night_counts() from public;
grant execute on function public.night_counts() to anon, authenticated;
