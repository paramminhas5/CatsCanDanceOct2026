# Pull Deezer albums for the MusicBrainz-matched artists (copy of ../roster/pull.py, same rules).
import os
import json, urllib.request, time, re
from collections import Counter
SB=os.environ['NEXT_PUBLIC_SUPABASE_URL']+'/rest/v1/'
KEY=os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY']
def get(u,h=None):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u,headers=h or {}),timeout=25) as r:
                d=json.load(r)
                if isinstance(d,dict) and d.get('error',{}).get('code')==4: time.sleep(2); continue
                return d
        except Exception: time.sleep(1.5)
    return {}
m={k:v for k,v in json.load(open('match.json')).items() if v['deezer']}
disc=get(SB+'artist_discography?select=id,artist_slug,title,year,label,deezer_album_id',{'apikey':KEY,'Authorization':'Bearer '+KEY})
names={s:v['name'] for s,v in m.items()}
norm=lambda s: re.sub(r'[^a-z0-9]','',s.lower())
def base(t):
    t=re.sub(r'\s*[\(\[].*?[\)\]]','',t); t=re.sub(r'\s+(feat\.?|ft\.?)\s+.*$','',t,flags=re.I)
    t=re.sub(r'\s*-\s*(EP|Single)$','',t,flags=re.I); t=re.sub(r'\s+(EP|Ep)$','',t); return norm(t)
def clean(l,an):
    if not l: return None
    if re.match(r'^\d+ Records DK\d*$',l): return None
    if norm(l)==norm(an) or ',' in l or '|' in l: return None
    return l
TYPE={'album':'album','ep':'ep','single':'single','compile':'compilation'}
U=[];I=[];flag=[]
for slug,v in m.items():
    if not v['deezer']: continue
    al=get(f"https://api.deezer.com/artist/{v['deezer']}/albums?limit=200").get('data',[])
    if len(al)>80: flag.append((slug,len(al))); continue
    ex={}
    for d in disc:
        if d['artist_slug']==slug: ex.setdefault(base(d['title']),d)
    seen=set()
    for a in sorted(al,key=lambda x:x.get('release_date') or '9999'):
        b=base(a['title'])
        if not b or b in seen or re.search(r'deluxe|instrumental|retrofitted|sped up|slowed',a['title'],re.I): continue
        seen.add(b)
        d=get(f"https://api.deezer.com/album/{a['id']}"); time.sleep(0.12)
        tr=[t for t in d.get('tracks',{}).get('data',[]) if t.get('preview')]
        pick=next((t for t in tr if base(t['title'])==b),None) or (max(tr,key=lambda t:t.get('rank') or 0) if tr else None)
        date=d.get('release_date') or a.get('release_date'); y=int(date[:4]) if date else None
        row={'s':slug,'ti':d.get('title',a['title']),'ty':TYPE.get(d.get('record_type') or a.get('record_type'),'single'),'d':date,'y':y,'l':clean(d.get('label'),names[slug]),'a':str(a['id']),'t':str(pick['id']) if pick else None,'n':pick['title'] if pick else None}
        if b in ex:
            e=ex[b]
            if e.get('deezer_album_id'): continue
            same=e['year'] is None or e['year']==y
            U.append({'i':e['id'],'d':date if same else None,'y':y,'l':row['l'],'a':row['a'],'t':row['t'],'n':row['n']})
        else: I.append(row)
    print(slug,len(al),flush=True)
json.dump({'U':U,'I':I,'flag':flag},open('plan.json','w'),ensure_ascii=False)
print('update',len(U),'insert',len(I),'flag',flag)
print(Counter(r['s'] for r in I))
