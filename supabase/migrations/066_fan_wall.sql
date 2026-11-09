-- 066: the fan wall on artist pages (plan ccd/v2-plan.md 5.3, Param 10 Nov).
-- Fans who are signed in leave a one-line note on an artist page, about a show or a record if they like.
-- Notes stay hidden until the artist (owner_member) or CCD staff approve them; the artist can pin three.
-- The public wall shows counts, first names only, and approved notes. Additive only.

create table if not exists public.fan_notes (
  id uuid primary key default gen_random_uuid(),
  artist_slug text not null,
  member_id uuid not null references public.members(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 2 and 140),
  about_kind text check (about_kind in ('show', 'release')),
  about_id text,
  about_label text check (about_label is null or char_length(about_label) <= 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists fan_notes_artist on public.fan_notes (artist_slug, status, created_at desc);
create index if not exists fan_notes_member on public.fan_notes (member_id, created_at desc);
alter table public.fan_notes enable row level security;
-- No policies: every read and write goes through the functions below.

create or replace function public.fan_first_name(p_name text) returns text
language sql immutable set search_path = public as $$
  select coalesce(nullif(initcap(split_part(split_part(btrim(coalesce(p_name, '')), '@', 1), ' ', 1)), ''), 'A fan');
$$;

-- Leave a note. Signed in, not banned, approved artist, no links, three a day per artist, ten a day in all.
create or replace function public.fan_note_add(p_slug text, p_body text, p_kind text default null, p_about text default null, p_label text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_body text := btrim(regexp_replace(coalesce(p_body, ''), '\s+', ' ', 'g'));
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'Sign in to leave a note.'); end if;
  if exists (select 1 from members where id = v_me and banned_at is not null) then return jsonb_build_object('ok', false, 'error', 'You cannot post notes.'); end if;
  if not exists (select 1 from artists where slug = p_slug and status = 'approved') then return jsonb_build_object('ok', false, 'error', 'No such artist.'); end if;
  if char_length(v_body) < 2 or char_length(v_body) > 140 then return jsonb_build_object('ok', false, 'error', 'Keep it to one line, up to 140 characters.'); end if;
  if v_body ~* '(https?://|www\.|\.com\b|@[a-z0-9_.]{3,})' then return jsonb_build_object('ok', false, 'error', 'No links or handles in notes.'); end if;
  if p_kind is not null and p_kind not in ('show', 'release') then return jsonb_build_object('ok', false, 'error', 'Bad note.'); end if;
  if (select count(*) from fan_notes where member_id = v_me and artist_slug = p_slug and created_at > now() - interval '1 day') >= 3
     or (select count(*) from fan_notes where member_id = v_me and created_at > now() - interval '1 day') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'That is enough notes for today.');
  end if;
  insert into fan_notes (artist_slug, member_id, body, about_kind, about_id, about_label)
  values (p_slug, v_me, v_body, p_kind, left(p_about, 120), left(p_label, 80));
  return jsonb_build_object('ok', true);
end $$;

-- The public wall: counts, a few first-letter faces, approved notes (pinned first), and your own pending ones.
create or replace function public.fan_wall(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  with att as (
    select member_id, count(*) n from show_attendance where artist_slug = p_slug group by member_id
  )
  select jsonb_build_object(
    'followers', (select count(*) from member_follows where artist_slug = p_slug),
    'was_there', (select coalesce(sum(n), 0) from att),
    'regulars', (select count(*) from att where n >= 3),
    'faces', coalesce((select jsonb_agg(f) from (
        select upper(left(fan_first_name(m.display_name), 1)) as f
        from member_follows mf join members m on m.id = mf.member_id
        where mf.artist_slug = p_slug order by mf.created_at desc limit 8) x), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', n.id, 'name', fan_first_name(m.display_name), 'body', n.body, 'about', n.about_label, 'kind', n.about_kind,
        'pinned', n.pinned, 'regular', coalesce(a.n, 0) >= 3, 'at', n.created_at) order by n.pinned desc, n.created_at desc)
      from (select * from fan_notes where artist_slug = p_slug and status = 'approved' order by pinned desc, created_at desc limit 12) n
      join members m on m.id = n.member_id left join att a on a.member_id = n.member_id), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'body', body, 'status', status) order by created_at desc)
      from fan_notes where artist_slug = p_slug and member_id = auth.uid() and status = 'pending'), '[]'::jsonb)
  );
$$;

-- For the artist who owns the page (or CCD staff): notes waiting, and the ones on the wall.
create or replace function public.fan_notes_review(p_slug text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_slug text; v_staff boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  select role in ('staff', 'owner') into v_staff from members where id = auth.uid();
  if coalesce(v_staff, false) and p_slug is not null then v_slug := p_slug;
  else select slug into v_slug from artists where owner_member = auth.uid() limit 1; end if;
  if v_slug is null then return jsonb_build_object('ok', false, 'error', 'No page claimed yet.'); end if;
  return jsonb_build_object('ok', true, 'slug', v_slug, 'notes', coalesce((select jsonb_agg(jsonb_build_object(
      'id', n.id, 'name', fan_first_name(m.display_name), 'body', n.body, 'about', n.about_label, 'status', n.status, 'pinned', n.pinned, 'at', n.created_at)
      order by (n.status = 'pending') desc, n.created_at desc)
    from (select * from fan_notes where artist_slug = v_slug and status <> 'hidden' order by created_at desc limit 100) n
    join members m on m.id = n.member_id), '[]'::jsonb));
end $$;

create or replace function public.fan_note_set(p_id uuid, p_status text, p_pinned boolean default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_slug text; v_ok boolean;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Sign in first.'); end if;
  if p_status not in ('approved', 'hidden', 'pending') then return jsonb_build_object('ok', false, 'error', 'Bad status.'); end if;
  select artist_slug into v_slug from fan_notes where id = p_id;
  if v_slug is null then return jsonb_build_object('ok', false, 'error', 'No such note.'); end if;
  select exists (select 1 from artists where slug = v_slug and owner_member = auth.uid())
      or exists (select 1 from members where id = auth.uid() and role in ('staff', 'owner')) into v_ok;
  if not v_ok then return jsonb_build_object('ok', false, 'error', 'Not your page.'); end if;
  if coalesce(p_pinned, false) and p_status = 'approved'
     and (select count(*) from fan_notes where artist_slug = v_slug and pinned and id <> p_id) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'You can pin three notes. Unpin one first.');
  end if;
  update fan_notes set status = p_status, pinned = case when p_status = 'approved' then coalesce(p_pinned, pinned) else false end, reviewed_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on table public.fan_notes from anon, authenticated;
revoke all on function public.fan_note_add(text, text, text, text, text) from public;
revoke all on function public.fan_notes_review(text) from public;
revoke all on function public.fan_note_set(uuid, text, boolean) from public;
grant execute on function public.fan_wall(text) to anon, authenticated;
grant execute on function public.fan_note_add(text, text, text, text, text) to authenticated;
grant execute on function public.fan_notes_review(text) to authenticated;
grant execute on function public.fan_note_set(uuid, text, boolean) to authenticated;
