# Extra instructions for the NDCR and HouseCats run (10 Nov 2026)

Every artist in these batches played a set on New Delhi Community Radio (NDCR, Delhi station co-run by Kalbaisakhi and founder-resident Nida; YouTube @newdelhicommunityradio, SoundCloud new-delhi-community-radio, Instagram @newdelhicommunityradio) or on HouseCats (YouTube @HouseCatsAtHome, Instagram @housecats_live, run by Maddeof and Parvati, linked to Off The Block fest). Each item lists its `sets` (YouTube URLs with titles) and, for HouseCats sets, the Instagram handle the video description gives (`instagram_from_video_description`). Those are the identity anchors: the set itself proves the person played the station; use the handle and the genres in the title to tie other pages to them. Many names are generic (Raj, Sage, Nash, Odd, Baba, Ritz, Big M, Vani, Rafiki, Daku, Didar, Kizzi). Only use a page that matches the handle, the NDCR or HouseCats set, or the Indian scene with the same sound.

Some guests are international (NDCR hosts sets from Vietnam, Japan, Singapore, Bangladesh, the US and UK). Bangladesh, Pakistan, Sri Lanka, Nepal and diaspora count as South Asian.

Extra keys per artist:
- `south_asian`: {"value": "yes" | "no" | "unknown", "evidence": "<one line>", "source_url": "<page>"}. "yes" needs a page saying they are based in or from South Asia, or of South Asian heritage. "no" needs a page showing they are from elsewhere with no South Asian link.
- `profile`: {based_city, from_city, instagram (handle or URL), soundcloud, mixcloud, website, kind ("dj", "producer", "live act", "band", "collective" or "selector"), sources: {field: url}}. Only what a page you opened states.
- `bio_draft` with `bio_sources` for every confirmed artist (two or three plain factual sentences). Without em dashes.
- Do not add the NDCR or HouseCats YouTube sets to mix_links: they are already stored. Add other mixes.
You can read a YouTube video's title and channel with oEmbed from the shell: curl -s "https://www.youtube.com/oembed?format=json&url=<url>".
