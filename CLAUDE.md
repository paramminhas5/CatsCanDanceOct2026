# Cats Can Dance (catscandance.com)

Lean Next.js 14 site. The public site is Pages Router (ported from the live catscandance.com design); /ops is App Router behind basic auth middleware. Data lives in Supabase project `jybloszaucgqlbkzquqw` (CATSCANDANCE.COM). Deployed on Vercel from `main`.

## Rules
- Keep it lean but match the live design: Tailwind, framer-motion, lenis, Radix pieces and the Supabase JS client are allowed because the live site uses them. No ORM, no extra UI kits. New data access goes through `src/lib/ccd-db.ts` (PostgREST fetch) or RPCs.
- Paid or AI features (Catbot, poster generation, Clerk, Razorpay, Shopify, Instagram feed) are OFF by default and gated by the `feature_flags` table. Param turns them on. No AI in crons.
- Never put the service key in the app. Public reads use the anon key + RLS. Ops reads/writes go through the token-guarded RPCs (`ops_snapshot`, `ops_set_event_status`, `ops_export`).
- Schema changes: add a new numbered file in `supabase/migrations/` and apply it with the Supabase MCP `apply_migration`. Additive changes only unless Param approves.
- The `events` table is CCD's own nights. `scraped_events` is the scene list: nothing shows publicly until `status = 'published'`. Param decides what gets published; CCD staff (members.role = 'staff', set only via `ops_set_member_role`) can vouch pending events and approve member-hosted events. Regular members can like, say they are going, follow artists and host (staff approve). Weekly digest posts stay drafts unless flag `blog_autopublish` is on. Resend/SMTP stays off until Param enables it.
- Money: tickets and shop orders are created by anon RPCs (`create_ticket_order`, `create_shop_order`) and confirmed only by `/api/pay/verify` after a Razorpay signature check, via ops-token RPCs. Razorpay keys (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) live in Vercel env only. Roles: member, host, staff, owner; change only via `ops_set_member_role`.
- Public forms (contact, promoter application, artist add or claim, event submit, tour dates, early access) write only through anon `SECURITY DEFINER` RPCs (`submit_contact`, `submit_promoter_application`, `submit_artist`, `submit_event`, `submit_tour`) with honeypot and throttle. Never insert into those tables from the browser. Everything they collect shows in the /ops Inbox (`ops_inbox`, `ops_set_inbox_status`). Migrations 003 to 028 and 030 to 053 are applied (there is no 029). Next number is 054. Email goes out from the Next.js server only (src/lib/mailer.ts, Resend); the database only holds bookkeeping.
- Handoff docs live in the Project `ccd/` folder: read `ccd/next-steps.md` first, then `ccd/roles-and-signup.md` and `ccd/artist-profiles.md` (newer). Booking flow: `ccd/booking-flow.md`; its code is in `src/components/tickets/`, `src/lib/booking.ts` and `src/lib/nights.ts`. Going and crews: `ccd/going-and-crews.md`.
- Plain names in nav and URLs: /nights, /whats-on, /artists, /tour, /shop, /listen, /adopt, /journal, /me. Nicknames (Episodes, Gig guide, Strays, Nine Lives) only in copy. Old URLs redirect in next.config.mjs.
- Nav labels (5 Nov 2026): Nights, What's on, Artists, On tour, School, then DISCO and Sign in (Your account when signed in). /me is "Your account", never "Your nights". The products are Nights (find a night, find your crew, our Episodes), Artists (pages, booking, On tour) and School.
- Home (v3): `src/pages/Index.tsx`, sections in `src/components/home/`, data in `src/lib/home.ts` (getStaticProps). Order (5 Nov): hero, tonight ticker, overview, Nights demo, This week, Episodes (next one as a strip, every past one as a drifting poster row), Artists, School, Your account, Work with us. The full contact form lives on the partner pages, not the home. Demos play themselves and stay clickable; example data (the demo crew) is labelled as an example; everything else is real. Never hide content until it scrolls into view (no `initial={{ opacity: 0 }}` with `whileInView`). Design changes go on the canvas first, then code.
- Gig radar to artist links: `event_artists`, filled by trigger `scraped_events_match_artists` on lineup names and sourced aliases (rule-based), only for events with a source URL. Links are confirmed automatically; staff remove wrong ones with Not them in /ops/gig-links (rejections stick). Param approved (migration 039, flag `gig_auto_publish`): a pending upcoming event with a confirmed roster artist link is published automatically. Artist pages show confirmed links on published events only (`artist_upcoming`) and past gigs from `artist_gigs` where `verified` is true.
- Artist page v2 (board I) serves every approved artist at `/artists/<slug>` when flag `artist_page_v2` is on (switch it at /ops/flags); Vercel previews and local dev always show it. It also carries the bio, booking form, press kit, mixes, photos, festivals, CCD nights, tour dates and structured data (MusicGroup, MusicAlbum, MusicEvent). Blocks hide when empty.
- Artist research: `scripts/artist-v2/research/pipeline/README.md` (gaps report, rule-based MusicBrainz and Deezer pass, parallel research agents, validator, fill-only SQL). Every fact keeps its source; identity first; never change an existing bio, city or link without Param's OK. Scope is Indian and South Asian artists (diaspora included); artists with no South Asian link are hidden. Bandcamp item ids are stored on releases (migration 040, `bandcamp_item_id`); the in-page Bandcamp player is on the new artist page for releases not on Deezer.
- Scoring is rule-based in Postgres (`scoring_keywords`, `trusted_venues`, trigger `score_scraped_event`). Do not add AI calls to crons.
- Credibility (Param, 5 Nov 2026, migration 047): publish a scene night only when someone credible is behind it: a roster artist on the lineup, a credible touring act, or a credible promoter or series (`curation_trust`, plus approved `promoters`). A good venue alone is never enough. Blocks (brand series, brewery nights, hard techno, psy) override. Trigger `zz_scraped_events_credible` fills `scraped_events.credible`; /ops shows it and edits the list. Rules: `ccd/curation-rules.md`.
- Loops (5 Nov 2026, migrations 048 to 052):
  - Look-alike nights are caught by `scene_dupe_of`. Flag `credible_auto_publish` (off) would publish credible, non-duplicate pending nights.
  - `submit_event_v2` takes lineup and promoter.
  - Share cards are served at `/api/card/<kind>/<target>?size=story|link`. Shares and opens are counted with `?ref=` and `log_share` (`src/lib/share.ts`).
  - Artist claim links: `/claim/<token>` (`ops_claim_invite`).
  - Calendar files are served at `/api/ics/<key>`.
  - Crons in vercel.json:
    - Weekly release check: `/api/cron/releases`, Deezer, fill-only.
    - Daily reminders: `/api/cron/reminders`, web push. Needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
  - WhatsApp opt-in is stored only. Nothing is sent yet.
  - Booking emails go through `ops_booking_outbox` and `emailBookingOutbox`.
  - Vercel Web Analytics tracks eight custom events (`src/lib/track.ts`).
- Improvement loop: `scripts/audit/check.cjs` (Playwright audit), `scripts/audit/LOOP.md` (playbook), `scripts/audit/LOOP_LOG.md` (rounds). The scheduled task "CCD site improvement loop" pushes to `loops/auto` and never merges.
- Brand: cream/ink, red #dc2626, acid #b6ef36, electric blue #2563eb. Bowlby One display, Space Grotesk body. Brutalist borders and hard shadows. Copy is plain and direct, no em dashes, no hype.
- `npm run build` must pass before any PR.

## Weekly improvement run
1. Check Vercel runtime errors and the latest deployment for the project.
2. Check Supabase advisors (security + performance) and the last 7 `cron_runs`.
3. Pick at most 3 small, safe fixes (broken things first, then SEO/metadata/schema, then performance, then copy). One branch, one PR, titled `weekly: <date>`.
4. Log each item in `build_log` (area, title, status='in_progress', link = PR URL).
5. Never merge. Param approves PRs.
