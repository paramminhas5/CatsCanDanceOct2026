"use client";
/** Night setup for the door lead: rules, UPI for door payments, the door team, the venue's live count link, and outside tickets. */
import { useEffect, useState } from "react";
import { fetchSetup, saveSettings, setTeam, liveLink, type Setup } from "@/lib/door";
import ImportGuests from "@/components/door/ImportGuests";

export default function DoorSetup({ slug }: { slug: string }) {
  const [s, setS] = useState<Setup | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => fetchSetup(slug).then((r) => (r.ok && r.data ? setS(r.data as Setup) : setErr(r.error ?? "Only the door lead can open setup.")));
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <p className="k-note k-note--warn" role="alert">{err}</p>;
  if (!s) return <p className="k-b" aria-busy="true">Loading setup</p>;
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
  return (
    <div className="grid gap-12">
      <form onSubmit={save} className="grid gap-4">
        <h2 className="k-d text-[28px]">Night rules</h2>
        <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" name="age" defaultChecked={s.settings.age_check} className="h-5 w-5 accent-[var(--k-pc)]" />Check ID at the door</label>
        <label className="k-label">Note for the door team<input className="k-field" name="note" defaultValue={s.settings.note ?? ""} maxLength={200} /></label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="k-label">UPI id for door payments<input className="k-field" name="upi" defaultValue={s.settings.upi_vpa ?? ""} maxLength={80} /></label>
          <label className="k-label">Name on the UPI<input className="k-field" name="upi_name" defaultValue={s.settings.upi_name ?? ""} maxLength={80} /></label>
        </div>
        <div className="flex items-center gap-3"><button className="k-btn k-btn--key">Save</button>{msg && <span role="status" className="k-b text-sm">{msg}</span>}</div>
      </form>
      <section className="grid gap-4">
        <h2 className="k-d text-[28px]">Door team</h2>
        <ul className="m-0 list-none p-0">{s.team.map((t) => <li key={t.email} className="k-li"><span className="flex-1"><b>{t.name ?? t.email}</b><small>{t.email} · {t.role === "lead" ? "Lead" : "Door"}{t.joined ? "" : " · not signed in yet"}</small></span><button className="k-btn k-btn--ghost k-btn--s" onClick={() => setTeam(slug, t.email, t.role, t.name ?? "", true).then(load)}>Remove</button></li>)}</ul>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
          <input className="k-field" name="email" type="email" placeholder="Email" required aria-label="Email" />
          <input className="k-field" name="name" placeholder="Name" aria-label="Name" />
          <select className="k-field" name="role" aria-label="Role"><option value="door">Door</option><option value="lead">Lead</option></select>
          <button className="k-btn k-btn--ghost">Add</button>
        </form>
      </section>
      <section className="grid gap-3">
        <h2 className="k-d text-[28px]">Live count for the venue</h2>
        <p className="k-b m-0">A link that shows how many are inside, with no sign-in. Share it with the venue.</p>
        {s.settings.live_key ? <div className="flex flex-wrap items-center gap-3"><code className="k-surface rounded-xl px-3 py-2 text-sm">{`${typeof window !== "undefined" ? window.location.origin : ""}/live/${s.settings.live_key}`}</code><button className="k-btn k-btn--ghost k-btn--s" onClick={() => live(true)}>New link</button></div> : <button className="k-btn k-btn--ghost justify-self-start" onClick={() => live(false)}>Make the link</button>}
      </section>
      <section className="grid gap-3"><h2 className="k-d text-[28px]">Tickets sold elsewhere</h2><ImportGuests slug={slug} flash={(m) => setMsg(m)} /></section>
    </div>
  );
}
