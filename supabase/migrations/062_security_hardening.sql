-- 062 Security hardening (9 Nov 2026, engineering and security audit).
--
-- 1. Internal helpers were callable by anyone through /rest/v1/rpc.
--    Supabase grants EXECUTE on new public functions to `anon` and `authenticated` directly, so
--    `revoke ... from public` (used in earlier migrations) did not close them, and functions that were
--    re-created later lost the revokes they once had.
--    Worst case: `_adopt_pending(p_id, p_email)` let a caller hand any artist page whose claim email they
--    knew to their own account, and turn on is_promoter. These helpers are only ever called by other
--    SECURITY DEFINER functions and triggers (which run as the owner), so revoking the API roles breaks nothing.
--
-- 2. Members could write their own `members` row directly through the API (policy members_own), including
--    banned_at (a banned member could unban themselves), founding_number, email and created_at.
--    No app code writes members directly: every change goes through SECURITY DEFINER RPCs
--    (signup, set_my_phone, save_taste_quiz, become_*, ...). Reads stay as they are.
--
-- 3. scene_is_festival had a mutable search_path (advisor warning).
--
-- Guard: scripts/security/check-db-grants.mjs fails CI if a function outside the allowlist becomes
-- callable by anon again.

revoke execute on function public._adopt_pending(uuid, text) from public, anon, authenticated;
revoke execute on function public.match_event_artists(uuid) from public, anon, authenticated;
revoke execute on function public.scene_dupe_of(uuid, text, date, text) from public, anon, authenticated;
revoke execute on function public.scene_twin_of(uuid, text[], date, text) from public, anon, authenticated;
revoke execute on function public.scene_should_autopublish(public.scraped_events) from public, anon, authenticated;
revoke execute on function public.promoter_qualifies(public.promoters) from public, anon, authenticated;

revoke insert, update, delete, truncate, references, trigger on table public.members from anon, authenticated;

do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'scene_is_festival' loop
    execute format('alter function %s set search_path = public, pg_temp', f);
  end loop;
end $$;
