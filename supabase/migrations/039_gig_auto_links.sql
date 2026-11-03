-- 039: gig radar links go live without review (Param, 3 Nov 2026).
-- A lineup match to a roster (approved) artist is confirmed at once when the event has a source link,
-- and the event is published if it was pending and is not in the past. Ops can still say "Not them"
-- in /ops/gig-links; a rejected link is never re-added. Alias matches need a sourced alias.
-- Flag gig_auto_publish (on) switches the publishing part off. Additive: functions, a trigger, a flag.

insert into public.feature_flags (key, enabled, note) values
  ('gig_auto_publish', true, 'Publish a gig radar event by itself when a roster artist is on the lineup. Off = links only.')
on conflict (key) do nothing;

create or replace function public.match_event_artists(p_event uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_lineup text[]; v_url text; v_date date; n int := 0;
begin
  select lineup, coalesce(nullif(url, ''), nullif(source_url, '')), event_date
    into v_lineup, v_url, v_date
  from public.scraped_events where id = p_event;
  if v_url is null then                      -- no source, no link
    delete from public.event_artists
     where event_id = p_event and reviewed_at is null and match_method <> 'manual';
    return 0;
  end if;

  with parts as (
    select distinct e as raw, public.lineup_norm(pt) as k
    from unnest(coalesce(v_lineup, '{}')) e, public.lineup_parts(e) pt
  ),
  hits as (
    select distinct on (a.slug) a.slug, 'name'::text as how, p.raw
    from parts p join public.artists a
      on a.status = 'approved' and length(p.k) >= 3 and public.lineup_norm(a.name) = p.k
    union
    select distinct on (al.artist_slug) al.artist_slug, 'alias', p.raw
    from parts p join public.artist_aliases al
      on al.source_url is not null and length(p.k) >= 3 and public.lineup_norm(al.alias) = p.k
    join public.artists a on a.slug = al.artist_slug and a.status = 'approved'
  ),
  one as (select distinct on (slug) slug, how, raw from hits order by slug, (how = 'name') desc),
  ins as (
    insert into public.event_artists (event_id, artist_slug, match_method, matched_text, status)
    select p_event, slug, how, raw, 'confirmed' from one
    on conflict (event_id, artist_slug) do nothing
    returning 1
  )
  select count(*) into n from ins;

  -- Drop automatic links whose name left the lineup. Links ops reviewed or added stay.
  delete from public.event_artists ea
  where ea.event_id = p_event and ea.reviewed_at is null and ea.match_method <> 'manual'
    and not exists (
      select 1 from unnest(coalesce(v_lineup, '{}')) e, public.lineup_parts(e) pt
      join public.artists a on a.slug = ea.artist_slug
      where length(public.lineup_norm(pt)) >= 3 and (
        public.lineup_norm(pt) = public.lineup_norm(a.name)
        or exists (select 1 from public.artist_aliases al
                   where al.artist_slug = ea.artist_slug and al.source_url is not null
                     and public.lineup_norm(al.alias) = public.lineup_norm(pt))));

  -- A roster artist is playing: publish the event (pending only; never undoes a rejection).
  if coalesce((select enabled from public.feature_flags where key = 'gig_auto_publish'), false)
     and (v_date is null or v_date >= current_date)
     and exists (select 1 from public.event_artists where event_id = p_event and status = 'confirmed') then
    update public.scraped_events
       set status = 'published', published_at = coalesce(published_at, now())
     where id = p_event and status = 'pending';
  end if;
  return n;
end $$;
revoke execute on function public.match_event_artists(uuid) from anon, authenticated;

-- When an artist joins the roster, link them to future events already on the radar.
create or replace function public.trg_artist_approved_match() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.status = 'approved' and coalesce(old.status, '') <> 'approved' then
    for r in select id from public.scraped_events
             where lineup is not null and cardinality(lineup) > 0
               and (event_date is null or event_date >= current_date) loop
      perform public.match_event_artists(r.id);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists artists_approved_match on public.artists;
create trigger artists_approved_match
  after update of status on public.artists
  for each row execute function public.trg_artist_approved_match();

-- Ops: "Not them" is a review; it sticks. Confirming again is also a review.
create or replace function public.ops_set_event_artist(p_token text, p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  if p_status not in ('proposed','confirmed','rejected') then
    return jsonb_build_object('ok', false, 'error', 'status must be proposed, confirmed or rejected');
  end if;
  update public.event_artists set status = p_status, reviewed_at = now() where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

-- Backfill: earlier proposed links become confirmed, then every event is matched again
-- (drops the unsourced alias match and publishes pending events with roster artists).
update public.event_artists set status = 'confirmed' where status = 'proposed' and reviewed_at is null;
do $$ declare r record; begin
  for r in select id from public.scraped_events where lineup is not null and cardinality(lineup) > 0 loop
    perform public.match_event_artists(r.id);
  end loop;
end $$;
