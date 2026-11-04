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
