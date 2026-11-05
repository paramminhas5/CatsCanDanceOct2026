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
