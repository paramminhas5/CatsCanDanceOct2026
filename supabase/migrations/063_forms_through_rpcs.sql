-- 063 Public forms only through their checked functions (9 Nov 2026 audit, finding M9).
--
-- contact_messages, early_access_signups and event_rsvps had "anyone can insert" policies, so a script could
-- write to them directly and skip the throttles. For event_rsvps it also skipped the checks in rsvp():
-- published night, RSVPs open, capacity and the plus-ones cap. The site now writes through
-- submit_contact(), signup() and rsvp() only (SECURITY DEFINER, so they do not need these policies).
--
-- ORDER: apply after the code from branch security/forms-images-csp is live, or the old forms on the
-- live site stop saving.

drop policy if exists "Anyone can submit contact" on public.contact_messages;
drop policy if exists "Anyone can sign up" on public.early_access_signups;
drop policy if exists "Anyone can RSVP" on public.event_rsvps;

revoke insert, update, delete, truncate on table public.contact_messages from anon, authenticated;
revoke insert, update, delete, truncate on table public.early_access_signups from anon, authenticated;
revoke insert, update, delete, truncate on table public.event_rsvps from anon, authenticated;
