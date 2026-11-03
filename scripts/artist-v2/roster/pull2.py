import json, urllib.request, time, re
exec(open('pull.py').read().split("U=[];I=[];flag=[]")[0])   # reuse helpers and data
P=json.load(open('plan.json'))
U=P['U']; I=P['I']; held=[]
def fetch_all(aid):
    out=[];u=f"https://api.deezer.com/artist/{aid}/albums?limit=100"
    while u:
        d=get(u); out+=d.get('data',[]); u=d.get('next'); time.sleep(0.2)
    return out
for slug,aid,mode in [('francis-mercier','5180873','all'),('komorebi','5948862','known')]:
    al=fetch_all(aid); ex={}
    for d in disc:
        if d['artist_slug']==slug: ex.setdefault(base(d['title']),d)
    rows=[];labels=set()
    seen=set()
    for a in sorted(al,key=lambda x:x.get('release_date') or '9999'):
        b=base(a['title'])
        if not b or b in seen or re.search(r'deluxe|instrumental|retrofitted|sped up|slowed',a['title'],re.I): continue
        seen.add(b)
        d=get(f"https://api.deezer.com/album/{a['id']}"); time.sleep(0.12)
        tr=[t for t in d.get('tracks',{}).get('data',[]) if t.get('preview')]
        pick=next((t for t in tr if base(t['title'])==b),None) or (max(tr,key=lambda t:t.get('rank') or 0) if tr else None)
        date=d.get('release_date') or a.get('release_date'); y=int(date[:4]) if date else None
        rows.append((b,{'s':slug,'ti':d.get('title',a['title']),'ty':TYPE.get(d.get('record_type') or a.get('record_type'),'single'),'d':date,'y':y,'l':clean(d.get('label'),names.get(slug,slug)),'a':str(a['id']),'t':str(pick['id']) if pick else None,'n':pick['title'] if pick else None}))
        if b in ex and d.get('label'): labels.add(d['label'])
    for e in ex.values():
        if e.get('label'): labels.add(e['label'])
    for b,row in rows:
        if b in ex:
            e=ex[b]
            if e.get('deezer_album_id'): continue
            same=e['year'] is None or e['year']==row['y']
            U.append({'i':e['id'],'d':row['d'] if same else None,'y':row['y'],'l':row['l'],'a':row['a'],'t':row['t'],'n':row['n']})
        elif mode=='all' or (row['l'] in labels): I.append(row)
        else: held.append((slug,row['ti'],row['l']))
    print(slug,len(al),'labels',labels)
P['U']=U; P['I']=I; P['held2']=held
json.dump(P,open('plan.json','w'),ensure_ascii=False)
from collections import Counter
print('update',len(U),'insert',len(I),'held',len(held)); print(Counter(r['s'] for r in I)['komorebi'], Counter(r['s'] for r in I)['francis-mercier'])
