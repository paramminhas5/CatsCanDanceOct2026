import type { Metadata } from "next";
import Link from "next/link";
import { select } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: photo rights", robots: { index: false } };

type Artist = { slug: string; name: string; instagram: string | null; website: string | null; soundcloud: string | null; spotify: string | null; photo_url: string | null };
type Media = { id: string; artist_slug: string; url: string; author: string | null; license: string | null; license_url: string | null; source_url: string | null };
type Search = { show?: string };

const ig = (h: string | null) => (h ? `https://www.instagram.com/${h.replace(/^@/, "")}/` : null);
const css = `
.ph{font:14px/1.45 system-ui,sans-serif;max-width:1180px;margin:0 auto;padding:28px 16px 80px;color:#111}
.ph h2{margin:0 0 4px}.ph .muted{color:#666;font-size:13px}
.ph table{border-collapse:collapse;width:100%}.ph th,.ph td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
.ph th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}
.ph img{width:56px;height:56px;object-fit:cover;border:2px solid #111;margin:0 4px 4px 0;background:#eee}
.ph .tag{display:inline-block;padding:1px 6px;border:1px solid #111;font-size:12px;margin:0 4px 4px 0}
.ph .ok{background:#b6ef36}.ph .no{background:#fde68a}.ph .none{background:#fecaca}
.ph .bar{display:flex;gap:8px;margin:16px 0;flex-wrap:wrap}
.ph .bar a{padding:5px 10px;border:2px solid #111;color:#111;text-decoration:none;font-weight:600;background:#fff}
.ph .bar a.cur{background:#b6ef36}
.ph .lk a{margin-right:10px}
`;

export default async function Photos({ searchParams }: { searchParams: Search }) {
  const show = searchParams?.show ?? "all";
  let artists: Artist[] = [], media: Media[] = [], err = "";
  try {
    [artists, media] = await Promise.all([
      select<Artist>("artists?status=eq.approved&select=slug,name,instagram,website,soundcloud,spotify,photo_url&order=name.asc", 0),
      select<Media>("artist_media?kind=eq.photo&select=id,artist_slug,url,author,license,license_url,source_url&order=sort.asc.nullslast", 0),
    ]);
  } catch (e) {
    err = String(e);
  }
  const by: Record<string, Media[]> = {};
  for (const m of media) (by[m.artist_slug] ??= []).push(m);
  // A photo counts as cleared only when a licence or permission is recorded for it.
  const cleared = (m: Media) => !!(m.license && m.license.trim());
  const rows = artists.map((a) => {
    const ms = by[a.slug] ?? [];
    const ok = ms.filter(cleared).length;
    const status = ms.length === 0 && !a.photo_url ? "none" : ok === ms.length && ms.length > 0 ? "ok" : "no";
    return { a, ms, ok, status };
  }).filter((r) => show === "all" || r.status === show);
  const count = (s: string) => artists.filter((a) => { const ms = by[a.slug] ?? []; const st = ms.length === 0 && !a.photo_url ? "none" : ms.length > 0 && ms.every(cleared) ? "ok" : "no"; return st === s; }).length;

  return (
    <main className="ph">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="muted" style={{ margin: 0 }}><Link href="/ops">Back to ops</Link></p>
      <h2>Photo rights</h2>
      <p className="muted" style={{ margin: 0 }}>
        Every approved artist, every stored photo, and where to get a better one. A photo is cleared only when a licence or permission is recorded for it
        (<code>artist_media.license</code>, with <code>author</code> and <code>license_url</code> or <code>source_url</code>). Today none is, so all are unverified.
        Links go to the artist&apos;s own profiles so photos can be asked for or downloaded with permission.
      </p>
      {err && <p style={{ color: "#dc2626" }}>Could not load: {err}</p>}
      <div className="bar">
        {[["all", `All (${artists.length})`], ["no", `Unverified (${count("no")})`], ["none", `No photo (${count("none")})`], ["ok", `Cleared (${count("ok")})`]].map(([k, l]) => (
          <a key={k} href={`/ops/photos?show=${k}`} className={show === k ? "cur" : ""}>{l}</a>
        ))}
      </div>
      <table>
        <thead><tr><th>Artist</th><th>Photos on the site</th><th>Rights</th><th>Where to get photos</th></tr></thead>
        <tbody>
          {rows.map(({ a, ms, ok, status }) => (
            <tr key={a.slug}>
              <td><b>{a.name}</b><div className="muted"><Link href={`/artists/${a.slug}`}>{a.slug}</Link></div></td>
              <td>
                {ms.length === 0 && a.photo_url && <img src={a.photo_url} alt="" />}
                {ms.map((m) => <a key={m.id} href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt="" /></a>)}
                {ms.length === 0 && !a.photo_url && <span className="muted">none</span>}
              </td>
              <td>
                <span className={`tag ${status}`}>{status === "ok" ? "cleared" : status === "none" ? "no photo" : "unverified"}</span>
                <div className="muted">{ms.length} stored, {ok} cleared</div>
              </td>
              <td className="lk">
                {ig(a.instagram) && <a href={ig(a.instagram)!} target="_blank" rel="noreferrer">Instagram</a>}
                {a.website && <a href={a.website} target="_blank" rel="noreferrer">Website</a>}
                {a.soundcloud && <a href={a.soundcloud} target="_blank" rel="noreferrer">SoundCloud</a>}
                {a.spotify && <a href={a.spotify} target="_blank" rel="noreferrer">Spotify</a>}
                {!ig(a.instagram) && !a.website && !a.soundcloud && !a.spotify && <span className="muted">no links stored</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
