-- 064: when the scraper last read a listing's own page for lineup, sound and promoter facts (9 Nov 2026). Additive.
-- Applied 9 Nov 2026. The details pass runs as its own pg_cron job (ccd-scrape-details, 02:20 IST), 50 pages a night, one at a time.
alter table public.scraped_events add column if not exists detail_checked_at timestamptz;
-- The 14 rows changed by the first backfill keep a mark so they are not read again.
update public.scraped_events set detail_checked_at = now()
 where source in ('allevents','district') and updated_at > now() - interval '1 hour' and (lineup is not null or description like 'Promoter:%' or genres is not null);

select cron.schedule('ccd-scrape-details', '50 20 * * *', $$
  select net.http_post(
    url := 'https://jybloszaucgqlbkzquqw.supabase.co/functions/v1/scrape-events?mode=backfill&limit=50',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.ops_config where id=1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
$$);
