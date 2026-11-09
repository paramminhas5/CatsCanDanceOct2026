"use client";
/** Promoters: your promoter pages, or apply for one (promoter_apply). CCD approves each promoter. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Led } from "@ccd/ui";
import { myPromoters, apply, type MyPromoter } from "@/lib/promoters";

export default function Promote() {
  const [mine, setMine] = useState<MyPromoter[] | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { myPromoters().then(setMine).catch(() => setMine([])); }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    setBusy(true); setErr(null);
    const r = await apply({ name: v("name"), city: v("city"), instagram: v("instagram"), website: v("website"), blurb: v("blurb"), genres: v("genres").split(",").map((x) => x.trim()).filter(Boolean) });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Could not apply."); return; }
    setDone((r.data as { slug?: string } | undefined)?.slug ?? "");
  };
  return (
    <div className="grid gap-12">
      {mine && mine.length > 0 && (
        <section>
          <h2 className="k-d text-[28px]">Your promoter pages</h2>
          <ul className="mt-3 list-none p-0">{mine.map((p) => <li key={p.slug}><Link className="k-li" href={`/promote/${p.slug}`}><Led state={p.status === "approved" ? "on" : "warn"}>{p.status === "approved" ? "Live" : "In review"}</Led><span className="flex-1"><b>{p.name}</b><small>{[p.city, `${p.nights} nights`].filter(Boolean).join(" · ")}</small></span></Link></li>)}</ul>
        </section>
      )}
      {done !== null ? (
        <div role="status" className="k-surface grid gap-2 rounded-[22px] p-6"><b className="k-d text-[34px]">Applied.</b><p className="k-b m-0">We check every promoter, usually within a day. You can start making nights now; they go live once you are approved.</p>{done && <Link className="k-btn k-btn--ghost justify-self-start" href={`/promote/${done}`}>Open your page</Link>}</div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <h2 className="k-d text-[28px]">{mine?.length ? "Start another" : "Apply as a promoter"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="k-label">Name<input className="k-field" name="name" required maxLength={80} /></label>
            <label className="k-label">City<input className="k-field" name="city" required maxLength={60} /></label>
            <label className="k-label">Instagram<input className="k-field" name="instagram" maxLength={200} placeholder="@handle" /></label>
            <label className="k-label">Website <small>optional</small><input className="k-field" name="website" maxLength={200} /></label>
          </div>
          <label className="k-label">Sound <small>comma separated</small><input className="k-field" name="genres" maxLength={200} /></label>
          <label className="k-label">What you throw<textarea className="k-field" name="blurb" maxLength={800} /></label>
          {err && <p className="k-note k-note--warn m-0" role="alert">{err}</p>}
          <button className="k-btn k-btn--key k-btn--l justify-self-start" disabled={busy}>{busy ? "Sending" : "Apply"}</button>
        </form>
      )}
    </div>
  );
}
