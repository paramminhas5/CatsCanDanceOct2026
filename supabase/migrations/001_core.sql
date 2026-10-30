-- Applied to Supabase project CATSCANDANCE.COM (jybloszaucgqlbkzquqw). Additive only:
-- existing events / event_rsvps / contact_messages / early_access_signups are untouched.

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind text not null default 'musician',
  based_city text, from_city text,
  bio text, why text,
  genres text[] default '{}', festivals text[] default '{}',
  instagram text, website text, soundcloud text, spotify text,
  booking_email text, labels text, members text,
  fee_min_inr numeric, fee_max_inr numeric, fee_currency text default 'INR',
  open_to_bookings boolean default true,
  status text not null default 'approved' check (status in ('pending','approved','hidden')),
  source text default 'manual',
  featured boolean default false,
  is_resident boolean default false,
  photo_url text,
  airtable_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text, area text, capacity int,
  genre_focus text[] default '{}',
  instagram text, website text, notes text,
  airtable_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Scene events found by the nightly scraper. Nothing goes live until status = 'published'.
create table if not exists public.scraped_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text unique not null,
  source text not null,
  city text, venue text,
  event_date date, event_time text,
  image_url text, description text,
  genres text[] default '{}',
  score int default 0,
  score_reasons text[] default '{}',
  status text not null default 'pending' check (status in ('pending','published','rejected','expired')),
  featured boolean default false,
  published_at timestamptz,
  airtable_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists scraped_events_status_idx on public.scraped_events(status, event_date);

-- Free, rule-based scoring. Tune by editing these two tables; no AI calls.
create table if not exists public.scoring_keywords (keyword text primary key, weight int not null, genre text);
insert into public.scoring_keywords(keyword, weight, genre) values
 ('house',3,'House'),('deep house',3,'House'),('tech house',2,'House'),('techno',3,'Techno'),
 ('disco',3,'Disco'),('garage',3,'UK Garage'),('ukg',3,'UK Garage'),
 ('breaks',3,'Breaks'),('breakbeat',3,'Breaks'),('jungle',3,'Jungle'),('drum and bass',3,'Drum & Bass'),
 ('drum & bass',3,'Drum & Bass'),('dnb',3,'Drum & Bass'),('dub',2,'Dub'),
 ('ambient',2,'Ambient'),('electro',2,'Electro'),('minimal',2,'Minimal'),('acid',2,'Acid'),
 ('underground',2,null),('club night',2,null),('rave',2,null),('warehouse',2,null),('boiler room',3,null),
 ('dj',1,null),('electronic',1,null),('vinyl',2,null),('all night long',2,null),
 ('b2b',2,null),('listening bar',2,null),('live set',1,null),('selector',2,null),('bass',1,'Bass'),
 ('pet friendly',2,null),('dog friendly',2,null),
 ('bollywood',-6,null),('commercial',-4,null),('edm',-3,null),('top 40',-5,null),('retro',-3,null),
 ('stand-up',-8,null),('standup',-8,null),('comedy',-8,null),('workshop',-4,null),('conference',-8,null),
 ('startup',-8,null),('wedding',-8,null),('cricket',-8,null),('screening',-6,null),('exhibition',-5,null),
 ('karaoke',-6,null),('ladies night',-4,null),('punjabi',-5,null),('ghazal',-6,null),
 ('open mic',-6,null),('tribute',-4,null)
on conflict (keyword) do nothing;

create table if not exists public.trusted_venues (name_pattern text primary key, bonus int not null default 3);
insert into public.trusted_venues values
 ('bar wild',4),('indiranagar social',3),('kitty su',3),('antisocial',3),('blue frog',2),
 ('summer house',2),('soi 7',2),('loft 38',2),('gatsby',1),('raasta',1)
on conflict do nothing;

create or replace function public.score_scraped_event() returns trigger
language plpgsql set search_path = public as $$
declare
  hay text := lower(coalesce(new.title,'')||' '||coalesce(new.description,'')||' '||coalesce(new.venue,''));
  s int := 0; reasons text[] := '{}'; g text[] := '{}'; r record;
begin
  for r in select * from public.scoring_keywords loop
    if hay ~ ('\m'||regexp_replace(r.keyword,'([.&+])','\\\1','g')||'\M') then
      s := s + r.weight;
      reasons := reasons || ((case when r.weight>0 then '+' else '' end)||r.weight||' '||r.keyword);
      if r.genre is not null and not (r.genre = any(g)) then g := g || r.genre; end if;
    end if;
  end loop;
  for r in select * from public.trusted_venues loop
    if lower(coalesce(new.venue,'')||' '||coalesce(new.title,'')) like '%'||r.name_pattern||'%' then
      s := s + r.bonus; reasons := reasons || ('+'||r.bonus||' venue '||r.name_pattern);
    end if;
  end loop;
  if lower(coalesce(new.city,'')) in ('bengaluru','bangalore') then
    s := s + 2; reasons := reasons || '+2 bengaluru'::text;
  end if;
  new.score := s; new.score_reasons := reasons;
  if coalesce(array_length(new.genres,1),0)=0 then new.genres := g; end if;
  if tg_op='INSERT' and s < 0 then new.status := 'rejected'; end if;
  if new.status='published' and new.published_at is null then new.published_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_score_scraped on public.scraped_events;
create trigger trg_score_scraped before insert or update on public.scraped_events
  for each row execute function public.score_scraped_event();

create or replace view public.pending_events with (security_invoker = true) as
  select id, score, event_date, title, venue, city, source, genres, url, score_reasons
  from public.scraped_events
  where status='pending' and (event_date is null or event_date >= current_date)
  order by score desc, event_date asc nulls last;

alter table public.events add column if not exists event_date date;
alter table public.events add column if not exists ticket_url text;
alter table public.events add column if not exists published boolean default true;

create table if not exists public.build_log (
  id bigint generated always as identity primary key,
  area text not null,
  title text not null,
  status text not null default 'planned' check (status in ('planned','in_progress','shipped','blocked')),
  detail text, link text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.cron_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  ok boolean,
  stats jsonb default '{}',
  error text
);

alter table public.artists enable row level security;
alter table public.venues enable row level security;
alter table public.scraped_events enable row level security;
alter table public.scoring_keywords enable row level security;
alter table public.trusted_venues enable row level security;
alter table public.build_log enable row level security;
alter table public.cron_runs enable row level security;
drop policy if exists "public read approved artists" on public.artists;
create policy "public read approved artists" on public.artists for select using (status='approved');
drop policy if exists "public read venues" on public.venues;
create policy "public read venues" on public.venues for select using (true);
drop policy if exists "public read published scene events" on public.scraped_events;
create policy "public read published scene events" on public.scraped_events for select using (status='published');
