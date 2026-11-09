-- 063: daily curation (Param, 9 Nov 2026: "new artists and nights need to be added and approved daily
-- and we need to get better at filtering these").
--
-- 1. Blocks match whole words (plural allowed), so "desi" no longer has to be avoided because of "design",
--    and the never-list from ccd/curation-rules.md (Bollywood and cousins, rock, metal, workshops, tour packages,
--    comedy...) is now a block instead of only a score penalty.
-- 2. curate_scene_nights() runs every night after the scraper (02:45 IST) and after the daily review:
--      - re-checks every upcoming pending night (credible ones publish themselves when credible_auto_publish is on)
--      - blocked nights and look-alikes of a live night leave the queue
--      - credible nights that still wait (festivals) are marked for Param
--      - a night with no credible name after 36 hours leaves the queue as "no credible name found";
--        it comes back on its own if the credible list grows to cover it
--    Every decision is written to scraped_events.curation so /ops and the daily summary can show why.
-- 3. discover_lineup_artists() adds names from the lineups of good nights (published, or credible and pending)
--    as pending artists, for the daily review to verify and approve or hide.
-- 4. Flag credible_auto_publish goes on (Param asked for daily approval).
-- Additive: two columns, three functions, one helper, one cron job, rows in curation_trust, one flag switched.

alter table public.scraped_events
  add column if not exists curation text,
  add column if not exists curated_at timestamptz;

-- ── 1. whole-word blocks ───────────────────────────────────────────────────
create or replace function public._word_re(p text)
returns text language sql immutable set search_path to 'public' as $$
  select '\m' || regexp_replace(lower(p), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || 's?\M'
$$;

create or replace function public.scene_credibility(p_title text, p_lineup text[], p_description text, p_venue text, p_genres text[])
returns text[] language sql stable security definer set search_path to 'public' as $$
  with hay as (
    select lower(coalesce(p_title,'') || ' | ' || coalesce(array_to_string(p_lineup, ' | '),'') || ' | ' || coalesce(p_description,'')) h,
           lower(coalesce(p_venue,'')) v,
           lower(coalesce(p_title,'') || ' ' || coalesce(array_to_string(p_genres, ' '),'') || ' ' || coalesce(p_venue,'')) b
  ), hits as (
    select 'block:' || t.pattern r, 0 o from curation_trust t, hay where t.kind = 'block' and (hay.b || ' ' || hay.h) ~ _word_re(t.pattern)
    union all
    select 'roster:' || a.name, 1 from artists a where a.status = 'approved'
      and exists (select 1 from unnest(coalesce(p_lineup, '{}'::text[])) l where lower(trim(l)) = lower(a.name))
    union all
    select 'act:' || t.pattern, 2 from curation_trust t, hay where t.kind = 'act' and position(t.pattern in hay.h) > 0
    union all
    select 'promoter:' || t.pattern, 3 from curation_trust t, hay where t.kind = 'promoter' and position(t.pattern in hay.h) > 0
    union all
    select 'promoter:' || lower(p.name), 3 from promoters p, hay where p.status = 'approved' and length(p.name) >= 5 and position(lower(p.name) in hay.h) > 0
    union all
    select 'venue:' || t.pattern, 4 from curation_trust t, hay where t.kind = 'venue' and position(t.pattern in hay.v) > 0
  )
  select coalesce(array_agg(distinct r), '{}'::text[]) from hits
$$;

-- The never-list from ccd/curation-rules.md, plus the non-music listings the scrapers pick up.
insert into public.curation_trust(kind, pattern, note) values
  ('block','bollywood','rules: never'), ('block','bollytech','rules: never'), ('block','bolly','rules: never'),
  ('block','kollywood','rules: never'), ('block','tollywood','rules: never'), ('block','punjabi','rules: never'),
  ('block','punjab','rules: never'), ('block','desi night','rules: never'), ('block','desi sunday','rules: never'),
  ('block','desi commercial','rules: never'), ('block','sufi','rules: never'), ('block','qawwali','rules: never'),
  ('block','ghazal','rules: never'), ('block','garba','rules: never'), ('block','dandiya','rules: never'),
  ('block','bhajan','rules: never'), ('block','kirtan','rules: never'), ('block','retro','rules: never'),
  ('block','top 40','rules: never'), ('block','commercial night','rules: never'),
  ('block','rock','rules: never'), ('block','metal','rules: never'), ('block','tribute','rules: never'),
  ('block','karaoke','not a night'), ('block','open mic','not a night'), ('block','comedy','not a night'),
  ('block','stand-up','not a night'), ('block','standup','not a night'), ('block','improv','not a night'),
  ('block','workshop','rules: never'), ('block','masterclass','rules: never'), ('block','class','not a night'),
  ('block','tour package','not a night'), ('block','trek','not a night'), ('block','cosplay','not a night'),
  ('block','screening','not a night'), ('block','candlelight','not a night'),
  ('block','cake mixing','not a night'), ('block','kids','not a night'), ('block','game night','not a night'), ('block','night games','not a night'),
  ('block','wedding','not a night'), ('block','conference','not a night'),
  ('block','ladies night','rules: brand and bar weeklies'), ('block','cocktail night','rules: brand and bar weeklies'),
  ('block','boat party','not a night'), ('block','cruise','not a night')
on conflict do nothing;

-- A second look-alike check (9 Nov): the same headline act in the same city within a day of a live night,
-- or the same promoter on the same date ("Persiko Presents Camacho" vs "Camacho at Room XO Gurgaon").
create or replace function public.scene_twin_of(p_id uuid, p_credible text[], p_date date, p_city text)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select s.id from scraped_events s
  where s.status = 'published' and s.id <> coalesce(p_id, '00000000-0000-0000-0000-000000000000')
    and lower(coalesce(s.city, '')) = lower(coalesce(p_city, '')) and abs(s.event_date - p_date) <= 1
    and (exists (select 1 from unnest(coalesce(p_credible, '{}'::text[])) a join unnest(s.credible) b on a = b where a like 'act:%')
         or (s.event_date = p_date and exists (select 1 from unnest(coalesce(p_credible, '{}'::text[])) a join unnest(s.credible) b on a = b where a like 'promoter:%')))
  order by abs(s.event_date - p_date)
  limit 1
$$;

-- Festivals wait for Param even when the scraper did not tag them as one.
create or replace function public.scene_is_festival(p_kind text, p_title text)
returns boolean language sql immutable as $$
  select coalesce(p_kind, 'club') = 'festival' or lower(coalesce(p_title, '')) ~ '\mfest(ival)?s?\M'
$$;

create or replace function public.scene_should_autopublish(e public.scraped_events)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select enabled from feature_flags where key = 'credible_auto_publish'), false)
     and e.status = 'pending'
     and e.event_date >= (now() at time zone 'Asia/Kolkata')::date
     and scene_is_credible(e.credible)
     and not scene_is_festival(e.kind, e.title)
     and scene_dupe_of(e.id, e.title, e.event_date, e.city) is null
     and scene_twin_of(e.id, e.credible, e.event_date, e.city) is null
$$;

-- ── 2. the daily pass ─────────────────────────────────────────────────────
create or replace function public.curate_scene_nights()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_started timestamptz := clock_timestamp();
  v_live_before int; v_back int; v_block int; v_dupe int; v_hold int; v_nocred int; v_left int; v_live_after int;
  v_stats jsonb;
begin
  select count(*) into v_live_before from scraped_events where status = 'published' and event_date >= v_today;

  -- Earlier "no credible name" nights get another chance: the credible list may have grown since.
  update scraped_events set status = 'pending', curation = null, curated_at = now()
   where status = 'rejected' and event_date >= v_today and curation = 'no credible name found'
     and scene_is_credible(scene_credibility(title, lineup, description, venue, genres));
  get diagnostics v_back = row_count;

  -- Re-check every upcoming pending night. The credibility trigger fills credible and dupe: tags and
  -- publishes credible, non-festival, non-duplicate nights when credible_auto_publish is on.
  update scraped_events set title = title where status = 'pending' and event_date >= v_today;

  update scraped_events
     set status = 'rejected', curated_at = now(),
         curation = 'blocked: ' || array_to_string(array(select substr(x, 7) from unnest(credible) x where x like 'block:%'), ', ')
   where status = 'pending' and event_date >= v_today and exists (select 1 from unnest(credible) x where x like 'block:%');
  get diagnostics v_block = row_count;

  update scraped_events set status = 'rejected', curation = 'duplicate of a live night', curated_at = now()
   where status = 'pending' and event_date >= v_today
     and (exists (select 1 from unnest(credible) x where x like 'dupe:%')
          or (scene_is_credible(credible) and scene_twin_of(id, credible, event_date, city) is not null));
  get diagnostics v_dupe = row_count;

  update scraped_events
     set curated_at = now(),
         curation = case when scene_is_festival(kind, title) then 'for Param: credible festival' else 'for Param: credible, waiting for a decision' end
   where status = 'pending' and event_date >= v_today and scene_is_credible(credible);
  get diagnostics v_hold = row_count;

  update scraped_events set status = 'rejected', curation = 'no credible name found', curated_at = now()
   where status = 'pending' and event_date >= v_today and not scene_is_credible(credible)
     and created_at < now() - interval '36 hours';
  get diagnostics v_nocred = row_count;

  update scraped_events set curation = 'checking: no credible name yet', curated_at = now()
   where status = 'pending' and event_date >= v_today and not scene_is_credible(credible);
  get diagnostics v_left = row_count;

  select count(*) into v_live_after from scraped_events where status = 'published' and event_date >= v_today;

  v_stats := jsonb_build_object(
    'published', greatest(v_live_after - v_live_before, 0), 'live_upcoming', v_live_after,
    'back_in', v_back, 'blocked', v_block, 'duplicates', v_dupe, 'for_param', v_hold,
    'no_credible_name', v_nocred, 'still_checking', v_left);
  insert into cron_runs(job, started_at, finished_at, ok, stats) values ('curate-nights', v_started, clock_timestamp(), true, v_stats);
  return v_stats;
end $$;

-- ── 3. new names from good nights ─────────────────────────────────────────
create or replace function public.discover_lineup_artists()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n int := 0; r record; v_slug text;
begin
  for r in
    select distinct on (k) trim(x) as nm, regexp_replace(lower(x), '[^a-z0-9]', '', 'g') as k
    from scraped_events e, unnest(e.lineup) x
    where e.event_date >= (now() at time zone 'Asia/Kolkata')::date
      and (e.status = 'published' or (e.status = 'pending' and scene_is_credible(e.credible)))
      and char_length(trim(x)) between 2 and 40 and trim(x) !~ '^[0-9 ]+$'
      and lower(trim(x)) not in ('tba','tbc','tbd','live','dj set','guests','special guests','more','and more','lineup','residents','b2b')
      and regexp_replace(lower(x), '[^a-z0-9]', '', 'g') <> ''
      and not exists (select 1 from artists a where regexp_replace(lower(a.name), '[^a-z0-9]', '', 'g') = regexp_replace(lower(x), '[^a-z0-9]', '', 'g'))
      and not exists (select 1 from artist_aliases al where regexp_replace(lower(al.alias), '[^a-z0-9]', '', 'g') = regexp_replace(lower(x), '[^a-z0-9]', '', 'g'))
  loop
    v_slug := trim(both '-' from regexp_replace(lower(r.nm), '[^a-z0-9]+', '-', 'g'));
    if v_slug = '' or exists (select 1 from artists where slug = v_slug) then continue; end if;
    insert into artists(slug, name, status, source, verify_note)
    values (v_slug, r.nm, 'pending', 'lineup', 'Found on a lineup; waiting for the daily review');
    n := n + 1;
  end loop;
  return jsonb_build_object('added', n);
end $$;

revoke all on function public.curate_scene_nights() from public, anon, authenticated;
revoke all on function public.discover_lineup_artists() from public, anon, authenticated;

-- ── 4. schedule and switch on ─────────────────────────────────────────────
select cron.schedule('ccd-curate', '15 21 * * *', $$ select public.discover_lineup_artists(); select public.curate_scene_nights(); $$);

update public.feature_flags set enabled = true where key = 'credible_auto_publish';
