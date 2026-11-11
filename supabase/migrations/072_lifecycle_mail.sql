-- 072: lifecycle email (Param, 11 Nov 2026: "get it to 100"). Three emails that close the loop around a night:
--   welcome   right after someone joins (and a daily catch-up for anyone missed)
--   reminder  the evening before a CCD night, to ticket holders and the free list
--   after     the evening after, to everyone the door checked in: rate it, see the next one
-- The database only keeps bookkeeping (who got what, who said stop). Mail goes out from the Next.js server
-- (src/lib/lifecycle.ts) through Resend. Days are Bengaluru days. Additive only.

create table if not exists public.lifecycle_sends (
  email text not null,
  kind text not null check (kind in ('welcome', 'reminder', 'after')),
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (email, kind, ref)
);
create table if not exists public.lifecycle_optout (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.lifecycle_sends enable row level security;
alter table public.lifecycle_optout enable row level security;
revoke all on public.lifecycle_sends, public.lifecycle_optout from anon, authenticated;

create or replace function public._ist_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- Everything due today. Each list skips people who got that email already or said stop.
create or replace function public.ops_lifecycle_due(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d date := _ist_today(); nxt jsonb;
begin
  perform ops_check(p_token);
  select jsonb_build_object('slug', e.slug, 'title', e.title, 'date', e.event_date, 'venue', e.venue) into nxt
  from events e
  where e.promoter_id is null and coalesce(e.published, true) and e.event_date > d
  order by e.event_date limit 1;

  return jsonb_build_object(
    'welcome', coalesce((
      select jsonb_agg(jsonb_build_object('member_id', m.id, 'email', lower(m.email), 'name', m.display_name, 'number', m.founding_number))
      from (select * from members m
            where m.created_at > now() - interval '3 days' and m.banned_at is null and m.email is not null
              and not exists (select 1 from lifecycle_sends s where s.email = lower(m.email) and s.kind = 'welcome')
              and not exists (select 1 from lifecycle_optout o where o.email = lower(m.email))
            order by m.created_at limit 200) m), '[]'::jsonb),

    'reminder', coalesce((
      select jsonb_agg(x) from (
        select distinct on (p.email, e.slug)
          jsonb_build_object('email', p.email, 'name', p.name, 'slug', e.slug, 'title', e.title, 'date', e.event_date,
                             'start', e.start_time, 'venue', e.venue, 'city', e.city, 'ticket', p.ticket, 'order_id', p.order_id) as x
        from events e
        join lateral (
          select lower(o.buyer_email) as email, o.buyer_name as name, true as ticket, o.id as order_id
          from ticket_orders o where o.event_slug = e.slug and o.status in ('paid', 'free') and o.refunded_at is null
          union all
          select lower(r.email), r.name, false, null from event_rsvps r where r.event_slug = e.slug
        ) p on p.email is not null
        where e.promoter_id is null and coalesce(e.published, true) and e.event_date = d + 1
          and not exists (select 1 from lifecycle_sends s where s.email = p.email and s.kind = 'reminder' and s.ref = e.slug)
          and not exists (select 1 from lifecycle_optout o where o.email = p.email)
        order by p.email, e.slug, p.ticket desc
        limit 2000) q), '[]'::jsonb),

    'after', coalesce((
      select jsonb_agg(x) from (
        select distinct on (a.email, e.slug)
          jsonb_build_object('email', a.email, 'name', a.name, 'slug', e.slug, 'title', e.title, 'next', nxt) as x
        from events e
        join lateral (
          select lower(o.buyer_email) as email, coalesce(t.holder_name, o.buyer_name) as name
          from tickets t join ticket_orders o on o.id = t.order_id
          where t.event_slug = e.slug and t.checked_in_at is not null and t.voided_at is null
          union all
          select lower(r.email), r.name from event_rsvps r where r.event_slug = e.slug and r.checked_in_at is not null
          union all
          select lower(g.email), g.name from door_guests g where g.event_slug = e.slug and g.checked_in_at is not null and g.voided_at is null
        ) a on a.email is not null and a.email like '%@%'
        where e.promoter_id is null and e.event_date = d - 1
          and not exists (select 1 from lifecycle_sends s where s.email = a.email and s.kind = 'after' and s.ref = e.slug)
          and not exists (select 1 from lifecycle_optout o where o.email = a.email)
        order by a.email, e.slug
        limit 2000) q), '[]'::jsonb)
  );
end $$;

-- One member's welcome, for the email sent the moment they join. Null when already sent or opted out.
create or replace function public.ops_lifecycle_welcome_for(p_token text, p_member uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m members;
begin
  perform ops_check(p_token);
  select * into m from members where id = p_member and banned_at is null;
  if m.id is null or m.email is null then return null; end if;
  if exists (select 1 from lifecycle_sends s where s.email = lower(m.email) and s.kind = 'welcome')
     or exists (select 1 from lifecycle_optout o where o.email = lower(m.email)) then return null; end if;
  return jsonb_build_object('member_id', m.id, 'email', lower(m.email), 'name', m.display_name, 'number', m.founding_number);
end $$;

create or replace function public.ops_lifecycle_mark(p_token text, p_sent jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform ops_check(p_token);
  insert into lifecycle_sends (email, kind, ref)
  select lower(x->>'email'), x->>'kind', x->>'ref' from jsonb_array_elements(coalesce(p_sent, '[]'::jsonb)) x
  where x->>'email' like '%@%' and x->>'kind' in ('welcome', 'reminder', 'after') and coalesce(x->>'ref', '') <> ''
  on conflict do nothing;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'marked', n);
end $$;

-- The stop link in every email. The server checks the link's signature before calling this.
create or replace function public.ops_lifecycle_stop(p_token text, p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  if coalesce(p_email, '') !~ '@' then return jsonb_build_object('ok', false); end if;
  insert into lifecycle_optout (email) values (lower(trim(p_email))) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.ops_lifecycle_due(text), public.ops_lifecycle_welcome_for(text, uuid),
  public.ops_lifecycle_mark(text, jsonb), public.ops_lifecycle_stop(text, text) from public;
grant execute on function public.ops_lifecycle_due(text), public.ops_lifecycle_welcome_for(text, uuid),
  public.ops_lifecycle_mark(text, jsonb), public.ops_lifecycle_stop(text, text) to anon, authenticated;
