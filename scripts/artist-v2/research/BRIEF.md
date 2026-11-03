# Research brief: Cats Can Dance artist pages (sourced facts only)

Cats Can Dance (CCD, catscandance.com) is a Bengaluru music platform. Each artist has a page with a career timeline. You are filling gaps with facts that are each backed by a public web page. Nothing is guessed and nothing is generated without a source. A wrong fact on a real artist's page is far worse than a missing one.

Input: your batch file (JSON list). Each item has slug, name, city, genres, links we already store, a bio excerpt, release years and sample releases on record, press URLs already stored, sound tags already stored.

## Identity first
Many names are shared (for example several artists are called Komorebi). Before using any page, confirm it is the same artist: city, genre, label, releases or links must match what we store. Write how you confirmed it in `identity`. If you cannot confirm, return the artist with empty lists and a note.

## What to return per artist
1. `eras` (0 to 3): periods where the artist's sound is described by a source.
   - from_year: a year backed by evidence (a release year on record, the source's date, or a dated fact in the source). to_year: the year before the next era, or null for the current one.
   - sound: 4 to 9 plain words describing the sound in that period, sentence case, from the source's own description. Examples of the house style: "Glitchy, mid-tempo post-dubstep, led by piano"; "Dreamy pop over hi-hat rhythms and airy synths"; "Clarinet, strings and plucked bass".
   - tags: 2 to 5 short tags from the source (genres, instruments, textures).
   - source_url, source_name (publication), quote: the exact words in the source that support the sound line (under 30 words).
   - One good source covering the whole career is fine: return one era with to_year null. Only split eras when sources show a real change over time.
2. `sound_tags`: up to 3 short phrases describing their sound, each quoted or closely taken from a source, with source_url. Skip ones already stored.
3. `aliases`: other performing names, side projects or former names, with source_url. Not legal or real names.
4. `press`: up to 5 articles about the artist (interviews, reviews, features, profiles) from real outlets, not already stored. title, publication, url, date_published (YYYY-MM-DD or null).
5. `mix_links`: up to 3 mixes or live sets on SoundCloud, YouTube, Mixcloud, NTS, RA, Boiler Room or a known outlet, posted by the artist or the outlet. title, url, year if shown.
6. `spotify`: the open.spotify.com/artist URL only if our record has none and you are sure it is the same artist; else null.
7. `bio_draft`: only if bio_excerpt is null. One or two plain sentences of facts (where they are from, what they play, notable labels or residencies), each fact in `bio_sources`. Else null.
8. `notes`: anything Param should know (doubts, namesakes, nothing found).

## Rules
- Use WebSearch and WebFetch. Open a page before citing it; cite only what it says. Good sources: Resident Advisor, Mixmag, Rolling Stone India, Wild City, Homegrown, Boiler Room, DJ Mag, The Hindu, Scroll, Bandcamp pages, label pages, official sites.
- No em dashes anywhere. No hype words (iconic, legendary, groundbreaking, trailblazing, visionary, must-hear). Plain, direct language.
- Do not touch the database or any repo. Do not run commands that write anywhere except your output file.
- Spend your effort on the artists with more history first, but return an entry for every artist in the batch.
- Write your result as JSON to the output path given, as a list of objects with keys: slug, identity, eras, sound_tags, aliases, press, mix_links, spotify, bio_draft, bio_sources, notes. Valid JSON only.
- In your final reply give a short summary: how many artists got eras, and which ones you could not confirm.

## Addendum: releases (added after start)
CCD is becoming the reference database for South Asian electronic music, filling gaps where MusicBrainz and Deezer have nothing. So also return:
9. `releases`: for artists with releases_on_record under 5, up to 20 releases you can confirm on a primary page: Bandcamp, Beatport, Discogs, MusicBrainz, the label's own site, SoundCloud (official releases, not mixes) or a press announcement. Each: title, year, release_type (album, ep, single, remix, compilation), label (null if self-released or unknown), url (the page that confirms it), date (YYYY-MM-DD if shown, else null). Skip anything already in sample_releases. Do not include DJ mixes here (those go in mix_links).
10. `ids`: other stable ids you can confirm for the artist: bandcamp (URL), discogs (artist URL), musicbrainz (artist MBID or URL), beatport (artist URL), ra (ra.co/dj/... URL), wikidata (Q-id). Only the same artist.

## Addendum: pass 2 (4 Nov 2026 IST)
Second pass for artists with no sourced eras or nothing that plays on their page. Same rules as above. Extra priorities:
- `mix_links` first. A SoundCloud, YouTube or Mixcloud URL plays on the page, so prefer those (an outlet's channel or the artist's own account, for example Wild City, Boiler Room, Mixmag, Keep Hush, Rinse, NTS on Mixcloud). Up to 5 per artist this pass. Open the page and confirm the artist is the one playing. Skip anything in `mix_urls_already_stored` or equal to `mix_url`.
- For releases on a Bandcamp page you opened, add `bandcamp_id` (the number in `item_id` or `album=` / `track=` in the page's embed data) and `bandcamp_type` ("album" or "track") when the page shows them.
- Artists whose records already have eras (`has_eras` true) need only mixes, releases, ids and press.
- If nothing public exists (common for small local DJs), return empty lists and say so in notes. Never guess.
