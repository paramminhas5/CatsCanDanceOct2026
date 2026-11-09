"use client";
/**
 * The fan wall (plan ccd/v2-plan.md 5.3; migration 066). Who follows, who was there, and one-line
 * notes fans leave on a show or a record. Notes show once the artist or CCD approves them; first names
 * only. Reads fan_wall, writes fan_note_add, both through the signed-in browser session.
 */
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";

type Note = { id: string; name: string; body: string; about: string | null; kind: string | null; pinned: boolean; regular: boolean; at: string };
type Wall = { followers: number; was_there: number; regulars: number; faces: string[]; notes: Note[]; mine: { id: string; body: string }[] };
type About = { kind: "show" | "release"; id: string; label: string };

const HUES = ["#B6EF36", "#FF4D8D", "#2563EB", "#FFE600", "#22C3A6", "#FF8A3D", "#A78BFA", "#F2F0EB"];
const ago = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  return d < 1 ? "today" : d < 2 ? "yesterday" : d < 30 ? `${Math.floor(d)} days ago` : new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};

async function fetchWall(slug: string): Promise<{ wall: Wall | null; signed: boolean }> {
  const sb = supabaseBrowser();
  const [{ data }, { data: u }] = await Promise.all([sb.rpc("fan_wall", { p_slug: slug }), sb.auth.getUser()]);
  return { wall: (data as Wall | null) ?? null, signed: !!u?.user };
}

export default function FanWall({ slug, name, about }: { slug: string; name: string; about: About[] }) {
  const [wall, setWall] = useState<Wall | null>(null);
  const [signed, setSigned] = useState<boolean | null>(null);
  const [body, setBody] = useState("");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fetchWall(slug).then((r) => { if (live) { setWall(r.wall); setSigned(r.signed); } }, () => {});
    return () => { live = false; };
  }, [slug, tick]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || body.trim().length < 2) return;
    setBusy(true); setMsg(null);
    const a = about.find((x) => `${x.kind}:${x.id}` === pick) ?? null;
    const { data, error } = await supabaseBrowser().rpc("fan_note_add", { p_slug: slug, p_body: body, p_kind: a?.kind ?? null, p_about: a?.id ?? null, p_label: a?.label ?? null });
    setBusy(false);
    const r = data as { ok: boolean; error?: string } | null;
    if (error || !r?.ok) { setMsg(r?.error ?? "Could not post that. Try again."); return; }
    setBody(""); setPick("");
    setMsg(`Thanks. It shows here once ${name.split(" ")[0]} or CCD says yes.`);
    setTick((t) => t + 1);
  };

  const w = wall ?? { followers: 0, was_there: 0, regulars: 0, faces: [], notes: [], mine: [] };
  const stats = [[w.followers, w.followers === 1 ? "follower" : "followers"], [w.was_there, "times someone was there"], [w.regulars, w.regulars === 1 ? "regular" : "regulars"]] as const;

  return (
    <section className="k-wrap k-section fw" aria-labelledby="fans" id="fans">
      <div className="k-h2">
        <div><h2 className="k-d" id="fans">Fans</h2><p className="k-b">Who follows {name.split(" ")[0]}, who was there, and what they said.</p></div>
      </div>
      <div className="fw-grid">
        <div className="fw-side">
          <div className="fw-faces" aria-hidden="true">
            {(w.faces.length ? w.faces : ["", "", ""]).slice(0, 8).map((f, i) => <span key={i} style={{ background: f ? HUES[i % HUES.length] : "rgba(255,255,255,.08)" }}>{f}</span>)}
          </div>
          <dl className="fw-stats">
            {stats.map(([n, l]) => <div key={l}><dt className="k-d">{n}</dt><dd className="k-b">{l}</dd></div>)}
          </dl>
          <p className="k-b text-sm">Mark the shows you went to and you count as a regular after three.</p>
        </div>
        <div className="fw-notes">
          {w.notes.length === 0 ? (
            <div className="fw-empty">
              <b className="k-d">No notes yet</b>
              <span className="k-b">Saw them live, or a record stuck with you? Say it in a line.</span>
            </div>
          ) : (
            <ul className="list-none p-0">
              {w.notes.map((n, i) => (
                <li key={n.id} className="fw-note" style={{ ["--h" as string]: HUES[i % HUES.length] }}>
                  <span className="fw-av" aria-hidden="true">{n.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="fw-who"><b>{n.name}</b>{n.regular && <em>Regular</em>}{n.pinned && <em className="pin">Pinned</em>}<span className="k-b">{ago(n.at)}</span></span>
                    <span className="fw-body">{n.body}</span>
                    {n.about && <span className="k-m fw-about">{n.kind === "show" ? "At " : "On "}{n.about}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {w.mine.length > 0 && <p className="k-b mt-3 text-sm">Your note is waiting for a yes: &ldquo;{w.mine[0].body}&rdquo;</p>}
          {signed ? (
            <form className="fw-form" onSubmit={post}>
              <label className="k-sr" htmlFor="fw-body">Your note</label>
              <input id="fw-body" value={body} onChange={(e) => setBody(e.target.value.slice(0, 140))} placeholder={`One line for ${name.split(" ")[0]}`} maxLength={140} />
              {about.length > 0 && (
                <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="About">
                  <option value="">About anything</option>
                  {about.map((x) => <option key={`${x.kind}:${x.id}`} value={`${x.kind}:${x.id}`}>{x.kind === "show" ? "At " : "On "}{x.label}</option>)}
                </select>
              )}
              <button type="submit" className="k-btn k-btn--key" disabled={busy || body.trim().length < 2}>{busy ? "Posting" : "Post"}</button>
              <span className="k-b fw-count">{140 - body.length}</span>
            </form>
          ) : signed === false ? (
            <a className="k-btn k-btn--ghost mt-4" href={`/sign-in?next=/${slug}%23fans`}>Sign in to leave a note</a>
          ) : null}
          {msg && <p className="k-b mt-3 text-sm" role="status">{msg}</p>}
        </div>
      </div>
    </section>
  );
}
