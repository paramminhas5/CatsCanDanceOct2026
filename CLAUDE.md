# Cats Can Dance platform

Four products, one platform, one database. pnpm workspaces + Turborepo.

| Folder | Product | Working name | Stack | Deploys to |
|---|---|---|---|---|
| `apps/ccd` | Cats Can Dance: find a night, find your crew, our Episodes, tickets, Your account, /ops | Cats Can Dance | Next 14 Pages Router (ported live site), App Router for /ops | catscandance.com (Vercel project `catscandance`) |
| `apps/artists` | Artist pages, discovery, booking desk, On tour, claims | Artists (working) | Next 16 App Router, React 19, Tailwind 4 | artists.catscandance.com (Vercel `ccd-artists`) |
| `apps/gate` | Hosts: parties and promoter nights, ticket types, outside-ticket import, the door, reports, plans | Host (working; folder and URL stay `gate`) | Next 16 App Router, PWA, offline queue | gate.catscandance.com (Vercel `ccd-gate`) |
| (separate repo `paramminhas5/Ableton-Final-Next`) | School: learn by making on a real instrument | School | Next 15 App Router + Rust engine + Tauri | school.catscandance.com (Vercel `ccd-school-app`) |

Shared packages:
- `packages/brand`: the product registry (`PRODUCTS`, names, nicknames, colours, URLs, `LINKS`) and design tokens for every product, plus one CSS token file per product. Rename a product here, nowhere else.
- `packages/banner`: the Cats Can Dance banner, the strip above every product. `import { CcdBanner } from "@ccd/banner"` and `import "@ccd/banner/banner.css"`.
- `packages/ui`: the suite look. `@ccd/ui/kit.css` (tokens, materials, motion, `k-` classes) and server-safe React components (buttons, readout, record, sleeve, passport, knob, keycaps, cats). Read `DESIGN.md` first; the kit renders at `/kit` in apps/artists.
- `packages/db`: Supabase clients (`supabaseServer`, `supabaseAnon`, `supabaseBrowser`, `rest`) and the generated `Database` types for project `jybloszaucgqlbkzquqw`.
- `packages/auth`: shared cookie options so one sign-in covers every `*.catscandance.com` product, and the signed hand-off tokens School trusts.
- `supabase/`: migrations (numbered, additive) and edge functions. One database for ccd, artists and gate. School has its own.

## Rules that span the suite
- Read the app's own `CLAUDE.md` before working in it. Product-specific rules live there.
- Names: plain names in URLs and nav; nicknames only in copy. Working names come from `packages/brand/src/products.ts`.
- Design first on a canvas, then code (Param, 4 Nov 2026). `DESIGN.md` at the root is the contract for every screen. Copy is plain and direct, no em dashes, no hype, nothing that reads as AI-written.
- Schema changes are new numbered migrations in `supabase/migrations/`, applied with the Supabase MCP. Next number: check the folder. Additive only unless Param approves.
- Secrets never in the repo or in docs. Public forms write only through anon `SECURITY DEFINER` RPCs.
- Paid or AI features stay off until Param enables them. No AI in crons.
- `pnpm build` (or the app's `pnpm --filter <name> build`) must pass before any PR. Merge only on Param's say-so.
- Handoff docs live in the Claude Project `ccd/` folder. Start with `ccd/next-steps.md` and `ccd/platform-split.md`.

## Commands
```
pnpm install
pnpm dev:ccd | dev:artists | dev:gate
pnpm build            # every app through turbo
pnpm build:artists    # one app
```
On Vercel each app is its own project with Root Directory `apps/<name>`; the install command is `pnpm install` at the repo root (Vercel detects pnpm from `packageManager`).
