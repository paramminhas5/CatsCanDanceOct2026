"use client";
/**
 * Make a party (board H39-Make). host_party_make (migration 063) creates the night straight away, so the
 * invite, RSVPs, who's coming and the door work at once. "Listed on Nights" also sends it to CCD for review.
 * Approved promoters can make it under their promoter name instead (promoter_night_save, then review).
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { memberRpc } from "@/lib/member";
import { myPromoters, saveNight, nightStatus, type MyPromoter } from "@/lib/promoters";
import { Icon, LOOKS, Top } from "./ui";

const CITIES = ["Bengaluru", "Mumbai", "Delhi NCR", "Goa", "Pune", "Hyderabad", "Chennai", "Kolkata"];
const list = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);
const today = () => new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);

function Keys<T extends string>({ value, set, opts }: { value: T; set: (v: T) => void; opts: [T, string][] }) {
  return (
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: `repeat(${opts.length}, minmax(0, 1fr))`, gap: 8 }} role="radiogroup">
      {opts.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} className={`kp${value === k ? " lit" : ""}`} style={{ height: 46, ["--c" as string]: "var(--pc)" }} onClick={() => set(k)}>
          <span className="cp" style={{ alignItems: "center", justifyContent: "center" }}><span className="l" style={{ fontSize: 13 }}>{l}</span></span>
        </button>
      ))}
    </div>
  );
}

export default function MakeParty() {
  const [promoters, setPromoters] = useState<MyPromoter[]>([]);
  const [as, setAs] = useState("");
  const [name, setName] = useState("");
  const [look, setLook] = useState("pink");
  const [entry, setEntry] = useState<"rsvp" | "tickets">("rsvp");
  const [who, setWho] = useState<"link" | "listed">("link");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ slug: string; review: boolean; promoter?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { myPromoters().then((p) => setPromoters(p.filter((x) => x.status === "approved"))).catch(() => {}); }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    setBusy(true); setErr(null);
    if (as) {
      const r = await saveNight(as, null, {
        title: v("title"), event_date: v("date"), start_time: v("time") || null, venue: v("where") || null, city: v("city"),
        blurb: v("about") || null, lineup: list(v("lineup")), genres: [], ticket_url: entry === "tickets" ? v("tickets") || null : null, rsvp_open: entry === "rsvp",
      });
      const slug = (r.data as { slug?: string } | undefined)?.slug;
      if (!r.ok || !slug) { setBusy(false); setErr(r.error ?? "Could not save."); return; }
      const s = await nightStatus(slug, "submit");
      setBusy(false);
      if (!s.ok) { setErr(s.error ?? "Saved, but could not send for review."); return; }
      setDone({ slug, review: true, promoter: true });
      return;
    }
    const r = await memberRpc<{ slug: string }>("host_party_make", {
      p_title: v("title"), p_date: v("date"), p_time: v("time") || null, p_city: v("city"), p_where: v("where") || null, p_look: look,
      p_entry: entry, p_ticket_url: entry === "tickets" ? v("tickets") : null, p_listed: who === "listed",
      p_lineup: list(v("lineup")), p_about: v("about") || null, p_capacity: Number(v("capacity")) || null,
    });
    setBusy(false);
    const slug = (r.data as { slug?: string } | undefined)?.slug;
    if (!r.ok || !slug) { setErr(r.error ?? "Could not make the party."); return; }
    setDone({ slug, review: who === "listed" });
  };

  if (done) {
    const url = typeof window === "undefined" ? `/i/${done.slug}` : `${window.location.origin}/i/${done.slug}`;
    const share = async () => {
      try { if (navigator.share) { await navigator.share({ title: name, url }); return; } } catch { return; }
      try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* the link is on screen */ }
    };
    return (
      <>
        <Top back="/parties" right="Made" />
        <div style={{ padding: "4px 20px 0" }}>
          <div className="rise" style={{ borderRadius: 22, background: LOOKS[look].bg, color: LOOKS[look].ink, padding: "26px 20px", position: "relative", overflow: "hidden" }}>
            <img src="/cats/dance.webp" alt="" style={{ position: "absolute", right: -4, bottom: -8, height: 130, animation: "hop 1.4s ease-in-out infinite" }} />
            <div className="m" style={{ color: "inherit", opacity: 0.7 }}>{done.promoter ? "Sent for review" : "It is live"}</div>
            <div className="d" style={{ fontSize: 42, marginTop: 8, color: "inherit", maxWidth: 240 }}>{name || "Your party"}</div>
          </div>
          <p className="b rise" style={{ marginTop: 16 }}>
            {done.promoter ? "CCD checks promoter nights, usually the same day. Once approved the invite works." : done.review ? "Your invite works now. We also check it for Nights, usually the same day." : "Your invite works now. Only people with the link see it."}
          </p>
          {!done.promoter && (
            <div className="sf row rise" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 16, gap: 10 }}>
              <span style={{ opacity: 0.8 }}><Icon i="link" /></span>
              <span style={{ flex: 1, fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url.replace(/^https?:\/\//, "")}</span>
              <button type="button" className="pill" onClick={share} style={{ height: 30 }}>{copied ? "Copied" : "Copy"}</button>
            </div>
          )}
          <div className="brow rise" style={{ marginTop: 22 }}>
            <Link className="btn" href="/parties" style={{ flex: 1 }}>Your parties</Link>
            {!done.promoter && <button type="button" className="key" onClick={share} style={{ flex: 1.3 }}><Icon i="share" />Share the invite</button>}
          </div>
        </div>
      </>
    );
  }

  const first = (name.trim().split(/\s+/)[0] || "Party").slice(0, 8);
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <Top back="/parties" right="Takes 2 minutes" />
      <div style={{ padding: "4px 20px 0" }}><h1 className="d" style={{ fontSize: 36, margin: 0 }}>Make a party</h1></div>
      <div style={{ padding: "0 20px" }}>
        {promoters.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="m">Make it as</div>
            <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {[{ slug: "", name: "Me" }, ...promoters].map((p) => <button key={p.slug} type="button" className={`pill lg${as === p.slug ? " on" : ""}`} onClick={() => setAs(p.slug)}>{p.name}</button>)}
            </div>
          </div>
        )}
        <label style={{ display: "block", marginTop: 14 }}><span className="m">Name</span><input className="fld" name="title" required maxLength={120} placeholder="Rooftop on Saturday" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <div className="row" style={{ gap: 10 }}>
          <label style={{ display: "block", marginTop: 14, flex: 1 }}><span className="m">When</span><input className="fld" type="date" name="date" required min={today()} /></label>
          <label style={{ display: "block", marginTop: 14, width: 120 }}><span className="m">From</span><input className="fld" type="time" name="time" defaultValue="21:00" /></label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label style={{ display: "block", marginTop: 14, flex: 1 }}><span className="m">Where</span><input className="fld" name="where" maxLength={120} placeholder="Indiranagar, or the venue" /></label>
          <label style={{ display: "block", marginTop: 14, width: 140 }}><span className="m">City</span><input className="fld" name="city" required list="host-cities" maxLength={60} defaultValue="Bengaluru" /><datalist id="host-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist></label>
        </div>

        {!as && (
          <>
            <div className="m" style={{ marginTop: 16 }}>Look</div>
            <div className="row" style={{ gap: 10, marginTop: 8 }} role="radiogroup" aria-label="Look">
              {Object.entries(LOOKS).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={look === k} aria-label={l.label} onClick={() => setLook(k)}
                  style={{ width: 58, height: 76, borderRadius: 12, overflow: "hidden", flex: "none", border: 0, cursor: "pointer", background: l.bg, position: "relative", boxShadow: look === k ? "0 0 0 2px #0A0A0B, 0 0 0 4px #F2F0EB" : "inset 0 0 0 1px rgba(255,255,255,.1)", transform: look === k ? "translateY(-3px)" : "none", transition: "transform .2s, box-shadow .2s" }}>
                  <b style={{ position: "absolute", left: 8, bottom: 8, right: 6, fontSize: 11, fontWeight: 800, letterSpacing: "-.02em", color: l.ink, textAlign: "left", lineHeight: 1.1, wordBreak: "break-word" }}>{first}</b>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="m" style={{ marginTop: 16 }}>Entry</div>
        <Keys value={entry} set={setEntry} opts={[["rsvp", "Free, RSVP"], ["tickets", "Tickets"]]} />
        {entry === "tickets" && <label style={{ display: "block", marginTop: 12 }}><span className="m">Where people buy tickets</span><input className="fld" type="url" name="tickets" required maxLength={300} placeholder="https://" /></label>}

        {!as && (
          <>
            <div className="m" style={{ marginTop: 14 }}>Who sees it</div>
            <Keys value={who} set={setWho} opts={[["link", "Link only"], ["listed", "Listed on Nights"]]} />
          </>
        )}

        <button type="button" className="b" onClick={() => setMore((x) => !x)} style={{ marginTop: 16, background: "none", border: 0, padding: 0, font: "inherit", fontSize: 14, cursor: "pointer", color: "var(--t2)" }}>{more ? "Fewer details" : "Lineup, capacity, a few words"}</button>
        {more && (
          <div className="rise">
            <label style={{ display: "block", marginTop: 12 }}><span className="m">Who is playing</span><input className="fld" name="lineup" maxLength={400} placeholder="Names, comma separated" /></label>
            {!as && <label style={{ display: "block", marginTop: 12 }}><span className="m">How many people fit</span><input className="fld" type="number" name="capacity" min={1} max={20000} inputMode="numeric" /></label>}
            <label style={{ display: "block", marginTop: 12 }}><span className="m">A few words</span><textarea className="fld" name="about" maxLength={1200} placeholder="Bring something to drink. Plus ones are fine." /></label>
          </div>
        )}
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <div style={{ flex: 1, minHeight: 20 }} />
      <div style={{ padding: "16px 20px 6px" }}>
        <button className="key" disabled={busy} style={{ width: "100%", boxSizing: "border-box" }}>{busy ? "Making it" : as ? "Send for review" : "Make the party"}</button>
      </div>
    </form>
  );
}
