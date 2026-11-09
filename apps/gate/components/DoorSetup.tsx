"use client";
/** Night setup for the door lead: rules, UPI for door payments, the door team, the venue's live count link, and outside tickets. */
import { useEffect, useState } from "react";
import { fetchSetup, saveSettings, setTeam, liveLink, type Setup } from "@/lib/door";
import ImportGuests from "@/components/door/ImportGuests";
import { Avatar, Top } from "@/components/app/ui";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="d" style={{ fontSize: 26, margin: "30px 0 0" }}>{children}</h2>;
}

export default function DoorSetup({ slug }: { slug: string }) {
  const [s, setS] = useState<Setup | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => fetchSetup(slug).then((r) => (r.ok && r.data ? setS(r.data as Setup) : setErr(r.error ?? "Only the door lead can open setup.")));
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <><Top back={`/door/${slug}`} /><p className="err" style={{ padding: "0 20px" }} role="alert">{err}</p></>;
  if (!s) return <><Top back={`/door/${slug}`} /><p className="b" style={{ padding: "0 20px" }} aria-busy="true">Loading setup</p></>;
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await saveSettings(slug, { age_check: fd.get("age") === "on", note: String(fd.get("note") ?? ""), upi_vpa: String(fd.get("upi") ?? ""), upi_name: String(fd.get("upi_name") ?? "") });
    setMsg(r.ok ? "Saved" : r.error ?? "Could not save");
  };
  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const r = await setTeam(slug, String(fd.get("email") ?? ""), fd.get("role") === "lead" ? "lead" : "door", String(fd.get("name") ?? ""));
    if (r.ok) { e.currentTarget.reset(); load(); } else setMsg(r.error ?? "Could not add");
  };
  const live = async (reset = false) => { const r = await liveLink(slug, reset); if (r.ok) load(); };
  const liveUrl = s.settings.live_key ? `${typeof window !== "undefined" ? window.location.origin : ""}/live/${s.settings.live_key}` : "";
  return (
    <>
      <Top back={`/door/${slug}`} right={msg ? <span className="m" role="status" style={{ color: "var(--pc)" }}>{msg}</span> : "Door lead"} />
      <div style={{ padding: "4px 20px 0" }}>
        <h1 className="d" style={{ fontSize: 36, margin: 0 }}>Door setup</h1>
        <form onSubmit={save}>
          <H>Night rules</H>
          <label className="rw" style={{ padding: "12px 0", borderTop: 0, cursor: "pointer" }}><span style={{ flex: 1, fontSize: 15 }}>Check ID at the door</span><input type="checkbox" name="age" defaultChecked={s.settings.age_check} style={{ width: 22, height: 22, accentColor: "var(--pc)" }} /></label>
          <label style={{ display: "block", marginTop: 6 }}><span className="m">Note for the door team</span><input className="fld" name="note" defaultValue={s.settings.note ?? ""} maxLength={200} placeholder="Wristbands in the blue box" /></label>
          <div className="row" style={{ gap: 10 }}>
            <label style={{ display: "block", marginTop: 12, flex: 1 }}><span className="m">UPI id for the door</span><input className="fld" name="upi" defaultValue={s.settings.upi_vpa ?? ""} maxLength={80} placeholder="name@bank" /></label>
            <label style={{ display: "block", marginTop: 12, flex: 1 }}><span className="m">Name on it</span><input className="fld" name="upi_name" defaultValue={s.settings.upi_name ?? ""} maxLength={80} /></label>
          </div>
          <button className="key" style={{ width: "100%", marginTop: 16 }}>Save the rules</button>
        </form>

        <H>Door team</H>
        {s.team.map((t) => (
          <div key={t.email} className="rw" style={{ padding: "11px 0" }}>
            <Avatar name={t.name ?? t.email} size={34} />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{t.name ?? t.email}</span><span className="b" style={{ display: "block", fontSize: 12 }}>{t.email} · {t.role === "lead" ? "Lead" : "Door"}{t.joined ? "" : " · not signed in yet"}</span></span>
            <button type="button" className="pill" style={{ border: 0, cursor: "pointer" }} onClick={() => setTeam(slug, t.email, t.role, t.name ?? "", true).then(load)}>Remove</button>
          </div>
        ))}
        <form onSubmit={add} style={{ marginTop: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <input className="fld" name="email" type="email" placeholder="Email" required aria-label="Email" style={{ flex: 1.4, marginTop: 0 }} />
            <input className="fld" name="name" placeholder="Name" aria-label="Name" style={{ flex: 1, marginTop: 0 }} />
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <select className="fld" name="role" aria-label="Role" style={{ flex: 1, marginTop: 0 }}><option value="door">On the door</option><option value="lead">Lead</option></select>
            <button className="pill lg on" style={{ height: 50, border: 0, cursor: "pointer" }}>Add</button>
          </div>
        </form>

        <H>Live count for the venue</H>
        <p className="b" style={{ marginTop: 8 }}>A link that shows how many are inside, with no sign-in.</p>
        {liveUrl ? (
          <div className="sf row" style={{ marginTop: 10, padding: "12px 14px", borderRadius: 16, gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{liveUrl.replace(/^https?:\/\//, "")}</span>
            <button type="button" className="pill" style={{ border: 0, cursor: "pointer" }} onClick={() => navigator.clipboard?.writeText(liveUrl).then(() => setMsg("Copied"))}>Copy</button>
            <button type="button" className="pill" style={{ border: 0, cursor: "pointer" }} onClick={() => live(true)}>New link</button>
          </div>
        ) : <button type="button" className="pill lg" style={{ marginTop: 10, border: 0, cursor: "pointer" }} onClick={() => live(false)}>Make the link</button>}

        <H>Tickets sold elsewhere</H>
        <div style={{ marginTop: 10 }}><ImportGuests slug={slug} flash={(m) => setMsg(m)} /></div>
      </div>
    </>
  );
}
