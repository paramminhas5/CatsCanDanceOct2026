-- 062: weekly run 9 Nov 2026. Additive only.
-- 1. Cover two foreign keys flagged by the performance advisor.
create index if not exists crew_checkins_member_id_idx on public.crew_checkins (member_id);
create index if not exists push_subscriptions_member_id_idx on public.push_subscriptions (member_id);

-- 2. Pin search_path on four helper functions flagged by the security advisor.
-- They only call built-ins, so behaviour does not change.
alter function public.scene_is_credible(text[]) set search_path = pg_catalog, public;
alter function public._title_words(text) set search_path = pg_catalog, public;
alter function public.promoter_slugify(text) set search_path = pg_catalog, public;
alter function public.gate_code(text) set search_path = pg_catalog, public;
