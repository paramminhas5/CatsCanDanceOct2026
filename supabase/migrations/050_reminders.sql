-- 050: reminders (Param, 5 Nov 2026). Additive only. No AI.
--   Web push: members save a browser push subscription; /api/cron/reminders (daily) sends
--     "your night is tomorrow" for nights they are going to, and "new date" when an artist they follow gets a gig.
--   WhatsApp: members can opt in now (number + consent), so the list exists the day a provider is switched on.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  failures integer not null default 0
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

alter table public.members add column if not exists whatsapp_opt_in boolean not null default false;
alter table public.members add column if not exists whatsapp_opt_in_at timestamptz;

create table if not exists public.reminders_sent (
  member_id uuid not null,
  kind text not null,
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (member_id, kind, ref)
);
alter table public.reminders_sent enable row level security;
revoke all on public.reminders_sent from anon, authenticated;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or not exists (select 1 from members where id = auth.uid()) then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if coalesce(p_endpoint, '') !~ '^https://' or length(p_endpoint) > 800 then return jsonb_build_object('ok', false, 'error', 'Bad subscription.'); end if;
  insert into push_subscriptions(endpoint, member_id, p256dh, auth) values (p_endpoint, auth.uid(), left(p_p256dh, 200), left(p_auth, 100))
  on conflict (endpoint) do update set member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth, failures = 0;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.drop_push_subscription(p_endpoint text)
returns jsonb language sql security definer set search_path to 'public' as $$
  with d as (delete from push_subscriptions where endpoint = p_endpoint and member_id = auth.uid() returning 1)
  select jsonb_build_object('ok', true, 'removed', (select count(*) from d))
$$;

create or replace function public.my_reminders()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'push', exists (select 1 from push_subscriptions where member_id = auth.uid()),
    'whatsapp', coalesce((select whatsapp_opt_in from members where id = auth.uid()), false),
    'phone', (select phone is not null from members where id = auth.uid()))
$$;

create or replace function public.set_whatsapp_opt_in(p_on boolean, p_phone text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if p_on and length(v_phone) >= 10 then update members set phone = v_phone where id = auth.uid(); end if;
  if p_on and (select phone from members where id = auth.uid()) is null then return jsonb_build_object('ok', false, 'error', 'Add your WhatsApp number.'); end if;
  update members set whatsapp_opt_in = p_on, whatsapp_opt_in_at = case when p_on then now() end where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.save_push_subscription(text, text, text), public.drop_push_subscription(text),
  public.my_reminders(), public.set_whatsapp_opt_in(boolean, text) to authenticated;

-- What the daily cron should send. Each item goes out once per member (reminders_sent).
create or replace function public.ops_due_reminders(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_tomorrow date := ((now() at time zone 'Asia/Kolkata')::date + 1);
begin
  perform ops_check(p_token);
  return jsonb_build_object(
    'subs', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'member_id', member_id, 'p256dh', p256dh, 'auth', auth))
                      from push_subscriptions where failures < 5), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(x) from (
      -- nights tomorrow you said you're going to
      select p.member_id, 'tomorrow' kind, p.night_key ref,
             coalesce(e.title, s.title) title, coalesce(e.venue, s.venue) venue,
             case when s.id is not null then '/me?n=' || p.night_key else '/me?n=' || p.night_key end url
      from night_plans p
      left join events e on e.slug = p.night_key
      left join scraped_events s on p.night_key = 'scene:' || s.id::text and s.status = 'published'
      where p.state = 'going' and coalesce(e.event_date, s.event_date) = v_tomorrow
        and not exists (select 1 from reminders_sent r where r.member_id = p.member_id and r.kind = 'tomorrow' and r.ref = p.night_key)
      union all
      -- a new confirmed gig for an artist you follow (found in the last 2 days)
      select f.member_id, 'follow_gig', ea.event_id::text, a.name || ' plays ' || s.title, coalesce(s.venue, '') || coalesce(', ' || s.city, ''), '/artists/' || a.slug
      from member_follows f
      join event_artists ea on ea.artist_slug = f.artist_slug and ea.status = 'confirmed' and ea.created_at > now() - interval '2 days'
      join scraped_events s on s.id = ea.event_id and s.status = 'published' and s.event_date >= current_date
      join artists a on a.slug = f.artist_slug
      where not exists (select 1 from reminders_sent r where r.member_id = f.member_id and r.kind = 'follow_gig' and r.ref = ea.event_id::text)
      limit 2000) x), '[]'::jsonb));
end $$;

create or replace function public.ops_mark_reminders(p_token text, p_sent jsonb, p_dead text[])
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  perform ops_check(p_token);
  insert into reminders_sent(member_id, kind, ref)
  select (x->>'member_id')::uuid, x->>'kind', x->>'ref' from jsonb_array_elements(coalesce(p_sent, '[]'::jsonb)) x
  on conflict do nothing;
  update push_subscriptions set failures = failures + 1 where endpoint = any (coalesce(p_dead, '{}'::text[]));
  update push_subscriptions set last_ok_at = now() where member_id in (select (x->>'member_id')::uuid from jsonb_array_elements(coalesce(p_sent, '[]'::jsonb)) x);
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.ops_due_reminders(text), public.ops_mark_reminders(text, jsonb, text[]) to anon, authenticated;
