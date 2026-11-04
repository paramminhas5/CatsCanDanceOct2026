# Improvement loop

Param asked for this on 5 Nov 2026: run the improvement check, build fixes, suggest more improvements to visuals and product, build those, and repeat. Run it without asking him for permission. Every rule in CLAUDE.md still applies.

## Setup (once per session)
1. Work on branch `loops/auto`, created from `loops/v1` if it does not exist yet; otherwise check it out and pull. Never push to `main`, `home/v3` or `loops/v1`.
2. Run `npm ci` if `node_modules` is missing.
3. Read `CLAUDE.md`, then the last entries in `scripts/audit/LOOP_LOG.md` so you don't redo or undo earlier rounds.
4. The scheduled task "CCD site improvement loop" runs one round per session. Count the `## Loop round` headings in `LOOP_LOG.md`. If there are already 5, do not run another round: turn the task off (list_triggers, find "CCD site improvement loop", update_trigger enabled false), add a line to the log, push, and stop.

## One round
1. Run `npm run build`, then `npx next start -p 3322` in the background. Wait for it to come up.
2. Run `BASE=http://localhost:3322 node scripts/audit/check.cjs`. It checks 13 pages at desktop and phone width and writes `scripts/audit/out/report.json` plus full-page screenshots. Add pages to `PAGES` if a round touches them.
3. Look at the screenshots yourself. Cut the phone ones into strips with PIL, because a full page is too tall to read in one image. Look for:
   - clipped or overlapping text, and content wider than the screen
   - empty or broken blocks, and layouts that break
   - weak hierarchy and unclear next steps
   - copy that breaks the brand rules: plain and direct, no em dashes, no hype
4. Fix what is broken first. Then pick up to 3 improvements, visual or product, that make the site clearly better for someone finding a night, an artist, or School. Prefer finishing loops that already exist (share, going, crews, booking, reminders, claims) over adding new surfaces.
5. Run `npm run build` (it must pass). Re-run the audit and check the screenshots of every page you touched.
6. Commit with the message `loop round N: <summary>` and push. Before round 1, open a PR from `loops/auto` into `loops/v1` titled `Improvement loop` (use `gh api repos/paramminhas5/CatsCanDanceOct2026/pulls` with a JSON body if `gh pr create` fails). After that, keep pushing to the same PR.
7. Append the round to `scripts/audit/LOOP_LOG.md` under a heading `## Loop round N (<date>)`, in this order:
   - the date
   - audit numbers before and after
   - what you fixed
   - what you built
   - what you suggest next but did not build, and why

## Limits
- One round per session, 5 rounds in total. If a round finds nothing broken and nothing worth building, write that in the log and turn the task off early.
- Stop at once and say so in the log if:
  - the build breaks and you can't fix it in the same round
  - you hit a usage or rate limit
  - you have used most of your context
- Param asked to stop if usage passes 60%. The loop cannot see his usage meter, so it caps itself by rounds instead. If any tool, error or system message mentions usage limits, rate limits, overage or a spending cap: stop at the last green build, push only what builds, log why, and turn the task off.
- No database changes: no migrations, no data edits, no publishing nights. Write the migration you would want into the log as a suggestion.
- No new paid services, keys or env vars, and no AI calls. Feature flags stay as they are.
- Keep the design system: cream/ink, red, acid, electric blue, Bowlby One and Space Grotesk, brutalist borders and hard shadows. Small visual polish is fine to build. A section redesign or a new page goes into the log as a proposal, because design changes go on the canvas first.
- Never hide content until it scrolls into view (no `initial={{ opacity: 0 }}` with `whileInView`).
- Never merge. Param approves PRs.

## At the end
Post a short summary as the session's last message:
- the PR link
- which round this was
- the top fixes
- what was built
- the top 3 suggestions waiting for Param
