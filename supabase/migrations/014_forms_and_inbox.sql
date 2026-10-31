-- 014: working public forms and an ops inbox.
-- Additive only. Public forms write through anon RPCs; reads go through the ops token.

-- Promoter applications (the /submit-event page posted to a route that never existed).
create table if not exists public.promoter_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  instagram text,
  website text,
  city text,
  genres text[] not null default '{}',
  bio text,
  sample_event text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.promoter_applications enable row level security;
-- No policies on purpose: anon cannot read or write the table directly.

create unique index if not exists promoter_applications_pending_email
  on public.promoter_applications (lower(email)) where status = 'pending';

-- Contact messages get a handled marker so the ops inbox can hide done ones.
alter table public.contact_messages add column if not exists handled_at timestamptz;

create or replace function public.submit_promoter_application(
  p_name text, p_email text, p_instagram text, p_website text, p_city text,
  p_genres text, p_bio text, p_sample_event text
) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_name, 80) is null then raise exception 'Add your name'; end if;
  if _clean(p_city, 60) is null then raise exception 'Pick your city'; end if;
  if _clean(p_bio, 1500) is null then raise exception 'Tell us about your nights'; end if;
  if exists (select 1 from promoter_applications where lower(email) = lower(p_email) and status = 'pending') then
    raise exception 'You have already applied with this email';
  end if;
  perform _throttle(p_email, 'submit_promoter_application', 3);
  insert into promoter_applications(name, email, instagram, website, city, genres, bio, sample_event)
  values (
    _clean(p_name, 80), lower(btrim(p_email)), _clean(p_instagram, 200), _clean(p_website, 300), _clean(p_city, 60),
    coalesce((select array_agg(distinct btrim(g)) from unnest(string_to_array(coalesce(p_genres, ''), ',')) g where btrim(g) <> ''), '{}'),
    _clean(p_bio, 1500), _clean(p_sample_event, 300)
  );
  return json_build_object('ok', true);
end $$;

-- Ops inbox: everything people sent through public forms that needs a human.
create or replace function public.ops_inbox(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return json_build_object(
    'contact', coalesce((select json_agg(x) from (
      select id, name, email, message, created_at from contact_messages
      where handled_at is null order by created_at desc limit 50) x), '[]'::json),
    'promoters', coalesce((select json_agg(x) from (
      select id, name, email, instagram, website, city, genres, bio, sample_event, created_at from promoter_applications
      where status = 'pending' order by created_at desc limit 50) x), '[]'::json),
    'artists', coalesce((select json_agg(x) from (
      select id, kind, artist_slug, name, email, based_city, genres, instagram, soundcloud, mix_url, bio, created_at from artist_submissions
      where status = 'pending' order by created_at desc limit 50) x), '[]'::json),
    'dates', coalesce((select json_agg(x) from (
      select id, artist_slug, artist_name, email, city, from_date, to_date, note, created_at from artist_dates
      where status = 'pending' order by created_at desc limit 50) x), '[]'::json),
    'bookings', coalesce((select json_agg(x) from (
      select id, artist_slug, name, email, org, city, event_date, budget_inr, message, created_at from booking_requests
      where status = 'new' order by created_at desc limit 50) x), '[]'::json)
  );
end $$;

-- One handler for every inbox row. kind: contact | promoter | artist | dates | booking
create or replace function public.ops_set_inbox_status(p_token text, p_kind text, p_id uuid, p_status text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  if p_kind = 'contact' then
    update contact_messages set handled_at = case when p_status = 'handled' then now() else null end where id = p_id;
  elsif p_kind = 'promoter' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update promoter_applications set status = p_status, reviewed_at = now() where id = p_id;
  elsif p_kind = 'artist' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update artist_submissions set status = p_status, reviewed_at = now() where id = p_id;
  elsif p_kind = 'dates' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update artist_dates set status = p_status where id = p_id;
  elsif p_kind = 'booking' then
    if p_status not in ('new','sent','closed') then raise exception 'bad status'; end if;
    update booking_requests set status = p_status where id = p_id;
  else
    raise exception 'bad kind';
  end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.submit_promoter_application(text,text,text,text,text,text,text,text),
  public.ops_inbox(text), public.ops_set_inbox_status(text,text,uuid,text) from public;
grant execute on function public.submit_promoter_application(text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.ops_inbox(text), public.ops_set_inbox_status(text,text,uuid,text) to anon, authenticated;
