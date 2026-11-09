-- 065: proposals for Param to approve (9 Nov 2026: "I will approve new lists and artists from here every day").
-- The daily review no longer adds to curation_trust or approves artists by itself. It writes proposals here
-- (credible acts, promoters, blocks) and recommendations on pending artists (artists.verify_note starting
-- "recommend:"). Param approves in chat; Claude applies the yeses with apply_curation_proposal().
-- Additive: one table, one function.

create table if not exists public.curation_proposals (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('act','promoter','block')),
  pattern text not null check (length(pattern) >= 4),
  display_name text,
  why text not null,
  source_url text,
  nights text[],
  recommend text not null default 'yes' check (recommend in ('yes','no','your call')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (kind, pattern)
);
alter table public.curation_proposals enable row level security;
revoke all on public.curation_proposals from anon, authenticated;

-- Approve or reject one proposal. Approving adds it to curation_trust and re-runs the curate pass.
create or replace function public.apply_curation_proposal(p_id bigint, p_approve boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare p curation_proposals; r jsonb;
begin
  select * into p from curation_proposals where id = p_id and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'no pending proposal ' || p_id); end if;
  update curation_proposals set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now() where id = p_id;
  if p_approve then
    insert into curation_trust(kind, pattern, note)
    values (p.kind, lower(p.pattern), 'Param approved ' || to_char(now() at time zone 'Asia/Kolkata', 'DD Mon YYYY') || ': ' || p.why || coalesce(' ' || p.source_url, ''))
    on conflict do nothing;
    r := curate_scene_nights();
  end if;
  return jsonb_build_object('ok', true, 'approved', p_approve, 'curate', r);
end $$;
revoke all on function public.apply_curation_proposal(bigint, boolean) from public, anon, authenticated;
