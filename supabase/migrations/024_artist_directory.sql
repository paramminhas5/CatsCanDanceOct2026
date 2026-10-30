-- 024: public directory extras. One call returns, per approved artist, the cities they have played (from approved
-- facts only), who they have shared a bill with (approved facts only) and how many gallery items they have.
-- Used by /litter filters. Additive only.
create or replace function public.artist_directory_extras()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(a.slug, jsonb_build_object(
    'cities', coalesce((select jsonb_agg(distinct btrim(split_part(f.detail, ',', array_length(string_to_array(f.detail, ','), 1))))
                        from artist_facts f
                        where f.artist_slug = a.slug and f.status = 'approved' and f.section in ('tours','upcoming') and f.detail like '%,%'), '[]'::jsonb),
    'with', coalesce((select jsonb_agg(distinct f.label) from artist_facts f
                      where f.artist_slug = a.slug and f.status = 'approved' and f.section = 'played_with'), '[]'::jsonb),
    'media', (select count(*) from artist_media m where m.artist_slug = a.slug)
  )), '{}'::jsonb)
  from artists a where a.status = 'approved';
$$;
grant execute on function public.artist_directory_extras() to anon, authenticated;
