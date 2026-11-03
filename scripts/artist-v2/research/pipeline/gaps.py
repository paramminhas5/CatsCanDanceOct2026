# Step 1: find what each artist page is missing and write research batches.
# Run from the repo root:
#   set -a; . ./.env.local; set +a
#   python3 -I scripts/artist-v2/research/pipeline/gaps.py               # approved artists with any gap
#   python3 -I scripts/artist-v2/research/pipeline/gaps.py --status pending --all   # new artists, everything
#   python3 -I scripts/artist-v2/research/pipeline/gaps.py --slugs a,b,c
# Writes runs/<date>/batchN.json (same fields as the earlier batches), gaps.md and gaps.json.
import sys, os, json, argparse, datetime
sys.path.insert(0, os.path.dirname(__file__))
from common import sb

ap = argparse.ArgumentParser()
ap.add_argument('--status', default='approved')
ap.add_argument('--slugs', default='')
ap.add_argument('--all', action='store_true', help='include artists with no gaps')
ap.add_argument('--size', type=int, default=8, help='artists per batch (one research agent each)')
ap.add_argument('--out', default='')
a = ap.parse_args()

arts = sb(f'artists?status=eq.{a.status}&select=slug,name,kind,based_city,from_city,genres,spotify,soundcloud,instagram,website,mix_url,labels,members,bio,photo_url,mbid')
if a.slugs: arts = [x for x in arts if x['slug'] in a.slugs.split(',')]
slugs = {x['slug'] for x in arts}
def by(rows, key='artist_slug'):
    d = {}
    for r in rows:
        if r.get(key) in slugs: d.setdefault(r[key], []).append(r)
    return d
disc = by(sb('artist_discography?select=artist_slug,title,year,label,deezer_track_id,bandcamp_item_id'))
press = by(sb('artist_press?select=artist_slug,url'))
eras = by(sb('artist_eras?select=artist_slug,from_year'))
tags = by(sb('artist_sound_tags?select=artist_slug,tag'))
mixes = by(sb('artist_tracklists?select=artist_slug,url'))
ids = by(sb('artist_external_ids?select=artist_slug,scheme,value'))
PLAY = ('soundcloud.com', 'youtube.com', 'youtu.be', 'mixcloud.com')

rows, report = [], []
for x in sorted(arts, key=lambda r: r['slug']):
    s = x['slug']; d = disc.get(s, []); idm = {i['scheme']: i['value'] for i in ids.get(s, [])}
    plays = bool(x['spotify'] or x['soundcloud'] or any(r.get('deezer_track_id') or r.get('bandcamp_item_id') for r in d) or 'deezer' in idm
                 or any(any(p in (m['url'] or '') for p in PLAY) for m in mixes.get(s, []))
                 or any(p in (x['mix_url'] or '') for p in PLAY))
    gaps = [k for k, ok in [('bio', x['bio'] and len(x['bio'].strip()) > 40), ('photo', x['photo_url']), ('plays', plays),
                            ('eras', s in eras), ('releases', d), ('press', s in press), ('tags', s in tags),
                            ('ids', any(k in idm for k in ('musicbrainz', 'discogs', 'ra', 'wikidata'))),
                            ('city', x['based_city'] and x['based_city'].strip().lower() != 'india')] if not ok]
    report.append((s, gaps))
    if not gaps and not a.all: continue
    ys = [r['year'] for r in d if r.get('year')]
    rows.append({
        'slug': s, 'name': x['name'], 'kind': x['kind'], 'based_city': x['based_city'], 'from_city': x['from_city'],
        'genres': x['genres'], 'spotify': x['spotify'], 'soundcloud': x['soundcloud'], 'instagram': x['instagram'],
        'website': x['website'], 'mix_url': x['mix_url'], 'labels': x['labels'], 'members': x['members'],
        'bio_excerpt': (x['bio'] or None) and x['bio'][:400], 'releases_on_record': len(d),
        'release_years': [min(ys), max(ys)] if ys else [None, None],
        'sample_releases': [f"{r['title']} ({r.get('year') or '?'}{', ' + r['label'] if r.get('label') else ''})" for r in sorted(d, key=lambda r: -(r.get('year') or 0))[:8]],
        'press_urls_already_stored': [p['url'] for p in press.get(s, [])],
        'sound_tags_already_stored': [t['tag'] for t in tags.get(s, [])],
        'mix_urls_already_stored': [m['url'] for m in mixes.get(s, [])],
        'ids_already_stored': idm, 'has_eras': s in eras, 'mbid': x['mbid'], 'gaps': gaps,
    })

out = a.out or os.path.join(os.path.dirname(__file__), 'runs', datetime.date.today().isoformat())
os.makedirs(out, exist_ok=True)
for i in range(0, len(rows), a.size):
    json.dump(rows[i:i + a.size], open(f'{out}/batch{i // a.size + 1}.json', 'w'), ensure_ascii=False, indent=1)
json.dump(report, open(f'{out}/gaps.json', 'w'))
full = sum(1 for _, g in report if not g)
lines = [f'# Artist gaps ({a.status}, {len(report)} artists, {full} with nothing missing)', '']
for k in ['bio', 'photo', 'plays', 'eras', 'releases', 'press', 'tags', 'ids', 'city']:
    miss = [s for s, g in report if k in g]
    lines.append(f'- {k}: {len(report) - len(miss)} have it, {len(miss)} missing' + (f": {', '.join(miss)}" if miss and len(miss) <= 40 else ''))
open(f'{out}/gaps.md', 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines)); print(f'\n{len(rows)} artists in {(len(rows) + a.size - 1) // a.size} batches at {out}')
