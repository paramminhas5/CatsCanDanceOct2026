"use client";
import { useState } from "react";

type Field = {
  name: string; // RPC parameter name, e.g. p_email
  label: string;
  type?: "text" | "email" | "date" | "url" | "textarea" | "number";
  required?: boolean;
  placeholder?: string;
};

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function RpcForm({
  fn, fields, hidden = {}, submit = "Send", done,
}: {
  fn: string; fields: Field[]; hidden?: Record<string, string>; submit?: string; done: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "ok">("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("company")) { setState("ok"); return; } // honeypot
    const body: Record<string, unknown> = { ...hidden };
    for (const f of fields) {
      const v = String(fd.get(f.name) ?? "").trim();
      body[f.name] = v === "" ? null : f.type === "number" ? Number(v) : v;
    }
    setState("busy"); setErr("");
    try {
      const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let m = "Something went wrong. Try again.";
        try { const j = await res.json(); if (j?.message) m = String(j.message); } catch {}
        setErr(m); setState("idle"); return;
      }
      setState("ok");
    } catch {
      setErr("Could not reach the server. Try again."); setState("idle");
    }
  }

  if (state === "ok") return <p className="form-done">{done}</p>;
  return (
    <form className="form" onSubmit={onSubmit}>
      {fields.map((f) => (
        <label key={f.name}>
          <span>{f.label}{f.required ? "" : " (optional)"}</span>
          {f.type === "textarea" ? (
            <textarea name={f.name} rows={4} required={f.required} placeholder={f.placeholder} maxLength={1500} />
          ) : (
            <input name={f.name} type={f.type ?? "text"} required={f.required} placeholder={f.placeholder} maxLength={300} />
          )}
        </label>
      ))}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: "absolute", left: "-9999px", height: 0, width: 0 }} />
      {err && <p className="form-err">{err}</p>}
      <button className="btn" type="submit" disabled={state === "busy"}>{state === "busy" ? "Sending" : submit}</button>
    </form>
  );
}
