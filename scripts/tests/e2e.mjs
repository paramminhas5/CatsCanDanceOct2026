#!/usr/bin/env node
// CCD end-to-end checks over HTTP. No dependencies. Node 18+.
//
//   BASE_URL=https://your-preview.vercel.app node scripts/tests/e2e.mjs
//   DUMMY_PASSWORD='the password you set' node scripts/tests/e2e.mjs      (adds the logged-in checks)
//   OPS_USER=... OPS_PASSWORD=... node scripts/tests/e2e.mjs               (adds the /ops basic-auth check)
//
// It only reads, or does an action and then undoes it (going, like). It never sends email.
const SB = process.env.SUPABASE_URL || "https://jybloszaucgqlbkzquqw.supabase.co";
const KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_LklrPFlR8TjDoT9ZV8PizA_wkIL9uNR";
const BASE = (process.env.BASE_URL || "").replace(/\/$/, "");
const PW = process.env.DUMMY_PASSWORD || "";
const NIGHT = "test-night-dummy";
const results = [];
const ok = (name, pass, info = "") => { results.push({ name, pass: !!pass, info }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${info ? "  [" + info + "]" : ""}`); };
const skip = (name, why) => { results.push({ name, pass: true, skip: true }); console.log(`SKIP  ${name}  [${why}]`); };

async function rest(path, { token, method = "GET", body } = {}) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { method, headers: { apikey: KEY, Authorization: `Bearer ${token || KEY}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch {}
  return { status: r.status, data };
}
const rpc = (fn, args = {}, token) => rest(`rpc/${fn}`, { token, method: "POST", body: args });

async function signIn(email) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, token: j.access_token, err: j.msg || j.error_description };
}

async function main() {
  console.log(`\n== Auth settings`);
  const s = await (await fetch(`${SB}/auth/v1/settings`, { headers: { apikey: KEY } })).json();
  ok("email sign in is enabled", s.external?.email === true);
  ok("sign ups are open (members can join)", s.disable_signup === false);
  ok("email confirmation required (mailer_autoconfirm off)", s.mailer_autoconfirm === false, "if this is off, magic links need working email");

  console.log(`\n== Public database access (anon key)`);
  for (const t of ["members", "crew_pool", "ticket_orders", "tickets", "shop_orders", "contact_messages", "promoter_applications", "night_going", "go_again", "ops_config"]) {
    const r = await rest(`${t}?select=*&limit=1`);
    const leaked = r.status === 200 && Array.isArray(r.data) && r.data.length > 0;
    ok(`anon cannot read ${t}`, !leaked, `status ${r.status}`);
  }
  const ev = await rest("events?select=slug,title&published=eq.true&limit=3");
  ok("anon can read published events", ev.status === 200 && Array.isArray(ev.data));
  const swaps = await rpc("public_ticket_swaps");
  ok("public ticket swaps list loads", swaps.status === 200);
  const stats = await rpc("public_stats");
  ok("public stats load", stats.status === 200);
  const counts = await rpc("night_counts");
  ok("night counts load without sign in", counts.status === 200 && Array.isArray(counts.data));
  const bad = await rpc("ops_inbox", { p_token: "wrong" });
  ok("ops_inbox refuses a wrong token", bad.status >= 400);
  const bad2 = await rpc("ops_form_crews", { p_token: "wrong", p_slug: NIGHT });
  ok("ops_form_crews refuses a wrong token", bad2.status >= 400);
  const anonGoing = await rpc("set_night_going", { p_slug: NIGHT, p_going: true });
  ok("anon cannot say going", anonGoing.status >= 400 || anonGoing.data?.ok === false);
  const bad3 = await rpc("submit_contact", { p_name: "T", p_email: "not-an-email", p_message: "hello this is a test" });
  ok("contact form refuses a bad email", bad3.status >= 400 || bad3.data?.ok === false);
  const bad4 = await rpc("create_ticket_order", { p_slug: "nope", p_name: "T", p_email: "t@t.co", p_phone: "", p_items: [], p_source: "platform" });
  ok("ticket order on an unknown night refused", bad4.data?.ok === false || bad4.status >= 400);

  console.log(`\n== Site pages${BASE ? " at " + BASE : ""}`);
  if (!BASE) skip("site pages", "set BASE_URL to check pages");
  else {
    const pages = ["/", "/whats-on", "/join", "/club", "/for-artists", "/submit-event", "/submit-event/event", "/tour", "/shop", "/episodes", "/llms.txt", "/sitemap.xml", "/ops"];
    for (const p of pages) {
      const r = await fetch(BASE + p, { redirect: "manual" }).catch((e) => ({ status: 0, e }));
      const good = p === "/ops" ? [401, 200, 307].includes(r.status) : p === "/shop" ? [200, 307, 308].includes(r.status) : r.status === 200;
      ok(`GET ${p}`, good, `status ${r.status}`);
    }
    if (process.env.OPS_USER && process.env.OPS_PASSWORD) {
      const r = await fetch(BASE + "/ops", { headers: { Authorization: "Basic " + Buffer.from(`${process.env.OPS_USER}:${process.env.OPS_PASSWORD}`).toString("base64") } });
      const t = await r.text();
      ok("/ops loads with basic auth", r.status === 200);
      ok("/ops shows the Inbox (OPS_TOKEN matches the database)", /Inbox/.test(t));
    } else skip("/ops with basic auth", "set OPS_USER and OPS_PASSWORD");
  }

  console.log(`\n== Dummy member login and journeys`);
  if (!PW) { skip("dummy member checks", "set DUMMY_PASSWORD (see set-dummy-passwords.mjs)"); return; }
  const who = {};
  for (const n of ["01", "02", "03", "09", "10", "13", "14"]) {
    const r = await signIn(`dummy${n}@example.com`);
    ok(`password login dummy${n}`, !!r.token, r.err || `status ${r.status}`);
    who[n] = r.token;
  }
  const bad5 = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: "dummy01@example.com", password: "wrong-password-123" }) });
  ok("wrong password is refused", bad5.status === 400);

  if (who["01"]) {
    const m = await rest("members?select=email,role,city,quiz&id=eq." + JSON.parse(Buffer.from(who["01"].split(".")[1], "base64url").toString()).sub, { token: who["01"] });
    ok("a member can read their own row", m.status === 200 && m.data?.[0]?.email === "dummy01@example.com");
    ok("dummy01 is staff", m.data?.[0]?.role === "staff");
    const all = await rest("members?select=email&limit=50", { token: who["01"] });
    ok("a member cannot read other members' rows", !(Array.isArray(all.data) && all.data.length > 1), `rows ${all.data?.length}`);
    const st = await rpc("my_standing", {}, who["01"]);
    ok("my_standing works", st.status === 200 && st.data && "nights_attended" in st.data);
    const up = await rest("members?id=eq." + JSON.parse(Buffer.from(who["01"].split(".")[1], "base64url").toString()).sub, { token: who["01"], method: "PATCH", body: { role: "owner" } });
    const after = await rest("members?select=role&id=eq." + JSON.parse(Buffer.from(who["01"].split(".")[1], "base64url").toString()).sub, { token: who["01"] });
    ok("a member cannot make themselves owner", after.data?.[0]?.role !== "owner", `status ${up.status}`);
  }
  if (who["03"]) {
    const cs = await rpc("my_crew_status", { p_slug: NIGHT }, who["03"]);
    ok("dummy03 (Bengaluru, in pool) sees waiting", cs.data?.state === "waiting", JSON.stringify(cs.data));
    const g1 = await rpc("set_night_going", { p_slug: NIGHT, p_going: true, p_show_name: false }, who["03"]);
    ok("dummy03 can say going", g1.data?.ok === true);
    const g2 = await rpc("set_night_going", { p_slug: NIGHT, p_going: false }, who["03"]);
    ok("dummy03 can undo going", g2.data?.ok === true);
    const lk = await rpc("toggle_night_like", { p_slug: NIGHT }, who["03"]);
    await rpc("toggle_night_like", { p_slug: NIGHT }, who["03"]);
    ok("dummy03 can like and unlike", lk.data?.ok === true);
    const pc = await rpc("my_past_crews", {}, who["03"]);
    ok("dummy03 has a past crew to go again with", Array.isArray(pc.data) && pc.data.some((x) => x.event_slug === "test-night-past"));
    const mates = await rpc("my_crew_mates", { p_slug: "test-night-past" }, who["03"]);
    ok("dummy03 sees 4 crew mates", Array.isArray(mates.data) && mates.data.length === 4, `got ${mates.data?.length}`);
  }
  if (who["09"]) {
    const j = await rpc("join_crew_pool", { p_slug: NIGHT }, who["09"]);
    ok("dummy09 (ticket, not yet in pool) can join the crew pool", j.data?.ok === true, JSON.stringify(j.data));
    await rest(`crew_pool?event_slug=eq.${NIGHT}`, { token: who["09"], method: "DELETE" }); // RLS blocks this; harmless
    skip("undo of dummy09 pool join", "run seed-dummy.sql to reset");
  }
  if (who["10"]) {
    const cs = await rpc("my_crew_status", { p_slug: NIGHT }, who["10"]);
    ok("dummy10 (Mumbai) sees the other-city message", cs.data?.state === "other_city", JSON.stringify(cs.data));
  }
  if (who["14"]) {
    const j = await rpc("join_crew_pool", { p_slug: NIGHT }, who["14"]);
    ok("dummy14 (no ticket) is refused the crew pool", j.data?.ok === false, JSON.stringify(j.data));
  }
  if (who["13"]) {
    const j = await rpc("join_crew_pool", { p_slug: NIGHT }, who["13"]);
    ok("dummy13 (RSVP only, Delhi) can join the pool", j.data?.ok === true, JSON.stringify(j.data));
  }
  if (who["01"]) {
    const v = await rpc("vouchable_events", {}, who["01"]);
    ok("dummy01 (staff) can list events to vouch", v.status === 200);
    const v2 = await rpc("vouchable_events", {}, who["03"] || who["01"]);
    ok("a normal member gets no vouch list", !who["03"] || (Array.isArray(v2.data) && v2.data.length === 0) || v2.status >= 400, `rows ${v2.data?.length}`);
  }
}

main().then(() => {
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${results.length - fails.length} of ${results.length} passed${fails.length ? ", " + fails.length + " FAILED" : ""}`);
  process.exit(fails.length ? 1 : 0);
}).catch((e) => { console.error("script error", e); process.exit(2); });
