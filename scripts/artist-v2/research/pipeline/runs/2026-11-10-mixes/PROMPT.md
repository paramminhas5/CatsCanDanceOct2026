# Mix hunt (10 Nov 2026)

Goal: Param wants at least one more DJ set or mix for every artist in your batch (they each have 0 to 2 stored, listed in `mixes_already_stored`). Aim for 2 to 3 new ones each where they exist. These are Indian and South Asian DJs from New Delhi Community Radio, HouseCats, boxout.fm and Padmini Records.

Where to look (cheap first, the WebSearch budget is shared by all agents and small):
1. Mixcloud public API from the shell: `curl -s "https://api.mixcloud.com/search/?q=<name>&type=cloudcast&limit=20"` and the artist's own uploads `curl -s "https://api.mixcloud.com/<username>/cloudcasts/?limit=50"` when `mixcloud` is set. Also station accounts: boxoutfm, WildCity, Mixmag Asia, RefugeWorldwide, worldwidefm, NTSRadio, Rinse FM.
2. YouTube from the shell: `yt-dlp --flat-playlist --print "%(id)s | %(title)s | %(channel)s" "ytsearch10:<name> dj set"` (also try "<name> boiler room", "<name> mix").
3. SoundCloud oEmbed only, to confirm a URL you already have: `curl -s "https://soundcloud.com/oembed?format=json&url=<url>"`. Do not fetch SoundCloud pages.
4. WebSearch and WebFetch only if 1 and 2 give nothing, at most 3 searches for your whole batch.

Identity rules: many names are generic (Raj, Sage, Odd, Baba, Ritz, Agent, Emote, D80, Lacuna, Corridors). Accept a mix only when the title or poster names the artist AND something ties it to them: their Instagram handle or SoundCloud/Mixcloud account, an Indian or South Asian outlet or venue, a city we store, or the same sound and scene as their NDCR/HouseCats/boxout set. Confirm each URL with oEmbed (YouTube: `https://www.youtube.com/oembed?format=json&url=<url>`, Mixcloud: `https://app.mixcloud.com/oembed/?format=json&url=<url>`). Never include a URL already in `mixes_already_stored`, a track or release (mixes and DJ sets only), or a page that is not a playable set. Rafiki is Sohail Arora (Krunk, Mumbai). Tapan Raj is from Midival Punditz. Sub-Z is a New Delhi crew.

Output: write valid JSON to {RUN}/out{N}.json, a list with one object per artist: {"slug", "mixes": [{"title", "url", "year" (or null), "poster", "how_confirmed"}], "notes"}. Empty list when nothing confirmed. No em dashes. Do not touch the database or git.
Final reply: one line per artist with the count of new mixes.
