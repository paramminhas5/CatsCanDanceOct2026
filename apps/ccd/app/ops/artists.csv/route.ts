import { rpc } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";

const COLS = ["slug", "name", "from_city", "based_city", "genres", "instagram", "website", "soundcloud", "spotify", "mix_url", "has_photo", "gallery_count", "has_bio", "upload_folder"] as const;
const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of every live artist for an outside image or bio script. Behind the /ops basic auth. */
export async function GET() {
  const rows = (await rpc<Record<string, unknown>[]>("ops_artist_worklist", { p_token: process.env.OPS_TOKEN })) ?? [];
  const body = [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="ccd-artists.csv"' } });
}
