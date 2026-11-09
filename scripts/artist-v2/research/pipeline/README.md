# Artist research pipeline

One flow for filling artist pages and adding new artists, so each round is a few commands instead of a day.
CCD aims to be the reference database for South Asian electronic music, so every fact keeps the page it came from.
Scope: Indian and South Asian artists, diaspora included. Artists with no South Asian link stay hidden.

## The flow (run from the repo root with `set -a; . ./.env.local; set +a`)
1. **Gaps** `python3 -I scripts/artist-v2/research/pipeline/gaps.py`
   Reads the public tables, writes `pipeline/runs/<date>/` with `gaps.md` (what is missing, per field) and `batchN.json` (8 artists each).
   New artists: `--status pending --all`. One artist: `--slugs name`.
2. **Rule-based pass** `python3 -I scripts/artist-v2/research/pipeline/auto.py pipeline/runs/<date>`
   No AI. MusicBrainz identity from our stored MBID or our own Spotify, SoundCloud or Bandcamp link (one artist, same name),
   then Discogs, Wikidata, Bandcamp, Beatport, RA, Spotify and Deezer ids and dated release groups. Checks stored mix links
   with oEmbed and lists dead ones in `dead_links.json`. Writes `out_auto.json`. About 3 seconds per artist (MusicBrainz rate limit).
3. **Research agents** (Claude, in a session): one agent per batch file, all in parallel, each with `AGENT_PROMPT.md`
   and `../BRIEF.md`. They write `outN.json`. This is the judgment part: identity, sound per period, press, mixes, Bandcamp ids.
4. **Validate** `python3 -I scripts/artist-v2/research/validate.py pipeline/runs/<date>`
   Drops anything without a source, hype words, bad years, items the research flagged. Writes `rows.json`.
   Then read the `notes` in each `out*.json`: doubts and record fixes go to Param, never straight in.
5. **SQL** `python3 -I scripts/artist-v2/research/gen_sql.py pipeline/runs/<date>`
   Fill-only chunks in `sql/` (inserts with `on conflict do nothing`, updates only where empty). Load them with the
   Supabase MCP `execute_sql`. Bandcamp ids from `rows.json` (`bc`) load with the pattern in `../../bandcamp/load_ids.sql` (needs migration 040).
6. **Check** `gaps.py` again: the counts should move. Spot-check two or three quotes against their pages.
7. **Claims** (`gaps.md` field `claims`): bios with press-kit claims (most booked, shared stages with, championed by, firsts, support lists). Run a claim check with `../claims/BRIEF.md`: every claim gets a source or comes out. Param's rule (3 Nov): no unverified claims from artists, including bios sent in through the forms.

## Fetch access for the scheduled run
The weekly task has nobody present to approve fetch prompts, so approve these domains in the task's permission settings (Param did this on 9 Nov 2026): thewildcity.com, mixmag.net, mixmag.asia, ra.co, *.bandcamp.com, homegrown.co.in, rollingstoneindia.com, djmag.com, refugeworldwide.com, magneticfields.in, platform-mag.com.
Policy blocks stay blocked: SoundCloud pages (robots), and anything the fetch tool refuses. Never work around them. Use open APIs (MusicBrainz, Deezer, Wikidata, Discogs with a token) and oEmbed (SoundCloud, YouTube, Mixcloud) instead, and artist claim links (`/claim/<token>`) for facts only the artist has.
Agents that still hit a block name the page in `notes`, so the next round can retry or ask the artist.

## Rules that do not change
- Identity first. Shared names are common (Komorebi, Kibo, Jatayu, Violet). If a page cannot be tied to the artist through
  city, label, releases or a link we already store, it is left out.
- Never change a bio, city or link on an existing record without Param's OK; list it in the notes instead.
- Pages the fetch tool cannot open are not cited. Do not work around blocked sites.
- No em dashes, no hype words. No AI in database crons.

## Adding new artists
New South Asian artists come in through `submit_artist` (forms), the gig radar and /ops/curation. Once Param approves
them, run steps 1 to 6 with `--status approved --slugs <new slugs>` (or `--status pending --all` to research before
approving). The weekly scheduled task (when Param turns it on) runs steps 1, 2, 4 and 5 for new and changed artists and
leaves the agent step and anything that edits an existing record for review.
