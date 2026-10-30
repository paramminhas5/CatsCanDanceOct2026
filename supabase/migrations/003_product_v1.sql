-- 003: CCD product v1
-- Real Episode history, residents, and the tables behind the public forms:
-- RSVP, newsletter, submit an event, artist join/claim, touring dates, booking requests.
-- All public writes go through security definer RPCs with validation. Anon never
-- gets direct insert on the new tables.

-- ── Events: episode metadata ───────────────────────────────────────────────
alter table public.events add column if not exists episode_no int;
alter table public.events add column if not exists start_time text;
alter table public.events add column if not exists rsvp_open boolean default false;
alter table public.events add column if not exists capacity int;
alter table public.events add column if not exists recap text;

-- ── Artists: claim + touring ───────────────────────────────────────────────
alter table public.artists add column if not exists claimed_email text;
alter table public.artists add column if not exists claimed_at timestamptz;
alter table public.artists add column if not exists mix_url text;
alter table public.artists add column if not exists played_ccd boolean default false;

-- Artist submissions: new profiles and claims of existing ones. Reviewed in /ops.
create table if not exists public.artist_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('new','claim')),
  artist_slug text,                     -- set for claims
  name text not null,
  email text not null,
  based_city text,
  genres text[] default '{}',
  instagram text, soundcloud text, mix_url text,
  bio text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

-- Touring / availability windows: "I'm in Bengaluru 12-15 Nov and open to gigs".
create table if not exists public.artist_dates (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null,
  artist_name text not null,
  email text not null,
  city text not null,
  from_date date not null,
  to_date date not null,
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  created_at timestamptz default now(),
  check (to_date >= from_date)
);
create index if not exists artist_dates_live_idx on public.artist_dates(status, to_date);

-- Booking requests from promoters/venues to an artist, routed through CCD.
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  artist_slug text,
  name text not null,
  email text not null,
  org text,
  city text,
  event_date date,
  budget_inr text,
  message text,
  status text not null default 'new' check (status in ('new','sent','closed')),
  created_at timestamptz default now()
);

-- Submitted scene events land in scraped_events as pending.
alter table public.scraped_events add column if not exists submitter_email text;

alter table public.artist_submissions enable row level security;
alter table public.artist_dates enable row level security;
alter table public.booking_requests enable row level security;

drop policy if exists "public read approved dates" on public.artist_dates;
create policy "public read approved dates" on public.artist_dates for select
  using (status = 'approved' and to_date >= current_date);

-- Public view without emails
create or replace view public.touring_now with (security_invoker = true) as
  select id, artist_slug, artist_name, city, from_date, to_date, note
  from public.artist_dates
  where status = 'approved' and to_date >= current_date
  order by from_date;
revoke select on public.artist_dates from anon, authenticated;
grant select on public.touring_now to anon, authenticated;
-- the view needs the base-table select through RLS; grant column-limited select
grant select (id, artist_slug, artist_name, city, from_date, to_date, note, status) on public.artist_dates to anon, authenticated;

-- ── Validation helpers ─────────────────────────────────────────────────────
create or replace function public._clean(t text, maxlen int) returns text
language sql immutable set search_path = public as $$ select nullif(left(btrim(coalesce(t,'')), maxlen), '') $$;

create or replace function public._email_ok(e text) returns boolean
language sql immutable set search_path = public as $$ select e ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(e) <= 200 $$;

-- simple per-email throttle across all public forms
create table if not exists public.form_hits (email text, form text, at timestamptz default now());
alter table public.form_hits enable row level security;
create index if not exists form_hits_idx on public.form_hits(email, form, at);

create or replace function public._throttle(p_email text, p_form text, p_max int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from form_hits where email = lower(p_email) and form = p_form and at > now() - interval '1 hour') >= p_max then
    raise exception 'Too many submissions, try again later';
  end if;
  insert into form_hits(email, form) values (lower(p_email), p_form);
end $$;

-- ── Public RPCs ────────────────────────────────────────────────────────────
create or replace function public.rsvp(p_event_slug text, p_name text, p_email text, p_plus_ones int default 0)
returns json language plpgsql security definer set search_path = public as $$
declare ev record; taken int;
begin
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_name, 80) is null then raise exception 'Enter your name'; end if;
  select * into ev from events where slug = p_event_slug and published;
  if not found then raise exception 'Event not found'; end if;
  if not coalesce(ev.rsvp_open, false) then raise exception 'RSVPs are closed for this night'; end if;
  perform _throttle(p_email, 'rsvp', 5);
  if exists (select 1 from event_rsvps where event_slug = p_event_slug and lower(email) = lower(p_email)) then
    return json_build_object('ok', true, 'already', true);
  end if;
  if ev.capacity is not null then
    select coalesce(sum(1 + coalesce(plus_ones,0)),0) into taken from event_rsvps where event_slug = p_event_slug;
    if taken + 1 + least(greatest(coalesce(p_plus_ones,0),0),2) > ev.capacity then
      insert into early_access_signups(email, source) values (lower(p_email), 'waitlist:'||p_event_slug);
      return json_build_object('ok', true, 'waitlist', true);
    end if;
  end if;
  insert into event_rsvps(event_slug, name, email, plus_ones)
  values (p_event_slug, _clean(p_name,80), lower(p_email), least(greatest(coalesce(p_plus_ones,0),0),2));
  return json_build_object('ok', true);
end $$;

create or replace function public.signup(p_email text, p_source text default 'site')
returns json language plpgsql security definer set search_path = public as $$
begin
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  perform _throttle(p_email, 'signup', 5);
  if not exists (select 1 from early_access_signups where lower(email) = lower(p_email) and source = coalesce(_clean(p_source,40),'site')) then
    insert into early_access_signups(email, source) values (lower(p_email), coalesce(_clean(p_source,40),'site'));
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.submit_event(
  p_email text, p_title text, p_url text, p_venue text, p_city text, p_date date, p_time text default null, p_description text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_url text := _clean(p_url, 400);
begin
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_title,140) is null then raise exception 'Add the event name'; end if;
  if v_url is null or v_url !~* '^https?://' then raise exception 'Add a link to the event page or tickets'; end if;
  if p_date is null or p_date < current_date then raise exception 'Add an upcoming date'; end if;
  perform _throttle(p_email, 'submit_event', 5);
  insert into scraped_events(title, url, source, city, venue, event_date, event_time, description, submitter_email)
  values (_clean(p_title,140), v_url, 'submitted', coalesce(_clean(p_city,60),'Bengaluru'), _clean(p_venue,120), p_date,
          _clean(p_time,40), _clean(p_description,1000), lower(p_email))
  on conflict (url) do nothing;
  return json_build_object('ok', true);
end $$;

create or replace function public.submit_artist(
  p_kind text, p_artist_slug text, p_name text, p_email text, p_city text, p_genres text,
  p_instagram text, p_soundcloud text, p_mix_url text, p_bio text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('new','claim') then raise exception 'Bad request'; end if;
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_name,80) is null then raise exception 'Add your artist name'; end if;
  if p_kind = 'claim' and not exists (select 1 from artists where slug = p_artist_slug) then raise exception 'Profile not found'; end if;
  if _clean(p_instagram,200) is null and _clean(p_soundcloud,300) is null and _clean(p_mix_url,300) is null then
    raise exception 'Add at least one link: Instagram, SoundCloud or a mix';
  end if;
  perform _throttle(p_email, 'submit_artist', 3);
  insert into artist_submissions(kind, artist_slug, name, email, based_city, genres, instagram, soundcloud, mix_url, bio)
  values (p_kind, case when p_kind='claim' then p_artist_slug end, _clean(p_name,80), lower(p_email), _clean(p_city,60),
          coalesce((select array_agg(distinct btrim(g)) from unnest(string_to_array(coalesce(p_genres,''), ',')) g where btrim(g) <> ''), '{}'),
          _clean(p_instagram,200), _clean(p_soundcloud,300), _clean(p_mix_url,300), _clean(p_bio,1200));
  return json_build_object('ok', true);
end $$;

create or replace function public.submit_dates(
  p_artist_name text, p_email text, p_city text, p_from date, p_to date, p_note text default null, p_artist_slug text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_artist_name,80) is null or _clean(p_city,60) is null then raise exception 'Add your name and the city'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to < current_date then raise exception 'Check the dates'; end if;
  if p_to - p_from > 60 then raise exception 'Keep a window under two months'; end if;
  perform _throttle(p_email, 'submit_dates', 5);
  v_slug := coalesce(nullif(p_artist_slug,''), trim(both '-' from regexp_replace(lower(_clean(p_artist_name,80)), '[^a-z0-9]+', '-', 'g')));
  insert into artist_dates(artist_slug, artist_name, email, city, from_date, to_date, note)
  values (v_slug, _clean(p_artist_name,80), lower(p_email), _clean(p_city,60), p_from, p_to, _clean(p_note,300));
  return json_build_object('ok', true);
end $$;

create or replace function public.request_booking(
  p_artist_slug text, p_name text, p_email text, p_org text, p_city text, p_date date, p_budget text, p_message text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_name,80) is null then raise exception 'Add your name'; end if;
  if p_artist_slug is not null and not exists (select 1 from artists where slug = p_artist_slug and status='approved') then
    raise exception 'Artist not found';
  end if;
  perform _throttle(p_email, 'booking', 5);
  insert into booking_requests(artist_slug, name, email, org, city, event_date, budget_inr, message)
  values (p_artist_slug, _clean(p_name,80), lower(p_email), _clean(p_org,120), _clean(p_city,60), p_date,
          _clean(p_budget,40), _clean(p_message,1500));
  return json_build_object('ok', true);
end $$;

-- Existing direct-insert policies on event_rsvps / early_access_signups are left in place
-- (the old site still uses them). Drop them once catscandance.com points at this site.

revoke all on function public._throttle(text,text,int) from public, anon, authenticated;
grant execute on function public.rsvp(text,text,text,int) to anon, authenticated;
grant execute on function public.signup(text,text) to anon, authenticated;
grant execute on function public.submit_event(text,text,text,text,text,date,text,text) to anon, authenticated;
grant execute on function public.submit_artist(text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.submit_dates(text,text,text,date,date,text,text) to anon, authenticated;
grant execute on function public.request_booking(text,text,text,text,text,date,text,text) to anon, authenticated;

-- Public counts (no personal data)
create or replace function public.rsvp_count(p_event_slug text) returns int
language sql security definer set search_path = public as $$
  select coalesce(sum(1 + coalesce(plus_ones,0)),0)::int from event_rsvps where event_slug = p_event_slug
$$;
grant execute on function public.rsvp_count(text) to anon, authenticated;

-- ── Ops: queues + review ───────────────────────────────────────────────────
create or replace function public.ops_queues(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return json_build_object(
    'artist_submissions', coalesce((select json_agg(s) from (select * from artist_submissions where status='pending' order by created_at) s), '[]'),
    'artist_dates', coalesce((select json_agg(d) from (select * from artist_dates where status='pending' and to_date >= current_date order by from_date) d), '[]'),
    'bookings', coalesce((select json_agg(b) from (select * from booking_requests where status='new' order by created_at desc) b), '[]'),
    'submitted_events', coalesce((select json_agg(e) from (select id, title, url, venue, city, event_date, submitter_email, score from scraped_events where source='submitted' and status='pending' order by event_date) e), '[]'),
    'rsvps', coalesce((select json_agg(r) from (select event_slug, count(*) n, sum(1+coalesce(plus_ones,0)) heads from event_rsvps group by event_slug) r), '[]'),
    'signups_7d', (select count(*) from early_access_signups where created_at > now() - interval '7 days')
  );
end $$;

create or replace function public.ops_review(p_token text, p_kind text, p_id uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare s record; v_slug text;
begin
  perform ops_check(p_token);
  if p_kind = 'artist_submission' then
    select * into s from artist_submissions where id = p_id;
    if not found then raise exception 'not found'; end if;
    if p_action = 'approve' then
      if s.kind = 'claim' then
        update artists set claimed_email = s.email, claimed_at = now(),
          instagram = coalesce(s.instagram, instagram), soundcloud = coalesce(s.soundcloud, soundcloud),
          mix_url = coalesce(s.mix_url, mix_url), bio = coalesce(s.bio, bio),
          genres = case when array_length(s.genres,1) > 0 then s.genres else genres end,
          based_city = coalesce(s.based_city, based_city), updated_at = now()
        where slug = s.artist_slug;
      else
        v_slug := trim(both '-' from regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g'));
        if exists (select 1 from artists where slug = v_slug) then v_slug := v_slug || '-' || left(p_id::text, 4); end if;
        insert into artists(slug, name, based_city, genres, instagram, soundcloud, mix_url, bio, claimed_email, claimed_at, source, status)
        values (v_slug, upper(s.name), s.based_city, s.genres, s.instagram, s.soundcloud, s.mix_url, s.bio, s.email, now(), 'submitted', 'approved');
      end if;
      update artist_submissions set status='approved', reviewed_at=now() where id = p_id;
    else
      update artist_submissions set status='rejected', reviewed_at=now() where id = p_id;
    end if;
  elsif p_kind = 'artist_date' then
    update artist_dates set status = case when p_action='approve' then 'approved' else 'rejected' end where id = p_id;
  elsif p_kind = 'booking' then
    update booking_requests set status = case when p_action='approve' then 'sent' else 'closed' end where id = p_id;
  else
    raise exception 'bad kind';
  end if;
end $$;
grant execute on function public.ops_queues(text) to anon;
grant execute on function public.ops_review(text,text,uuid,text) to anon;

-- expire old touring windows nightly
select cron.unschedule('ccd-expire-dates') where exists (select 1 from cron.job where jobname='ccd-expire-dates');
select cron.schedule('ccd-expire-dates', '35 21 * * *', $c$
  update public.artist_dates set status='expired' where status in ('pending','approved') and to_date < current_date;
  delete from public.form_hits where at < now() - interval '2 days';
$c$);
