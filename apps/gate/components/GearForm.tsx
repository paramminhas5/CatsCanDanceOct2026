"use client";
/**
 * Book gear (board H39-Gear). There is no gear inventory in the database yet, so this is an honest
 * request: what you need, for which night. It goes to the CCD inbox through submit_contact and we reply.
 */
import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";

const KIT = ["Decks (CDJs and a mixer)", "Controller", "PA and monitors", "Lights", "Smoke machine", "VJ screen or projector"];

export default function GearForm({ night }: { night: string }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (String(fd.get("website") ?? "")) { setState("done"); return; }
    const lines = [`Gear request${night ? ` for ${night}` : ""}`, `Date: ${fd.get("date") || "not set"}`, `City: ${fd.get("city") || "not set"}`, `Kit: ${picked.join(", ") || "not picked"}`, `Notes: ${fd.get("notes") || ""}`];
    setState("busy"); setErr(null);
    const { error } = await supabase().rpc("submit_contact", { p_name: String(fd.get("name") ?? ""), p_email: String(fd.get("email") ?? ""), p_message: lines.join("\n") });
    if (error) { setErr(error.message.replace(/^.*?:\s*/, "")); setState("idle"); return; }
    setState("done");
  };
  if (state === "done") return <div role="status" className="k-surface grid gap-2 rounded-[22px] p-6"><b className="k-d text-[34px]">Got it.</b><p className="k-b m-0">We reply with what is free and the price for the night, usually within a day.</p></div>;
  return (
    <form onSubmit={submit} className="grid gap-5">
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <fieldset className="grid gap-3">
        <legend className="k-m mb-3">What you need</legend>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {KIT.map((k) => <button key={k} type="button" className="k-keycap" aria-pressed={picked.includes(k)} onClick={() => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}>{k}</button>)}
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="k-label">Date<input className="k-field" type="date" name="date" /></label>
        <label className="k-label">City<input className="k-field" name="city" maxLength={60} /></label>
        <label className="k-label">Your name<input className="k-field" name="name" required maxLength={80} /></label>
        <label className="k-label">Email<input className="k-field" type="email" name="email" required /></label>
      </div>
      <label className="k-label">Anything else <small>room size, delivery, set up</small><textarea className="k-field" name="notes" maxLength={800} /></label>
      {err && <p className="k-note k-note--warn m-0" role="alert">{err}</p>}
      <button className="k-btn k-btn--key k-btn--l justify-self-start" disabled={state === "busy"}>{state === "busy" ? "Sending" : "Ask for gear"}</button>
    </form>
  );
}
