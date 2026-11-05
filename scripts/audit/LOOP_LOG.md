# Improvement loop log

## Rounds 1-3 (5 Nov 2026, by hand, branch loops/v1)
- Round 1:
  - The 4.8MB disco mp3 was preloading on every page. It now loads only when disco starts.
  - Night titles over 55 characters get a smaller size and are clamped to 3 lines.
  - Em dashes are cleaned out of scraped titles (migration 052).
  - Bigger filter chips.
- Round 2:
  - On phones, the city/venue lists on What's on were 442px wide on a 390px screen, so dates were cut off. The grid column is now fixed.
  - The audit now measures against the real screen width. Phones stretch the layout to fit too-wide content, which had hidden this.
- Round 3:
  - Tap targets now meet 24px (WCAG 2.2 AA): footer, breadcrumbs, chips, release filters, theme dot, "Full page" links.
  - On phones the School demo sequencer is 2 rows of 8. The pads were 11px.
- After round 3:
  - Desktop: 13 of 13 pages clean.
  - Phone: 10 of 13 pages clean. What's left are inline text links, and the artist cards that are mid-animation when measured.

## Loop round 1 (5 Nov 2026)
First scheduled round, on branch loops/auto (from loops/v1), PR #20 into loops/v1. Rounds 1-3 above were by hand.
- Date: Thu 5 Nov 2026.
- Audit before: desktop 13 of 13 clean, phone 10 of 13 clean (home 2, artists 6, kohra 10 small tap targets). After: the same. Phone /book page height went from 42,200px to 15,400px.
- Note for next rounds: the local build needs `.env.local` with the public anon key (from Supabase get_publishable_keys) or every page renders empty. Kill `next-server` before rebuilding, or the old server serves stale chunk hashes and the audit reports 404s.
- Fixed:
  - What's on: night titles in Bowlby had 0.9 line height, so two and three line titles touched and overlapped on phones. Cards now use 1.05 (the global `.font-display` rule beats `leading-*`, so it takes `!leading-[1.05]`).
  - Book an artist: the type poster split one-word names mid-word ("SARTDAW / G"). Size now follows the longest word as well as the full length.
  - Em dashes in visible copy on the old artist page (ArtistDetail), Submit event and the 404 page.
- Built:
  - Book an artist: each list shows the 24 best matches, then "Show N more artists". On a phone the page was 80 cards long.
  - What's on: genre chips and filters are tidied. Source categories that are not sounds ("club gigs", "music shows") are hidden, each sound has one spelling ("house" and "House" were two chips), and old `?genre=` links still match.
- Suggested next, not built:
  - About 190 em dashes are still in visible copy across older pages (BengaluruSceneGuide 19, SceneHub, BlogPost, Privacy, Press, Pets, CheckoutDialog, RsvpDialog, TransferDialog). One sweep page by page, kept out of this round to keep the diff reviewable.
  - Book an artist on phones: the coloured type poster repeats the name that sits right under it. A shorter poster (16:9) or no poster on phones would halve each card. Design change, so it goes on the canvas first.
  - Scraped titles keep source punctuation ("pres....", "Get Housed- Featuring"). A rule in the scraper or a display tidy (collapse runs of dots, fix "word- Word") would clean them. The display part is safe to build next round; the data part needs a migration (Param).
  - Remaining small tap targets are inline text links on the artist page (label chips, "Source") and artist cards mid-animation. Padding the label chips to 24px is the next small fix.

## Loop round 2 (5 Nov 2026)
Second scheduled round, same branch and PR #20.
- Date: Thu 5 Nov 2026.
- Audit before (13 pages): desktop 13 of 13 clean, phone 10 of 13 clean (home 2, artists 6, kohra 10 small tap targets). Round 2 added /privacy, /press, /bengaluru-underground-dance-music, /bengaluru-techno-events and /pets to the run (pass them with `PAGES=`): press had 3 small tap targets and pets had 2 h1s.
- Audit after (18 pages): desktop 18 of 18 clean, phone 17 of 18 clean. Only /artists is left: the 6 cards are mid-animation when measured, not really small.
- Note for next rounds: `pkill -f next-server` or `pgrep -f next-server | xargs kill` also matches the shell running the command and kills it (exit 144). Use `ps aux | grep "[n]ext-ser"` to find the server, and start it with `setsid nohup npx next start -p 3322 &`.
- Fixed:
  - Phone tap targets: the "Also on CCD" label chips, "Source", "Press kit", "All artists" and "Claim this page" on the artist page, the night titles in the home week row, and the Copy buttons on /press. All now 24px or more.
  - /pets had two h1s (the hero and a hidden SEO line). The hidden one is now an h2.
- Built:
  - `tidyTitle` in `src/lib/find.ts`: scraped titles read cleanly without touching the data. Runs of dots become one ("pres...." to "pres."), "Housed- Featuring" becomes "Housed: Featuring", em dashes become a colon, stray spaces before punctuation go. Used on What's on, the home week row, the home nights demo and the tonight ticker. Date ranges like "5-7 Nov" with an en dash are left alone.
  - Em dash sweep, part 1: visible copy in BengaluruSceneGuide, SceneHub, Privacy, Press, Pets, CheckoutDialog, RsvpDialog and the booking emails (subjects and body). About 64 lines. Code comments were left as they are.
- Suggested next, not built:
  - Em dash sweep, part 2: src/content/posts.ts (65), ArtistDetail (23, old page), content/scenes.ts (19), content/artists.ts (17), Events (13), BlogPost (11), HomepageEvents (10), ProductDetail, TalentDirectory, PromoterDetail, About, Videos, CatsCanCare, Cookies. posts.ts is journal copy, so check each one reads right rather than sweeping blind.
  - /artists cards on phones: the audit flags them because they animate in. Measure after the animation ends (wait for `transitionend` or add a 600ms settle in check.cjs) so the number means something.
  - Home hero on phones: the cat illustrations sit on top of "DANCE" and the left edge of the word is cut. Moving the left cats down or behind the word would fix it. Design change, so canvas first.
  - Episode 5 poster still shows "PLACEHOLDER · POSTER COMING" in the public page. Param to swap in the real poster when it exists (data, not code).
  - The data side of title cleanup: the same rules as `tidyTitle` in the scraper or a trigger would clean titles at the source for share cards and emails too. Needs a migration (Param).
