# Labels and promoters research (3 Nov 2026)

Sourced lists of Indian and South Asian diaspora labels (`labels.json`, 34) and promoters, collectives, agencies, festivals and clubs (`promoters.json`, 46).
Migration 046 (applied with Param's OK) created `labels` and added depth columns to `promoters`.

Loaded as `status = 'pending'`, so nothing is public until approved:
- 34 labels in `labels`.
- 37 new rows in `promoters`; the 4 existing rows with sources (Krunk, Qilla Records, Levitate, Drum and Bass India) got only their empty new columns filled. Subculture BLR was left alone (no source found).
- Not loaded on purpose: Mehfil (Daytimers), Kuch Kuch, Discostan, Basement Bhangra (adjacent or not electronic).

Caveats: facts came partly through summarised page reads, so spot-check founders and years before approving. Low-confidence rows have one source. Qilla's co-founder Gaurav Malekar is in one article only and was left out; Krunk Kulture's roster link to Nikki Nair is unconfirmed and was left out.
Approve by setting `status = 'approved'` (labels and promoters). The /labels and /promoters pages read approved rows only.

## Second pass (3 Nov 2026, evening)
Loaded with `on conflict do nothing`; only high-confidence rows approved.
- `agencies.json`: 20 into `promoters` (3 approved: Submerge, Represent, Third Culture). Shown on /agencies.
- `venues.json`: 39 into `promoters` (3 approved). Left out: Kuch Kuch, Discostan, Basement Bhangra (not electronic), Dialled In (already loaded), Kitty Su Bengaluru pop-up (fold into Kitty Su), Jambutek (belongs in labels). Corrections to existing rows (antiSOCIAL, Sunday Playground, No I.D., Tawoos, unmute year) NOT applied; need Param's OK.
- `stakeholders.json`: 52 into `promoters` (13 approved): radio, media, schools, studios, rights bodies, collectives, platforms.
- `labels2.json`: 30 into `labels` (2 approved: Circuit, Mallung). Azadi and Gully Gang are high confidence but hip-hop, so left pending for scope.
