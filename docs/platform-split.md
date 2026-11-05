# The split: four products under the Cats Can Dance banner (6 Nov 2026)

Param, 6 Nov 2026, 2am: "these should now be three different products ... build the most brilliant identities and individual products ... a very comprehensive plan ... links for the end products ... clean everything up ... best code and stacks ... ready to ship."

This is the plan, the names, the identities and the engineering. It is the brief every build agent works from and the doc the next chat starts from. The repo copy is `docs/platform-split.md`; the Project copy is `ccd/platform-split.md`.

## 1. The four products

| Product | What it is | Who it is for | The promise | Folder / repo | URL |
|---|---|---|---|---|---|
| **Cats Can Dance** | The umbrella brand and the go-out product: the curated gig guide (What's on), going + crews, our Episodes, tickets, Your account, /ops | People who go out | Find a night, find your crew, come to ours | `apps/ccd` | catscandance.com |
| **Artists** (working name **Headliner**) | Sourced artist pages that keep themselves up to date, discovery, booking desk, On tour, claims, EPKs, the weekly research | Artists, managers, promoters, fans | Your page, your bookings, your tour. Kept up to date for you | `apps/artists` | artists.catscandance.com |
| **Gate** | The host side: put on a night (promoter nights), ticket types and free lists, tickets sold elsewhere, the door (scan, walk-ins, pass-outs, live count), reports, plans | Promoters, venues, artists hosting their own nights, CCD's own door | Run your night: tickets, lists and a door that never queues | `apps/gate` | gate.catscandance.com |
| **School** (working name **Ustad**) | Learn production and DJing by making real music on a real instrument; every lesson adds to your track; opens in Ableton | Beginners to producers, DJs | Learn by making | repo `paramminhas5/Ableton-Final-Next` | school.catscandance.com |

Events + door are one product (Gate). Nights + curation + crews stay in Cats Can Dance. The two meet in the database: a night created in Gate shows on What's on in CCD; a ticket bought in CCD is scanned by Gate.

Each product is a standalone product and better together. Standalone means: its own domain, its own identity, its own home page that sells it, its own sign-in screen, and no dead links into the others when it runs alone. Better together means: one account, the banner on every product, and the cross-links in section 5.

### What moves where (from the current apps/ccd)

| Today in the site | Goes to | Notes |
|---|---|---|
| `/artists`, `/artists/[slug]`, `/artists/[slug]/epk`, `/tour`, `/book`, `/bookings/*`, `/club/artist`, `/claim/[token]`, `/api/artists/*`, `/api/data/artists/*`, `/api/deezer/*`, `/api/booking-*`, `/api/artist-*`, `/api/card/artist|tour|booked`, `/api/cron/releases`, `src/lib/artist-v2.ts`, `booking-desk*.ts`, `booking-email.ts`, `tour.ts`, `src/components/artist-v2`, `booking`, `tour`, `scripts/artist-v2`, edge functions `refresh-artists`, `profile-facts`, `artist-photo-upload`, scheduled task "Weekly artist database update" | **apps/artists** | CCD keeps a thin `/artists` that redirects to the Artists app (301 to the same slug). The home's Artists carousel stays on CCD and links across. |
| `/door/*`, `/gate`, `/promote/*`, `/promoters`, `/promoters/[slug]`, `/submit-event*`, `src/lib/door.ts`, `promoters.ts`, `promoter-auth.ts`, `src/components/door`, `promoters`, `scripts/door`, `scripts/promoters` | **apps/gate** | CCD keeps `/for-venues` (a pitch page) linking to Gate. `/promoters/[slug]` (public promoter pages) stays readable on CCD as part of the gig guide; Gate owns the dashboard. |
| Everything else: home, `/nights`, `/whats-on`, `/me`, `/tickets/*`, going + crews, Episodes, shop, journal, pets/care, partner pages, `/ops` | **apps/ccd** | Cleaned (section 7). |

## 2. Names

Principle (Param, 3 Nov 2026): the name must be easy to understand with its function clear first; each product also gets a cat-language and a music-language nickname used colloquially. Working names are set in `packages/brand/src/products.ts` and nowhere else, so the final pick is a one-line change. Param picks; every category below is presented with equal weight.

### Artists: a name that helps them grow and build a career

| Category | Candidates | The thinking |
|---|---|---|
| A. Outcome words (what the artist is working towards) | **Headliner** (working), **Booked**, **Top Billing** | Say the goal, not the tool. Headliner is the name on top of every poster; Booked is the verb that pays the rent; Top Billing is where your name sits. All three read in one glance and carry the career promise. |
| B. Someone working for you | **Mgmt**, **Agent**, **Lineup** | A page that updates itself, answers bookings and posts your dates is what a manager does. Mgmt is clipped and cool (the band spelling), Agent is plain but collides with AI agents in 2026, Lineup works for both sides (get on the lineup, build your lineup). |
| C. Place words (Apple-clean) | **Stage**, **Marquee**, **Green Room** | One word, no explanation, premium. They say less about function. Green Room is a strong nickname for the artist dashboard whatever the product is called. |
| D. Nicknames | cat: **Top Cat** · music: **the bill** ("on the bill") · the tour section: **Prowl** | Used in copy only. |

### School: a teacher or mentor word

| Category | Candidates | The thinking |
|---|---|---|
| A. Teacher titles, South Asian | **Ustad** (working), **Guru** / **Guruji**, **Riyaz** | Ustad is the master musician who teaches; in everyday Hindi it also means "the pro". Instantly understood across South Asia, exotic and cool everywhere else, nobody in music software uses it, and it engraves well on an instrument. It is an honorific, so the copy should treat it with a wink, not claim it. Guru is the familiar word but worn out by tech. Riyaz is daily practice with your teacher: it is not a teacher word, but it is the habit the product lives on ("do your riyaz"). |
| B. Teacher titles, global | **Maestro**, **Sensei**, **Mentor** / **Tutor** / **Coach** | Maestro is the conductor who teaches, premium and Apple-like, but Maestro is a Gibson effects brand revived in 2022, so avoid it as the final name. Sensei is used by many apps. Mentor, Tutor and Coach are the clearest words and have no character. |
| C. Music-study words | **Etude**, **Woodshed** / **the Shed**, **Clinic** | An étude is a piece written to teach one technique, which is exactly what each lesson is. Woodshedding is jazz slang for practising hard. Clinic is what touring musicians run. Etude is the most premium; the other two are the most insider. |
| D. Nicknames | cat: **Big Cat** (the elder teaching the kittens; the Bob Ross voice is the Big Cat) · music: **riyaz** · also **Kit** (a kitten is a kit, and a drum kit) | Used in copy only. |

### Gate

Gate stays (Param, 5 Nov: "make everyone use Gate"). Nicknames: cat **the cat flap**, music **doors** ("doors at 9"). If Gate ever needs a change: Doors, List ("you're on the list"), Stamp, Wristband.

### Cats Can Dance

Stays. The product inside is "Nights" in the banner. Nicknames already in use: Episodes (our nights), the gig guide (What's on), Crew.

## 3. Identities

Rules across all four: product colour is an accent, never a slab; one primary button per block; photographs and posters lead; nothing starts hidden waiting for scroll; copy is plain, direct, no em dashes, no hype, nothing that reads as AI-written. Tokens live in `packages/brand` (one CSS file per product) and must match this section.

### Cats Can Dance (unchanged, it is the umbrella)
Brutalist isometric cat world. Stone #e8e6e3 and cream, ink #050a14, red #dc2626, acid #b6ef36, electric blue #2563eb. Bowlby One display, Space Grotesk body, 3px ink borders, hard 8px shadows, the white cats. The live site is the reference and nothing here changes it. What is new: the banner (below), the home overview tile per product, and a "Work with us" row that points at Gate and Artists.

### Artists (Headliner): Airbnb clarity, Apple restraint, Gen Z volume
- **Feel:** white space that lets photographs shout. Big, tight, black display type. One loud colour. Everything else is quiet so the artist is loud.
- **Colour:** paper #ffffff, bone #f4f2ec (section backgrounds), ink #0a0a0c, graphite #2b2b30, mute #6b6b70, line #e6e4de. The one accent: acid #b6ef36 (shared with CCD, so the family shows) used as the marker behind a word, the "available" tag, the mark, hover states. Live red #ff3d00 only for the pulsing "on tour now" dot. Primary buttons are ink with white text (Apple), never acid fills.
- **Type:** Bricolage Grotesque 800 for display (tracking -0.04em, leading 0.92, optical size 96) and Geist for body and UI. Headlines are huge: the artist's name is the hero.
- **Layout (Airbnb):** a pinned search bar (Where, When, Genre, Budget) on the index; a photo-first card grid (4:5 photo, name, city, next date, "from ₹" when the artist allows it); the artist page is a listing: gallery, name, "Booked 12 times through Headliner", the sourced bio, releases with Play, eras, connections, upcoming dates, and a sticky booking panel on the right ("Book this window", tour windows, response time). On tour is a map plus a date strip.
- **Signature pieces:** the headline card (name in display type over the photo like a poster), the acid marker, the "Updated 3 days ago · 14 sources" line under every page, the Play button that streams real previews, the booking panel.
- **Motion:** Apple-quiet. Fade-up on load, 1.02 scale on card hover, one hero moment where the name slides in. Reduced motion respected.
- **Mark and wordmark:** HEADLINER set in Bricolage 800; the mark is an acid rounded square with an ink "H" cut to look like a marquee letter. Works as an app icon.
- **Voice:** second person, short, confident. "Your page keeps itself up to date." "Book Sandunes for Goa, 12 to 14 Dec."

### Gate: built for 1am at the door
- **Feel:** a backstage laminate. Black, hi-vis yellow, huge numbers, screens that flash a whole colour so the person on the door never has to read.
- **Colour:** black #0a0a0a, surface #161616, raised #1f1f1f, line #2a2a2a, text #f5f5f5, muted #9a9a9a. Accent yellow #ffe600 (wristband yellow) on the wordmark, primary buttons and the stripe. Status colours stay exactly as the door uses them: in green #22c55e, pass-out blue #3b82f6, refused red #ef4444, not on the list orange #f97316.
- **Type:** Anton for the wordmark and every big number (tabular figures), Space Grotesk for UI (ties it to CCD).
- **Layout:** phone first, 56px tap targets, bottom tabs on the door screen (Scan, Guests, Walk-in, Count), the count huge in the header, a diagonal yellow-black stripe as the only decoration (the wristband), dark only.
- **Signature pieces:** the full-screen colour flash with beep and buzz, the live count link for the venue, the report you copy and paste, the laminate card on the landing page.
- **Mark and wordmark:** GATE in Anton with the stripe cutting through the bar of the A; the mark is a yellow laminate shape (rounded rectangle with a slot) with a black "G".
- **Voice:** imperative, short. "Scan." "In." "You're on the list."

### School (Ustad): a real instrument
- **Feel:** Model 1 hardware (already designed, 44 boards): deep glass screens with an engraved seam, matte silicone pads in one recessed tray, light that means something, engraved lowercase labels, pink only on the go key. The identity work here is the name, the wordmark, the banner and a marketing page, not the instrument.
- **Colour:** body #121214, graphite #1c1c1e, silicone #2c2c30, seam #0b0b0d, engraved label #8e8e93, cream text #f2f2f7, glass #0f1f1b with LCD text #9df5d8, go pink #ff4d8d.
- **Type:** Space Grotesk, lowercase in the UI, JetBrains Mono on the screens.
- **Wordmark:** `ustad` lowercase, engraved into the faceplate (text-shadow highlight above, shadow below), letterspaced; the "u" doubles as a knob with its indicator line at one o'clock. The mark alone is that knob.
- **Voice:** the Big Cat. Kind, generous, old-man warmth, pitched at adults, never jargon first.

### The Cats Can Dance banner (every product)
A 36px strip (32 on phones) above each product's own nav: the cat mark and "Cats Can Dance" on the left; the four products as verb + name (Go out Nights · Book Headliner · Host Gate · Learn Ustad) with a coloured dot per product and the current one highlighted; the product's promise in the middle; Sign in or the person's name on the right. Ink background, cream text, no logo soup. `packages/banner`.

## 4. Architecture

```
CatsCanDanceOct2026 (branch platform/v1)
  apps/ccd        Next 14 Pages Router (ported live site) + App Router /ops
  apps/artists    Next 16 App Router, React 19, Tailwind 4, typed Supabase, "use cache"
  apps/gate       Next 16 App Router, PWA (installable, offline door queue), typed Supabase
  packages/brand  product registry + tokens (+ css per product)
  packages/banner the banner component
  packages/db     Supabase clients (server, anon, browser, rest) + generated Database types
  packages/auth   shared cookie domain, hand-off tokens (HS256, 60s, nonce)
  packages/config tsconfig base
  supabase/       migrations 003..061 (shared), edge functions
Ableton-Final-Next (School): Next 15 App Router + Rust engine + Tauri. Gets the banner and "Continue with Cats Can Dance".
```

- **One database.** Supabase `jybloszaucgqlbkzquqw` stays the master for ccd, artists and gate. Table ownership (who writes): ccd owns events, scraped_events, curation, members, tickets, orders, crews, night plans, shop, posts, push, share_events, ops tables; artists owns `artists` and every `artist_*` table, booking_requests/messages/reviews, tour_posts/stops, private_contacts, artist_gigs, venues; gate owns promoters, promoter_applications, promoter_team, door_* and gate_plans, and reads events, ticket_tiers, tickets, event_rsvps. Shared: event_artists, feature_flags, site_settings. Nobody duplicates data.
- **One identity.** Supabase Auth on the same project. The session cookie is set for `.catscandance.com` (`packages/auth`), so a sign-in on any product signs you in on all three. School keeps NextAuth and its own database and trusts a signed hand-off token from CCD (`ccd/sso-and-accounts.md`, step 1 is in this build). Later (step 3) School can move onto the same auth and database.
- **Cross-links** are never hard-coded. `productUrl("gate")` reads `NEXT_PUBLIC_GATE_URL` (set per Vercel project, so previews link to previews) and falls back to the production URL. `LINKS` in `packages/brand` lists the paths each product owns.
- **Ops.** `/ops` stays in apps/ccd for now (one password, one place) and links out to each product's own admin pages (artists: /ops/artists, /ops/bookings, /ops/tour, /ops/gig-links move into apps/artists at `/desk`; gate: /ops/promoters moves into apps/gate at `/admin`). Both are gated by `members.role in (staff, owner)` through the shared session, not by a second password.
- **Crons and jobs.** Vercel crons are per project: `apps/ccd/vercel.json` keeps reminders; `apps/artists/vercel.json` gets the weekly release check. Edge functions stay in `supabase/functions` (one deploy target) with the owner named in each function's README line. Scheduled tasks: "Weekly artist database update" opens its PR against apps/artists; "CCD site improvement loop" audits apps/ccd.
- **Email.** Resend from the server only, one `RESEND_FROM` on the verified domain, each app sends its own mail (booking mail from artists, door-team invites and promoter decisions from gate, tickets and crews from ccd).
- **Payments.** Razorpay stays in apps/ccd (tickets) now; Gate's Pro plan billing lands in apps/gate when Param sets a price.
- **Deploys.** One Vercel project per app on the same repo: `catscandance` (root `apps/ccd`), `ccd-artists` (root `apps/artists`), `ccd-gate` (root `apps/gate`). Production for the new projects deploys from `platform/v1` until it is merged into `main`. The live `catscandance-v2` project keeps serving catscandance.com from `main` until Param moves the domain to `catscandance`; nothing changes on the live site until he does.
- **Env per project.** Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CCD_URL`, `NEXT_PUBLIC_ARTISTS_URL`, `NEXT_PUBLIC_GATE_URL`, `NEXT_PUBLIC_SCHOOL_URL`. Server: `SSO_SHARED_SECRET` (all four), `RESEND_API_KEY` + `RESEND_FROM` (ccd, artists, gate), `OPS_TOKEN` (ccd, artists, gate: the token-guarded RPCs), `OPS_PASSWORD` (ccd only), `RAZORPAY_*` (ccd), `VAPID_*` + `CRON_SECRET` (ccd, artists). Secrets are set in Vercel by Param, never in the repo or in chat.
- **Why a monorepo and not three repos:** three apps share tokens, the banner, the database types and the auth helpers; a monorepo keeps those in one place with one CI. Each `apps/<name>` is self-contained (its own package.json, config, README, CLAUDE.md), so splitting into separate repos later is `git subtree split -P apps/<name>` plus publishing the four packages. School stays separate because it carries a Rust engine and native shells.

## 5. Routes and features per product

### apps/ccd (Cats Can Dance)
Keeps: `/` home v3, `/nights`, `/nights/[slug]` (Episodes and promoter nights in their look), `/whats-on` (gig guide, agenda, going, crews), `/tickets/*`, `/me` (Your account: tickets, plans, crews, bookings via the Artists app, follows, School card, reminders, the door card linking to Gate), `/join`, `/claim` redirects to Artists, `/for-artists` (now a page about Headliner that links across), `/for-venues` (about Gate), `/for-investors`, `/about`, `/press`, `/journal/*`, `/shop/*`, `/pets`, `/care`, `/listen`, `/cat-studio`, SEO pages, `/ops/*`, `/api/*` for the above.
New: the banner; `/artists*`, `/tour`, `/book`, `/bookings*`, `/door*`, `/gate`, `/promote*` become 301 redirects to the other products; the home tiles read live numbers from the database directly (not from the other apps).

### apps/artists (Headliner)
- `/` home: the search bar, "This week" (new releases, new dates), featured artists, the pitch for artists ("claim your page"), the pitch for promoters ("book in two messages").
- `/artists` index: pinned search (city, date window, genre chips, budget band), photo-first grid, steady rhythm, no rate bands on cards, "what's new this week" strip.
- `/[slug]` artist page (short URLs; `/artists/[slug]` redirects): gallery, name, sourced facts with their sources, releases with real Deezer previews and Bandcamp players, eras rail, connections, press, videos, upcoming dates and past gigs (verified), tour windows, CCD nights, the booking panel, share card, structured data (MusicGroup, MusicAlbum, MusicEvent), "updated on" line.
- `/[slug]/epk` press kit; `/[slug]/book` booking request; `/bookings` and `/bookings/[id]` the booking desk (request, counter, accept, confirm, thread, phone masked, calendar marked); `/tour` (map + strip, post a tour, every row bookable); `/claim/[token]`; `/desk` (staff: artists, bookings, tour approvals, gig links, photos, CSV export); `/api/data/artists/[slug]`, `/api/card/*`, `/api/deezer/*`, `/api/cron/releases`, `/sitemap.xml`, `/llms.txt`, `/robots.txt`.
- Research pipeline and photo loaders move with it (`apps/artists/scripts`).

### apps/gate
- `/` home: the pitch (free while we launch, Free and Pro), the laminate, "works with tickets sold on District, BookMyShow, Skillbox, Insider, RA".
- `/promote` (apply), `/promote/[slug]` (dashboard: nights, look, team, plan), `/promote/[slug]/night` (night editor: free ticket types or own ticket link, free list, capacity, ID rules, UPI).
- `/door` (pick the night), `/door/[slug]` (Scan, Guests, Walk-in, Count; offline queue; pass-outs; ID check; UPI QR), `/door/[slug]/setup`, `/door/[slug]/report`, `/live/[key]` (no sign-in, the venue's live count).
- `/admin` (staff: approve promoters and nights, Gate plans, trust list).
- PWA: manifest, service worker caching the door shell, installable on Android and iPhone.

### School (Ustad), repo Ableton-Final-Next, branch `identity/v1` from `school/field`
- `PRODUCT_NAME` and the wordmark in one place; the banner; `/api/auth/ccd` (the hand-off credentials provider, step 1 of `ccd/sso-and-accounts.md`); "Continue with Cats Can Dance" on sign-in; README and metadata updated. Lessons and the instrument are untouched.

## 6. Build order (this session)

1. Skeleton: pnpm + turbo, packages, the site moved to `apps/ccd`. Done.
2. In parallel, three agents on sub-branches merged back into `platform/v1`:
   - `apps/ccd`: paths fixed, dead code removed, redirects to the other products, banner, typecheck and build green.
   - `apps/artists`: new app, every route above, identity applied, build green, Playwright smoke at 390 and 1440.
   - `apps/gate`: new app, every route above, identity applied, PWA, the door e2e ported, build green.
3. School identity branch.
4. Vercel: three projects, env, production deploys from `platform/v1`, subdomains added (DNS by Param), the PR.
5. Check: every deployed page opened, flows clicked, the audit script run, docs updated.

## 7. Cleanup

In this build:
- Delete from apps/ccd: `MarqueeBySlot`, `TicketsStrip`, `Videos`, `Playlist(s)`, `Drops`, `EarlyAccess`, `HomepageEvents` (platform-redesign.md section 7.5), the dead ticketing files from `booking-flow.md`, `compat-router` where no page still needs it, the `litter/*` and `talent/*` legacy page files (their routes already redirect), the Clerk components (flag-gated and unused on the new home), `src/pages/*.tsx` files that no `pages/*` route imports.
- Delete from apps/ccd everything that moved to artists and gate (section 1), leaving redirects.
- One token source per app: `packages/brand` CSS plus each app's Tailwind theme; the duplicate hex palette in `ccd.css` goes.
- Old repos to archive on GitHub (Param): `CCD-Final-Next.Js`, `CCDLATEST`, `ccdfinal`, `CCD_SCHOOL_LATEST`, `catscandance.com`, `ccdclone`, `ccdkiroedit`, `CCDWORKING`, `ablelive`, `ableton-next`, `ableton-playground`, `ccdvideomaker`, `CatscanPosterGen`. Old Vercel projects to delete: `ccdworking`, `ccd-final-next-js-cats-can-dance`, `catscandance-com`, `ccdclone-cats-can-dance`, `ccdkiroedit-*`, `ableton-final-next-ccd-school` (once `ccd-school-app` serves school.catscandance.com).

Next, after this build (section 8 of `platform-redesign.md` still applies to apps/ccd): App Router migration of apps/ccd route by route with the compat-router gone, Next 16, typed database everywhere, feature folders, Playwright screenshots on every PR, Lighthouse budget.

## 8. Cut-over

1. Param reviews the three product links and the canvas.
2. Names: pick from section 2, change `packages/brand/src/products.ts`, done.
3. Merge `platform/v1` into `main`. Vercel: set `catscandance-v2` Root Directory to `apps/ccd` (or move the catscandance.com domain to the new `catscandance` project and delete `catscandance-v2`).
4. DNS at Namecheap: CNAME `artists` and `gate` to `cname.vercel-dns.com`; `school` already points at `ccd-school-app`.
5. Env: `SSO_SHARED_SECRET` in all four projects, `RESEND_FROM` and `OPS_NOTIFY_EMAIL` where mail is sent, `OPS_TOKEN` in artists and gate.
6. Archive the old repos and Vercel projects in section 7.
