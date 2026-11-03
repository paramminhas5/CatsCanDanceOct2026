# Cats Can Dance (catscandance.com)

Lean Next.js 14 site. The public site is Pages Router (ported from the live catscandance.com design); /ops is App Router behind basic auth middleware. Data lives in Supabase project `jybloszaucgqlbkzquqw` (CATSCANDANCE.COM). Deployed on Vercel from `main`.

## Rules
- Keep it lean but match the live design: Tailwind, framer-motion, lenis, Radix pieces and the Supabase JS client are allowed because the live site uses them. No ORM, no extra UI kits. New data access goes through `src/lib/ccd-db.ts` (PostgREST fetch) or RPCs.
- Paid or AI features (Catbot, poster generation, Clerk, Razorpay, Shopify, Instagram feed) are OFF by default and gated by the `feature_flags` table. Param turns them on. No AI in crons.
- Never put the service key in the app. Public reads use the anon key + RLS. Ops reads/writes go through the token-guarded RPCs (`ops_snapshot`, `ops_set_event_status`, `ops_export`).
- Schema changes: add a new numbered file in `supabase/migrations/` and apply it with the Supabase MCP `apply_migration`. Additive changes only unless Param approves.
- The `events` table is CCD's own nights. `scraped_events` is the scene list: nothing shows publicly until `status = 'published'`. Param decides what gets published; CCD staff (members.role = 'staff', set only via `ops_set_member_role`) can vouch pending events and approve member-hosted events. Regular members can like, say they are going, follow artists and host (staff approve). Weekly digest posts stay drafts unless flag `blog_autopublish` is on. Resend/SMTP stays off until Param enables it.
- Money: tickets and shop orders are created by anon RPCs (`create_ticket_order`, `create_shop_order`) and confirmed only by `/api/pay/verify` after a Razorpay signature check, via ops-token RPCs. Razorpay keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) live in Vercel env only. Roles: member, host, staff, owner; change only via `ops_set_member_role`.
- Public forms (contact, promoter application, artist add or claim, event submit, tour dates, early access) write only through anon `SECURITY DEFINER` RPCs (`submit_contact`, `submit_promoter_application`, `submit_artist`, `submit_event`) with honeypot and throttle. Never insert into those tables from the browser. Everything they collect shows in the /ops Inbox (`ops_inbox`, `ops_set_inbox_status`). Migrations 003 to 028, 030 to 036, 038 and 039 are applied (there is no 029; 037 is on the booking branch, not yet applied). Email goes out from the Next.js server only (src/lib/mailer.ts, Resend); the database only holds bookkeeping.
- Handoff docs live in the Project `ccd/` folder: read `ccd/next-steps.md` first, then `ccd/roles-and-signup.md` and `ccd/artist-profiles.md` (newer).
- Gig radar to artist links: `event_artists`, filled by trigger `scraped_events_match_artists` on lineup names and sourced aliases (rule-based), only for events with a source URL. Links are confirmed automatically; staff remove wrong ones with Not them in /ops/gig-links (rejections stick). Param approved (migration 039, flag `gig_auto_publish`): a pending upcoming event with a confirmed roster artist link is published automatically. Artist pages show confirmed links on published events only (`artist_upcoming`) and past gigs from `artist_gigs` where `verified` is true.
- Artist page v2 (board I) serves every approved artist at `/litter/<slug>` when flag `artist_page_v2` is on; Vercel previews and local dev always show it. It also carries the bio, booking form, press kit, mixes, photos, festivals, CCD nights, tour dates and structured data (MusicGroup, MusicAlbum, MusicEvent). Blocks hide when empty.
- Scoring is rule-based in Postgres (`scoring_keywords`, `trusted_venues`, trigger `score_scraped_event`). Do not add AI calls to crons.
- Brand: cream/ink, red #dc2626, acid #b6ef36, electric blue #2563eb. Bowlby One display, Space Grotesk body. Brutalist borders and hard shadows. Copy is plain and direct, no em dashes, no hype.
- `npm run build` must pass before any PR.

## Weekly improvement run
1. Check Vercel runtime errors and the latest deployment for the project.
2. Check Supabase advisors (security + performance) and the last 7 `cron_runs`.
3. Pick at most 3 small, safe fixes (broken things first, then SEO/metadata/schema, then performance, then copy). One branch, one PR, titled `weekly: <date>`.
4. Log each item in `build_log` (area, title, status='in_progress', link = PR URL).
5. Never merge. Param approves PRs.
