-- 009: roles (visitor / member / host / staff / owner), ops admin RPCs, own artist registry.
-- Additive. Visitors are signed-out users. Roles are changed only through ops_set_member_role.

alter table public.members drop constraint if exists members_role_check;
do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid='public.members'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%role%' loop
    execute format('alter table public.members drop constraint %I', c);
  end loop;
end $$;
alter table public.members add constraint members_role_chk check (role in ('member','host','staff','owner'));

alter table public.artists add column if not exists links jsonb;

-- Staff checks now accept owner too.
do $$ declare f text; d text; begin
  for f in select unnest(array['member_vouch','pending_hosted_events','review_hosted_event','vouchable_events']) loop
    select pg_get_functiondef(p.oid) into d from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=f;
    d := replace(d, 'role = ''staff''', 'role in (''staff'',''owner'')');
    execute d;
  end loop;
end $$;

-- Hosts and the CCD team publish their own nights without review. Members go to the review queue.
create or replace function public.submit_hosted_event(p_title text, p_date date, p_time text, p_city text, p_venue text, p_genres text[], p_lineup text[], p_ticket_url text, p_about text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_role text; h public.hosted_events; v_ev uuid;
begin
  select role into v_role from public.members where id = auth.uid();
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if (select count(*) from public.hosted_events where host_id = auth.uid() and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'Three submissions a day is the limit.');
  end if;
  if p_date is null or p_date < current_date then return jsonb_build_object('ok', false, 'error', 'Pick a date in the future.'); end if;
  insert into public.hosted_events(host_id, title, event_date, event_time, city, venue, genres, lineup, ticket_url, about)
  values (auth.uid(), trim(p_title), p_date, nullif(trim(p_time),''), trim(p_city), nullif(trim(p_venue),''), coalesce(p_genres,'{}'), coalesce(p_lineup,'{}'), nullif(trim(p_ticket_url),''), nullif(trim(p_about),''))
  returning id into v_id;
  if v_role in ('host','staff','owner') then
    select * into h from public.hosted_events where id = v_id;
    insert into public.scraped_events(title, url, source, city, venue, event_date, event_time, genres, lineup, ticket_url, kind, status, published_at, submitter_email)
    values (h.title, 'https://catscandance.com/whats-on#host-' || h.id, 'member', h.city, h.venue, h.event_date, h.event_time, h.genres, h.lineup, h.ticket_url, 'club', 'published', now(), (select email from public.members where id = h.host_id))
    returning id into v_ev;
    update public.scraped_events set status = 'published', published_at = now() where id = v_ev;
    update public.hosted_events set status = 'approved', published_event_id = v_ev where id = v_id;
    return jsonb_build_object('ok', true, 'published', true);
  end if;
  return jsonb_build_object('ok', true, 'published', false);
exception when check_violation then return jsonb_build_object('ok', false, 'error', 'Check the date, link and field lengths.');
end $$;

create or replace function public.ops_set_member_role(p_token text, p_email text, p_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  if p_role not in ('member','host','staff','owner') then return jsonb_build_object('ok', false, 'error', 'bad role'); end if;
  perform set_config('ccd.allow_role_change', '1', true);
  update public.members set role = p_role where lower(email) = lower(p_email);
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ops_members(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(m) from (select email, display_name, city, role, created_at from public.members order by (role='owner') desc, (role='staff') desc, created_at desc limit 300) m), '[]');
end $$;

create or replace function public.ops_artists(p_token text, p_status text default 'hidden') returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(a) from (
    select id, slug, name, based_city, status, source, genres, instagram, spotify, links,
           enrich_sources->'candidates' as candidates, enrich_sources->>'confidence' as confidence
    from public.artists where status = p_status order by name limit 400) a), '[]');
end $$;

create or replace function public.ops_set_artist_status(p_token text, p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  if p_status not in ('pending','approved','hidden') then return jsonb_build_object('ok', false, 'error', 'bad status'); end if;
  update public.artists set status = p_status, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ops_bulk_artists(p_token text, p_from text, p_to text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public.ops_check(p_token);
  if p_to not in ('pending','approved','hidden') then return jsonb_build_object('ok', false, 'error', 'bad status'); end if;
  update public.artists set status = p_to, updated_at = now() where status = p_from;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'changed', n);
end $$;

-- Staff confirms the Deezer / Apple Music candidates are the right artist.
create or replace function public.ops_confirm_candidate(p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c jsonb;
begin
  perform public.ops_check(p_token);
  select enrich_sources->'candidates' into c from public.artists where id = p_id;
  if c is null then return jsonb_build_object('ok', false, 'error', 'no candidates'); end if;
  update public.artists set links = jsonb_strip_nulls(jsonb_build_object('deezer', c#>>'{deezer,link}', 'apple', c#>>'{apple,link}')),
    enrich_sources = jsonb_set(coalesce(enrich_sources,'{}'), '{confidence}', '"confirmed by CCD"'), updated_at = now()
  where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Our own registry: artists that appear on event lineups but are not in the database yet.
-- They arrive hidden. Param approves them in ops. This is how Indian acts MusicBrainz does not know get in.
create or replace function public.ops_discover_artists(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int := 0; r record; v_slug text;
begin
  perform public.ops_check(p_token);
  for r in
    select distinct on (k) trim(x) as nm, regexp_replace(lower(x), '[^a-z0-9]', '', 'g') as k, e.city
    from public.scraped_events e, unnest(e.lineup) x
    where e.status in ('pending','published') and e.event_date >= current_date
      and char_length(trim(x)) between 2 and 40 and trim(x) !~ '^[0-9 ]+$'
      and lower(trim(x)) not in ('tba','tbc','live','dj set','guests','special guests','more','and more','lineup')
      and regexp_replace(lower(x), '[^a-z0-9]', '', 'g') <> ''
      and not exists (select 1 from public.artists a where regexp_replace(lower(a.name), '[^a-z0-9]', '', 'g') = regexp_replace(lower(x), '[^a-z0-9]', '', 'g'))
  loop
    v_slug := trim(both '-' from regexp_replace(lower(r.nm), '[^a-z0-9]+', '-', 'g'));
    if v_slug = '' or exists (select 1 from public.artists where slug = v_slug) then continue; end if;
    insert into public.artists(slug, name, status, source) values (v_slug, upper(r.nm), 'hidden', 'discovered');
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'added', n);
end $$;

create or replace function public.ops_swaps(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(s) from (select id, event_label, swap_type, ticket_count, face_value_inr, tier, note, contact, status, created_at from public.ticket_swaps where status in ('pending','approved') order by (status='pending') desc, created_at desc limit 100) s), '[]');
end $$;

revoke execute on function public.ops_members(text), public.ops_artists(text,text), public.ops_set_artist_status(text,uuid,text),
  public.ops_bulk_artists(text,text,text), public.ops_confirm_candidate(text,uuid), public.ops_discover_artists(text), public.ops_swaps(text) from public;
grant execute on function public.ops_members(text), public.ops_artists(text,text), public.ops_set_artist_status(text,uuid,text),
  public.ops_bulk_artists(text,text,text), public.ops_confirm_candidate(text,uuid), public.ops_discover_artists(text), public.ops_swaps(text) to anon, authenticated;
