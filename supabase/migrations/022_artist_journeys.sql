-- 022: artist journeys. Photo and media upload for artists, artists see and answer booking requests,
-- requesters (venues, hosts) can follow their request, booking requests can point at a hosted night,
-- profile fields can be cleared. Additive only.

-- ---------- Storage: one public bucket, artists write only inside their own slug folder ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artist-media', 'artist-media', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "artist media read" on storage.objects;
create policy "artist media read" on storage.objects for select using (bucket_id = 'artist-media');

drop policy if exists "artist media upload own folder" on storage.objects;
create policy "artist media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'artist-media'
    and (storage.foldername(name))[1] in (select slug from public.artists where owner_member = auth.uid()));

drop policy if exists "artist media delete own folder" on storage.objects;
create policy "artist media delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'artist-media'
    and (storage.foldername(name))[1] in (select slug from public.artists where owner_member = auth.uid()));

-- ---------- Media list per artist (photos, videos, mixes, press) ----------
create table if not exists public.artist_media (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null references public.artists(slug) on delete cascade on update cascade,
  kind text not null check (kind in ('photo','video','mix','press')),
  url text not null,
  caption text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists artist_media_slug_idx on public.artist_media(artist_slug, sort);
alter table public.artist_media enable row level security;
-- No direct table policies: reads and writes go through the RPCs below.

create or replace function public.artist_media_public(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'url', m.url, 'caption', m.caption) order by m.sort, m.created_at), '[]'::jsonb)
  from public.artist_media m join public.artists a on a.slug = m.artist_slug
  where m.artist_slug = p_slug and a.status = 'approved';
$$;

create or replace function public.my_media()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'url', m.url, 'caption', m.caption) order by m.sort, m.created_at), '[]'::jsonb)
  from public.artist_media m join public.artists a on a.slug = m.artist_slug where a.owner_member = auth.uid();
$$;

create or replace function public.add_my_media(p_kind text, p_url text, p_caption text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s text; n int;
begin
  select slug into s from public.artists where owner_member = auth.uid() limit 1;
  if s is null then return jsonb_build_object('ok', false, 'error', 'No artist profile is linked to your account.'); end if;
  if p_kind not in ('photo','video','mix','press') then return jsonb_build_object('ok', false, 'error', 'Pick photo, video, mix or press.'); end if;
  if p_url is null or p_url !~* '^https://' or length(p_url) > 500 then return jsonb_build_object('ok', false, 'error', 'Add a link that starts with https://'); end if;
  select count(*) into n from public.artist_media where artist_slug = s;
  if n >= 30 then return jsonb_build_object('ok', false, 'error', 'You have 30 items already. Remove one first.'); end if;
  insert into public.artist_media(artist_slug, kind, url, caption, sort) values (s, p_kind, btrim(p_url), left(nullif(btrim(coalesce(p_caption,'')),''), 140), n);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.remove_my_media(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  delete from public.artist_media m using public.artists a where m.id = p_id and a.slug = m.artist_slug and a.owner_member = auth.uid();
  return jsonb_build_object('ok', found);
end $$;

-- ---------- Profile updates: null keeps a field, an empty string clears it ----------
create or replace function public.update_my_artist(p_bio text, p_city text, p_genres text, p_instagram text, p_soundcloud text, p_website text, p_mix_url text, p_photo_url text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.artists where owner_member = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'No artist profile is linked to your account.'); end if;
  if p_instagram is not null and btrim(p_instagram) <> '' and length(p_instagram) > 200 then return jsonb_build_object('ok', false, 'error', 'Instagram link is too long.'); end if;
  if p_photo_url is not null and btrim(p_photo_url) <> '' and btrim(p_photo_url) !~* '^https://' then return jsonb_build_object('ok', false, 'error', 'Photo link must start with https://'); end if;
  update public.artists set
    bio = case when p_bio is null then bio else left(nullif(trim(p_bio), ''), 1500) end,
    based_city = case when p_city is null then based_city else nullif(trim(p_city), '') end,
    genres = case when p_genres is null then genres
                  else coalesce((select array_agg(distinct btrim(g)) from unnest(string_to_array(p_genres, ',')) g where btrim(g) <> ''), '{}') end,
    instagram = case when p_instagram is null then instagram else nullif(trim(p_instagram), '') end,
    soundcloud = case when p_soundcloud is null then soundcloud else nullif(trim(p_soundcloud), '') end,
    website = case when p_website is null then website else nullif(trim(p_website), '') end,
    mix_url = case when p_mix_url is null then mix_url else nullif(trim(p_mix_url), '') end,
    photo_url = case when p_photo_url is null then photo_url else nullif(trim(p_photo_url), '') end,
    updated_at = now()
  where owner_member = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Booking: link to a member and a night, artist answer, requester status ----------
alter table public.booking_requests
  add column if not exists member_id uuid,
  add column if not exists event_slug text,
  add column if not exists artist_response text check (artist_response in ('interested','declined')),
  add column if not exists artist_note text,
  add column if not exists responded_at timestamptz,
  add column if not exists response_emailed_at timestamptz;

drop function if exists public.request_booking(text, text, text, text, text, date, text, text);
create or replace function public.request_booking(p_artist_slug text, p_name text, p_email text, p_org text, p_city text, p_date date, p_budget text, p_message text, p_event_slug text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not _email_ok(p_email) then raise exception 'Enter a valid email'; end if;
  if _clean(p_name,80) is null then raise exception 'Add your name'; end if;
  if p_artist_slug is not null and not exists (select 1 from artists where slug = p_artist_slug and status='approved') then raise exception 'Artist not found'; end if;
  perform _throttle(p_email, 'booking', 5);
  insert into booking_requests(artist_slug, name, email, org, city, event_date, budget_inr, message, member_id, event_slug)
  values (p_artist_slug, _clean(p_name,80), lower(p_email), _clean(p_org,120), _clean(p_city,60), p_date, _clean(p_budget,40), _clean(p_message,1500),
          auth.uid(), case when p_event_slug is not null and exists (select 1 from events where slug = p_event_slug) then p_event_slug end);
  return json_build_object('ok', true);
end $$;

-- What an artist sees: requests for their own page.
create or replace function public.my_booking_requests()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'email', b.email, 'org', b.org, 'city', b.city, 'event_date', b.event_date,
    'budget', b.budget_inr, 'message', b.message, 'status', b.status, 'response', b.artist_response, 'note', b.artist_note, 'created_at', b.created_at) order by b.created_at desc), '[]'::jsonb)
  from public.booking_requests b join public.artists a on a.slug = b.artist_slug where a.owner_member = auth.uid();
$$;

create or replace function public.respond_booking(p_id uuid, p_response text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_response not in ('interested','declined') then return jsonb_build_object('ok', false, 'error', 'Pick interested or declined.'); end if;
  update public.booking_requests b set artist_response = p_response, artist_note = left(nullif(btrim(coalesce(p_note,'')),''), 600), responded_at = now(), status = case when p_response = 'declined' then 'closed' else 'sent' end
  from public.artists a where b.id = p_id and a.slug = b.artist_slug and a.owner_member = auth.uid();
  return jsonb_build_object('ok', found);
end $$;

-- What a requester sees: their own requests (by login or by matching email) and the answer.
create or replace function public.my_bookings()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'artist', a.name, 'slug', b.artist_slug, 'event_date', b.event_date, 'status', b.status,
    'response', b.artist_response, 'note', b.artist_note, 'created_at', b.created_at) order by b.created_at desc), '[]'::jsonb)
  from public.booking_requests b left join public.artists a on a.slug = b.artist_slug
  where b.member_id = auth.uid() or lower(b.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- Ops: answers waiting to be emailed to requesters (server sends, DB keeps bookkeeping).
create or replace function public.ops_booking_answers(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'email', b.email, 'name', b.name, 'artist', a.name, 'response', b.artist_response, 'note', b.artist_note))
    from booking_requests b join artists a on a.slug = b.artist_slug where b.artist_response is not null and b.response_emailed_at is null), '[]'::jsonb);
end $$;
create or replace function public.ops_mark_booking_answer_emailed(p_token text, p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin perform ops_check(p_token); update booking_requests set response_emailed_at = now() where id = p_id; return json_build_object('ok', true); end $$;

-- ---------- Grants ----------
revoke all on function public.my_media(), public.add_my_media(text, text, text), public.remove_my_media(uuid), public.my_booking_requests(),
  public.respond_booking(uuid, text, text), public.my_bookings() from public;
grant execute on function public.my_media(), public.add_my_media(text, text, text), public.remove_my_media(uuid), public.my_booking_requests(),
  public.respond_booking(uuid, text, text), public.my_bookings() to authenticated;
grant execute on function public.artist_media_public(text) to anon, authenticated;
grant execute on function public.request_booking(text, text, text, text, text, date, text, text, text) to anon, authenticated;
grant execute on function public.ops_booking_answers(text), public.ops_mark_booking_answer_emailed(text, uuid) to anon, authenticated;
