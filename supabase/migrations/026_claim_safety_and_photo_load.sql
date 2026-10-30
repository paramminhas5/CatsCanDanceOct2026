-- 026: claim safety and photo loading. Applied via MCP on 31 Oct 2026 (this file mirrors what was applied).
-- 1. A pending claim on a LIVE (approved) page is never auto-assigned. It waits for review in /ops "Artist claims to check".
--    Claims on hidden pages and new-artist submissions are still handed to the signed-in email (sign-in proves the email).
-- 2. Every artist submission carries a 6 character verify_code. The claimant puts it in their Instagram bio or sends it from the artist account.
-- 3. ops_claim_checks: pending claims with weak signals (instagram match, booking email match, email domain matches website).
-- 4. ops_artist_worklist + ops_set_artist_photos: export the list for an outside image script and load the results back.
-- 5. my_claims: what a claimant sees.
-- 6. search_path pinned on the trigger functions (advisor warning).
alter table public.artist_submissions add column if not exists verify_code text;
update public.artist_submissions set verify_code = upper(substr(md5(id::text || 'ccd'), 1, 6)) where verify_code is null;
create or replace function public._sub_code() returns trigger language plpgsql set search_path = public as $$
begin new.verify_code := coalesce(new.verify_code, upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))); return new; end $$;
drop trigger if exists artist_submissions_code on public.artist_submissions;
create trigger artist_submissions_code before insert on public.artist_submissions for each row execute function public._sub_code();
alter function public.members_lock_flags() set search_path = public;
alter function public.members_lock_role() set search_path = public;

create or replace function public._adopt_pending(p_id uuid, p_email text) returns jsonb language plpgsql security definer set search_path = public as $$
declare n int := 0; s record; v_slug text; base text;
begin
  update public.artists a set owner_member = p_id, claimed_email = coalesce(a.claimed_email, lower(p_email)), claimed_at = coalesce(a.claimed_at, now())
   where a.owner_member is null and (lower(a.claimed_email) = lower(p_email)
     or (a.status <> 'approved' and a.slug in (select artist_slug from public.artist_submissions where kind = 'claim' and status = 'pending' and lower(email) = lower(p_email))));
  get diagnostics n = row_count;
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
  if exists (select 1 from public.promoter_applications where lower(email) = lower(p_email) and status in ('pending','approved')) then
    perform set_config('ccd.allow_role_change', '1', true);
    update public.members set is_promoter = true where id = p_id and not is_promoter;
  end if;
  return jsonb_build_object('ok', true, 'assigned', n);
end $$;

create or replace function public.my_claims() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', s.artist_slug, 'name', s.name, 'status', s.status, 'code', s.verify_code, 'kind', s.kind) order by s.created_at desc), '[]'::jsonb)
  from public.artist_submissions s where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;
grant execute on function public.my_claims() to authenticated;

create or replace function public.ops_claim_checks(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'slug', s.artist_slug, 'name', s.name, 'email', s.email, 'code', s.verify_code,
      'claimant_instagram', s.instagram, 'page_instagram', a.instagram, 'page_website', a.website, 'page_booking_email', a.booking_email,
      'instagram_matches', (s.instagram is not null and a.instagram is not null and lower(regexp_replace(s.instagram, '^.*instagram\.com/|^@|/$', '', 'g')) = lower(regexp_replace(a.instagram, '^.*instagram\.com/|^@|/$', '', 'g'))),
      'email_matches_booking', (a.booking_email is not null and lower(a.booking_email) = lower(s.email)),
      'email_domain_matches_site', (a.website is not null and split_part(lower(s.email), '@', 2) <> '' and lower(a.website) like '%' || split_part(lower(s.email), '@', 2) || '%' and split_part(lower(s.email), '@', 2) not in ('gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com'))
    ) order by s.created_at desc)
    from artist_submissions s left join artists a on a.slug = s.artist_slug where s.status = 'pending' and s.kind = 'claim'), '[]'::jsonb);
end $$;

create or replace function public.ops_set_artist_photos(p_token text, p_rows jsonb, p_overwrite boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; g text; n_photo int := 0; n_gal int := 0; bad int := 0; s text;
begin
  perform ops_check(p_token);
  for r in select * from jsonb_array_elements(p_rows) loop
    s := r->>'slug';
    if not exists (select 1 from artists where slug = s) then bad := bad + 1; continue; end if;
    if (r->>'photo_url') ~* '^https://' then
      update artists set photo_url = r->>'photo_url', updated_at = now() where slug = s and (photo_url is null or p_overwrite);
      if found then n_photo := n_photo + 1; end if;
    end if;
    for g in select jsonb_array_elements_text(coalesce(r->'gallery', '[]'::jsonb)) loop
      if g ~* '^https://' and length(g) <= 500 and not exists (select 1 from artist_media where artist_slug = s and url = g) then
        insert into artist_media(artist_slug, kind, url, caption, sort) values (s, 'photo', g, left(r->>'source', 140), (select count(*) from artist_media where artist_slug = s));
        n_gal := n_gal + 1;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('ok', true, 'profile_photos_set', n_photo, 'gallery_added', n_gal, 'unknown_slugs', bad);
end $$;

create or replace function public.ops_artist_worklist(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('slug', a.slug, 'name', a.name, 'from_city', a.from_city, 'based_city', a.based_city, 'genres', array_to_string(a.genres, '; '),
    'instagram', a.instagram, 'website', a.website, 'soundcloud', a.soundcloud, 'spotify', a.spotify, 'mix_url', a.mix_url,
    'has_photo', (a.photo_url is not null), 'gallery_count', (select count(*) from artist_media m where m.artist_slug = a.slug), 'has_bio', (a.bio is not null),
    'upload_folder', 'artist-media/' || a.slug || '/') order by a.name)
    from artists a where a.status = 'approved'), '[]'::jsonb);
end $$;
grant execute on function public.ops_claim_checks(text), public.ops_set_artist_photos(text, jsonb, boolean), public.ops_artist_worklist(text) to anon, authenticated;
