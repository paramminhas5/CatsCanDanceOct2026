/** "Email me my tickets": always answers the same way, so it never reveals whether an email has bookings. */
import { useState } from "react";

export default function FindTickets() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setState("busy"); setMsg("");
    try {
      const r = await fetch("/api/tickets/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setState("error"); setMsg(j.error ?? "Could not send right now. Try again in a few minutes."); return; }
      setState("sent");
    } catch {
      setState("error"); setMsg("Could not reach us. Check your connection and try again.");
    }
  }

  if (state === "sent") {
    return (
      <div className="bg-cream border-4 border-ink chunk-shadow p-6 max-w-md" role="status">
        <p className="font-display text-2xl leading-none mb-2">Check your inbox.</p>
        <p className="text-ink/80">If {email} has tickets for an upcoming night, they&apos;re on the way. It can take a minute. Check spam too.</p>
      </div>
    );
  }
  return (
    <form onSubmit={go} className="bg-cream border-4 border-ink chunk-shadow p-5 md:p-6 max-w-md grid gap-3">
      <label className="grid gap-1">
        <span className="font-bold">Email you booked with</span>
        <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border-4 border-ink bg-cream px-3 py-3 text-base focus:outline-none focus:ring-4 focus:ring-electric-blue/40" />
      </label>
      <button disabled={state === "busy"} className="font-display text-lg px-5 py-3 border-4 border-ink bg-acid-yellow hover:bg-ink hover:text-acid-yellow transition-colors disabled:opacity-60">
        {state === "busy" ? "Sending..." : "Email me my tickets"}
      </button>
      {msg && <p className="text-sm font-bold text-magenta" role="alert">{msg}</p>}
    </form>
  );
}
