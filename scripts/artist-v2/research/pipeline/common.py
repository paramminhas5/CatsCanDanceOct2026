# Shared helpers for the artist research pipeline. Public data only (anon key + open APIs). No AI.
import os, json, time, re, urllib.request, urllib.parse
UA = 'CatsCanDance/1.0 (catscandance.com; research pipeline)'
SB = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', 'https://jybloszaucgqlbkzquqw.supabase.co') + '/rest/v1/'
KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

def get(url, headers=None, tries=3, wait=1.5):
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers or {'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403, 404): return None
            time.sleep(wait)
        except Exception:
            time.sleep(wait)
    return None

def sb(path):
    if not KEY: raise SystemExit('Set NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.local)')
    out, off = [], 0
    while True:
        sep = '&' if '?' in path else '?'
        rows = get(f'{SB}{path}{sep}limit=1000&offset={off}', {'apikey': KEY, 'Authorization': 'Bearer ' + KEY}) or []
        out += rows
        if len(rows) < 1000: return out
        off += 1000

_last_mb = [0.0]
def mb(path):
    """MusicBrainz, kept under 1 request per second as their rules ask."""
    dt = time.time() - _last_mb[0]
    if dt < 1.1: time.sleep(1.1 - dt)
    _last_mb[0] = time.time()
    return get('https://musicbrainz.org/ws/2/' + path + ('&' if '?' in path else '?') + 'fmt=json')

def deezer(path):
    d = get('https://api.deezer.com/' + path, {})
    return d if d and not d.get('error') else None

def oembed(url):
    """Title and author of a SoundCloud, YouTube or Mixcloud page, or None if it is gone."""
    q = urllib.parse.quote(url, safe='')
    if re.search(r'youtube\.com|youtu\.be', url): api = f'https://www.youtube.com/oembed?format=json&url={q}'
    elif 'soundcloud.com' in url: api = f'https://soundcloud.com/oembed?format=json&url={q}'
    elif 'mixcloud.com' in url: api = f'https://app.mixcloud.com/oembed/?format=json&url={q}'
    else: return None
    return get(api, tries=2)

norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
MBID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
