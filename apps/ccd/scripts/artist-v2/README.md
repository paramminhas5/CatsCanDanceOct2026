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

## Roster artists (other than the 14 pilots), 3 Nov 2026

`roster/` holds the Deezer pull for the rest of the roster. `match.py` finds a Deezer artist only when MusicBrainz links our stored MBID or Spotify URL to it (no name-only guesses). `pull.py` / `pull2.py` fetch albums and build the chunks. `c_ids.sql` stores the Deezer ids, `c_upd.sql` fills blanks on existing rows, `c_ins0..7.sql` insert new rows (fill-only, `on conflict do nothing`). Run with `NEXT_PUBLIC_SUPABASE_ANON_KEY` set.

Held back on purpose: Komorebi albums by other artists of the same name, Onra singles from a merged Turkish profile (Mitas Müzik), and labels that are just the artist's own name.
