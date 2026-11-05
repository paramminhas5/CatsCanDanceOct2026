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

## Loop round 3 (5 Nov 2026)
Third scheduled round, same branch and PR #20.
- Date: Thu 5 Nov 2026.
- Audit before: default 13 pages, desktop 13 of 13 clean, phone 12 of 13 (/artists 6 small tap targets). Extra pages: /about, /cookies and /journal had em dashes on both widths; /school was "too wide" on phone.
- Audit after: default 13 pages clean on both widths. /about, /cookies, /journal, /events, /videos, /privacy, /press, /pets and the two Bengaluru guides clean on both widths.
- Note for next rounds: /school is a redirect to the separate School app (ableton-final-next-ccd-school.vercel.app), so its findings (a 450px electric blue card on phone, one em dash in "Each path is a mission snake") belong to that repo, not this one. Leave /school out of `PAGES`.
- Fixed:
  - /artists: the featured cards (every 9th artist with a photo, Kohra first) collapsed to a thin strip on phones because `col-span-2 row-span-2` had no height of its own. They now keep a square shape and show as large photo cards. This was the "6 small tap targets" the audit kept reporting; they were real, not mid-animation.
  - /artists: cards with no photo printed the bio on top of the name and genre chips on phones. The bio now shows from the small tablet width up, 3 lines.
  - Em dash sweep, part 2: About, Team, Cookies, Events, BlogPost, ProductDetail, TalentDirectory, Videos, PromoterDetail, CatsCanCare, content/posts.ts (journal), content/scenes.ts and content/artists.ts. Page titles use " | Cats Can Dance". Journal prose was read line by line: dashes became a full stop, a colon or brackets where a comma would have made a run-on.
  - check.cjs now waits for entrance animations to finish (up to 1.5s, marquees skipped) before measuring.
- Built:
  - Artist page v2, Watch and listen: research notes in brackets are dropped from video and mix titles on display ("Kohra | Boiler Room: Bengaluru (set79 tracklist, no date on page)" now reads "Kohra | Boiler Room: Bengaluru"). Only brackets with words like tracklist, no date, on page, unverified or source are removed.
- Suggested next, not built:
  - Data: the Kohra mix title above carries a research note in `artist_mixes` (or wherever mixes live). The research validator should reject titles with notes in brackets, and that row needs a clean title (data edit, Param).
  - Em dash sweep, part 3: components About, Audiences, Drops, GenreWheel, PartnerContactDialog, Playlist, ProductCard, PromoterLogin, Catbot, ArtistDetail (old page) and ArtistEPK. Mostly titles and alt text.
  - /tour cards on phones: Follow sits alone on its own row under the dates. Moving it up beside the act line would make each card a row shorter. Small layout change, safe to build next round.
  - Home week row: a tidied title that ends in "pres." then gets the clamp ellipsis reads "pres.…". Trim a trailing full stop before clamping.
  - Artist page on phones: the fixed mini player covers the Start here and Follow buttons on first view. Lift the buttons above the fold or start the player collapsed. Design change, canvas first.

- 5 Nov 2026, after round 3: Param said AI and filler copy matters more than em dashes. LOOP.md now has a Copy pass section; rounds 4 and 5 put copy ahead of polish. Claims nobody can back (journal posts, scene guides) go to "Param to check", not into new rewrites.
- Param chose "cut to facts only" for the journal posts and scene/genre guides.

- 5 Nov 2026, by hand after round 3 (Param: "I approve everything, go ahead"):
  - Em dash sweep, part 3: About, Audiences, Drops, GenreWheel, PartnerContactDialog (and the matching default reason on Submit event), Playlist, ProductCard, PromoterLogin, ArtistEPK, ArtistDetail.
  - /tour on phones: Follow sits beside the act name; acts without a page show their links under the dates. Each card is a row shorter.
  - `tidyTitle`: three or more dots become one ellipsis. Two dots now stay as they are, because "Fred again.." is the artist's name (round 2 had turned it into "Fred again.").
  - Book an artist on phones: cards without a photo use a 2:1 poster with the name one size smaller (was 4:3).
  - Home hero on phones: the lower pair of flank cats is hidden; they sat on top of DANCE.
  - Artist page v2 on phones: the player bar waits until something plays, so it no longer covers Start here and Follow on first view.
  - Migration 053 (`supabase/migrations/053_title_tidy.sql`) is written: the same title rules in the scraper trigger, a one-off clean of non-pending upcoming titles, and research notes removed from three mix titles and one video title. NOT applied yet: the session's permission check blocked `apply_migration`. Param can apply it from a session where database writes are allowed.
  - VAPID keys for web-push reminders were set in Vercel (production and preview).
  - Audit: 13 of 13 clean on both widths.
- 5 Nov 2026, later (Param: "I want the cats and DANCE to not be hidden", and approved database changes):
  - Home hero: all four flank cats are back on phones. The lower pair is smaller there and sits in the margins either side of DANCE. The DJ cat is smaller and lower on desktop, so every letter of DANCE is readable on phone and desktop.
  - Migration 053 applied (title tidy in the scraper trigger, research notes out of three mix titles and one video title). "Fred again.." stays as written.
  - `scrape-events` edge function deployed from the repo (version 8): the coverage changes from commit 5b853aa (more pages per source, gigscalendar sitemap).
