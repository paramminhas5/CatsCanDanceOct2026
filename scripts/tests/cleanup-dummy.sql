-- Removes every dummy user and test night created by seed-dummy.sql. Safe to run any time.
delete from public.crews where event_slug in ('test-night-dummy','test-night-past');
delete from public.crew_pool where event_slug in ('test-night-dummy','test-night-past');
delete from public.go_again where event_slug in ('test-night-dummy','test-night-past');
delete from public.tickets where event_slug in ('test-night-dummy','test-night-past');
delete from public.ticket_orders where event_slug in ('test-night-dummy','test-night-past');
delete from public.event_rsvps where event_slug in ('test-night-dummy','test-night-past');
delete from public.night_going where event_slug in ('test-night-dummy','test-night-past');
delete from public.night_likes where event_slug in ('test-night-dummy','test-night-past');
delete from public.ticket_tiers where event_slug in ('test-night-dummy','test-night-past');
delete from public.events where slug in ('test-night-dummy','test-night-past');
delete from public.members where email like 'dummy__@example.com';
delete from auth.identities where user_id in (select id from auth.users where email like 'dummy__@example.com');
delete from auth.users where email like 'dummy__@example.com';
