# Step 2: the rule-based pass. No AI, no guessing; every fact keeps the page it came from.
# For each artist in a run's batch files:
#   1. MusicBrainz identity: the stored MBID, else the MusicBrainz artist that our own stored Spotify,
#      SoundCloud or Bandcamp link points to (exactly one artist, and the name must match).
#   2. From that MusicBrainz artist: Discogs, Wikidata, Bandcamp, Spotify (only if we have none) and
#      Deezer ids (a direct link, or Deezer albums linked from its releases that all point to one
#      Deezer artist of the same name), plus its release groups with dates (for artists with < 5 on record).
#   3. Stored mix links checked with oEmbed: dead ones are reported, live ones are titled.
# Writes <run>/out_auto.json in the research output format, so validate.py and gen_sql.py take it as is.
#   python3 -I scripts/artist-v2/research/pipeline/auto.py scripts/artist-v2/research/pipeline/runs/<date>
import sys, os, json, glob, re
sys.path.insert(0, os.path.dirname(__file__))
from common import mb, deezer, oembed, norm, MBID

run = sys.argv[1]
batch = [x for f in sorted(glob.glob(f'{run}/batch*.json')) for x in json.load(open(f))]
TYPE = {'Album': 'album', 'EP': 'ep', 'Single': 'single'}
out, dead = [], []

def resolve(x):
    if x.get('mbid') and MBID.search(x['mbid']): return MBID.search(x['mbid']).group(0), 'stored MBID'
    m = (x.get('ids_already_stored') or {}).get('musicbrainz')
    if m and MBID.search(m): return MBID.search(m).group(0), 'stored MusicBrainz id'
    for link in [x.get('spotify'), x.get('soundcloud'), (x.get('ids_already_stored') or {}).get('bandcamp')]:
        if not link: continue
        link = link.split('?')[0].rstrip('/')
        r = mb('url?resource=' + __import__('urllib.parse').parse.quote(link, safe='') + '&inc=artist-rels')
        arts = {rel['artist']['id']: rel['artist'] for rel in (r or {}).get('relations', []) if rel.get('artist')}
        if len(arts) == 1:
            aid, art = next(iter(arts.items()))
            if norm(art.get('name')) == norm(x['name']): return aid, f'our link {link} is on MusicBrainz artist {aid}'
    return None, None

for x in batch:
    s = x['slug']; have = x.get('ids_already_stored') or {}
    rec = {'slug': s, 'identity': '', 'eras': [], 'sound_tags': [], 'aliases': [], 'press': [], 'mix_links': [],
           'spotify': None, 'bio_draft': None, 'bio_sources': [], 'releases': [], 'ids': {}, 'notes': ''}
    for u in x.get('mix_urls_already_stored', []) + ([x['mix_url']] if x.get('mix_url') else []):
        if re.search(r'soundcloud\.com|youtube\.com|youtu\.be|mixcloud\.com', u) and oembed(u) is None: dead.append((s, u))
    mbid, how = resolve(x)
    if not mbid:
        rec['notes'] = 'auto: no MusicBrainz artist tied to our stored links'; out.append(rec); print(s, '-'); continue
    a = mb(f'artist/{mbid}?inc=url-rels+aliases')
    if not a or norm(a.get('name')) != norm(x['name']) and not any(norm(al.get('name')) == norm(x['name']) for al in a.get('aliases', [])):
        rec['notes'] = f'auto: MusicBrainz {mbid} name does not match, skipped'; out.append(rec); print(s, 'name mismatch'); continue
    rec['identity'] = f'auto: {how}; MusicBrainz name {a.get("name")}'
    ids = {'musicbrainz': mbid}
    urls = [r['url']['resource'] for r in a.get('relations', []) if r.get('url')]
    for u in urls:
        if m := re.search(r'discogs\.com/artist/(\d+)', u): ids.setdefault('discogs', f'https://www.discogs.com/artist/{m.group(1)}')
        elif m := re.search(r'wikidata\.org/wiki/(Q\d+)', u): ids.setdefault('wikidata', m.group(1))
        elif m := re.match(r'https?://([a-z0-9-]+)\.bandcamp\.com/?$', u): ids.setdefault('bandcamp', f'https://{m.group(1)}.bandcamp.com')
        elif m := re.search(r'beatport\.com/artist/[^/]+/(\d+)', u): ids.setdefault('beatport', u)
        elif m := re.search(r'ra\.co/dj/([a-z0-9-]+)', u): ids.setdefault('ra', f'https://ra.co/dj/{m.group(1)}')
        elif (m := re.search(r'open\.spotify\.com/artist/([A-Za-z0-9]{22})', u)) and not x.get('spotify'): rec['spotify'] = f'https://open.spotify.com/artist/{m.group(1)}'
    dz = sorted({m.group(1) for u in urls if (m := re.search(r'deezer\.com/(?:[a-z]{2}/)?artist/(\d+)', u))})
    if len(dz) == 1: ids['deezer'] = dz[0]
    rels = mb(f'release?artist={mbid}&inc=url-rels+release-groups&limit=100') or {}
    if 'deezer' not in ids and 'deezer' not in have:
        albums = sorted({m.group(1) for rl in rels.get('releases', []) for r in rl.get('relations', []) if (m := re.search(r'deezer\.com/(?:[a-z]{2}/)?album/(\d+)', r.get('url', {}).get('resource', '')))})
        found = {}
        for al in albums[:12]:
            d = deezer(f'album/{al}') or {}
            if (art := d.get('artist')) and norm(art.get('name')) == norm(a.get('name')): found[str(art['id'])] = art['name']
        if len(found) == 1: ids['deezer'] = next(iter(found))
    rec['ids'] = {k: v for k, v in ids.items() if k not in have}
    if x.get('releases_on_record', 0) < 5:
        seen = set()
        for rl in sorted(rels.get('releases', []), key=lambda r: r.get('date') or '9999'):
            rg = rl.get('release-group') or {}
            if rg.get('id') in seen or rg.get('primary-type') not in TYPE or set(rg.get('secondary-types') or []) & {'Compilation', 'DJ-mix', 'Live', 'Interview', 'Spokenword'}: continue
            date = rg.get('first-release-date') or rl.get('date') or ''
            if not re.match(r'^\d{4}', date): continue
            seen.add(rg['id'])
            rec['releases'].append({'title': rg.get('title') or rl.get('title'), 'year': int(date[:4]), 'release_type': TYPE[rg['primary-type']],
                                    'label': None, 'url': f'https://musicbrainz.org/release-group/{rg["id"]}', 'date': date if len(date) == 10 else None})
    out.append(rec)
    print(s, {k: v for k, v in rec['ids'].items()}, len(rec['releases']), 'releases', 'spotify' if rec['spotify'] else '')

json.dump(out, open(f'{run}/out_auto.json', 'w'), ensure_ascii=False, indent=1)
json.dump(dead, open(f'{run}/dead_links.json', 'w'), indent=1)
print(f'{sum(1 for r in out if r["identity"])} of {len(out)} matched on MusicBrainz; {len(dead)} dead mix links (dead_links.json)')
