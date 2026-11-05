-- 047: credibility rules for the scene list (Param, 5 Nov 2026). Additive only.
-- A scene night is worth recommending when someone credible is behind it:
--   roster    a CCD roster artist is on the lineup
--   act       a credible touring act from our list is on the lineup or in the title
--   promoter  a credible promoter, collective or series runs it (our list, or an approved row in promoters)
-- A trusted venue is noted but never enough on its own. Nothing is published automatically by this;
-- it fills scraped_events.credible so /ops can show why a night is (or is not) credible.

create table if not exists public.curation_trust (
  kind text not null check (kind in ('act','promoter','venue','block')),
  pattern text not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (kind, pattern)
);
alter table public.curation_trust enable row level security;
revoke all on public.curation_trust from anon, authenticated;

alter table public.scraped_events add column if not exists credible text[];

insert into public.curation_trust(kind, pattern, note) values
  -- touring acts on the calendar now
  ('act','fred again','touring headliner'), ('act','anyma',null), ('act','kölsch',null), ('act','anotr',null),
  ('act','shallou',null), ('act','phil berg',null), ('act','victor ruiz',null), ('act','colyn',null),
  ('act','aaron hibell',null), ('act','francis mercier',null), ('act','sweely',null), ('act','fish56octagon',null),
  ('act','ape drums',null), ('act','domi & jd beck',null), ('act','adam port',null), ('act','camacho',null),
  ('act','pan-pot',null), ('act','stimming',null), ('act','hugel',null), ('act','mochakk',null),
  ('act','tech panda',null), ('act','kenzani',null),
  -- promoters, collectives and series
  ('promoter','nightvibe',null), ('promoter','gunpowder',null), ('promoter','jawani 4eva','Param, 5 Nov'),
  ('promoter','common ground',null), ('promoter','danza',null), ('promoter','airhaus',null),
  ('promoter','keinemusik',null), ('promoter','boiler room',null), ('promoter','strcture','Structure, as spelt on listings'),
  ('promoter','structure showcase',null), ('promoter','somad',null), ('promoter','magnetic fields',null),
  ('promoter','qilla',null), ('promoter','krunk',null), ('promoter','submerge',null), ('promoter','bay beat',null),
  ('promoter','coven code',null), ('promoter','daytimers',null), ('promoter','subculture',null),
  ('promoter','drum and bass india',null), ('promoter','reggae rajahs',null), ('promoter','bass camp',null),
  ('promoter','boxout',null), ('promoter','wild city',null), ('promoter','dgtl','festival brand'),
  -- venues: noted, never enough alone
  ('venue','antisocial',null), ('venue','humming tree',null), ('venue','bar wild',null), ('venue','bianco',null),
  ('venue','dirty good',null), ('venue','cosy box',null), ('venue','the loft',null), ('venue','summer house',null),
  ('venue','room xo',null), ('venue','kitty su',null), ('venue','auro',null),
  -- never credible, whatever else matches
  ('block','smirnoff experience','brand series'), ('block','bira 91','brand series'), ('block','house of dopamine','brewery nights'),
  ('block','hard techno','Param: never'), ('block','psytrance','Param: never'), ('block','psy trance','Param: never'), ('block','ticket to boiler room','a contest, not a Boiler Room')
on conflict do nothing;

create or replace function public.scene_credibility(p_title text, p_lineup text[], p_description text, p_venue text, p_genres text[])
returns text[] language sql stable security definer set search_path to 'public' as $$
  with hay as (
    select lower(coalesce(p_title,'') || ' | ' || coalesce(array_to_string(p_lineup, ' | '),'') || ' | ' || coalesce(p_description,'')) h,
           lower(coalesce(p_venue,'')) v,
           lower(coalesce(p_title,'') || ' ' || coalesce(array_to_string(p_genres, ' '),'') || ' ' || coalesce(p_venue,'')) b
  ), hits as (
    select 'block:' || t.pattern r, 0 o from curation_trust t, hay where t.kind = 'block' and position(t.pattern in hay.b || ' ' || hay.h) > 0
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

-- credible = at least one roster, act or promoter hit and no block hit
create or replace function public.scene_is_credible(p text[])
returns boolean language sql immutable as $$
  select exists (select 1 from unnest(coalesce(p, '{}'::text[])) x where x like 'roster:%' or x like 'act:%' or x like 'promoter:%')
     and not exists (select 1 from unnest(coalesce(p, '{}'::text[])) x where x like 'block:%')
$$;

create or replace function public.scraped_events_set_credible()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  new.credible := scene_credibility(new.title, new.lineup, new.description, new.venue, new.genres);
  return new;
end $$;

drop trigger if exists zz_scraped_events_credible on public.scraped_events;
create trigger zz_scraped_events_credible before insert or update of title, lineup, description, venue, genres
  on public.scraped_events for each row execute function public.scraped_events_set_credible();

update public.scraped_events
   set credible = scene_credibility(title, lineup, description, venue, genres)
 where event_date >= current_date - 1;

-- ops: read the reasons for a set of nights, and edit the trust list
create or replace function public.ops_scene_credibility(p_token text, p_ids uuid[])
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_object_agg(id, jsonb_build_object('reasons', coalesce(credible, '{}'::text[]), 'credible', scene_is_credible(credible)))
                   from scraped_events where id = any (p_ids)), '{}'::jsonb);
end $$;

create or replace function public.ops_curation_trust_list(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_agg(t order by t.kind, t.pattern) from curation_trust t), '[]'::jsonb);
end $$;

create or replace function public.ops_curation_trust_set(p_token text, p_kind text, p_pattern text, p_note text default null, p_remove boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v text := lower(trim(coalesce(p_pattern, '')));
begin
  perform ops_check(p_token);
  if p_kind not in ('act','promoter','venue','block') or length(v) < 3 then return jsonb_build_object('ok', false, 'error', 'Pick a kind and at least 3 letters.'); end if;
  if p_remove then delete from curation_trust where kind = p_kind and pattern = v;
  else insert into curation_trust(kind, pattern, note) values (p_kind, v, left(p_note, 200)) on conflict (kind, pattern) do update set note = excluded.note;
  end if;
  update scraped_events set credible = scene_credibility(title, lineup, description, venue, genres) where event_date >= current_date - 1;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.scene_credibility(text, text[], text, text, text[]) from public, anon, authenticated;
revoke all on function public.scraped_events_set_credible() from public, anon, authenticated;
grant execute on function public.ops_scene_credibility(text, uuid[]), public.ops_curation_trust_list(text),
  public.ops_curation_trust_set(text, text, text, text, boolean) to anon, authenticated;
