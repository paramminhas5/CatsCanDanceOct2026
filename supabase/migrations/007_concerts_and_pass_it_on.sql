-- 007: main concerts on the scene list + "Pass it on" board (face value resale / trade / upgrade).
-- Additive only. No payments are handled. Contact details never leave the database.

alter table public.scraped_events
  add column if not exists ticket_url text,
  add column if not exists lineup text[],
  add column if not exists kind text not null default 'club',
  add column if not exists source_url text;

do $$ begin
  alter table public.scraped_events add constraint scraped_events_kind_chk check (kind in ('club','concert','festival'));
exception when duplicate_object then null; end $$;

create unique index if not exists scraped_events_source_url_key on public.scraped_events (source_url) where source_url is not null;

-- Public read path for published scene events (RLS on the table stays closed; submitter_email is never returned).
create or replace function public.scene_events(p_kind text default null)
returns table (id uuid, title text, url text, ticket_url text, source text, city text, venue text,
               event_date date, event_time text, genres text[], lineup text[], kind text, featured boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.title, e.url, e.ticket_url, e.source, e.city, e.venue, e.event_date, e.event_time,
         e.genres, e.lineup, e.kind, e.featured
  from public.scraped_events e
  where e.status = 'published'
    and (e.event_date is null or e.event_date >= current_date)
    and (p_kind is null or e.kind = p_kind)
  order by e.featured desc, e.event_date asc nulls last
  limit 200;
$$;

create table if not exists public.ticket_swaps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.scraped_events(id) on delete set null,
  event_label text not null check (char_length(event_label) between 2 and 160),
  swap_type text not null check (swap_type in ('sell','trade','upgrade')),
  ticket_count int not null default 1 check (ticket_count between 1 and 10),
  face_value_inr int check (face_value_inr is null or face_value_inr between 0 and 500000),
  tier text check (tier is null or char_length(tier) <= 60),
  note text check (note is null or char_length(note) <= 400),
  contact text not null check (char_length(contact) between 5 and 160),
  status text not null default 'pending' check (status in ('pending','approved','rejected','closed')),
  created_at timestamptz not null default now()
);
alter table public.ticket_swaps enable row level security;
revoke all on public.ticket_swaps from anon, authenticated;

create or replace function public.submit_ticket_swap(
  p_event_label text, p_swap_type text, p_ticket_count int, p_face_value_inr int,
  p_tier text, p_note text, p_contact text, p_event_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_swap_type = 'sell' and p_face_value_inr is null then
    return jsonb_build_object('ok', false, 'error', 'Face value is required when selling.');
  end if;
  if (select count(*) from public.ticket_swaps where contact = p_contact and created_at > now() - interval '1 day') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'Too many listings today.');
  end if;
  insert into public.ticket_swaps(event_id, event_label, swap_type, ticket_count, face_value_inr, tier, note, contact)
  values (p_event_id, trim(p_event_label), p_swap_type, coalesce(p_ticket_count,1), p_face_value_inr, nullif(trim(p_tier),''), nullif(trim(p_note),''), trim(p_contact));
  return jsonb_build_object('ok', true);
exception when check_violation then
  return jsonb_build_object('ok', false, 'error', 'Check the fields and try again.');
end $$;

create or replace function public.public_ticket_swaps()
returns table (id uuid, event_label text, swap_type text, ticket_count int, face_value_inr int, tier text, note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.event_label, s.swap_type, s.ticket_count, s.face_value_inr, s.tier, s.note, s.created_at
  from public.ticket_swaps s where s.status = 'approved' order by s.created_at desc limit 100;
$$;

create or replace function public.ops_set_swap_status(p_token text, p_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  update public.ticket_swaps set status = p_status where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.ops_set_swap_status(text,uuid,text) from public;
grant execute on function public.scene_events(text), public.submit_ticket_swap(text,text,int,int,text,text,text,uuid),
  public.public_ticket_swaps() to anon, authenticated;
grant execute on function public.ops_set_swap_status(text,uuid,text) to anon, authenticated;
