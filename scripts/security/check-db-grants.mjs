#!/usr/bin/env node
// Fails if the live database lets the public API do more than we have agreed to.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/security/check-db-grants.mjs
//
// Checks (all read-only):
//   1. Every SECURITY DEFINER function anon can call is in anon-definer-allowlist.txt.
//      Supabase grants EXECUTE to anon and authenticated on every new public function, and
//      `revoke ... from public` does not undo that. New internal helpers must revoke from anon, authenticated.
//   2. No public table has RLS off.
//   3. anon and authenticated cannot write `members` directly (roles, bans and founding numbers live there).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ref = process.env.SUPABASE_PROJECT_REF || "jybloszaucgqlbkzquqw";
const pat = process.env.SUPABASE_ACCESS_TOKEN;
if (!pat) { console.error("Set SUPABASE_ACCESS_TOKEN."); process.exit(1); }

async function q(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`query failed: ${r.status} ${await r.text()}`);
  return r.json();
}

const allow = new Set(
  readFileSync(fileURLToPath(new URL("./anon-definer-allowlist.txt", import.meta.url)), "utf8")
    .split("\n").map((s) => s.trim()).filter((s) => s && !s.startsWith("#")),
);

const problems = [];

const fns = await q(`
  select distinct p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef
    and has_function_privilege('anon', p.oid, 'execute')
    and pg_get_function_result(p.oid) <> 'trigger'`);
for (const { name } of fns) if (!allow.has(name)) problems.push(`function ${name}() is SECURITY DEFINER and callable by anon but not in the allowlist`);

const norls = await q(`
  select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
for (const { name } of norls) problems.push(`table ${name} has row level security off`);

const memberWrites = await q(`
  select r as role, priv from unnest(array['anon','authenticated']) r, unnest(array['INSERT','UPDATE','DELETE']) priv
  where has_table_privilege(r, 'public.members', priv)`);
for (const { role, priv } of memberWrites) problems.push(`${role} has ${priv} on members`);

if (problems.length) {
  console.error(`FAILED (${problems.length})\n- ` + problems.join("\n- "));
  process.exit(1);
}
console.log(`ALL PASSED: ${fns.length} public definer functions, all allowlisted; RLS on every table; members locked.`);
