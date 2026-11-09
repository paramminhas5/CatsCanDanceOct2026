-- 063: Host parties. "Make a party" on Host creates a real night (an events row the host owns), so the
-- invite, RSVPs, who's coming, the door and the report all work for anyone, not only approved promoters.
-- Additive: two nullable columns, two new functions. Host parties are never listed on Nights by this
-- (listed = false); "Listed on Nights" sends the same party to CCD for review through submit_hosted_event,
-- exactly as before.

alter table public.events add column if not exists host_id uuid references public.members(id);
alter table public.events add column if not exists look text;
create index if not exists events_host_id_idx on public.events(host_id) where host_id is not null;

create or replace function public.host_party_make(
  p_title text, p_date date, p_time text, p_city text, p_where text, p_look text,
  p_entry text, p_ticket_url text, p_listed boolean, p_lineup text[], p_about text, p_capacity integer
) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_email text; v_name text; v_slug text; v_base text; v_listed jsonb;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  select email, coalesce(nullif(display_name, ''), split_part(email, '@', 1)) into v_email, v_name
    from public.members where id = v_uid and banned_at is null;
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if _clean(p_title, 120) is null then return jsonb_build_object('ok', false, 'error', 'Give the party a name.'); end if;
  if p_date is null or p_date < current_date then return jsonb_build_object('ok', false, 'error', 'Pick a date from today on.'); end if;
  if _clean(p_city, 60) is null then return jsonb_build_object('ok', false, 'error', 'Add the city.'); end if;
  if coalesce(p_entry, 'rsvp') not in ('rsvp', 'tickets') then return jsonb_build_object('ok', false, 'error', 'Pick how people get in.'); end if;
  if p_entry = 'tickets' and (p_ticket_url is null or p_ticket_url !~* '^https?://') then
    return jsonb_build_object('ok', false, 'error', 'Add the link where people buy tickets.'); end if;
  if (select count(*) from public.events where host_id = v_uid and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'Three parties a day is the limit.'); end if;

  v_base := trim(both '-' from left(regexp_replace(lower(_clean(p_title, 120)), '[^a-z0-9]+', '-', 'g'), 60));
  if v_base = '' or v_base like 'test-%' then v_base := 'party'; end if;
  loop
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 5);
    exit when not exists (select 1 from public.events where slug = v_slug);
  end loop;

  insert into public.events(slug, title, event_date, date, start_time, city, venue, blurb, lineup, ticket_url,
    rsvp_open, capacity, published, listed, status, event_type, host_id, look)
  values (v_slug, _clean(p_title, 120), p_date, to_char(p_date, 'Dy, Mon FMDD, YYYY'), nullif(trim(coalesce(p_time, '')), ''),
    _clean(p_city, 60), _clean(p_where, 120), _clean(p_about, 1200), coalesce(p_lineup[1:12], '{}'),
    case when p_entry = 'tickets' then trim(p_ticket_url) end,
    coalesce(p_entry, 'rsvp') = 'rsvp', case when p_capacity between 1 and 20000 then p_capacity end,
    true, false, 'upcoming', 'party', v_uid,
    case when p_look in ('pink', 'blue', 'lime', 'yellow', 'ink') then p_look else 'pink' end);

  insert into public.door_team(event_slug, email, role, name, added_by)
  values (v_slug, lower(v_email), 'lead', v_name, v_uid);

  if coalesce(p_listed, false) then
    v_listed := public.submit_hosted_event(_clean(p_title, 120), p_date, p_time, _clean(p_city, 60), _clean(p_where, 120),
      '{}', coalesce(p_lineup[1:12], '{}'), case when p_entry = 'tickets' then trim(p_ticket_url) end, _clean(p_about, 1200));
  end if;

  return jsonb_build_object('ok', true, 'slug', v_slug, 'listing', v_listed);
end $$;

-- What the invite shows to anyone with the link: the party, the host's first name (display name only,
-- never anything from the email), and how many are coming.
create or replace function public.party_public(p_slug text) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('ok', true,
    'slug', e.slug, 'title', e.title, 'event_date', e.event_date, 'start_time', e.start_time, 'city', e.city,
    'venue', e.venue, 'blurb', e.blurb, 'lineup', e.lineup, 'look', e.look, 'ticket_url', e.ticket_url,
    'rsvp_open', e.rsvp_open, 'capacity', e.capacity, 'poster_url', e.poster_url, 'is_party', e.host_id is not null,
    'host', (select nullif(split_part(trim(m.display_name), ' ', 1), '') from public.members m where m.id = e.host_id),
    'going', (select coalesce(sum(1 + coalesce(r.plus_ones, 0)), 0) from public.event_rsvps r where r.event_slug = e.slug))
  from public.events e where e.slug = p_slug and e.published;
$$;

revoke all on function public.host_party_make(text, date, text, text, text, text, text, text, boolean, text[], text, integer) from public, anon;
grant execute on function public.host_party_make(text, date, text, text, text, text, text, text, boolean, text[], text, integer) to authenticated;
grant execute on function public.party_public(text) to anon, authenticated;
