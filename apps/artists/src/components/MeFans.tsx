"use client";
/** Your fans (board F38-A-Fans): followers by city, from my_fans (aggregates only; small cities folded together). */
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@ccd/db/browser";

type Fans = { ok: boolean; error?: string; total?: number; cities?: { city: string; n: number }[] };
const SEG = 24;

export default function MeFans() {
  const [f, setF] = useState<Fans | null>(null);
  useEffect(() => {
    supabaseBrowser().rpc("my_fans").then(({ data, error }: { data: unknown; error: { message: string } | null }) => setF(error ? { ok: false, error: error.message } : (data as Fans)));
  }, []);
  if (!f) return <p className="b" aria-busy="true">Counting your fans</p>;
  const cities = f.ok ? f.cities ?? [] : [];
  const max = Math.max(1, ...cities.map((c) => c.n));
  return (
    <>
      <h1 className="d" style={{ fontSize: 40, margin: 0 }}>Your fans</h1>
      <div className="b">{f.ok ? `${(f.total ?? 0).toLocaleString("en-IN")} follow you. They hear first when you post a date in their city.` : f.error ?? "Fans show here once your page is linked to this account."}</div>
      {f.ok && (cities.length === 0 ? (
        <div className="sf rise" style={{ marginTop: 18, borderRadius: 18, padding: "16px 18px" }}><b style={{ fontSize: 15 }}>No followers yet</b><div className="b" style={{ fontSize: 13, marginTop: 2 }}>Share your page after your next show.</div></div>
      ) : (
        <>
          <div className="row" style={{ marginTop: 22 }}><span className="d" style={{ fontSize: 22, flex: 1 }}>Where they are</span></div>
          {cities.map((c, ci) => {
            const on = Math.max(1, Math.round((c.n / max) * SEG));
            return (
              <div key={c.city} className="rise" style={{ marginTop: 14 }}>
                <div className="row"><span style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{c.city}</span><span style={{ fontWeight: 700 }}>{c.n.toLocaleString("en-IN")}</span></div>
                <div className="art-bar" style={{ marginTop: 6 }} aria-hidden="true">{Array.from({ length: SEG }, (_, i) => <i key={i} className={i < on ? "on" : ""} style={i < on ? { animationDelay: `${ci * 0.06 + i * 0.015}s` } : undefined} />)}</div>
              </div>
            );
          })}
        </>
      ))}
      <div className="b" style={{ fontSize: 13, marginTop: 22 }}>Messaging a city switches on with WhatsApp updates. Until then, post the date and followers there are told.</div>
      <div className="brow" style={{ marginTop: 18 }}>
        <Link className="key" href="/me/tour" style={{ flex: 1 }}>Post a date</Link>
      </div>
    </>
  );
}
