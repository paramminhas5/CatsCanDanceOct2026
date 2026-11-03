-- 043: "I was there" on past shows on artist pages. Additive only. NOT APPLIED YET: Param applies it.
-- Members mark a past show (a timeline moment id such as g-<uuid> or m-<uuid>) on an artist page.
-- Visitors keep the mark in their browser only. The page works without this migration
-- (it falls back to local marks and hides counts when the RPCs are missing).

create table if not exists public.show_attendance (
  member_id   uuid not null references public.members(id) on delete cascade,
  artist_slug text not null,
  moment_id   text not null,
  created_at  timestamptz not null default now(),
  primary key (member_id, artist_slug, moment_id)
);
alter table public.show_attendance enable row level security;
-- No policies and no grants: reads and writes go through the functions below.
revoke all on public.show_attendance from anon, authenticated;
create index if not exists show_attendance_slug_idx on public.show_attendance(artist_slug, moment_id);

-- Toggle a mark for the signed-in member.
create or replace function public.set_i_was_there(p_slug text, p_moment text, p_on boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.members where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Join first.', 'need', 'join');
  end if;
  if p_slug is null or p_moment is null or length(p_slug) > 120 or length(p_moment) > 80 then
    return jsonb_build_object('ok', false, 'error', 'Bad request.');
  end if;
  if not exists (select 1 from public.artists where slug = p_slug and status = 'approved') then
    return jsonb_build_object('ok', false, 'error', 'Unknown artist.');
  end if;
  if coalesce(p_on, false) then
    insert into public.show_attendance(member_id, artist_slug, moment_id) values (auth.uid(), p_slug, p_moment)
    on conflict do nothing;
  else
    delete from public.show_attendance where member_id = auth.uid() and artist_slug = p_slug and moment_id = p_moment;
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.set_i_was_there(text, text, boolean) from public;
grant execute on function public.set_i_was_there(text, text, boolean) to authenticated;

-- Public counts per show for one artist page.
create or replace function public.i_was_there_counts(p_slug text)
returns table(moment_id text, count bigint) language sql stable security definer set search_path to 'public' as $$
  select s.moment_id, count(*)::bigint from public.show_attendance s where s.artist_slug = p_slug group by s.moment_id;
$$;
revoke all on function public.i_was_there_counts(text) from public;
grant execute on function public.i_was_there_counts(text) to anon, authenticated;

-- The signed-in member's own marks on one artist page, so the toggles show their state after a reload.
create or replace function public.my_i_was_there(p_slug text)
returns setof text language sql stable security definer set search_path to 'public' as $$
  select s.moment_id from public.show_attendance s where s.member_id = auth.uid() and s.artist_slug = p_slug;
$$;
revoke all on function public.my_i_was_there(text) from public;
grant execute on function public.my_i_was_there(text) to authenticated;
