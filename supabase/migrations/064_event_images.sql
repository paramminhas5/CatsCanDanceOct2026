-- 064: Real images for scene nights. Upcoming published nights get the promoter's own cover poster from
-- their source page (gig guides embed it as the event cover). Rule-based fetch and match, no AI.
-- Runs daily after the detail scrape (ccd-event-images), and once now. Only fills empty image_url.

create or replace function public.refresh_event_images(p_limit integer default 60)
returns integer language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare r record; page text; img text; n int := 0;
begin
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '6');
  for r in
    select id, coalesce(nullif(source_url, ''), url) as u from public.scraped_events
    where status = 'published' and event_date >= current_date and (image_url is null or image_url = '')
      and coalesce(nullif(source_url, ''), url) ~* '^https://'
    order by event_date limit greatest(1, least(p_limit, 200))
  loop
    begin
      select content into page from extensions.http_get(r.u) where status = 200;
      img := substring(page from '(https://[^"''\s\\)]+/media/event_cover/[^"''\s\\)]+\.(?:jpg|jpeg|png|webp)(?:\.webp)?)');
      if img is null then
        img := substring(page from '<meta[^>]+property="og:image"[^>]+content="(https://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"');
      end if;
      if img is not null and length(img) < 600 then
        update public.scraped_events set image_url = img, updated_at = now() where id = r.id;
        n := n + 1;
      end if;
    exception when others then null; -- one bad page never stops the run
    end;
  end loop;
  return n;
end $$;

revoke all on function public.refresh_event_images(integer) from public, anon, authenticated;

select cron.schedule('ccd-event-images', '10 21 * * *', $$select public.refresh_event_images(120)$$);
