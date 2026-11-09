# DESIGN.md: the contract for every screen

Read this before changing any UI in any app. The source boards are on the canvas "CCD Products: Identities", page **Final preview: every page, ready to build**. The plan is `ccd/build-plan-final40.md` in the Claude Project.

## Order of work
1. Design on the canvas first, then code (Param, 4 Nov 2026).
2. Build from the board. If the board and this file disagree, ask. Don't guess.
3. Show Param before merging. Merge only on his say-so.

## One look for the suite
- **Dark.**
  - Base `#0A0A0B`, 1 px hairlines.
  - Muted text at 64% and 56%. Never lower: it fails contrast.
- **Product colour is the accent, never a slab on every section.**
  - Nights `#2563EB`, Artists `#B6EF36`, Host `#FFE600`, School `#FF4D8D`.
  - Each app sets `--k-pc` once on `<html>`.
- **Type:**
  - Bricolage Grotesque for display.
  - Outfit for UI.
  - JetBrains Mono for data labels only (dates, counts, codes).
- **The CCD live look** (cream, ink, Bowlby One, hard shadows) is a later theme. Don't mix it in.

## Tokens and code
- Tokens live in `packages/brand/src/tokens.ts` under `suite`. The CSS mirror is `packages/ui/src/kit.css` (classes prefixed `k-`). Change both together.
- Shared components live in `@ccd/ui`. They are server components with no client JS. Add a piece to `/kit` in `apps/artists` when you add it to the package.
- Product names come from `packages/brand/src/products.ts`. Never type a product name into a component.

## Spacing
- **Phone:**
  - Inset 20.
  - Section gap 28, group 12.
  - Rows 56 minimum.
  - Top bar 60.
  - One bottom bar of 88, or a dock of 64 sitting 18 from the bottom.
  - Nothing sits under a fixed bar.
- **Web:**
  - Inset 64.
  - 130 between sections.
  - Content max 1440.
- **Buttons:** 56, 52 or 44 high. Every tap target is at least 44.

## Materials, one per job
| Job | Material |
|---|---|
| Music | lacquer record, sleeve, tonearm (`Record`, `Sleeve`, `Arm`, `Plinth`) |
| Numbers | glass readout (`Readout`): cells with no value are dropped |
| Shows, receipts, contracts | paper and ink stamps (`Passport`, `k-paper`) |
| Choices | keycaps (`Keycap`) |
| An amount | knob (`Knob`): display only; keycaps or a typed amount are the real control |
| Status | LED (`Led`) |
| New or dated | sticker (`Sticker`) |
| Personality | cats (`Cat`): one per screen, never on a list, a form or the door scanner |

## Motion
- CSS only.
- Records turn once every 1.8 s. The beat is 469 ms (128 bpm).
- Scroll reveals move things. They never fade them in, so content is always visible: without scroll-timeline support, in print, and to crawlers.
- `prefers-reduced-motion` stops everything.

## Data
- **Real data only.**
  - A block with no data is left out, never filled with a placeholder.
  - Anything that is an example (shop items, prices, gear) carries the `ExampleTag` until the real thing exists.
- **Security:**
  - Public reads use anon and RLS.
  - Writes go only through the `SECURITY DEFINER` RPCs.
  - Slugs are checked with `isSlug` before any query.
  - No service key in any app.
- **Off until Param switches them on:** paid features, deposits, contracts.

## Copy
- Plain and direct.
- Function first, short.
- No em dashes, no hype, nothing that reads as AI-written.
- Say what a thing does and what it helps you do.

## Checks before a PR
- `pnpm --filter <app> build`, `typecheck` and `lint` pass.
- Check the page against its board at 1440 and 390 wide. No horizontal scroll at 390.
- Keyboard: every control is reachable, and the focus ring shows.
