-- 006: CMS-style site settings (read public, write via ops token) and public aggregate stats.
-- Additive only.

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings for select using (true);
revoke insert, update, delete, truncate on public.site_settings from anon, authenticated;

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
drop policy if exists "public read feature_flags" on public.feature_flags;
create policy "public read feature_flags" on public.feature_flags for select using (true);
revoke insert, update, delete, truncate on public.feature_flags from anon, authenticated;

-- All paid or AI features start OFF. Param turns them on from /ops.
insert into public.feature_flags (key, enabled, note) values
  ('catbot_ai', false, 'AI chat. Costs per message. Only on when Param enables.'),
  ('ai_poster_generation', false, 'AI poster generation. Costs credits.'),
  ('clerk_auth', false, 'Fan, artist and promoter accounts.'),
  ('razorpay_ticketing', false, 'Paid ticketing.'),
  ('shopify_store', false, 'Scratch store via Shopify.'),
  ('instagram_feed', false, 'Behold Instagram feed.')
on conflict (key) do nothing;

create or replace function public.ops_set_setting(p_token text, p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  insert into site_settings(key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

create or replace function public.ops_set_flag(p_token text, p_key text, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  update feature_flags set enabled = p_enabled, updated_at = now() where key = p_key;
end $$;

create or replace function public.public_stats()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'total_rsvps', (select count(*) from event_rsvps),
    'total_artists', (select count(*) from artists where status = 'approved'),
    'total_signups', (select count(*) from early_access_signups),
    'cities', (select count(*) from scenes where kind = 'city')
  )
$$;
grant execute on function public.public_stats() to anon, authenticated;
grant execute on function public.ops_set_setting(text, text, jsonb) to anon, authenticated;
grant execute on function public.ops_set_flag(text, text, boolean) to anon, authenticated;
