/**
 * Every email, drawn with sample data (plan ccd/v2-plan.md section 9). Pick one to see it full size and
 * send a test to any address. Until catscandance.com is verified in Resend, a test only reaches the
 * Resend account owner. Sample data only.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { SAMPLES, signInTemplate } from "@ccd/mail";
import { send } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: emails", robots: { index: false } };

/** What actually sends today, and what is a template waiting for its feature. */
const WIRED: Record<string, string> = {
  "sign-in": "Supabase sends it. Paste the template below into Auth, Email templates, Magic link.",
  tickets: "Sends after payment and from Email me my tickets.",
  crew: "Sends when ops forms crews.",
  "party-live": "Sends after a host publishes (Host).",
  "door-team": "Sends when a lead adds someone in Door setup (Host).",
  ask: "Sends from the booking outbox.",
  answered: "Sends from the booking outbox.",
  promoter: "Sends after a CCD review.",
};

async function sendTest(fd: FormData) {
  "use server";
  const key = String(fd.get("key") ?? "");
  const to = String(fd.get("to") ?? "").trim();
  const s = SAMPLES.find((x) => x.key === key);
  if (!s || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return;
  const m = s.mail();
  await send(to, { ...m, subject: `[Test] ${m.subject}` });
}

const css = `
.em{font:14px/1.45 system-ui,sans-serif;max-width:1240px;margin:0 auto;padding:28px 16px 80px;color:#111}
.em h1{margin:0 0 4px}.em .muted{color:#666;font-size:13px}
.em .grid{display:grid;grid-template-columns:300px 1fr;gap:20px;margin-top:20px;align-items:start}
.em nav a{display:block;padding:8px 10px;border:2px solid #111;margin:6px 0;text-decoration:none;color:#111;background:#fff}
.em nav a.on{background:#b6ef36}
.em nav small{display:block;color:#666}
.em .tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 6px;margin-left:6px;border:1px solid #111}
.em .tag.no{background:#eee;border-color:#999;color:#666}
.em iframe{width:100%;height:900px;border:2px solid #111;background:#050505}
.em form{display:flex;gap:8px;margin:10px 0}.em input{flex:1;padding:8px;border:2px solid #111;font:inherit}.em button{padding:8px 14px;border:2px solid #111;background:#b6ef36;font-weight:700;cursor:pointer}
.em textarea{width:100%;height:120px;font:12px monospace}
.em .phone{width:390px;height:780px}
.em .row{display:flex;gap:16px;align-items:start;flex-wrap:wrap}
`;

export default async function Emails({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const cur = SAMPLES.find((x) => x.key === e) ?? SAMPLES[1];
  const m = cur.mail();
  return (
    <main className="em">
      <style>{css}</style>
      <p><Link href="/ops">Ops</Link></p>
      <h1>Emails</h1>
      <p className="muted">Every email in the one design, with sample data. Green tag: sends today. Grey: a template waiting for its feature. Mail reaches everyone once catscandance.com is verified in Resend and RESEND_FROM uses it.</p>
      <div className="grid">
        <nav>
          {SAMPLES.map((s) => (
            <Link key={s.key} href={`/ops/emails?e=${s.key}`} className={s.key === cur.key ? "on" : ""}>
              <b>{s.group}</b>: {s.mail().subject}
              <span className={`tag${WIRED[s.key] ? "" : " no"}`}>{WIRED[s.key] ? "sends" : "template"}</span>
              <small>{s.when}</small>
            </Link>
          ))}
        </nav>
        <section>
          <p><b>Subject:</b> {m.subject}<br /><b>Preview line:</b> {m.preheader}<br /><b>Status:</b> {WIRED[cur.key] ?? "Template only. It sends once its feature is on."}</p>
          <form action={sendTest}>
            <input type="hidden" name="key" value={cur.key} />
            <input type="email" name="to" placeholder="Send a test to" required />
            <button type="submit">Send test</button>
          </form>
          <div className="row">
            <iframe title="Desktop" srcDoc={m.html} style={{ flex: "1 1 600px" }} />
            <iframe title="Phone" className="phone" srcDoc={m.html} />
          </div>
          {cur.key === "sign-in" && (
            <>
              <p><b>Supabase magic link template</b> (Auth, Email templates, Magic link; subject &ldquo;Your sign-in link&rdquo;):</p>
              <textarea readOnly defaultValue={signInTemplate()} />
            </>
          )}
          <details><summary>Plain text version</summary><pre style={{ whiteSpace: "pre-wrap" }}>{m.text}</pre></details>
        </section>
      </div>
    </main>
  );
}
