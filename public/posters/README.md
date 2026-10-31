# Event Poster Images

Images in this folder are served directly from Netlify — no Supabase required.
They load on every page, on every device, even if the database is down.

## How it works

1. Drop your poster JPG here with the right filename (see table below)
2. Push to main — Netlify deploys it instantly
3. The poster shows everywhere automatically

## Expected files

| Filename | Event | Aspect ratio |
|---|---|---|
| `ccdxsocial-blr.jpg` | CCD × SOCIAL — Bangalore | 3:4 portrait |
| `ccdxsocial-mum.jpg` | CCD × SOCIAL — Mumbai | 3:4 portrait |
| `ccdxsocial-hyd.jpg` | CCD × SOCIAL — Hyderabad | 3:4 portrait |
| `ccdxsocial-del.jpg` | CCD × SOCIAL — Delhi (Finale) | 3:4 portrait |

## Format guidelines

- **Format:** JPG or WebP (next/image converts to WebP/AVIF automatically at CDN level)
- **Minimum size:** 600 × 800px
- **Recommended:** 900 × 1200px (Netlify CDN serves it at the correct display size)
- **Max file size:** Under 2MB before optimisation

## Override with Supabase (optional)

If you upload a poster via the admin panel to Supabase Storage,
that URL takes priority over the local file automatically.
The local file is the fallback — it always works regardless.
