-- 057 Promoter pages (Param, 5 Nov 2026: "add old promoter only if they qualify").
-- Additive, read-only functions. A promoter gets a public page when it is approved and either
--   applied through /promote (and CCD approved it), or
--   is an older listing that throws nights (not media, school, radio, rights body, studio, shop, platform, management or distributor)
--   and is on the credible promoter list or has a published night on What's on with its name on it.
-- The page shows its CCD nights and the upcoming What's on nights with its name in the title or lineup.

create or replace function public.promoter_qualifies(p public.promoters) returns boolean
language sql stable security definer set search_path = public as $$
  select p.status = 'approved' and (
    p.applied_by is not null
    or (coalesce(p.kind, 'promoter') not in ('media', 'school', 'radio', 'rights_body', 'studio', 'other', 'platform', 'management', 'distributor')
        and (
          exists (select 1 from public.curation_trust t where t.kind = 'promoter' and lower(p.name) like '%' || lower(t.pattern) || '%')
          or exists (select 1 from public.scraped_events e where e.status = 'published' and e.event_date >= current_date - 365
                     and (lower(e.title) like '%' || lower(p.name) || '%' or exists (select 1 from unnest(e.lineup) l where lower(l) = lower(p.name))))
        ))
  );
$$;

create or replace function public.promoters_public() returns table(slug text, name text, city text, cities text[], genres text[], blurb text, tagline text,
  instagram text, website text, accent text, logo_url text, kind text, nights_on_ccd int)
language sql stable security definer set search_path = public as $$
  select p.slug, p.name, p.city, p.cities, p.genres, p.blurb, p.tagline, p.instagram, p.website, p.accent, p.logo_url, p.kind,
    (select count(*) from public.events e where e.promoter_id = p.id and e.published)::int
  from public.promoters p where public.promoter_qualifies(p) order by p.name;
$$;

create or replace function public.promoter_page(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p public.promoters;
begin
  select * into p from public.promoters where slug = p_slug;
  if not found or not public.promoter_qualifies(p) then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true,
    'promoter', jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'city', p.city, 'genres', p.genres, 'blurb', p.blurb, 'tagline', p.tagline,
      'instagram', p.instagram, 'website', p.website, 'accent', p.accent, 'logo_url', p.logo_url, 'cover_url', p.cover_url),
    'nights', coalesce((select jsonb_agg(jsonb_build_object('slug', e.slug, 'title', e.title, 'date', e.date, 'event_date', e.event_date, 'venue', e.venue,
        'city', e.city, 'poster_url', e.poster_url, 'lineup', e.lineup) order by e.event_date desc)
      from public.events e where e.promoter_id = p.id and e.published), '[]'::jsonb),
    'scene', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'event_date', e.event_date, 'venue', e.venue, 'city', e.city,
        'url', coalesce(e.ticket_url, e.url)) order by e.event_date)
      from public.scraped_events e where e.status = 'published' and e.event_date >= current_date
        and (lower(e.title) like '%' || lower(p.name) || '%' or exists (select 1 from unnest(e.lineup) l where lower(l) = lower(p.name)))), '[]'::jsonb));
end $$;

grant execute on function public.promoters_public(), public.promoter_page(text) to anon, authenticated;
