#!/usr/bin/env node
// Sets the password on the 15 dummy members so you can log in as them at /join ("CCD team sign in").
// Uses the ops-users edge function, which needs your OPS_TOKEN (the value in ops_config / Vercel env).
//
//   OPS_TOKEN=... DUMMY_PASSWORD='pick-a-password-10+chars' node scripts/tests/set-dummy-passwords.mjs
//
// dummy01 is staff, dummy02 is a host, the rest are members. Re-run any time to reset the passwords.
const URL = (process.env.SUPABASE_URL || "https://jybloszaucgqlbkzquqw.supabase.co") + "/functions/v1/ops-users";
const token = process.env.OPS_TOKEN, password = process.env.DUMMY_PASSWORD;
if (!token || !password || password.length < 10) { console.error("Set OPS_TOKEN and DUMMY_PASSWORD (10+ characters)."); process.exit(1); }
const names = ["Aarav","Bela","Chirag","Divya","Esha","Farhan","Gauri","Hari","Isha","Jai","Kiara","Lakshman","Meera","Nikhil","Ojas"];
let bad = 0;
for (let i = 1; i <= 15; i++) {
  const email = `dummy${String(i).padStart(2, "0")}@example.com`;
  const role = i === 1 ? "staff" : i === 2 ? "host" : "member";
  const r = await fetch(URL, { method: "POST", headers: { "x-cron-token": token, "Content-Type": "application/json" }, body: JSON.stringify({ email, password, role, name: names[i - 1] + " (dummy)" }) });
  const j = await r.json().catch(() => ({}));
  console.log(`${j.ok ? "ok  " : "FAIL"} ${email} ${role} ${j.ok ? "" : JSON.stringify(j)}`);
  if (!j.ok) bad++;
}
process.exit(bad ? 1 : 0);
