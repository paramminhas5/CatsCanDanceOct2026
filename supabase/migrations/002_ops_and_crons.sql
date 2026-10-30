-- Ops access: one secret token, stored where anon can't read it.
create table if not exists public.ops_config (
  id int primary key default 1 check (id = 1),
  token text not null default encode(gen_random_bytes(24), 'hex')
);
insert into public.ops_config(id) values (1) on conflict do nothing;
alter table public.ops_config enable row level security;  -- no policies: invisible to anon

create or replace function public.ops_check(p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or p_token <> (select token from ops_config where id = 1) then
    raise exception 'unauthorized';
  end if;
end $$;

create or replace function public.ops_snapshot(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare out json;
begin
  perform ops_check(p_token);
  select json_build_object(
    'counts', json_build_object(
      'pending', (select count(*) from pending_events),
      'published', (select count(*) from scraped_events where status='published' and (event_date is null or event_date >= current_date)),
      'artists', (select count(*) from artists where status='approved'),
      'ccd_events', (select count(*) from events where published),
      'rsvps', (select count(*) from event_rsvps),
      'signups', (select count(*) from early_access_signups)
    ),
    'pending', coalesce((select json_agg(p) from (select * from pending_events limit 60) p), '[]'),
    'published', coalesce((select json_agg(p) from (
        select id, event_date, title, venue, city, featured from scraped_events
        where status='published' and (event_date is null or event_date >= current_date)
        order by event_date nulls last limit 60) p), '[]'),
    'runs', coalesce((select json_agg(r) from (select job, started_at, finished_at, ok, stats, error from cron_runs order by started_at desc limit 15) r), '[]'),
    'build', coalesce((select json_agg(b) from (
        select id, area, title, status, detail, link, updated_at from build_log
        order by case status when 'in_progress' then 0 when 'blocked' then 1 when 'planned' then 2 else 3 end, updated_at desc limit 40) b), '[]'),
    'ccd_events', coalesce((select json_agg(e) from (select slug, title, date, event_date, venue, published from events order by event_date nulls last, sort_order) e), '[]')
  ) into out;
  return out;
end $$;

create or replace function public.ops_set_event_status(p_token text, p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  update scraped_events set status = p_status,
    published_at = case when p_status='published' then coalesce(published_at, now()) else null end
  where id = p_id;
end $$;

-- Export for the Airtable mirror (read by an Airtable automation script, token-guarded)
create or replace function public.ops_export(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return json_build_object(
    'artists', coalesce((select json_agg(a) from (select slug, name, kind, based_city, genres, instagram, booking_email, is_resident, featured, status, updated_at from artists order by name) a), '[]'),
    'scene_events', coalesce((select json_agg(e) from (
        select id, title, event_date, venue, city, source, score, status, genres, url from scraped_events
        where (event_date is null or event_date >= current_date) and status in ('pending','published')
        order by score desc limit 300) e), '[]'),
    'ccd_events', coalesce((select json_agg(e) from (select slug, title, event_date, date, venue, city, published from events) e), '[]')
  );
end $$;

revoke all on function public.ops_check(text) from public, anon, authenticated;
grant execute on function public.ops_snapshot(text) to anon;
grant execute on function public.ops_set_event_status(text, uuid, text) to anon;
grant execute on function public.ops_export(text) to anon;

-- Nightly jobs (pg_cron runs inside Supabase: no servers, no AI credits)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 02:00 IST: run the scraper edge function
select cron.unschedule('ccd-scrape') where exists (select 1 from cron.job where jobname='ccd-scrape');
select cron.schedule('ccd-scrape', '30 20 * * *', $$
  select net.http_post(
    url := 'https://jybloszaucgqlbkzquqw.supabase.co/functions/v1/scrape-events',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(select token from public.ops_config where id=1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
$$);

-- 03:00 IST: expire past events
select cron.unschedule('ccd-expire') where exists (select 1 from cron.job where jobname='ccd-expire');
select cron.schedule('ccd-expire', '30 21 * * *', $$
  update public.scraped_events set status='expired' where status in ('pending','published') and event_date < current_date;
$$);
