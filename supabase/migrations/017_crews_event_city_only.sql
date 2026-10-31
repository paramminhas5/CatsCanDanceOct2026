-- 017: crews only place members who live in the event's city (or have no city set).
-- Found in the 30 Oct fake-user test: a Mumbai member who joined the pool for a Bengaluru night was
-- put into a "Mumbai" crew for a Bengaluru event. City match is now case-insensitive and trimmed.
create or replace function public.ops_form_crews(p_token text, p_slug text, p_pre_spot text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ids uuid[]; n int; k int; i int; sz int; pos int; v_crew uuid; v_cap uuid; made int := 0; v_city text;
begin
  perform public.ops_check(p_token);
  select coalesce(trim(city), '') into v_city from public.events where slug = p_slug;
  select array_agg(p.member_id order by
           coalesce(m.quiz->>'good_night', ''), coalesce(m.quiz->>'when', ''), coalesce(m.quiz->>'arrive', ''),
           m.genres, p.created_at) into ids
    from public.crew_pool p join public.members m on m.id = p.member_id
    where p.event_slug = p_slug and p.crew_id is null
      and (v_city = '' or nullif(trim(m.city), '') is null or lower(trim(m.city)) = lower(v_city));
  n := coalesce(array_length(ids, 1), 0);
  if n >= 3 then
    k := ceil(n / 6.0)::int; pos := 1;
    for i in 1..k loop
      sz := n / k + (case when i <= n % k then 1 else 0 end);
      made := made + 1;
      select x into v_cap from unnest(ids[pos:pos + sz - 1]) as x
        order by (select count(*) from public.go_again g where g.to_member = x) desc limit 1;
      insert into public.crews(event_slug, name, pre_spot, captain_id)
        values (p_slug, 'Crew ' || made || case when v_city <> '' then ' ' || v_city else '' end, p_pre_spot, v_cap) returning id into v_crew;
      update public.crew_pool set crew_id = v_crew where event_slug = p_slug and member_id = any(ids[pos:pos + sz - 1]);
      pos := pos + sz;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'crews', made,
    'unplaced', (select count(*) from public.crew_pool where event_slug = p_slug and crew_id is null));
end $$;
