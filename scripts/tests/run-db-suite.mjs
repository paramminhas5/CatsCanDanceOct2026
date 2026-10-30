#!/usr/bin/env node
// Runs db-suite.sql and db-suite-020.sql against the project through the Supabase Management API and prints the report.
// The suite always rolls back, so it is safe on the live project.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/tests/run-db-suite.mjs
//
// (Create the token at supabase.com/dashboard/account/tokens. Or paste db-suite.sql into the SQL editor.)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const ref = process.env.SUPABASE_PROJECT_REF || "jybloszaucgqlbkzquqw";
const pat = process.env.SUPABASE_ACCESS_TOKEN;
if (!pat) { console.error("Set SUPABASE_ACCESS_TOKEN."); process.exit(1); }
let failed = false;
for (const file of ["db-suite.sql", "db-suite-020.sql"]) {
  const sql = readFileSync(fileURLToPath(new URL("./" + file, import.meta.url)), "utf8");
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const text = await r.text();
  const m = text.match(/(ALL PASSED[\s\S]*|FAILED[\s\S]*?)(?:\\nCONTEXT|\nCONTEXT|"\})/);
  const report = (m ? m[1] : text).replace(/\\n/g, "\n").replace(/\\"/g, '"');
  console.log(`== ${file}\n${report}`);
  if (!/^ALL PASSED/.test(report)) failed = true;
}
process.exit(failed ? 1 : 0);
