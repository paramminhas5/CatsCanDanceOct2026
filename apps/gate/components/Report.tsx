"use client";
/** The report the next morning (board H39-Report): who came, when, through which list, and what the door took. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Readout } from "@ccd/ui";
import { fetchReport, sourceLabel, type Report as R } from "@/lib/door";

export default function Report({ slug }: { slug: string }) {
  const [r, setR] = useState<R | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetchReport(slug).then((x) => (x.ok && x.data ? setR(x.data) : setErr(x.error ?? "Could not load the report"))); }, [slug]);
  if (err) return <p className="k-note k-note--warn" role="alert">{err}</p>;
  if (!r) return <p className="k-b" aria-busy="true">Building the report</p>;
  const sold = r.tiers.reduce((a, t) => a + t.sold, 0);
  const inT = r.tiers.reduce((a, t) => a + t.in, 0);
  const out = (r.outside ?? []).reduce((a, o) => a + o.in, 0);
  const total = inT + r.list.in + out + r.walkins.people;
  const take = Object.entries(r.walkins.takings ?? {});
  const peak = Math.max(1, ...r.arrivals.map((a) => a.n));
  return (
    <div className="grid gap-10">
      <div>
        <span className="k-m" style={{ color: "var(--k-pc)" }}>Report</span>
        <h1 className="k-d mt-2 text-[44px] md:text-[64px]">{r.night.title}</h1>
        <p className="k-b mt-1">{[r.night.date, r.night.venue].filter(Boolean).join(" · ")}</p>
      </div>
      <Readout cells={[{ value: total, label: "Came in" }, { value: r.night.capacity, label: "Capacity" }, { value: r.first_timers, label: "First time" }, { value: r.repeat, label: "Came back" }]} />
      <div className="grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="k-d text-[28px]">How they got in</h2>
          <ul className="mt-3 list-none p-0">
            <li className="k-li"><span className="flex-1"><b>Tickets</b><small>{sold} sold</small></span><span className="k-m !text-[var(--k-tx)]">{inT} in</span></li>
            <li className="k-li"><span className="flex-1"><b>Guest list</b><small>{r.list.people} on the list</small></span><span className="k-m !text-[var(--k-tx)]">{r.list.in} in</span></li>
            {(r.outside ?? []).map((o) => <li key={o.source} className="k-li"><span className="flex-1"><b>{sourceLabel(o.source)}</b><small>{o.people} imported</small></span><span className="k-m !text-[var(--k-tx)]">{o.in} in</span></li>)}
            <li className="k-li"><span className="flex-1"><b>Walk-ins</b><small>Paid at the door</small></span><span className="k-m !text-[var(--k-tx)]">{r.walkins.people}</span></li>
            <li className="k-li"><span className="flex-1"><b>Pass-outs</b></span><span className="k-m !text-[var(--k-tx)]">{r.passouts}</span></li>
          </ul>
        </section>
        <section>
          <h2 className="k-d text-[28px]">When they arrived</h2>
          {r.arrivals.length ? (
            <div className="mt-5 flex h-[160px] items-end gap-1" role="img" aria-label="Arrivals every 15 minutes">
              {r.arrivals.map((a) => <span key={a.t} title={`${a.t}: ${a.n}`} className="flex-1 rounded-t-[3px]" style={{ height: `${(a.n / peak) * 100}%`, background: "var(--k-pc)" }} />)}
            </div>
          ) : <p className="k-b mt-3">No arrivals recorded.</p>}
          {take.length > 0 && (
            <>
              <h2 className="k-d mt-8 text-[28px]">Door takings</h2>
              <ul className="mt-3 list-none p-0">{take.map(([m, v]) => <li key={m} className="k-li"><span className="flex-1 capitalize"><b>{m}</b></span><span className="k-m !text-[var(--k-tx)]">₹{Number(v).toLocaleString("en-IN")}</span></li>)}</ul>
            </>
          )}
        </section>
      </div>
      <Link href={`/door/${slug}`} className="k-btn k-btn--ghost justify-self-start">Back to the door</Link>
    </div>
  );
}
