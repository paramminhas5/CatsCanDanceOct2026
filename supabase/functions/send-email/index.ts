// Sends one plain email through Resend. Guarded by the ops token (x-cron-token). No AI.
// Until catscandance.com is verified in Resend, set RESEND_FROM to onboarding@resend.dev; Resend then only delivers to the account owner's own address.
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const token = req.headers.get("x-cron-token") ?? "";
  const cfg = await (await fetch(`${SB_URL}/rest/v1/ops_config?id=eq.1&select=token`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })).json();
  if (!token || token !== cfg?.[0]?.token) return new Response("unauthorized", { status: 401 });
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return Response.json({ ok: false, error: "RESEND_API_KEY secret is not set" }, { status: 503 });
  const { to, subject, text } = await req.json().catch(() => ({}));
  if (!to || !subject || !text) return Response.json({ ok: false, error: "to, subject, text required" }, { status: 400 });
  const from = Deno.env.get("RESEND_FROM") ?? "Cats Can Dance <onboarding@resend.dev>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, text }),
  });
  const body = await r.json().catch(() => ({}));
  return Response.json({ ok: r.ok, status: r.status, resend: body }, { status: r.ok ? 200 : 502 });
});
