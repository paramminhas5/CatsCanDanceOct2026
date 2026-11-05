-- 047: photo upload with rights.
-- Additive only. Existing add_my_media stays for mixes, videos and press links.

-- Artists add a photo and state where the right to use it comes from.
create or replace function public.add_my_photo(p_url text, p_caption text, p_credit text, p_rights text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare s text; n int;
begin
  select slug into s from public.artists where owner_member = auth.uid() limit 1;
  if s is null then return jsonb_build_object('ok', false, 'error', 'No artist profile is linked to your account.'); end if;
  if p_rights not in ('own','permission') then return jsonb_build_object('ok', false, 'error', 'Say whether the photo is yours or you have the photographer''s permission.'); end if;
  if p_url is null or p_url !~* '^https://' or length(p_url) > 500 then return jsonb_build_object('ok', false, 'error', 'Add a link that starts with https://'); end if;
  select count(*) into n from public.artist_media where artist_slug = s;
  if n >= 30 then return jsonb_build_object('ok', false, 'error', 'You have 30 items already. Remove one first.'); end if;
  insert into public.artist_media(artist_slug, kind, url, caption, sort, author, license)
  values (s, 'photo', btrim(p_url), left(nullif(btrim(coalesce(p_caption,'')),''), 140), n,
          left(nullif(btrim(coalesce(p_credit,'')),''), 140),
          case p_rights when 'own' then 'Supplied by the artist: own photo' else 'Supplied by the artist: photographer permission' end);
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.add_my_photo(text,text,text,text) from public, anon;
grant execute on function public.add_my_photo(text,text,text,text) to authenticated;

-- Ops: add a photo with its rights, record rights on an existing photo, remove one.
create or replace function public.ops_add_artist_photo(p_token text, p_slug text, p_url text, p_author text, p_license text, p_license_url text, p_source_url text, p_set_profile boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare n int;
begin
  perform ops_check(p_token);
  if not exists (select 1 from artists where slug = p_slug) then return jsonb_build_object('ok', false, 'error', 'Unknown artist.'); end if;
  if p_url is null or p_url !~* '^https://' or length(p_url) > 500 then return jsonb_build_object('ok', false, 'error', 'Link must start with https://'); end if;
  if coalesce(btrim(p_license),'') = '' then return jsonb_build_object('ok', false, 'error', 'Say what the licence or permission is.'); end if;
  select count(*) into n from artist_media where artist_slug = p_slug;
  insert into artist_media(artist_slug, kind, url, sort, author, license, license_url, source_url)
  values (p_slug, 'photo', btrim(p_url), n, left(nullif(btrim(coalesce(p_author,'')),''),140), left(btrim(p_license),200),
          left(nullif(btrim(coalesce(p_license_url,'')),''),500), left(nullif(btrim(coalesce(p_source_url,'')),''),500));
  if p_set_profile then update artists set photo_url = btrim(p_url), updated_at = now() where slug = p_slug; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ops_set_photo_rights(p_token text, p_id uuid, p_author text, p_license text, p_license_url text, p_source_url text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  update artist_media set author = left(nullif(btrim(coalesce(p_author,'')),''),140), license = left(nullif(btrim(coalesce(p_license,'')),''),200),
    license_url = left(nullif(btrim(coalesce(p_license_url,'')),''),500), source_url = left(nullif(btrim(coalesce(p_source_url,'')),''),500)
  where id = p_id and kind = 'photo';
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ops_remove_photo(p_token text, p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  delete from artist_media where id = p_id and kind = 'photo';
  return jsonb_build_object('ok', found);
end $$;

-- Staff and owners can put files in any artist folder of the artist-media bucket.
create policy "artist media staff upload" on storage.objects for insert to authenticated
with check (bucket_id = 'artist-media' and exists (select 1 from public.members m where m.id = auth.uid() and m.role in ('staff','owner')));
