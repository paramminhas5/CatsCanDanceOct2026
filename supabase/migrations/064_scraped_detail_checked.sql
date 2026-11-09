-- 064: when the scraper last read a listing's own page for lineup, sound and promoter facts (9 Nov 2026). Additive.
-- Applied 9 Nov 2026. The details pass runs as its own pg_cron job (ccd-scrape-details, 02:20 IST), 50 pages a night, one at a time.
alter table public.scraped_events add column if not exists detail_checked_at timestamptz;
-- The rows changed by the first backfill keep a mark so they are not read again.
-- (As first applied, this also matched about 440 unread rows, because genres is '{}' rather than null and the curate pass
-- had just touched every pending row. Those marks were cleared straight after with:
--   update scraped_events set detail_checked_at = null where source in ('allevents','district') and event_date >= current_date
--     and detail_checked_at is not null and lineup is null and coalesce(description,'') not like 'Promoter:%';)
update public.scraped_events set detail_checked_at = now()
 where source in ('allevents','district') and updated_at > now() - interval '1 hour' and (lineup is not null or description like 'Promoter:%');

select cron.schedule('ccd-scrape-details', '50 20 * * *', $$
  select net.http_post(
    url := 'https://jybloszaucgqlbkzquqw.supabase.co/functions/v1/scrape-events?mode=backfill&limit=50',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.ops_config where id=1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
$$);
