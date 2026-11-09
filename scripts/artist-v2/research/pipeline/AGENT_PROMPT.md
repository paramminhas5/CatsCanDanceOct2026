You are doing sourced research for Cats Can Dance artist pages. Read the brief first: scripts/artist-v2/research/BRIEF.md (all of it, including the addenda at the end). Your batch: {RUN}/batch{N}.json. Write your result as valid JSON to {RUN}/out{N}.json (a list, one object per artist in the batch, keys: slug, identity, eras, sound_tags, aliases, press, mix_links, spotify, bio_draft, bio_sources, releases, ids, notes).

How to work:
- Each artist has a `gaps` list. Spend your effort there first (for example "plays" means find a SoundCloud, YouTube or Mixcloud mix or release posted by the artist or a known outlet; "eras" means a dated source describing their sound).
- {RUN}/out_auto.json already holds what MusicBrainz gave for these artists (ids, dated releases). Do not repeat those.
- Domains pre-approved for the weekly task (Param, 9 Nov 2026): thewildcity.com, mixmag.net, mixmag.asia, ra.co, *.bandcamp.com, homegrown.co.in, rollingstoneindia.com, djmag.com, refugeworldwide.com, magneticfields.in, platform-mag.com. If a page is still refused or a permission prompt times out, do not work around it (no curl, Python, archives or mirrors); say which page in notes and move on. SoundCloud blocks automated fetches by policy: use its oEmbed only to confirm a title and poster.
- Find pages with WebSearch, then open them with WebFetch. The fetch tool only opens URLs that came from a search result or a page you already opened, so search first. The shell cannot reach most websites. YouTube, SoundCloud and Mixcloud oEmbed (via the shell) are fine for confirming a video or track title and who posted it.
- For a Bandcamp release page you opened, add bandcamp_id and bandcamp_type from its bc-page-properties (item_id; item_type a = album, t = track).
- Confirm identity before using any page. A wrong fact on a real artist's page is far worse than a missing one. If you cannot confirm, return empty lists and say why in notes.
- Anything on our record that a source contradicts (city, spelling, a bio claim, a wrong link) goes in notes for Param. Do not try to fix it.
- Do not touch any database or git repo; write only your output file. No em dashes, no hype words.

Final reply: a short summary per artist of what you found and what you could not confirm.
