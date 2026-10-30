-- 025: self-serve roles. A member can become an artist, a host or a promoter at sign-up or later, from /club.
-- Pending claims and submissions made with the same (verified) email are assigned automatically on sign-up and on login.
-- Hosts who grant themselves the role still need staff approval to publish; ops-approved hosts keep auto-publish.
-- Additive. Role changes by ops still go through ops_set_member_role.

alter table public.members add column if not exists is_promoter boolean not null default false;
alter table public.members add column if not exists host_verified boolean not null default false;
update public.members set host_verified = true where role in ('host','staff','owner');

-- Flags can only change inside the RPCs below (they set ccd.allow_role_change).
create or replace function public.members_lock_flags() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then new.is_promoter := false; new.host_verified := false;
  elsif coalesce(current_setting('ccd.allow_role_change', true), '') <> '1' then
    new.is_promoter := old.is_promoter; new.host_verified := old.host_verified;
  end if;
  return new;
end $$;
drop trigger if exists members_lock_flags_trg on public.members;
create trigger members_lock_flags_trg before insert or update on public.members for each row execute function public.members_lock_flags();

create or replace function public.ops_set_member_role(p_token text, p_email text, p_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  if p_role not in ('member','host','staff','owner') then return jsonb_build_object('ok', false, 'error', 'bad role'); end if;
  perform set_config('ccd.allow_role_change', '1', true);
  update public.members set role = p_role, host_verified = (p_role in ('host','staff','owner')) where lower(email) = lower(p_email);
  return jsonb_build_object('ok', found);
end $$;

-- Hosting: anyone can host. Staff and owner and ops-approved hosts publish at once. Everyone else waits for review.
create or replace function public.submit_hosted_event(p_title text, p_date date, p_time text, p_city text, p_venue text, p_genres text[], p_lineup text[], p_ticket_url text, p_about text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_role text; v_ver boolean; h public.hosted_events; v_ev uuid;
begin
  select role, host_verified into v_role, v_ver from public.members where id = auth.uid();
  if v_role is null then return jsonb_build_object('ok', false, 'error', 'Join first.'); end if;
  if (select count(*) from public.hosted_events where host_id = auth.uid() and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'Three submissions a day is the limit.');
  end if;
  if p_date is null or p_date < current_date then return jsonb_build_object('ok', false, 'error', 'Pick a date in the future.'); end if;
  if v_role = 'member' then
    perform set_config('ccd.allow_role_change', '1', true);
    update public.members set role = 'host' where id = auth.uid();
    v_role := 'host';
  end if;
  insert into public.hosted_events(host_id, title, event_date, event_time, city, venue, genres, lineup, ticket_url, about)
  values (auth.uid(), trim(p_title), p_date, nullif(trim(p_time),''), trim(p_city), nullif(trim(p_venue),''), coalesce(p_genres,'{}'), coalesce(p_lineup,'{}'), nullif(trim(p_ticket_url),''), nullif(trim(p_about),''))
  returning id into v_id;
  if v_role in ('staff','owner') or v_ver then
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

create or replace function public.become_host() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  perform set_config('ccd.allow_role_change', '1', true);
  update public.members set role = 'host' where id = auth.uid() and role = 'member';
  return jsonb_build_object('ok', true);
end $$;

-- Hand over pages and submissions that were waiting for this email. Safe because sign-in proves the email.
create or replace function public._adopt_pending(p_id uuid, p_email text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int := 0; s record; v_slug text; base text;
begin
  -- 1. claims on existing profiles, not yet approved or approved earlier with this email
  update public.artists a set owner_member = p_id, claimed_email = coalesce(a.claimed_email, lower(p_email)), claimed_at = coalesce(a.claimed_at, now())
   where a.owner_member is null and (lower(a.claimed_email) = lower(p_email)
     or a.slug in (select artist_slug from public.artist_submissions where kind = 'claim' and status = 'pending' and lower(email) = lower(p_email)));
  get diagnostics n = row_count;
  -- 2. new-artist submissions: make the (hidden) profile and give it to them
  if not exists (select 1 from public.artists where owner_member = p_id) then
    select * into s from public.artist_submissions where kind = 'new' and status = 'pending' and lower(email) = lower(p_email) order by created_at limit 1;
    if found then
      base := trim(both '-' from lower(regexp_replace(s.name, '[^a-zA-Z0-9]+', '-', 'g')));
      v_slug := base; if exists (select 1 from public.artists where slug = v_slug) then v_slug := base || '-' || substr(md5(random()::text), 1, 4); end if;
      insert into public.artists(slug, name, status, based_city, genres, instagram, soundcloud, mix_url, bio, owner_member, claimed_email, claimed_at, source)
      values (v_slug, s.name, 'pending', s.based_city, coalesce(s.genres, '{}'), s.instagram, s.soundcloud, s.mix_url, s.bio, p_id, lower(p_email), now(), 'member');
      n := n + 1;
    end if;
  end if;
  -- 3. promoter applications already sent with this email
  if exists (select 1 from public.promoter_applications where lower(email) = lower(p_email) and status in ('pending','approved')) then
    perform set_config('ccd.allow_role_change', '1', true);
    update public.members set is_promoter = true where id = p_id and not is_promoter;
  end if;
  return jsonb_build_object('ok', true, 'assigned', n);
end $$;
revoke all on function public._adopt_pending(uuid, text) from public;

create or replace function public.link_claimed_artists() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._adopt_pending(new.id, new.email);
  return new;
end $$;

create or replace function public.adopt_my_pending() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  return public._adopt_pending(auth.uid(), auth.jwt() ->> 'email');
end $$;

-- Register as an artist from inside the club. Existing profile with this name: sends a claim for review. Otherwise a new hidden profile is created and assigned.
create or replace function public.become_artist(p_name text, p_city text, p_genres text, p_instagram text, p_soundcloud text, p_mix_url text, p_claim_slug text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email'; v_slug text; base text; r jsonb;
begin
  if auth.uid() is null or v_email is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join the club first.'); end if;
  perform public._adopt_pending(auth.uid(), v_email);
  select slug into v_slug from public.artists where owner_member = auth.uid() limit 1;
  if v_slug is not null then return jsonb_build_object('ok', true, 'slug', v_slug, 'assigned', true); end if;
  if _clean(p_name, 80) is null then return jsonb_build_object('ok', false, 'error', 'Add your artist name.'); end if;
  if _clean(p_instagram,200) is null and _clean(p_soundcloud,300) is null and _clean(p_mix_url,300) is null then
    return jsonb_build_object('ok', false, 'error', 'Add at least one link: Instagram, SoundCloud or a mix.'); end if;
  if p_claim_slug is not null and exists (select 1 from public.artists where slug = p_claim_slug and owner_member is null) then
    insert into public.artist_submissions(kind, artist_slug, name, email, based_city, instagram, soundcloud, mix_url)
    values ('claim', p_claim_slug, _clean(p_name,80), lower(v_email), _clean(p_city,60), _clean(p_instagram,200), _clean(p_soundcloud,300), _clean(p_mix_url,300));
    return jsonb_build_object('ok', true, 'claim', true);
  end if;
  insert into public.artist_submissions(kind, name, email, based_city, genres, instagram, soundcloud, mix_url)
  values ('new', _clean(p_name,80), lower(v_email), _clean(p_city,60),
    coalesce((select array_agg(distinct btrim(g)) from unnest(string_to_array(coalesce(p_genres,''), ',')) g where btrim(g) <> ''), '{}'),
    _clean(p_instagram,200), _clean(p_soundcloud,300), _clean(p_mix_url,300));
  r := public._adopt_pending(auth.uid(), v_email);
  select slug into v_slug from public.artists where owner_member = auth.uid() limit 1;
  return jsonb_build_object('ok', true, 'slug', v_slug, 'created', true);
end $$;

create or replace function public.become_promoter(p_name text, p_city text, p_instagram text, p_bio text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null or v_email is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if not exists (select 1 from public.members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Join the club first.'); end if;
  perform set_config('ccd.allow_role_change', '1', true);
  update public.members set is_promoter = true where id = auth.uid();
  if not exists (select 1 from public.promoter_applications where lower(email) = lower(v_email) and status in ('pending','approved')) then
    insert into public.promoter_applications(name, email, instagram, city, bio)
    values (coalesce(_clean(p_name,80), 'Promoter'), lower(v_email), _clean(p_instagram,200), coalesce(_clean(p_city,60), 'Unknown'), coalesce(_clean(p_bio,1500), 'Joined from the club page.'));
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Everything the UI needs to show role cards.
create or replace function public.my_roles() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('role', m.role, 'host_verified', m.host_verified, 'is_promoter', m.is_promoter,
    'artist_slug', a.slug, 'artist_status', a.status)
   from public.members m left join public.artists a on a.owner_member = m.id where m.id = auth.uid() limit 1), 'null'::jsonb);
$$;

-- Approving a new-artist submission publishes the hidden profile that was made for it.
create or replace function public.ops_set_inbox_status(p_token text, p_kind text, p_id uuid, p_status text)
returns json language plpgsql security definer set search_path = public as $$
declare s public.artist_submissions;
begin
  perform ops_check(p_token);
  if p_kind = 'contact' then
    update contact_messages set handled_at = case when p_status = 'handled' then now() else null end where id = p_id;
  elsif p_kind = 'promoter' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update promoter_applications set status = p_status, reviewed_at = now() where id = p_id;
  elsif p_kind = 'artist' then
    if p_status not in ('pending','approved','rejected') then raise exception 'bad status'; end if;
    update artist_submissions set status = p_status, reviewed_at = now() where id = p_id returning * into s;
    if p_status = 'approved' and s.kind = 'claim' and s.artist_slug is not null then
      update artists set claimed_email = s.email, claimed_at = now(),
             owner_member = coalesce(owner_member, (select id from members where lower(email) = lower(s.email) limit 1))
        where slug = s.artist_slug;
    elsif p_status = 'approved' and s.kind = 'new' then
      update artists set status = 'approved' where lower(claimed_email) = lower(s.email) and status = 'pending' and lower(name) = lower(s.name);
    end if;
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

-- The artist editor also needs to know if the profile is live yet.
create or replace function public.my_artist() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('slug', slug, 'name', name, 'bio', bio, 'based_city', based_city, 'genres', genres,
           'instagram', instagram, 'soundcloud', soundcloud, 'website', website, 'mix_url', mix_url, 'photo_url', photo_url, 'status', status)
    from public.artists where owner_member = auth.uid() limit 1), 'null'::jsonb);
$$;

revoke all on function public.become_host(), public.adopt_my_pending(), public.become_artist(text,text,text,text,text,text,text),
  public.become_promoter(text,text,text,text), public.my_roles() from public;
grant execute on function public.become_host(), public.adopt_my_pending(), public.become_artist(text,text,text,text,text,text,text),
  public.become_promoter(text,text,text,text), public.my_roles() to authenticated;
