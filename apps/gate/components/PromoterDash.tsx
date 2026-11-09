"use client";
/** A promoter's dashboard: their nights with where each is in review, and the team. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Readout } from "@ccd/ui";
import { getDashboard, stateOf, nightUrl, setTeam, type Dashboard } from "@/lib/promoters";

export default function PromoterDash({ slug }: { slug: string }) {
  const [d, setD] = useState<Dashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => getDashboard(slug).then((r) => (r.ok && r.data ? setD(r.data as Dashboard) : setErr(r.error ?? "Could not load")));
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <p className="err" role="alert">{err}</p>;
  if (!d) return <p className="b" aria-busy="true">Loading</p>;
  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const r = await setTeam(slug, email, "admin");
    if (r.ok) load(); else setErr(r.error ?? "Could not add");
  };
  const going = d.nights.reduce((a, n) => a + (n.going ?? 0), 0);
  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1"><span className="m" style={{ color: "var(--k-pc)" }}>{d.promoter.status === "approved" ? "Live" : "In review"}</span><h1 className="d mt-2 text-[40px]">{d.promoter.name}</h1></div>
        <Link className="key" href="/make">New night</Link>
      </div>
      <Readout cells={[{ value: d.nights.length, label: "Nights" }, { value: going || "0", label: "Going" }, { value: d.team.length, label: "Team" }]} />
      <section>
        <h2 className="d text-[26px]">Nights</h2>
        {d.nights.length === 0 ? <p className="b mt-3">No nights yet.</p> : (
          <ul className="mt-3 list-none p-0">
            {d.nights.map((n) => {
              const st = stateOf(n);
              return (
                <li key={n.slug} className="rw" style={{ padding: "11px 0" }}>
                  <span className="m w-[100px] flex-none !text-[var(--k-tx)]">{n.event_date ?? "No date"}</span>
                  <span className="min-w-0 flex-1"><b>{n.title}</b><small>{st.label}{n.rsvps ? ` · ${n.rsvps} RSVPs` : ""}{n.tickets ? ` · ${n.tickets} tickets` : ""}</small></span>
                  {n.published && <a className="text-sm font-semibold" href={nightUrl(n.slug)}>On Nights</a>}
                  <Link className="pill" href={`/door/${n.slug}`}>Door</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="d text-[26px]">Team</h2>
        <ul className="m-0 list-none p-0">{d.team.map((t) => <li key={t.email} className="rw" style={{ padding: "11px 0" }}><span className="flex-1"><b>{t.email}</b><small>{t.role}</small></span></li>)}</ul>
        {(d.role === "owner" || d.role === "admin") && (
          <form onSubmit={add} className="flex flex-wrap gap-3"><input className="fld" type="email" name="email" placeholder="Add someone by email" required aria-label="Email" /><button className="btn">Add</button></form>
        )}
      </section>
    </div>
  );
}
