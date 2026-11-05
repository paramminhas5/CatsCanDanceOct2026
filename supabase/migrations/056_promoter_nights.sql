-- 056 Promoter nights (Param, 5 Nov 2026): "anyone can apply and get approved, promoters can get their own look but under
-- the ccd website, we will charge a cut eventually, let's not charge anything right now, build whatever you need to".
-- Additive. Promoters apply, CCD approves them, then they create nights that CCD approves before they go public.
-- A promoter night is an `events` row with promoter_id set, so tickets (free tiers for now), the free list, going,
-- crews and the door all work on it unchanged. CCD's own lists filter promoter_id is null.

alter table public.promoters add column if not exists accent text not null default 'blue'
  check (accent in ('blue', 'red', 'acid', 'pink', 'orange', 'lime', 'cream'));
alter table public.promoters add column if not exists logo_url text;
alter table public.promoters add column if not exists cover_url text;
alter table public.promoters add column if not exists tagline text;
alter table public.promoters add column if not exists applied_by uuid;
alter table public.promoters add column if not exists reviewed_at timestamptz;
alter table public.promoters add column if not exists review_note text;

create table if not exists public.promoter_team (
  promoter_id uuid not null references public.promoters(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  added_by uuid,
  created_at timestamptz not null default now(),
  primary key (promoter_id, email)
);
alter table public.promoter_team enable row level security;

alter table public.events add column if not exists promoter_id uuid references public.promoters(id) on delete set null;
alter table public.events add column if not exists review_status text check (review_status in ('draft', 'pending', 'approved', 'rejected'));
alter table public.events add column if not exists review_note text;
alter table public.events add column if not exists submitted_at timestamptz;
alter table public.events add column if not exists genres text[] not null default '{}';
create index if not exists events_promoter_idx on public.events (promoter_id) where promoter_id is not null;

-- 'staff' for CCD staff and owner, 'owner' or 'admin' for the promoter's team, null for everyone else.
create or replace function public.promoter_role(p_promoter uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.members where id = auth.uid() and role in ('staff', 'owner') and banned_at is null) then 'staff'
    else (select t.role from public.promoter_team t where t.promoter_id = p_promoter and t.email = public.door_me_email()
          and not exists (select 1 from public.members where id = auth.uid() and banned_at is not null))
  end;
$$;

create or replace function public.promoter_slugify(p text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ---------- Apply ----------
create or replace function public.promoter_apply(p_name text, p_city text, p_instagram text, p_website text, p_blurb text, p_genres text[] default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare base text; s text; n int := 1; v_id uuid; em text := public.door_me_email();
begin
  if auth.uid() is null or em is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if coalesce(length(trim(p_name)), 0) < 2 or length(p_name) > 80 then return jsonb_build_object('ok', false, 'error', 'Add your promoter or crew name.'); end if;
  if coalesce(trim(p_city), '') = '' then return jsonb_build_object('ok', false, 'error', 'Add your city.'); end if;
  if coalesce(trim(p_instagram), '') = '' and coalesce(trim(p_website), '') = '' then return jsonb_build_object('ok', false, 'error', 'Add an Instagram or a website so we can see your past nights.'); end if;
  if (select count(*) from public.promoters where applied_by = auth.uid() and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'Three applications a day is the limit.'); end if;
  base := nullif(public.promoter_slugify(p_name), '');
  if base is null then base := 'promoter'; end if;
  s := base;
  while exists (select 1 from public.promoters where slug = s) loop n := n + 1; s := base || '-' || n; end loop;
  insert into public.promoters (slug, name, city, cities, genres, blurb, instagram, website, status, applied_by, kind)
  values (s, trim(p_name), trim(p_city), array[trim(p_city)], coalesce(p_genres, '{}'), left(nullif(trim(p_blurb), ''), 600),
    left(nullif(trim(p_instagram), ''), 120), left(nullif(trim(p_website), ''), 200), 'pending', auth.uid(), 'promoter')
  returning id into v_id;
  insert into public.promoter_team (promoter_id, email, role, added_by) values (v_id, em, 'owner', auth.uid());
  return jsonb_build_object('ok', true, 'slug', s);
exception when check_violation then return jsonb_build_object('ok', false, 'error', 'Check the fields and try again.');
end $$;

-- Promoters this person can manage (or every pending and approved one for CCD staff).
create or replace function public.my_promoters() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  return jsonb_build_object('ok', true, 'promoters', coalesce((select jsonb_agg(jsonb_build_object(
      'slug', p.slug, 'name', p.name, 'status', p.status, 'city', p.city, 'accent', p.accent, 'role', public.promoter_role(p.id),
      'nights', (select count(*) from public.events e where e.promoter_id = p.id)) order by p.name)
    from public.promoters p
    where exists (select 1 from public.promoter_team t where t.promoter_id = p.id and t.email = public.door_me_email())), '[]'::jsonb));
end $$;

-- Everything the dashboard needs.
create or replace function public.promoter_get(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p public.promoters; r text;
begin
  select * into p from public.promoters where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'Not found.'); end if;
  r := public.promoter_role(p.id);
  if r is null then return jsonb_build_object('ok', false, 'error', 'You are not on this promoter''s team.'); end if;
  return jsonb_build_object('ok', true, 'role', r,
    'promoter', jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'status', p.status, 'city', p.city, 'genres', p.genres, 'blurb', p.blurb,
      'tagline', p.tagline, 'instagram', p.instagram, 'website', p.website, 'accent', p.accent, 'logo_url', p.logo_url, 'cover_url', p.cover_url, 'review_note', p.review_note),
    'team', coalesce((select jsonb_agg(jsonb_build_object('email', t.email, 'role', t.role) order by t.role desc, t.email) from public.promoter_team t where t.promoter_id = p.id), '[]'::jsonb),
    'nights', coalesce((select jsonb_agg(jsonb_build_object(
        'slug', e.slug, 'title', e.title, 'event_date', e.event_date, 'start_time', e.start_time, 'venue', e.venue, 'city', e.city, 'capacity', e.capacity,
        'blurb', e.blurb, 'lineup', e.lineup, 'genres', e.genres, 'poster_url', e.poster_url, 'ticket_url', e.ticket_url, 'rsvp_open', e.rsvp_open,
        'published', e.published, 'review_status', e.review_status, 'review_note', e.review_note,
        'tiers', coalesce((select jsonb_agg(jsonb_build_object('name', t.name, 'capacity', t.capacity, 'max_per_order', t.max_per_order) order by t.sort_order)
                 from public.ticket_tiers t where t.event_slug = e.slug and t.active), '[]'::jsonb),
        'tickets', (select count(*) from public.tickets k where k.event_slug = e.slug and k.voided_at is null),
        'rsvps', (select coalesce(sum(1 + coalesce(plus_ones, 0)), 0) from public.event_rsvps r where r.event_slug = e.slug),
        'going', (select count(*) from public.night_plans n where n.night_key = e.slug and n.state = 'going'),
        'inside', (select count(*) from public.tickets k where k.event_slug = e.slug and k.checked_in_at is not null and k.voided_at is null))
      order by e.event_date desc nulls last) from public.events e where e.promoter_id = p.id), '[]'::jsonb));
end $$;

create or replace function public.promoter_save(p_slug text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.promoters; r text; acc text := p_data ->> 'accent';
begin
  select * into p from public.promoters where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'Not found.'); end if;
  r := public.promoter_role(p.id);
  if r is null then return jsonb_build_object('ok', false, 'error', 'You are not on this promoter''s team.'); end if;
  if (p_data ? 'logo_url' and coalesce(p_data ->> 'logo_url', '') <> '' and p_data ->> 'logo_url' !~ '^https://')
     or (p_data ? 'cover_url' and coalesce(p_data ->> 'cover_url', '') <> '' and p_data ->> 'cover_url' !~ '^https://') then
    return jsonb_build_object('ok', false, 'error', 'Image links must start with https://'); end if;
  update public.promoters set
    name = coalesce(nullif(left(trim(p_data ->> 'name'), 80), ''), name),
    tagline = case when p_data ? 'tagline' then left(nullif(trim(p_data ->> 'tagline'), ''), 120) else tagline end,
    blurb = case when p_data ? 'blurb' then left(nullif(trim(p_data ->> 'blurb'), ''), 1200) else blurb end,
    city = coalesce(nullif(left(trim(p_data ->> 'city'), 60), ''), city),
    instagram = case when p_data ? 'instagram' then left(nullif(trim(p_data ->> 'instagram'), ''), 120) else instagram end,
    website = case when p_data ? 'website' then left(nullif(trim(p_data ->> 'website'), ''), 200) else website end,
    accent = case when acc in ('blue', 'red', 'acid', 'pink', 'orange', 'lime', 'cream') then acc else accent end,
    logo_url = case when p_data ? 'logo_url' then nullif(trim(p_data ->> 'logo_url'), '') else logo_url end,
    cover_url = case when p_data ? 'cover_url' then nullif(trim(p_data ->> 'cover_url'), '') else cover_url end,
    genres = case when p_data ? 'genres' then coalesce((select array_agg(left(trim(g), 40)) from jsonb_array_elements_text(p_data -> 'genres') g where trim(g) <> ''), '{}') else genres end,
    updated_at = now()
  where id = p.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.promoter_team_set(p_slug text, p_email text, p_role text, p_remove boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.promoters; r text; em text := lower(trim(p_email));
begin
  select * into p from public.promoters where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'Not found.'); end if;
  r := public.promoter_role(p.id);
  if coalesce(r, '') not in ('owner', 'staff') then return jsonb_build_object('ok', false, 'error', 'Only the owner can change the team.'); end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return jsonb_build_object('ok', false, 'error', 'Add a real email.'); end if;
  if coalesce(p_remove, false) then
    if (select count(*) from public.promoter_team where promoter_id = p.id and role = 'owner' and email <> em) = 0
       and exists (select 1 from public.promoter_team where promoter_id = p.id and email = em and role = 'owner') then
      return jsonb_build_object('ok', false, 'error', 'Add another owner before removing the last one.'); end if;
    delete from public.promoter_team where promoter_id = p.id and email = em;
  else
    insert into public.promoter_team (promoter_id, email, role, added_by) values (p.id, em, case when p_role = 'owner' then 'owner' else 'admin' end, auth.uid())
    on conflict (promoter_id, email) do update set role = excluded.role;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Nights ----------
-- Create or update a night. Tickets are free for now: tiers are names and caps, price is always 0.
-- A paid night uses its own ticket link (ticket_url) until CCD takes payments.
create or replace function public.promoter_night_save(p_slug text, p_night text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.promoters; r text; e public.events; d date; base text; s text; n int := 1; tier jsonb; i int := 0; kept text[] := '{}';
begin
  select * into p from public.promoters where slug = p_slug;
  if not found then return jsonb_build_object('ok', false, 'error', 'Not found.'); end if;
  r := public.promoter_role(p.id);
  if r is null then return jsonb_build_object('ok', false, 'error', 'You are not on this promoter''s team.'); end if;
  if p.status <> 'approved' and r <> 'staff' then return jsonb_build_object('ok', false, 'error', 'You can add nights once CCD has approved you.'); end if;
  if coalesce(length(trim(p_data ->> 'title')), 0) < 2 then return jsonb_build_object('ok', false, 'error', 'Add the night''s name.'); end if;
  begin d := (p_data ->> 'event_date')::date; exception when others then d := null; end;
  if d is null then return jsonb_build_object('ok', false, 'error', 'Add the date.'); end if;
  if coalesce(trim(p_data ->> 'venue'), '') = '' or coalesce(trim(p_data ->> 'city'), '') = '' then return jsonb_build_object('ok', false, 'error', 'Add the venue and city.'); end if;
  if coalesce(p_data ->> 'ticket_url', '') <> '' and p_data ->> 'ticket_url' !~ '^https://' then return jsonb_build_object('ok', false, 'error', 'The ticket link must start with https://'); end if;
  if coalesce(p_data ->> 'poster_url', '') <> '' and p_data ->> 'poster_url' !~ '^https://' then return jsonb_build_object('ok', false, 'error', 'The poster link must start with https://'); end if;

  if p_night is null or p_night = '' then
    if d < current_date then return jsonb_build_object('ok', false, 'error', 'Pick a date that has not passed.'); end if;
    base := public.promoter_slugify(p.slug || '-' || to_char(d, 'YYYY-MM-DD'));
    s := base;
    while exists (select 1 from public.events where slug = s) loop n := n + 1; s := base || '-' || n; end loop;
    insert into public.events (slug, title, date, event_date, city, venue, status, published, listed, promoter_id, review_status, event_type, series_label)
    values (s, left(trim(p_data ->> 'title'), 120), to_char(d, 'Dy, Mon FMDD, YYYY'), d, trim(p_data ->> 'city'), trim(p_data ->> 'venue'),
      'upcoming', false, true, p.id, 'draft', 'promoter', p.name)
    returning * into e;
  else
    select * into e from public.events where slug = p_night and promoter_id = p.id;
    if not found then return jsonb_build_object('ok', false, 'error', 'Night not found.'); end if;
  end if;

  update public.events set
    title = left(trim(p_data ->> 'title'), 120),
    event_date = d, date = to_char(d, 'Dy, Mon FMDD, YYYY'),
    start_time = left(nullif(trim(p_data ->> 'start_time'), ''), 20),
    venue = left(trim(p_data ->> 'venue'), 120), city = left(trim(p_data ->> 'city'), 60),
    capacity = nullif(p_data ->> 'capacity', '')::int,
    blurb = left(nullif(trim(p_data ->> 'blurb'), ''), 1500),
    lineup = coalesce((select array_agg(left(trim(x), 60)) from jsonb_array_elements_text(coalesce(p_data -> 'lineup', '[]'::jsonb)) x where trim(x) <> ''), '{}'),
    genres = coalesce((select array_agg(left(trim(x), 40)) from jsonb_array_elements_text(coalesce(p_data -> 'genres', '[]'::jsonb)) x where trim(x) <> ''), '{}'),
    poster_url = nullif(trim(p_data ->> 'poster_url'), ''),
    ticket_url = nullif(trim(p_data ->> 'ticket_url'), ''),
    rsvp_open = coalesce((p_data ->> 'rsvp_open')::boolean, false),
    series_label = p.name,
    updated_at = now()
  where id = e.id;

  -- Free ticket types. Tiers left out are switched off, never deleted, because tickets point at them.
  for tier in select * from jsonb_array_elements(coalesce(p_data -> 'tiers', '[]'::jsonb)) loop
    continue when coalesce(trim(tier ->> 'name'), '') = '';
    i := i + 1;
    kept := kept || left(trim(tier ->> 'name'), 60);
    if exists (select 1 from public.ticket_tiers where event_slug = e.slug and name = left(trim(tier ->> 'name'), 60)) then
      update public.ticket_tiers set price_inr = 0, capacity = nullif(tier ->> 'capacity', '')::int,
        max_per_order = greatest(1, least(10, coalesce(nullif(tier ->> 'max_per_order', '')::int, 2))), active = true, sort_order = i
      where event_slug = e.slug and name = left(trim(tier ->> 'name'), 60);
    else
      insert into public.ticket_tiers (event_slug, name, price_inr, capacity, max_per_order, active, sort_order)
      values (e.slug, left(trim(tier ->> 'name'), 60), 0, nullif(tier ->> 'capacity', '')::int, greatest(1, least(10, coalesce(nullif(tier ->> 'max_per_order', '')::int, 2))), true, i);
    end if;
  end loop;
  update public.ticket_tiers set active = false where event_slug = e.slug and not (name = any(kept));

  return jsonb_build_object('ok', true, 'slug', e.slug, 'published', e.published);
exception
  when invalid_text_representation then return jsonb_build_object('ok', false, 'error', 'Capacity must be a number.');
  when check_violation then return jsonb_build_object('ok', false, 'error', 'Check the ticket types: names need 2 to 60 letters, caps 1 to 5000, up to 10 per order.');
end $$;

-- Ask CCD to put the night up, or take it down.
create or replace function public.promoter_night_status(p_night text, p_action text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.events; r text;
begin
  select * into e from public.events where slug = p_night and promoter_id is not null;
  if not found then return jsonb_build_object('ok', false, 'error', 'Night not found.'); end if;
  r := public.promoter_role(e.promoter_id);
  if r is null then return jsonb_build_object('ok', false, 'error', 'You are not on this promoter''s team.'); end if;
  if p_action = 'submit' then
    update public.events set review_status = case when published then 'approved' else 'pending' end, submitted_at = now() where id = e.id;
  elsif p_action = 'withdraw' then
    update public.events set published = false, review_status = 'draft' where id = e.id;
  else return jsonb_build_object('ok', false, 'error', 'Unknown action.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- CCD review (ops token, shown on /ops) ----------
create or replace function public.ops_promoter_queue(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return jsonb_build_object(
    'promoters', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'city', p.city, 'instagram', p.instagram, 'website', p.website,
        'blurb', p.blurb, 'created_at', p.created_at, 'owner', (select string_agg(t.email, ', ') from public.promoter_team t where t.promoter_id = p.id and t.role = 'owner'))
      order by p.created_at) from public.promoters p where p.status = 'pending' and p.applied_by is not null), '[]'::jsonb),
    'nights', coalesce((select jsonb_agg(jsonb_build_object('slug', e.slug, 'title', e.title, 'event_date', e.event_date, 'venue', e.venue, 'city', e.city,
        'lineup', e.lineup, 'blurb', e.blurb, 'ticket_url', e.ticket_url, 'promoter', p.name, 'promoter_slug', p.slug, 'submitted_at', e.submitted_at)
      order by e.submitted_at) from public.events e join public.promoters p on p.id = e.promoter_id where e.review_status = 'pending'), '[]'::jsonb));
end $$;

create or replace function public.ops_review_promoter(p_token text, p_id uuid, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  update public.promoters set status = case when p_approve then 'approved' else 'hidden' end, reviewed_at = now(), review_note = left(p_note, 400), updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ops_review_night(p_token text, p_slug text, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  update public.events set published = coalesce(p_approve, false), review_status = case when p_approve then 'approved' else 'rejected' end,
    review_note = left(p_note, 400), updated_at = now()
  where slug = p_slug and promoter_id is not null;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- The door opens for the promoter's own team too ----------
create or replace function public.door_can(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.door_can()
    or exists (select 1 from public.door_team d where d.event_slug = p_slug and d.email = public.door_me_email())
    or exists (select 1 from public.events e join public.promoter_team t on t.promoter_id = e.promoter_id
               where e.slug = p_slug and t.email = public.door_me_email())
  ) and not exists (select 1 from public.members where id = auth.uid() and banned_at is not null);
$$;

create or replace function public.door_can_lead(p_slug text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = auth.uid() and role in ('staff', 'owner') and banned_at is null)
    or exists (select 1 from public.door_team d where d.event_slug = p_slug and d.email = public.door_me_email() and d.role = 'lead')
    or exists (select 1 from public.events e join public.promoter_team t on t.promoter_id = e.promoter_id
               where e.slug = p_slug and t.email = public.door_me_email());
$$;

revoke all on function public.promoter_role(uuid), public.promoter_apply(text, text, text, text, text, text[]), public.my_promoters(), public.promoter_get(text),
  public.promoter_save(text, jsonb), public.promoter_team_set(text, text, text, boolean), public.promoter_night_save(text, text, jsonb),
  public.promoter_night_status(text, text) from public, anon;
grant execute on function public.promoter_role(uuid), public.promoter_apply(text, text, text, text, text, text[]), public.my_promoters(), public.promoter_get(text),
  public.promoter_save(text, jsonb), public.promoter_team_set(text, text, text, boolean), public.promoter_night_save(text, text, jsonb),
  public.promoter_night_status(text, text) to authenticated;
grant execute on function public.ops_promoter_queue(text), public.ops_review_promoter(text, uuid, boolean, text), public.ops_review_night(text, text, boolean, text) to anon, authenticated;
