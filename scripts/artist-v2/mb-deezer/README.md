# Deezer match through MusicBrainz (3 Nov 2026, night)

For approved artists that have a MusicBrainz id and no Deezer id (15). MusicBrainz evidence only, no name search.

Rules:
1. `match.py`: the MusicBrainz artist carries exactly one deezer.com/artist link. No hits this time.
2. `match2.py`: the artist's MusicBrainz releases link deezer.com/album pages; every linked album's Deezer artist must be one id with the same name as on MusicBrainz.
3. `pull.py` (copy of ../roster/pull.py): Deezer albums for the matches, skipping deluxe, instrumental and duplicate editions.
4. New releases are inserted only when their label is already on record for that artist (our rows or the MusicBrainz-matched ones). Everything else is held in `plan.json` under `held_unknown_label`.

Result: Deezer ids for Hunee, Violet, Karenn, Deena Abdelwahed and HAAi. 23 existing releases filled with Deezer ids (`d_upd.sql`), 26 added (`d_ins.sql`), 16 held (Hunee self-released singles, two Karenn singles that look like a different Karenn, HAAi remixes on other labels).
No match: stain, indo-warehouse, pariah, dualist-inquiry, mixtress, nazira, suchi, aayna, green-park, the-f16s (their MusicBrainz entries link no Deezer pages).
