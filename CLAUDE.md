# Cats Can Dance (catscandance.com)

Lean Next.js 14 (app router) site. Data lives in Supabase project `jybloszaucgqlbkzquqw` (CATSCANDANCE.COM). Deployed on Vercel from `main`.

## Rules
- Keep it lean: only `next`, `react`, `react-dom` as runtime deps. No ORM, no Supabase SDK, no UI kits. Data access goes through `lib/db.ts` (PostgREST fetch).
- Never put the service key in the app. Public reads use the anon key + RLS. Ops reads/writes go through the token-guarded RPCs (`ops_snapshot`, `ops_set_event_status`, `ops_export`).
- Schema changes: add a new numbered file in `supabase/migrations/` and apply it with the Supabase MCP `apply_migration`. Additive changes only unless Param approves.
- The `events` table is CCD's own nights. `scraped_events` is the scene list: nothing shows publicly until `status = 'published'`. Param decides what gets published.
- Scoring is rule-based in Postgres (`scoring_keywords`, `trusted_venues`, trigger `score_scraped_event`). Do not add AI calls to crons.
- Brand: cream/ink, red #dc2626, acid #b6ef36, electric blue #2563eb. Bowlby One display, Space Grotesk body. Brutalist borders and hard shadows. Copy is plain and direct, no em dashes, no hype.
- `npm run build` must pass before any PR.

## Weekly improvement run
1. Check Vercel runtime errors and the latest deployment for the project.
2. Check Supabase advisors (security + performance) and the last 7 `cron_runs`.
3. Pick at most 3 small, safe fixes (broken things first, then SEO/metadata/schema, then performance, then copy). One branch, one PR, titled `weekly: <date>`.
4. Log each item in `build_log` (area, title, status='in_progress', link = PR URL).
5. Never merge. Param approves PRs.
