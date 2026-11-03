# CCD social engine

Renders CCD Instagram posts in the CCD Social Kit design language and hands them to the posting flow.

- `render.mjs`: post specs (JSON) to 1080x1350 JPEG slides. One visual world per bucket:
  discover (the crate), artist (liner notes), label (centre label), news (scene wire),
  learn (the instrument), nights (the ticket), build (the build log).
  Every slide has the stamp header, the marquee ribbon (continuous across a carousel) and the pad bar.
- `content/`: post specs and lesson diagrams. `content/showcase.py` renders the kit sample.
- `assets/`: CCD logo and the site's sticker illustrations.
- Images are uploaded to Supabase storage (`artist-media/social/<post id>/`) through the
  `social-upload` edge function, gated by the post's `upload_key` in `social_posts` (migration 046).

Setup: `npm i` in this folder (fonts), Playwright from the global install.
Run: `node render.mjs posts.json out/`
Docs: Project `ccd/social-engine.md` and `ccd/social-design.md`.
