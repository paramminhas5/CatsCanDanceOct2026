// Owner tool: create a sign-in with a password, or reset one, then set the role. Guarded by the ops token. No AI.
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  const token = req.headers.get("x-cron-token") ?? "";
  const cfg = await (await fetch(`${SB_URL}/rest/v1/ops_config?id=eq.1&select=token`, { headers: H })).json();
  if (!token || token !== cfg?.[0]?.token) return new Response("unauthorized", { status: 401 });
  const { email, password, role = "member", name } = await req.json().catch(() => ({}));
  if (!email || !password || String(password).length < 10) return Response.json({ ok: false, error: "email and a password of 10+ characters required" }, { status: 400 });
  if (!["member", "host", "staff", "owner"].includes(role)) return Response.json({ ok: false, error: "bad role" }, { status: 400 });

  let uid: string | null = null;
  const c = await fetch(`${SB_URL}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ email, password, email_confirm: true }) });
  const cb = await c.json().catch(() => ({}));
  if (c.ok) uid = cb.id;
  else {
    // Already exists: find and reset the password.
    const l = await (await fetch(`${SB_URL}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
    const u = (l.users ?? []).find((x: any) => String(x.email).toLowerCase() === String(email).toLowerCase());
    if (!u) return Response.json({ ok: false, error: cb.msg ?? cb.message ?? "could not create user" }, { status: 400 });
    uid = u.id;
    await fetch(`${SB_URL}/auth/v1/admin/users/${uid}`, { method: "PUT", headers: H, body: JSON.stringify({ password, email_confirm: true }) });
  }
  await fetch(`${SB_URL}/rest/v1/members`, {
    method: "POST", headers: { ...H, Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify({ id: uid, email, display_name: name ?? email.split("@")[0], city: "Bengaluru", genres: [] }),
  });
  const r = await (await fetch(`${SB_URL}/rest/v1/rpc/ops_set_member_role`, { method: "POST", headers: H, body: JSON.stringify({ p_token: token, p_email: email, p_role: role }) })).json();
  return Response.json({ ok: true, id: uid, role, role_set: r });
});
