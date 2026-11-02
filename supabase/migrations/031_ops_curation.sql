-- 031: token-guarded RPCs for the /ops/curation page. Additive only (new functions, no table changes).
-- List artists with curation fields and filters; edit commercial / ccd_fit / verify_note; bulk status change by id.

create or replace function public.ops_curation_list(
  p_token text,
  p_status text default null,
  p_commercial text default null,
  p_has_photo boolean default null,
  p_min_fit int default null,
  p_unscored boolean default false,
  p_limit int default 300
) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return coalesce((select json_agg(a) from (
    select id, slug, name, status, source, based_city, from_city, genres, instagram,
           commercial, ccd_fit, verified_at, verify_note,
           (photo_url is not null and photo_url <> '') as has_photo
    from public.artists
    where (p_status is null or p_status = '' or status = p_status)
      and (p_commercial is null or p_commercial = '' or
           (p_commercial = 'none' and commercial is null) or commercial = p_commercial)
      and (p_has_photo is null or (photo_url is not null and photo_url <> '') = p_has_photo)
      and (p_min_fit is null or ccd_fit >= p_min_fit)
      and (not coalesce(p_unscored, false) or ccd_fit is null)
    order by ccd_fit desc nulls last, name
    limit least(greatest(coalesce(p_limit, 300), 1), 1000)) a), '[]'::json);
end $$;

create or replace function public.ops_curation_counts(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_check(p_token);
  return (select json_build_object(
    'total', count(*),
    'approved', count(*) filter (where status = 'approved'),
    'pending', count(*) filter (where status = 'pending'),
    'hidden', count(*) filter (where status = 'hidden'),
    'scored', count(*) filter (where ccd_fit is not null),
    'with_photo', count(*) filter (where photo_url is not null and photo_url <> '')
  ) from public.artists);
end $$;

create or replace function public.ops_set_curation(
  p_token text, p_id uuid, p_commercial text, p_fit int, p_note text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c text := nullif(trim(coalesce(p_commercial, '')), '');
begin
  perform public.ops_check(p_token);
  if c is not null and c not in ('low','medium','high') then
    return jsonb_build_object('ok', false, 'error', 'commercial must be low, medium or high');
  end if;
  if p_fit is not null and (p_fit < 0 or p_fit > 100) then
    return jsonb_build_object('ok', false, 'error', 'fit must be 0 to 100');
  end if;
  update public.artists
     set commercial = c, ccd_fit = p_fit, verify_note = nullif(trim(coalesce(p_note, '')), ''),
         verified_at = now(), updated_at = now()
   where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.ops_curation_bulk(p_token text, p_ids uuid[], p_to text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public.ops_check(p_token);
  if p_to not in ('pending','approved','hidden') then
    return jsonb_build_object('ok', false, 'error', 'bad status');
  end if;
  if coalesce(array_length(p_ids, 1), 0) = 0 or array_length(p_ids, 1) > 500 then
    return jsonb_build_object('ok', false, 'error', 'send between 1 and 500 ids');
  end if;
  update public.artists set status = p_to, updated_at = now() where id = any(p_ids);
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'changed', n);
end $$;
