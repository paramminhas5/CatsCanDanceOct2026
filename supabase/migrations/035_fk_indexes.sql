-- Weekly run 2026-11-02: cover foreign keys flagged by the Supabase performance advisor (unindexed_foreign_keys).
-- Additive only.
create index if not exists artist_packages_artist_slug_idx on public.artist_packages (artist_slug);
create index if not exists artist_social_stats_artist_slug_idx on public.artist_social_stats (artist_slug);
create index if not exists artists_owner_member_idx on public.artists (owner_member);
create index if not exists crew_pool_member_id_idx on public.crew_pool (member_id);
create index if not exists crew_reports_reported_idx on public.crew_reports (reported);
create index if not exists crew_reports_reporter_idx on public.crew_reports (reporter);
create index if not exists crews_captain_id_idx on public.crews (captain_id);
create index if not exists event_going_event_id_idx on public.event_going (event_id);
create index if not exists event_likes_event_id_idx on public.event_likes (event_id);
create index if not exists event_vouches_event_id_idx on public.event_vouches (event_id);
create index if not exists go_again_from_member_idx on public.go_again (from_member);
create index if not exists go_again_to_member_idx on public.go_again (to_member);
create index if not exists hosted_events_host_id_idx on public.hosted_events (host_id);
create index if not exists hosted_events_published_event_id_idx on public.hosted_events (published_event_id);
create index if not exists ticket_swaps_event_id_idx on public.ticket_swaps (event_id);
create index if not exists tickets_tier_id_idx on public.tickets (tier_id);
