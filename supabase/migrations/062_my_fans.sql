-- 062: Fans by city for the artist who owns the page (board F38-A-Fans).
-- Aggregates only: a total and a count per city. Cities with fewer than 3 followers are folded
-- into "Other cities" so no single person can be picked out. Additive, read-only.
create or replace function public.my_fans()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_slug text;
  v_total int;
  v_cities jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sign in first.');
  end if;
  select slug into v_slug from artists where owner_member = auth.uid() limit 1;
  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'No page claimed yet.');
  end if;
  select count(*) into v_total from member_follows where artist_slug = v_slug;
  with by_city as (
    select coalesce(nullif(btrim(m.city), ''), 'No city set') as city, count(*)::int as n
    from member_follows f join members m on m.id = f.member_id
    where f.artist_slug = v_slug
    group by 1
  ), folded as (
    select case when n >= 3 then city else 'Other cities' end as city, sum(n)::int as n
    from by_city group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('city', city, 'n', n) order by n desc), '[]'::jsonb) into v_cities from folded;
  return jsonb_build_object('ok', true, 'slug', v_slug, 'total', v_total, 'cities', v_cities);
end;
$$;

revoke all on function public.my_fans() from public;
grant execute on function public.my_fans() to authenticated;
