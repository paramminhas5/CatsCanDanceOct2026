# Deezer match for approved artists with a MusicBrainz id, MusicBrainz evidence only (no name search).
# Rule: MusicBrainz artist (our stored MBID) must carry exactly one deezer.com/artist URL relation.
# Run: set -a; . ../../../.env.local; set +a; python3 -I match.py
import os, json, urllib.request, time, re
SB=os.environ['NEXT_PUBLIC_SUPABASE_URL']+'/rest/v1/'
KEY=os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
UA='CatsCanDance/1.0 (catscandance.com)'
def get(u, hdr=None):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=hdr or {'User-Agent': UA}), timeout=25) as r: return json.load(r)
        except Exception: time.sleep(2)
    return None
sb=lambda p: get(SB+p, {'apikey': KEY, 'Authorization': 'Bearer '+KEY})
arts=sb('artists?status=eq.approved&select=slug,name,mbid')
ext=sb('artist_external_ids?select=artist_slug,scheme,value')
has_dz={e['artist_slug'] for e in ext if e['scheme']=='deezer'}
mb={}
for e in ext:
    if e['scheme']=='musicbrainz': mb[e['artist_slug']]=e['value']
for a in arts:
    if a.get('mbid') and a['slug'] not in mb: mb[a['slug']]=a['mbid']
todo=[a for a in arts if a['slug'] in mb and a['slug'] not in has_dz]
print(len(arts), 'approved;', len(mb), 'with MBID;', len(todo), 'with MBID and no Deezer id', flush=True)
out={}
for a in todo:
    s=a['slug']; m=mb[s]
    r=get(f'https://musicbrainz.org/ws/2/artist/{m}?inc=url-rels&fmt=json'); time.sleep(1.1)
    if not r: out[s]={'name':a['name'],'mbid':m,'deezer':None,'evidence':'MusicBrainz lookup failed'}; continue
    dzs=sorted({mm.group(1) for x in r.get('relations',[]) for mm in [re.search(r'deezer\.com/(?:[a-z]{2}/)?artist/(\d+)', x.get('url',{}).get('resource',''))] if mm})
    mbname=r.get('name')
    if len(dzs)==1:
        d=get(f'https://api.deezer.com/artist/{dzs[0]}', {}) or {}
        out[s]={'name':a['name'],'mbid':m,'mb_name':mbname,'deezer':dzs[0],'deezer_name':d.get('name'),'nb_album':d.get('nb_album'),
                'evidence':f'MusicBrainz {m} ({mbname}) links deezer.com/artist/{dzs[0]}'}
    else:
        out[s]={'name':a['name'],'mbid':m,'mb_name':mbname,'deezer':None,'evidence':f'{len(dzs)} Deezer links on MusicBrainz'}
    print(s, out[s]['deezer'], out[s].get('deezer_name'), '|', out[s]['evidence'], flush=True)
json.dump(out, open('match.json','w'), indent=1, ensure_ascii=False)
