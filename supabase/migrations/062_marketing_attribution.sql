-- 062: marketing attribution (Param, 9 Nov 2026).
-- 1. lead_signals: what a person tells us when they convert ("how did you hear about us"),
--    the WhatsApp number they opted in with, and the UTM/click ids they arrived with.
--    Written only through log_lead_signal (anon, SECURITY DEFINER, throttled). Never readable by anon.
-- 2. marketing.leads_feed: one row per conversion (ticket order, RSVP, signup, contact) joined to its
--    signal, for the Marketing Magic engine. Lives in a schema PostgREST does not expose.
-- Additive only.

create table if not exists public.lead_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  form text not null check (form in ('ticket', 'rsvp', 'signup', 'contact', 'promoter', 'artist', 'event')),
  ref text,
  email text not null,
  heard_from text,
  whatsapp text,
  utm jsonb not null default '{}'::jsonb,
  page text
);
alter table public.lead_signals enable row level security;
revoke all on public.lead_signals from anon, authenticated;
create index if not exists lead_signals_email_idx on public.lead_signals (lower(email), created_at desc);

create or replace function public.log_lead_signal(
  p_form text, p_ref text, p_email text, p_heard_from text,
  p_whatsapp text default null, p_utm jsonb default '{}'::jsonb, p_page text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare clean_utm jsonb; wa text;
begin
  if p_form not in ('ticket', 'rsvp', 'signup', 'contact', 'promoter', 'artist', 'event') then
    return jsonb_build_object('ok', false, 'error', 'unknown form');
  end if;
  if not _email_ok(p_email) then return jsonb_build_object('ok', false, 'error', 'bad email'); end if;
  perform _throttle(p_email, 'signal', 20);
  -- keep only known attribution keys, short string values
  select coalesce(jsonb_object_agg(k, left(v, 120)), '{}'::jsonb) into clean_utm
  from jsonb_each_text(coalesce(p_utm, '{}'::jsonb)) as e(k, v)
  where k in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ref', 'landing');
  wa := nullif(regexp_replace(coalesce(p_whatsapp, ''), '[^0-9+]', '', 'g'), '');
  if wa is not null and wa !~ '^\+?[0-9]{8,15}$' then wa := null; end if;
  insert into lead_signals (form, ref, email, heard_from, whatsapp, utm, page)
  values (p_form, _clean(p_ref, 120), lower(trim(p_email)), _clean(p_heard_from, 300), wa, clean_utm, _clean(p_page, 200));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.log_lead_signal(text, text, text, text, text, jsonb, text) to anon, authenticated;

create schema if not exists marketing;
revoke all on schema marketing from public, anon, authenticated;

create or replace view marketing.leads_feed as
with conv as (
  -- acked_at: the confirmation went out; responded_at: a person handled it. The engine uses them for speed-to-lead.
  select 'order_' || o.id::text as id, o.created_at, 'ticket_' || o.status as source,
         o.buyer_name as name, o.buyer_email as email, o.buyer_phone as phone, null::text as message,
         o.event_slug as ref, o.amount_inr as value_inr, o.emailed_at as acked_at, null::timestamptz as responded_at
  from public.ticket_orders o
  union all
  select 'rsvp_' || r.id::text, r.created_at, 'rsvp', r.name, r.email, null, null, r.event_slug, 0, null, null
  from public.event_rsvps r
  union all
  select 'signup_' || s.id::text, s.created_at, 'signup:' || coalesce(s.source, 'site'), null, s.email, null, null, null, 0, null, null
  from public.early_access_signups s
  union all
  select 'contact_' || c.id::text, c.created_at, 'contact', c.name, c.email, null, c.message, null, 0, null, c.handled_at
  from public.contact_messages c
)
select conv.*, sig.heard_from, sig.whatsapp, coalesce(sig.utm, '{}'::jsonb) as utm, sig.page
from conv
left join lateral (
  select s.heard_from, s.whatsapp, s.utm, s.page
  from public.lead_signals s
  where lower(s.email) = lower(conv.email)
    and s.created_at between conv.created_at - interval '2 hours' and conv.created_at + interval '2 hours'
  order by abs(extract(epoch from s.created_at - conv.created_at))
  limit 1
) sig on true;
revoke all on marketing.leads_feed from public, anon, authenticated;

comment on view marketing.leads_feed is 'Every conversion with how they heard about us. Read by the Marketing Magic engine (service role only).';
