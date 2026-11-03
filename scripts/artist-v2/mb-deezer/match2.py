# Second MusicBrainz-only rule: MusicBrainz releases of our MBID that link a deezer.com/album URL.
# Each such Deezer album's main artist id is collected; a match needs every linked album to point
# to the same Deezer artist (one id), and that artist's Deezer name must equal the MusicBrainz name.
import json, urllib.request, time, re
UA='CatsCanDance/1.0 (catscandance.com)'
def get(u, hdr=None):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=hdr or {'User-Agent': UA}), timeout=25) as r: return json.load(r)
        except Exception: time.sleep(2)
    return None
norm=lambda s: re.sub(r'[^a-z0-9]','',(s or '').lower())
M=json.load(open('match.json'))
for s,v in M.items():
    if v['deezer']: continue
    rels=[]; off=0
    while True:
        r=get(f"https://musicbrainz.org/ws/2/release?artist={v['mbid']}&inc=url-rels&fmt=json&limit=100&offset={off}"); time.sleep(1.1)
        if not r: break
        rels+=r.get('releases',[]); off+=100
        if off>=r.get('release-count',0): break
    albums=sorted({m.group(1) for rl in rels for x in rl.get('relations',[]) for m in [re.search(r'deezer\.com/(?:[a-z]{2}/)?album/(\d+)', x.get('url',{}).get('resource',''))] if m})
    ids={}
    for a in albums[:30]:
        d=get(f'https://api.deezer.com/album/{a}',{}) or {}; time.sleep(0.15)
        art=d.get('artist') or {}
        if art.get('id'): ids.setdefault(str(art['id']), {'name': art.get('name'), 'albums': []})['albums'].append(a)
    v['mb_releases']=len(rels); v['deezer_albums_on_mb']=albums
    named={k:x for k,x in ids.items() if norm(x['name'])==norm(v.get('mb_name'))}
    if len(named)==1:
        k,x=next(iter(named.items()))
        v['deezer']=k; v['deezer_name']=x['name']
        v['evidence']=f"MusicBrainz {v['mbid']} releases link {len(x['albums'])} Deezer album(s) ({', '.join(x['albums'][:3])}) by Deezer artist {k} ({x['name']})"
    else:
        v['evidence']+=f"; {len(albums)} Deezer album links on MB releases, {len(named)} same-name Deezer artists ({ {k:x['name'] for k,x in ids.items()} })"
    print(s, v['deezer'], '|', v['evidence'], flush=True)
json.dump(M, open('match.json','w'), indent=1, ensure_ascii=False)
