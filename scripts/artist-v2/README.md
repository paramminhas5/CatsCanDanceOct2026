# Artist page v2 data loads (3 Nov 2026)

Applied to production on 3 Nov 2026 with Param's OK. Kept as a record; they are idempotent (fill-only updates, `on conflict do nothing`, `where not exists`).

- `1_fill_existing.sql`: 54 existing releases get Deezer album and track ids, and a release date, year and label only where empty. Where Deezer's year disagrees with the year we had from press (Sickflip Dark Ages, Roshni), the date is left empty.
- `2_` to `4_insert_*.sql`: 181 releases from Deezer that we did not have.
- `5_deezer_ids_and_eras.sql`: Deezer artist ids for 11 artists and the three Sandunes eras.
- `deezer-plan.json`: the full plan, including what was held back.

Match rules (no guessing):
- An artist matches only on an exact Deezer name AND at least one release we already had from a sourced page. Komorebi (five Deezer profiles, none with her releases), Spryk and Okedo (no Deezer profile) were skipped.
- Kohra and Shantam share their Deezer profile with other artists (Italian pop singles, meditation albums). For them only releases on labels we already know were loaded; 41 were held back (listed under `held` in the plan).
- Deluxe, instrumental and duplicate editions were skipped. Distributor placeholder labels ("1141230 Records DK") and labels that are just artist names were left empty.
