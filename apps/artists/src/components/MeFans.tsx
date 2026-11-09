"use client";
/** Your fans (board F38-A-Fans): followers by city, from my_fans (aggregates only; small cities folded together). */
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@ccd/db/browser";
import { Readout } from "@ccd/ui";

type Fans = { ok: boolean; error?: string; total?: number; cities?: { city: string; n: number }[] };

export default function MeFans() {
  const [f, setF] = useState<Fans | null>(null);
  useEffect(() => {
    supabaseBrowser().rpc("my_fans").then(({ data, error }) => setF(error ? { ok: false, error: error.message } : (data as Fans)));
  }, []);
  if (!f) return <p className="k-b" aria-busy="true">Counting your fans</p>;
  if (!f.ok) return <div className="k-surface rounded-[22px] p-6"><b>{f.error ?? "Could not load your fans."}</b><p className="k-b m-0 mt-1 text-sm">Fans show here once your page is linked to this account.</p></div>;
  const cities = f.cities ?? [];
  const max = Math.max(1, ...cities.map((c) => c.n));
  return (
    <div className="grid gap-8 md:grid-cols-[1fr_380px]">
      <div>
        <h1 className="k-d text-[44px] md:text-[56px]">Your fans</h1>
        <p className="k-b mt-2 text-[17px]">People who follow you, by the city on their account. They hear first when you post a date in their city.</p>
        {cities.length === 0 ? (
          <p className="k-b mt-8">No followers yet. Share your page after your next show.</p>
        ) : (
          <ul className="mt-8 grid list-none gap-4 p-0">
            {cities.map((c) => (
              <li key={c.city} className="grid grid-cols-[150px_1fr_48px] items-center gap-4">
                <span className="truncate text-[15px] font-semibold">{c.city}</span>
                <span className="relative h-2.5" aria-hidden="true"><span className="absolute inset-y-0 left-0 rounded-[3px]" style={{ width: `${(c.n / max) * 100}%`, background: "repeating-linear-gradient(90deg, var(--k-pc) 0 8px, transparent 8px 11px)" }} /></span>
                <span className="k-m text-right !text-[var(--k-tx)]">{c.n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <aside className="grid content-start gap-4">
        <Readout cells={[{ value: f.total ?? 0, label: "Followers" }, { value: cities.filter((c) => c.city !== "Other cities" && c.city !== "No city set").length, label: "Cities" }]} />
        <p className="k-b m-0 text-sm">Messaging a city switches on with WhatsApp updates. Until then, post the date and followers there are told.</p>
      </aside>
    </div>
  );
}
