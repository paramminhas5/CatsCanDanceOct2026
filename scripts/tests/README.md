# CCD tests

Three scripts and one seed. Full checklist (done, to do, manual) is in the Project doc `ccd/test-plan.md`.

| File | What it does | How to run |
|---|---|---|
| `db-suite.sql` | 78 checks on the database: join, quiz, crews, tickets, capacity, check-in, going, go again, shop, forms, ops guards. Always rolls back. | Paste into the Supabase SQL editor (the report is the error text), or `SUPABASE_ACCESS_TOKEN=... node scripts/tests/run-db-suite.mjs` |
| `e2e.mjs` | Over HTTP: auth settings, what the public can and cannot read, page status codes, and (with a password) logging in as the dummy members and walking their journeys. | `BASE_URL=https://<preview> DUMMY_PASSWORD=... node scripts/tests/e2e.mjs` |
| `set-dummy-passwords.mjs` | Sets the password on the 15 dummy members through the ops-users function. | `OPS_TOKEN=... DUMMY_PASSWORD=... node scripts/tests/set-dummy-passwords.mjs` |
| `seed-dummy.sql` / `cleanup-dummy.sql` | Create or remove the 15 dummy members and the two TEST NIGHT events. | Paste cleanup then seed into the SQL editor. |

Dummy members: dummy01@example.com to dummy15@example.com. dummy01 is staff, dummy02 is a host.
Test nights: `test-night-dummy` (upcoming, Bengaluru) and `test-night-past` (3 days ago, with a formed crew). Both are published and say "delete me" in the title: run `cleanup-dummy.sql` before you launch, they show on the public Episodes list.
