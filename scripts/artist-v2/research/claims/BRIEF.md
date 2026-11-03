# Claim check brief (3 Nov 2026)

Param's rule: no unverified claims from artists. Many bios came from press kits or the artists themselves and carry claims nobody has checked ("most booked", "shared stages with", "championed by", "first Indian to", chart positions, festival lists).

For each artist in your file:
1. Split the stored bio into individual factual claims.
2. For each claim, find a public page that supports it (WebSearch first, then WebFetch the page; the fetch tool only opens URLs from a search result or a page you already opened). Good sources: the label, the festival or venue, RA, Mixmag, DJ Mag, Rolling Stone India, Wild City, Homegrown, The Hindu, Boiler Room, Bandcamp, Beatport, Discogs, MusicBrainz, the artist's own official site for plain facts about themselves (not for praise).
3. Mark each claim `supported` (with source_url and a short quote under 25 words), `not_found`, or `contradicted` (with the source).
4. Write `new_bio`: only supported claims, plain and direct, 2 to 5 sentences, no em dashes, no hype words (iconic, legendary, groundbreaking, trailblazing, visionary, prestigious, historic, renowned, brightest, most booked). Keep names, places, labels, dates. If something was "named one of X" by an outlet and you find that outlet's list, it can stay as a plain fact ("Mixmag listed her among ... in 2022").
5. Do not add new facts that were not in the bio, except to replace a contradicted fact with what the source says.

Output: JSON list to the path you are given, one object per artist: {"slug", "claims": [{"claim", "status", "source_url", "quote"}], "new_bio", "notes"}. Do not touch any database or repo; write only your output file.
