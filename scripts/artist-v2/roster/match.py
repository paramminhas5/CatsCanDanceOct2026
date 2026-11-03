import os
import json, urllib.request, urllib.parse, time, re, sys
SB='https://jybloszaucgqlbkzquqw.supabase.co/rest/v1/'
KEY=os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
UA='CatsCanDance/1.0 (catscandance.com)'
def get(u, hdr=None, tries=4):
    for i in range(tries):
        try:
            req=urllib.request.Request(u, headers=hdr or {'User-Agent':UA})
            with urllib.request.urlopen(req, timeout=25) as r: return json.load(r)
        except Exception as e:
            time.sleep(2)
    return None
sb=lambda p: get(SB+p, {'apikey':KEY,'Authorization':'Bearer '+KEY})
arts=sb('artists?status=eq.approved&select=slug,name,spotify')
ext=sb('artist_external_ids?select=artist_slug,scheme,value')
disc=sb('artist_discography?select=artist_slug,title,deezer_album_id')
done={e['artist_slug'] for e in ext if e['scheme']=='deezer'}
mbid={e['artist_slug']:e['value'] for e in ext if e['scheme']=='musicbrainz'}
titles={}
for d in disc: titles.setdefault(d['artist_slug'],[]).append(d['title'])
norm=lambda s: re.sub(r'[^a-z0-9]','',s.lower())
def base(t):
    t=re.sub(r'\s*[\(\[].*?[\)\]]','',t); t=re.sub(r'\s+(feat\.?|ft\.?)\s+.*$','',t,flags=re.I)
    t=re.sub(r'\s*-\s*(EP|Single)$','',t,flags=re.I); t=re.sub(r'\s+(EP|Ep)$','',t); return norm(t)
out={}
todo=[a for a in arts if a['slug'] not in done]
print(len(arts),'approved,',len(todo),'without deezer id', flush=True)
for a in todo:
    slug=a['slug']; ev=None; dz=None
    # 1. MusicBrainz: stored mbid, else look up by our Spotify link
    mb=mbid.get(slug)
    if not mb and a.get('spotify') and 'open.spotify.com/artist/' in a['spotify']:
        sp=a['spotify'].split('?')[0].rstrip('/')
        r=get('https://musicbrainz.org/ws/2/url?resource='+urllib.parse.quote(sp,safe='')+'&inc=artist-rels&fmt=json'); time.sleep(1.1)
        if r:
            ids=[x['artist']['id'] for x in r.get('relations',[]) if x.get('artist')]
            if len(set(ids))==1: mb=ids[0]; ev='our Spotify link -> MusicBrainz '+mb
    if mb:
        r=get(f'https://musicbrainz.org/ws/2/artist/{mb}?inc=url-rels&fmt=json'); time.sleep(1.1)
        dzs=sorted({m.group(1) for x in (r or {}).get('relations',[]) for m in [re.search(r'deezer\.com/(?:[a-z]{2}/)?artist/(\d+)', x['url']['resource'])] if m})
        if len(dzs)==1:
            dz=dzs[0]; ev=(ev+' -> ' if ev else 'MusicBrainz '+mb+' -> ')+'Deezer '+dz
    # 2. Deezer exact name + overlap with a sourced release
    cand=None
    if not dz:
        d=get('https://api.deezer.com/search/artist?q='+urllib.parse.quote(a['name'])+'&limit=25', {})
        hits=[h for h in (d or {}).get('data',[]) if norm(h['name'])==norm(a['name'])]
        known=[t for t in titles.get(slug,[])]
        for h in hits:
            al=get(f"https://api.deezer.com/artist/{h['id']}/albums?limit=100",{}) or {}
            dt=[x['title'] for x in al.get('data',[])]
            ov=[t for t in known if base(t) and any(base(t)==base(x) for x in dt)]
            if ov:
                if cand: cand=None; break   # two profiles both overlap: ambiguous
                cand=(str(h['id']),ov)
        if cand: dz=cand[0]; ev=f'exact name on Deezer and {len(cand[1])} sourced release(s): '+', '.join(cand[1][:4])
    out[slug]={'name':a['name'],'deezer':dz,'evidence':ev}
    print(slug, dz, ev, flush=True)
json.dump(out,open('match.json','w'),indent=1,ensure_ascii=False)
