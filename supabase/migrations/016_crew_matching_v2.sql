-- 016: crew matching v2. Same signature as ops_form_crews, smarter grouping.
-- Before: grouped by profile city only, ordered by genres, first joiner was captain.
-- Now: members with no profile city count as the event's city; within a city, people who
-- answered the taste quiz alike (good night, when, genres) sit in the same crew; the captain
-- is the member with the most "go again" taps received (earliest joiner on a tie).
create or replace function public.ops_form_crews(p_token text, p_slug text, p_pre_spot text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; ids uuid[]; n int; k int; i int; sz int; pos int; v_crew uuid; v_cap uuid; made int := 0;
        v_city text;
begin
  perform public.ops_check(p_token);
  select coalesce(city, '') into v_city from public.events where slug = p_slug;
  for c in
    select coalesce(nullif(m.city, ''), nullif(v_city, ''), '') as city
    from public.crew_pool p join public.members m on m.id = p.member_id
    where p.event_slug = p_slug and p.crew_id is null
    group by 1 having count(*) >= 3
  loop
    select array_agg(p.member_id order by
             coalesce(m.quiz->>'good_night', ''), coalesce(m.quiz->>'when', ''), coalesce(m.quiz->>'arrive', ''),
             m.genres, p.created_at) into ids
      from public.crew_pool p join public.members m on m.id = p.member_id
      where p.event_slug = p_slug and p.crew_id is null
        and coalesce(nullif(m.city, ''), nullif(v_city, ''), '') = c.city;
    n := array_length(ids, 1); k := ceil(n / 6.0)::int; pos := 1;
    for i in 1..k loop
      sz := n / k + (case when i <= n % k then 1 else 0 end);
      made := made + 1;
      select x into v_cap from unnest(ids[pos:pos + sz - 1]) as x
        order by (select count(*) from public.go_again g where g.to_member = x) desc limit 1;
      insert into public.crews(event_slug, name, pre_spot, captain_id)
        values (p_slug, 'Crew ' || made || ' ' || c.city, p_pre_spot, v_cap) returning id into v_crew;
      update public.crew_pool set crew_id = v_crew where event_slug = p_slug and member_id = any(ids[pos:pos + sz - 1]);
      pos := pos + sz;
    end loop;
  end loop;
  return jsonb_build_object('ok', true, 'crews', made,
    'unplaced', (select count(*) from public.crew_pool where event_slug = p_slug and crew_id is null));
end $$;
