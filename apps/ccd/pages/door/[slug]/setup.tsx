/**
 * /door/<night>/setup: the door lead's page. Door rules (ID check, a note every door phone shows),
 * UPI for door payments, the door team by email, outside guest lists (District, BookMyShow, any CSV) and the venue's live count link.
 * Staff, the owner, or a lead on this night's team (door_can_lead).
 */
import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import DoorGate from "@/components/door/DoorGate";
import ImportGuests from "@/components/door/ImportGuests";
import { fetchSetup, liveLink, saveSettings, setTeam, type Setup } from "@/lib/door";

const inp = "w-full bg-cream text-ink border-4 border-cream p-3";
const btn = "font-display px-4 py-3 bg-acid-yellow text-ink border-4 border-ink";

function SetupBody({ slug }: { slug: string }) {
  const [data, setData] = useState<Setup | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ age_check: false, note: "", upi_vpa: "", upi_name: "" });
  const [who, setWho] = useState({ email: "", name: "", role: "door" as "door" | "lead" });
  const origin = typeof window === "undefined" ? "https://catscandance.com" : window.location.origin;

  const load = useCallback(async () => {
    const r = await fetchSetup(slug);
    if (!r.ok) { setErr(r.error ?? "Could not load."); return; }
    setData(r.data);
    const s = r.data.settings;
    setF({ age_check: s.age_check, note: s.note ?? "", upi_vpa: s.upi_vpa ?? "", upi_name: s.upi_name ?? "" });
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };
  const copy = async (text: string, done: string) => { try { await navigator.clipboard.writeText(text); flash(done); } catch { flash("Could not copy. Long-press to copy instead."); } };

  if (err) return <p className="mt-6">{err} <Link href={`/door/${slug}`} className="underline">Back to the door</Link></p>;
  if (!data) return <p className="mt-6 text-cream/70">Loading…</p>;

  const live = data.settings.live_key ? `${origin}/door/live/${data.settings.live_key}` : "";
  const doorUrl = `${origin}/door/${slug}`;
  const invite = `You're on the door for this night. Open ${doorUrl} on your phone and sign in with this email. Load it before doors, while there's signal: scanning keeps working offline.`;

  return (
    <div className="space-y-10 mt-6">
      {msg && <p className="sticky top-2 z-10 bg-cream text-ink border-4 border-ink p-3 font-bold" role="status">{msg}</p>}

      <section>
        <h2 className="font-display text-2xl">Door rules</h2>
        <p className="text-sm text-cream/70 mt-1">Every door phone shows these at the top, and on each green scan.</p>
        <form className="mt-3 space-y-3" onSubmit={async (e) => { e.preventDefault(); const r = await saveSettings(slug, f); flash(r.ok ? "Saved. Door phones pick it up within a minute." : r.error ?? "Could not save."); }}>
          <label className="flex items-center gap-3 border-4 border-cream p-3">
            <input type="checkbox" checked={f.age_check} onChange={(e) => setF({ ...f, age_check: e.target.checked })} className="w-6 h-6 accent-[hsl(var(--acid-yellow))]" />
            <span><b>Check ID for everyone</b><span className="block text-sm text-cream/70">Green scans say "Check ID" and stay on screen longer.</span></span>
          </label>
          <input className={inp} placeholder="Note for the door, e.g. Wristband after ID. Guest list at the side door." value={f.note} maxLength={280} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <h3 className="font-display text-lg pt-2">UPI at the door</h3>
          <p className="text-sm text-cream/70">Walk-ins paying by UPI see a QR for the exact amount. Money goes straight to this UPI id; CCD never holds it.</p>
          <input className={inp} placeholder="UPI id, e.g. catscandance@okhdfc" value={f.upi_vpa} onChange={(e) => setF({ ...f, upi_vpa: e.target.value })} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <input className={inp} placeholder="Name shown in their UPI app" value={f.upi_name} maxLength={60} onChange={(e) => setF({ ...f, upi_name: e.target.value })} />
          <button className={btn}>Save</button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl">Door team</h2>
        <p className="text-sm text-cream/70 mt-1">Add the email each person signs in with. Door can scan and check in. Lead can also change this page. CCD staff can always open the door.</p>
        <ul className="mt-3 space-y-2">
          {data.team.length === 0 && <li className="text-cream/70">Nobody added yet.</li>}
          {data.team.map((t) => (
            <li key={t.email} className="border-4 border-cream p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold break-all">{t.name ? `${t.name} · ` : ""}{t.email}</p>
                <p className="text-xs text-cream/60">{t.role === "lead" ? "Lead" : "Door"}{t.joined ? " · has signed in before" : " · hasn't signed in yet"}</p>
              </div>
              <button type="button" className="text-sm underline min-h-[44px] px-2" onClick={async () => { const r = await setTeam(slug, t.email, t.role === "lead" ? "door" : "lead", t.name ?? ""); if (r.ok) load(); }}>
                {t.role === "lead" ? "Make door" : "Make lead"}
              </button>
              <button type="button" className="text-sm underline min-h-[44px] px-2" onClick={async () => { const r = await setTeam(slug, t.email, t.role, "", true); if (r.ok) load(); }}>Remove</button>
            </li>
          ))}
        </ul>
        <form className="mt-3 space-y-2" onSubmit={async (e) => {
          e.preventDefault();
          const r = await setTeam(slug, who.email, who.role, who.name);
          if (r.ok) { setWho({ email: "", name: "", role: "door" }); load(); flash("Added. Send them the invite below."); } else flash(r.error ?? "Could not add.");
        }}>
          <input className={inp} type="email" required placeholder="Email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} autoCapitalize="none" />
          <input className={inp} placeholder="Name (optional)" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />
          <div className="flex gap-2">
            {(["door", "lead"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setWho({ ...who, role: r })} className={`font-display px-4 py-3 border-4 border-cream ${who.role === r ? "bg-acid-yellow text-ink" : ""}`}>{r === "door" ? "Door" : "Lead"}</button>
            ))}
            <button className={`${btn} ml-auto`}>Add</button>
          </div>
        </form>
        <div className="mt-4 border-4 border-cream/40 p-3">
          <p className="text-sm">{invite}</p>
          <button type="button" className="mt-2 text-sm underline" onClick={() => copy(invite, "Invite copied. Paste it in WhatsApp.")}>Copy invite</button>
        </div>
      </section>

      <ImportGuests slug={slug} flash={flash} />

      <section>
        <h2 className="font-display text-2xl">Live count for the venue</h2>
        <p className="text-sm text-cream/70 mt-1">A link that shows how many are inside against capacity, updated every 15 seconds. No names, nothing personal. Good for the venue manager or a screen behind the bar.</p>
        {live ? (
          <div className="mt-3 space-y-2">
            <p className="font-mono text-sm break-all border-4 border-cream p-3">{live}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={btn} onClick={() => copy(live, "Live link copied.")}>Copy link</button>
              <a href={live} target="_blank" rel="noreferrer" className="font-display px-4 py-3 border-4 border-cream">Open</a>
              <button type="button" className="text-sm underline min-h-[44px]" onClick={async () => { if (!confirm("Make a new link? The old one stops working.")) return; const r = await liveLink(slug, true); if (r.ok) load(); }}>Make a new link</button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${btn} mt-3`} onClick={async () => { const r = await liveLink(slug); if (r.ok) load(); else flash(r.error ?? "Could not make the link."); }}>Make the link</button>
        )}
      </section>
    </div>
  );
}

export default function DoorSetupPage() {
  const { query, isReady } = useRouter();
  const slug = typeof query.slug === "string" ? query.slug : "";
  return (
    <>
      <Head>
        <title>Door setup | Cats Can Dance</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <DoorGate next={`/door/${slug}/setup`}>
        <div className="min-h-[100dvh] bg-ink text-cream px-4 py-6">
          <div className="max-w-lg mx-auto">
            <p className="font-display text-acid-yellow text-sm tracking-widest">CCD DOOR · SETUP</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <Link href={`/door/${slug}`} className="underline font-bold">Open the door</Link>
              <Link href={`/door/${slug}/report`} className="underline">Report</Link>
              <Link href="/door" className="underline">All nights</Link>
            </div>
            {isReady && slug && <SetupBody slug={slug} />}
          </div>
        </div>
      </DoorGate>
    </>
  );
}
