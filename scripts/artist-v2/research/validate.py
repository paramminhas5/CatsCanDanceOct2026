# Validate research output and build fill-only SQL chunks. Run: python3 -I validate.py <dir>
import json, re, sys, glob, os, hashlib
D = sys.argv[1]
batch = {}
for f in glob.glob(f'{D}/batch*.json'):
    for a in json.load(open(f)): batch[a['slug']] = a
HYPE = re.compile(r'iconic|legendary|groundbreaking|trailblaz|visionary|must-hear|genre-defying|boundary-pushing', re.I)
URL = re.compile(r'^https?://[^\s]+$')
def clean(t):
    if t is None: return None
    t = str(t).replace('—', ', ').replace('–', '-').strip()
    return re.sub(r'\s+', ' ', t)
PAL = ['night', 'blush', 'ink']
FIELD_OUT = {('thegreybox','eras'),('thegreybox','bio_draft'),('dotdat','spotify'),('lush-lata','eras')}
TAG_OUT = {('kaleekarma','ethno techno')}
EXCLUDE = {'dj-ravator': 'identity match rated weak by research (MusicBrainz Ravator via a shared singer); Param to confirm'}
rows = {k: [] for k in ['eras', 'tags', 'aliases', 'press', 'mixes', 'spotify', 'bio', 'releases', 'ids']}
report = {'artists': 0, 'with_eras': 0, 'dropped': [], 'no_confirm': []}
def drop(slug, what, why): report['dropped'].append(f'{slug}: {what}: {why}')
for f in sorted(glob.glob(f'{D}/out*.json')):
    try: data = json.load(open(f))
    except Exception as e: print('BAD JSON', f, e); continue
    for x in data:
        s = x.get('slug')
        if s not in batch: print('unknown slug', s); continue
        report['artists'] += 1
        b = batch[s]
        if s in EXCLUDE: report['dropped'].append(f'{s}: all: {EXCLUDE[s]}'); continue
        for (fs, ff) in FIELD_OUT:
            if fs == s and x.get(ff): x[ff] = [] if ff == 'eras' else None; report['dropped'].append(f'{s}: {ff}: unverified per research notes')
        if s == 'gazzi' and isinstance(x.get('ids'), dict): x['ids'].pop('bandcamp', None)
        x['sound_tags'] = [t for t in (x.get('sound_tags') or []) if (s, str(t.get('tag','')).lower()) not in TAG_OUT]
        eras = [e for e in (x.get('eras') or []) if isinstance(e, dict)]
        good = []
        for e in eras:
            fy, ty = e.get('from_year'), e.get('to_year')
            snd = clean(e.get('sound')); src = e.get('source_url'); q = e.get('quote')
            if not (isinstance(fy, int) and 1985 <= fy <= 2026): drop(s, 'era', f'bad from_year {fy}'); continue
            if ty is not None and not (isinstance(ty, int) and fy <= ty <= 2026): drop(s, 'era', f'bad to_year {ty}'); continue
            if not snd or len(snd.split()) > 12 or HYPE.search(snd): drop(s, 'era', f'sound line {snd!r}'); continue
            if not (src and URL.match(src)) or not q: drop(s, 'era', 'no source or quote'); continue
            tags = [clean(t) for t in (e.get('tags') or []) if t and len(str(t)) <= 30][:5]
            good.append({'s': s, 'f': fy, 't': ty, 'snd': snd[0].upper() + snd[1:], 'tags': tags, 'u': src, 'n': clean(e.get('source_name')) or None})
        good.sort(key=lambda e: e['f'])
        # no overlaps: each era ends the year before the next starts; only the last can be open
        ok = []
        for i, e in enumerate(good):
            if ok and e['f'] <= ok[-1]['f']: drop(s, 'era', 'same start year'); continue
            ok.append(e)
        for i, e in enumerate(ok):
            if i < len(ok) - 1: e['t'] = min(e['t'] or 9999, ok[i + 1]['f'] - 1)
            e['p'] = PAL[(i + int(hashlib.md5(s.encode()).hexdigest(), 16)) % 3]
        if ok and not b.get('has_eras'): rows['eras'] += ok; report['with_eras'] += 1
        for t in (x.get('sound_tags') or [])[:3]:
            tag, u = clean(t.get('tag')), t.get('source_url')
            if tag and u and URL.match(u) and len(tag) <= 140 and not HYPE.search(tag) and tag not in b['sound_tags_already_stored']:
                rows['tags'].append({'s': s, 'tag': tag, 'u': u})
        for al in (x.get('aliases') or []):
            n, u = clean(al.get('alias')), al.get('source_url')
            if n and u and URL.match(u) and len(n) >= 3 and n.lower() != b['name'].lower():
                rows['aliases'].append({'s': s, 'a': n, 'k': al.get('kind') or 'also_known_as', 'u': u})
        for pr in (x.get('press') or [])[:5]:
            u = pr.get('url')
            if u and URL.match(u) and pr.get('title') and u not in b['press_urls_already_stored']:
                d = pr.get('date_published'); d = d if d and re.match(r'^\d{4}-\d{2}-\d{2}$', str(d)) else None
                rows['press'].append({'s': s, 't': clean(pr['title'])[:300], 'p': clean(pr.get('publication')), 'u': u, 'd': d})
        for m in (x.get('mix_links') or [])[:3]:
            u = m.get('url')
            if u and URL.match(u) and m.get('title'):
                y = m.get('year')
                rows['mixes'].append({'s': s, 't': clean(m['title'])[:200] + (f' (published {y})' if isinstance(y, int) else ''), 'u': u})
        sp = x.get('spotify')
        if sp and re.match(r'^https://open\.spotify\.com/artist/[A-Za-z0-9]{22}', sp) and not b.get('spotify'):
            rows['spotify'].append({'s': s, 'u': sp.split('?')[0]})
        bd = clean(x.get('bio_draft'))
        if bd and not b.get('bio_excerpt') and x.get('bio_sources') and len(bd) < 500 and not HYPE.search(bd):
            rows['bio'].append({'s': s, 'b': bd, 'src': x.get('bio_sources')})
        have = {r.split(' (')[0].lower() for r in b['sample_releases']}
        for r in (x.get('releases') or [])[:20]:
            t, u, y = clean(r.get('title')), r.get('url'), r.get('year')
            ty = (r.get('release_type') or 'single').lower()
            if ty not in ('album', 'ep', 'single', 'remix', 'compilation'): ty = 'single'
            if not (t and u and URL.match(u) and isinstance(y, int) and 1985 <= y <= 2026): drop(s, 'release', f'{t!r} incomplete'); continue
            if t.lower() in have: continue
            d = r.get('date'); d = d if d and re.match(r'^\d{4}-\d{2}-\d{2}$', str(d)) and d.startswith(str(y)) else None
            rows['releases'].append({'s': s, 'ti': t[:200], 'ty': ty, 'y': y, 'd': d, 'l': clean(r.get('label')), 'u': u})
        ids = x.get('ids') or {}
        if isinstance(ids, dict):
            for k, v in ids.items():
                k = k.lower()
                if k not in ('bandcamp', 'discogs', 'musicbrainz', 'beatport', 'ra', 'wikidata') or not v: continue
                v = str(v).strip()
                if k == 'musicbrainz':
                    m = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', v)
                    if not m: continue
                    rows['ids'].append({'s': s, 'k': k, 'v': m.group(0), 'u': f'https://musicbrainz.org/artist/{m.group(0)}'})
                elif k == 'wikidata':
                    m = re.search(r'Q\d+', v)
                    if m: rows['ids'].append({'s': s, 'k': k, 'v': m.group(0), 'u': f'https://www.wikidata.org/wiki/{m.group(0)}'})
                elif URL.match(v):
                    rows['ids'].append({'s': s, 'k': k, 'v': v, 'u': v})
        if not ok and not x.get('releases') and not x.get('press'):
            report['no_confirm'].append(f"{s}: {(x.get('notes') or '')[:120]}")
json.dump(rows, open(f'{D}/rows.json', 'w'), ensure_ascii=False, indent=0)
print({k: len(v) for k, v in rows.items()})
print('artists', report['artists'], 'with eras', report['with_eras'])
print('dropped', len(report['dropped'])); [print('  ', d) for d in report['dropped'][:40]]
print('nothing confirmed:'); [print('  ', n) for n in report['no_confirm']]
