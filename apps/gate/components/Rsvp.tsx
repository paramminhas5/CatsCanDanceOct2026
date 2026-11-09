"use client";
/** RSVP (board H39-RSVP from the guest side): name, email, plus ones. One call to rsvp. */
import { useState } from "react";
import { supabase } from "@/lib/supabase/browser";

export default function Rsvp({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [already, setAlready] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("busy"); setErr(null);
    const { data, error } = await supabase().rpc("rsvp", { p_event_slug: slug, p_name: String(fd.get("name") ?? "").trim(), p_email: String(fd.get("email") ?? "").trim(), p_plus_ones: Number(fd.get("plus") ?? 0) });
    if (error) { setErr(error.message.replace(/^.*?:\s*/, "")); setState("idle"); return; }
    setAlready(!!(data as { already?: boolean } | null)?.already);
    setState("done");
  };
  if (state === "done") return <div role="status" className="grid gap-2"><b className="k-d text-[34px]">{already ? "You were already on the list." : "You are on the list."}</b><p className="k-b m-0">Give your name at the door. See you there.</p></div>;
  return (
    <form onSubmit={submit} className="grid gap-4">
      <b className="text-[19px]">Say you are coming</b>
      <label className="k-label">Name<input className="k-field" name="name" required maxLength={80} autoComplete="name" /></label>
      <label className="k-label">Email<input className="k-field" type="email" name="email" required autoComplete="email" /></label>
      <label className="k-label">Bringing
        <select className="k-field" name="plus" defaultValue="0"><option value="0">Just me</option><option value="1">Me and one more</option><option value="2">Me and two more</option><option value="3">Me and three more</option></select>
      </label>
      {err && <p className="k-note k-note--warn m-0" role="alert">{err}</p>}
      <button className="k-btn k-btn--key k-btn--l" disabled={state === "busy"}>{state === "busy" ? "Saving" : "I am coming"}</button>
    </form>
  );
}
