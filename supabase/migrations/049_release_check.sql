-- 049: weekly release check (Param, 5 Nov 2026). Additive only. No AI.
-- /api/cron/releases (Vercel cron, weekly) reads Deezer albums for artists with a high-confidence Deezer id
-- and sends the ones we don't have here. Fill-only: never edits or deletes an existing release.

create or replace function public.ops_add_releases(p_token text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare r jsonb; n integer := 0; v_run bigint;
begin
  perform ops_check(p_token);
  insert into cron_runs(job) values ('release-check') returning id into v_run;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    if not exists (select 1 from artists where slug = r->>'artist_slug' and status = 'approved') then continue; end if;
    if exists (select 1 from artist_discography d where d.artist_slug = r->>'artist_slug'
               and (d.deezer_album_id = r->>'deezer_album_id' or lower(regexp_replace(d.title, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace(r->>'title', '[^a-zA-Z0-9]', '', 'g')))) then
      continue;
    end if;
    insert into artist_discography(artist_slug, title, release_type, release_date, year, source_url, deezer_album_id, artwork_url)
    values (r->>'artist_slug', left(r->>'title', 200), nullif(r->>'release_type', ''), nullif(r->>'release_date', '')::date,
            nullif(r->>'year', '')::int, r->>'source_url', r->>'deezer_album_id', nullif(r->>'artwork_url', ''));
    n := n + 1;
  end loop;
  update cron_runs set finished_at = now(), ok = true, stats = jsonb_build_object('sent', jsonb_array_length(coalesce(p_rows, '[]'::jsonb)), 'added', n) where id = v_run;
  return jsonb_build_object('ok', true, 'added', n);
end $$;
grant execute on function public.ops_add_releases(text, jsonb) to anon, authenticated;

-- What the cron reads: artists with a Deezer id we trust.
create or replace function public.ops_deezer_artists(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  return coalesce((select jsonb_agg(jsonb_build_object('slug', x.artist_slug, 'deezer', x.value)) from (
    select distinct on (e.artist_slug) e.artist_slug, e.value from artist_external_ids e
    join artists a on a.slug = e.artist_slug and a.status = 'approved'
    where e.scheme = 'deezer' and e.confidence = 'high' and e.value ~ '^\d+$' order by e.artist_slug) x), '[]'::jsonb);
end $$;
grant execute on function public.ops_deezer_artists(text) to anon, authenticated;
