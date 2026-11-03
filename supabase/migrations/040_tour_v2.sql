-- 040: On tour v2 (Strays). Additive only. Param applies this by hand.
--
-- 1. tour_posts + tour_stops: one post per act and trip, one row per city window.
--    kind 'touring' = a foreign act's India window, 'away' = an Indian act in another city.
--    Each stop is 'playing' (booked, venue and ticket link) or 'open' (free to book).
--    Closed tables: RLS on, no policies, no grants. Everything goes through the functions below.
-- 2. submit_tour(...): anon post with honeypot and the shared per-email throttle. Lands as 'pending'.
-- 3. tour_board(p_city): public read. One row per date window from four sources:
--      post  approved tour_stops
--      gig   confirmed event_artists on published, upcoming scene nights
--      ccd   CCD's own published, listed, upcoming nights (lineup names, matched to the roster when they can be)
--      dates approved artist_dates (the old single-city form), always 'open'
--    No emails leave this function. home is the artist's base so the site can tell touring from away from local.
-- 4. ops_tour_posts / ops_tour_review: token-guarded review for /ops/tour.

create table if not exists public.tour_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('touring', 'away')),
  act_name text not null,
  artist_slug text,                       -- set when the act matches an approved artist (or by ops)
  home_city text,
  home_country text,
  instagram text,
  ra text,
  spotify text,
  email text not null,                    -- private, never returned by public functions
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.tour_stops (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.tour_posts(id) on delete cascade,
  city text not null,
  from_date date not null,
  to_date date not null,
  state text not null default 'open' check (state in ('playing', 'open')),
  venue text,
  ticket_url text,
  sort_order int not null default 0,
  check (to_date >= from_date)
);

create index if not exists tour_posts_status_idx on public.tour_posts(status, created_at desc);
create index if not exists tour_stops_post_idx on public.tour_stops(post_id);
create index if not exists tour_stops_dates_idx on public.tour_stops(to_date, from_date);

alter table public.tour_posts enable row level security;
alter table public.tour_stops enable row level security;
revoke all on public.tour_posts from anon, authenticated;
revoke all on public.tour_stops from anon, authenticated;

-- ── Public: post a tour ─────────────────────────────────────────────────────
-- p_stops: [{ "city": "Goa", "from": "2026-11-18", "to": "2026-11-20", "state": "playing", "venue": "...", "ticket_url": "https://..." }]
-- p_company is the honeypot. Bots fill it, people never see it.
create or replace function public.submit_tour(
  p_kind text, p_act_name text, p_home_city text, p_home_country text,
  p_instagram text, p_ra text, p_spotify text, p_email text, p_note text,
  p_stops jsonb, p_company text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_slug text; s jsonb; i int := 0;
  v_city text; v_from date; v_to date; v_state text; v_url text;
begin
  if coalesce(btrim(p_company), '') <> '' then return json_build_object('ok', true); end if;
  if p_kind not in ('touring', 'away') then raise exception 'Pick the kind of post'; end if;
  if _clean(p_act_name, 80) is null then raise exception 'Add the act name'; end if;
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_instagram, 200) is null and _clean(p_ra, 200) is null and _clean(p_spotify, 200) is null then
    raise exception 'Add at least one link: Instagram, RA or Spotify';
  end if;
  if p_kind = 'away' and _clean(p_home_city, 60) is null then raise exception 'Add your home city'; end if;
  if p_kind = 'touring' and _clean(p_home_country, 60) is null then raise exception 'Add where you are based'; end if;
  if p_stops is null or jsonb_typeof(p_stops) <> 'array' or jsonb_array_length(p_stops) = 0 then raise exception 'Add at least one city and dates'; end if;
  if jsonb_array_length(p_stops) > 12 then raise exception 'Keep it to 12 stops per post'; end if;

  -- Check every stop before writing anything.
  for s in select * from jsonb_array_elements(p_stops) loop
    v_city := _clean(s->>'city', 60);
    begin
      v_from := (s->>'from')::date; v_to := (s->>'to')::date;
    exception when others then raise exception 'Check the dates'; end;
    if v_city is null then raise exception 'Every stop needs a city'; end if;
    if v_from is null or v_to is null or v_to < v_from or v_to < current_date then raise exception 'Check the dates for %', v_city; end if;
    if v_to - v_from > 60 then raise exception 'Keep each window under two months (%)', v_city; end if;
    if v_from > current_date + 400 then raise exception 'Dates more than a year out are too early to post (%)', v_city; end if;
    if coalesce(s->>'state', 'open') not in ('playing', 'open') then raise exception 'Mark each stop Playing or Open'; end if;
  end loop;

  perform _throttle(p_email, 'submit_tour', 5);

  select a.slug into v_slug from artists a
   where a.status = 'approved' and lower(btrim(a.name)) = lower(btrim(p_act_name)) limit 1;

  insert into tour_posts(kind, act_name, artist_slug, home_city, home_country, instagram, ra, spotify, email, note)
  values (p_kind, _clean(p_act_name, 80), v_slug, city_norm(_clean(p_home_city, 60)), _clean(p_home_country, 60),
          _clean(p_instagram, 200), _clean(p_ra, 200), _clean(p_spotify, 200), lower(btrim(p_email)), _clean(p_note, 500))
  returning id into v_id;

  for s in select * from jsonb_array_elements(p_stops) loop
    v_state := coalesce(s->>'state', 'open');
    v_url := _clean(s->>'ticket_url', 300);
    if v_url is not null and v_url !~* '^https?://' then v_url := null; end if;
    insert into tour_stops(post_id, city, from_date, to_date, state, venue, ticket_url, sort_order)
    values (v_id, city_norm(_clean(s->>'city', 60)), (s->>'from')::date, (s->>'to')::date, v_state,
            case when v_state = 'playing' then _clean(s->>'venue', 120) end,
            case when v_state = 'playing' then v_url end, i);
    i := i + 1;
  end loop;

  return json_build_object('ok', true, 'id', v_id);
end $$;

-- ── Public: the board ───────────────────────────────────────────────────────
create or replace function public.tour_board(p_city text default null)
returns table(
  src text, ref text, post_kind text, artist_slug text, artist_name text, home text,
  city text, from_date date, to_date date, state text, venue text, title text,
  url text, ticket_url text, note text, instagram text, ra text, spotify text)
language sql stable security definer set search_path = public as $$
  with b as (
    -- 1. approved tour posts
    select 'post'::text src, p.id::text ref, p.kind post_kind, a.slug artist_slug, coalesce(a.name, p.act_name) artist_name,
           concat_ws(', ', p.home_city, p.home_country) home,
           st.city, st.from_date, st.to_date, st.state, st.venue, null::text title,
           null::text url, st.ticket_url, p.note, p.instagram, p.ra, p.spotify
    from tour_posts p
    join tour_stops st on st.post_id = p.id
    left join artists a on a.slug = p.artist_slug and a.status = 'approved'
    where p.status = 'approved' and st.to_date >= current_date
    union all
    -- 2. confirmed gig links on published scene nights
    select 'gig', e.id::text, null, a.slug, a.name, coalesce(a.based_city, a.from_city),
           city_norm(e.city), e.event_date, e.event_date, 'playing', e.venue, e.title,
           e.url, coalesce(e.ticket_url, e.url), null, a.instagram, null, a.spotify
    from event_artists ea
    join scraped_events e on e.id = ea.event_id
    join artists a on a.slug = ea.artist_slug and a.status = 'approved'
    where ea.status = 'confirmed' and e.status = 'published' and e.event_date >= current_date
    union all
    -- 3. CCD's own nights, one row per lineup name
    select 'ccd', ev.slug, null, a.slug, coalesce(a.name, btrim(l.name)), coalesce(a.based_city, a.from_city),
           city_norm(ev.city), ev.event_date, ev.event_date, 'playing', ev.venue, ev.title,
           '/nights/' || ev.slug, coalesce(ev.ticket_url, '/nights/' || ev.slug), null, a.instagram, null, a.spotify
    from events ev
    cross join lateral unnest(coalesce(ev.lineup, '{}'::text[])) as l(name)
    left join artists a on a.status = 'approved' and lower(btrim(a.name)) = lower(btrim(l.name))
    -- events.listed comes with 037; read it through jsonb so this works before or after 037.
    where ev.published and coalesce((to_jsonb(ev)->>'listed')::boolean, ev.slug not like 'test-night%')
      and ev.event_date >= current_date and btrim(l.name) <> ''
    union all
    -- 4. approved single-city dates from the old form
    select 'dates', d.id::text, null, a.slug, d.artist_name, coalesce(a.based_city, a.from_city),
           city_norm(d.city), d.from_date, d.to_date, 'open', null, null,
           null, null, d.note, a.instagram, null, a.spotify
    from artist_dates d
    left join artists a on a.slug = d.artist_slug and a.status = 'approved'
    where d.status = 'approved' and d.to_date >= current_date
  )
  select * from b
  where p_city is null or city_norm(b.city) = city_norm(p_city)
  order by from_date, artist_name
  limit 500;
$$;

-- ── Ops: review ─────────────────────────────────────────────────────────────
create or replace function public.ops_tour_posts(p_token text, p_status text default 'pending')
returns json language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return coalesce((select json_agg(x order by x.created_at desc) from (
    select p.*, coalesce((select json_agg(st order by st.sort_order) from tour_stops st where st.post_id = p.id), '[]'::json) stops
    from tour_posts p
    where p_status is null or p.status = p_status
    order by p.created_at desc limit 100) x), '[]'::json);
end $$;

create or replace function public.ops_tour_review(p_token text, p_id uuid, p_status text, p_artist_slug text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'bad status'; end if;
  if nullif(btrim(coalesce(p_artist_slug, '')), '') is not null
     and not exists (select 1 from artists where slug = btrim(p_artist_slug)) then
    raise exception 'No artist with slug %', p_artist_slug;
  end if;
  update tour_posts
     set status = p_status, reviewed_at = now(),
         artist_slug = coalesce(nullif(btrim(coalesce(p_artist_slug, '')), ''), artist_slug)
   where id = p_id;
  if not found then raise exception 'not found'; end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.submit_tour(text,text,text,text,text,text,text,text,text,jsonb,text) from public;
revoke all on function public.tour_board(text) from public;
revoke all on function public.ops_tour_posts(text,text) from public;
revoke all on function public.ops_tour_review(text,uuid,text,text) from public;
grant execute on function public.submit_tour(text,text,text,text,text,text,text,text,text,jsonb,text) to anon, authenticated;
grant execute on function public.tour_board(text) to anon, authenticated;
grant execute on function public.ops_tour_posts(text,text) to anon, authenticated;
grant execute on function public.ops_tour_review(text,uuid,text,text) to anon, authenticated;
