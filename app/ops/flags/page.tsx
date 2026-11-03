import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { rpc, select } from "@/lib/ccd-db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ops: switches", robots: { index: false } };

type Flag = { key: string; enabled: boolean; note: string | null; updated_at: string };
const T = () => process.env.OPS_TOKEN;

async function setFlag(formData: FormData) {
  "use server";
  const key = String(formData.get("key") ?? "");
  const on = String(formData.get("to")) === "on";
  if (key) await rpc("ops_set_flag", { p_token: T(), p_key: key, p_enabled: on });
  revalidatePath("/ops/flags");
  revalidatePath("/artists", "layout");
  redirect("/ops/flags");
}

const css = `
.fl{font:14px/1.45 system-ui,sans-serif;max-width:860px;margin:0 auto;padding:28px 16px 80px;color:#111}
.fl h2{margin:0 0 4px}.fl .muted{color:#666;font-size:13px}
.fl .row{display:flex;gap:12px;align-items:center;justify-content:space-between;border:2px solid #111;box-shadow:3px 3px 0 #111;padding:10px 12px;margin:10px 0;background:#fff}
.fl .btn{padding:5px 12px;border:2px solid #111;font:inherit;font-weight:700;cursor:pointer;min-width:64px}
.fl .on{background:#b6ef36}.fl .off{background:#eee}
.fl code{font-size:13px}
`;

export default async function Flags() {
  let flags: Flag[] = [];
  let err = "";
  try {
    flags = await select<Flag>("feature_flags?select=key,enabled,note,updated_at&order=key.asc", 0);
  } catch (e) {
    err = String(e);
  }
  return (
    <main className="fl">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <p className="muted" style={{ margin: 0 }}><Link href="/ops">Back to ops</Link></p>
      <h2>Switches</h2>
      <p className="muted" style={{ margin: 0 }}>
        Paid and AI features, and the new artist page, are controlled here. A change reaches the site within about a minute.
        Turning a switch off puts the old behaviour back straight away. Nothing is deleted.
      </p>
      {err && <p style={{ color: "#dc2626" }}>Could not load: {err}</p>}
      {flags.map((f) => (
        <form key={f.key} action={setFlag} className="row">
          <div>
            <b><code>{f.key}</code></b> <span className="muted">{f.enabled ? "is ON" : "is off"}</span>
            {f.note && <div className="muted">{f.note}</div>}
          </div>
          <input type="hidden" name="key" value={f.key} />
          <input type="hidden" name="to" value={f.enabled ? "off" : "on"} />
          <button className={`btn ${f.enabled ? "on" : "off"}`} type="submit">{f.enabled ? "Turn off" : "Turn on"}</button>
        </form>
      ))}
    </main>
  );
}
