/**
 * Weekly release check (Vercel cron, see vercel.json). No AI.
 * For every artist with a high-confidence Deezer id, reads their Deezer albums and sends the ones released in
 * the last 18 months to ops_add_releases, which adds only what we don't have (migration 049).
 * Auth: Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set. Without it, only Vercel's cron agent runs it.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { rpc } from "@/lib/api-rpc";

export const config = { maxDuration: 60 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TYPES: Record<string, string> = { album: "album", ep: "ep", single: "single", compile: "compilation" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = process.env.CRON_SECRET;
  const ok = secret ? req.headers.authorization === `Bearer ${secret}` : String(req.headers["user-agent"] ?? "").startsWith("vercel-cron");
  if (!ok) return res.status(401).json({ error: "unauthorized" });
  const token = process.env.OPS_TOKEN;
  if (!token) return res.status(200).json({ ok: false, reason: "OPS_TOKEN not set" });

  const list = await rpc("ops_deezer_artists", { p_token: token });
  const artists = (list.ok && Array.isArray(list.data) ? list.data : []) as { slug: string; deezer: string }[];
  const since = new Date(Date.now() - 548 * 864e5).toISOString().slice(0, 10);
  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  for (const a of artists) {
    try {
      const r = await fetch(`https://api.deezer.com/artist/${a.deezer}/albums?limit=50`, { signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      for (const al of (j?.data ?? []) as any[]) {
        if (!al?.id || !al?.title || !al?.release_date || al.release_date < since) continue;
        rows.push({
          artist_slug: a.slug, title: String(al.title).slice(0, 200), release_type: TYPES[al.record_type] ?? null,
          release_date: al.release_date, year: Number(String(al.release_date).slice(0, 4)) || null,
          source_url: al.link ?? `https://www.deezer.com/album/${al.id}`, deezer_album_id: String(al.id), artwork_url: al.cover_xl ?? al.cover_big ?? null,
        });
      }
    } catch (e) { if (errors.length < 10) errors.push(`${a.slug}: ${String(e).slice(0, 80)}`); }
    await sleep(150);
  }
  const out = await rpc("ops_add_releases", { p_token: token, p_rows: rows });
  return res.status(200).json({ ok: out.ok, artists: artists.length, candidates: rows.length, result: out.data, errors });
}
