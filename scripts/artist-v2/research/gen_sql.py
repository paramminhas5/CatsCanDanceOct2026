import json, sys, os
D = sys.argv[1]; rows = json.load(open(f'{D}/rows.json')); os.makedirs(f'{D}/sql', exist_ok=True)
def lit(x): return "'" + json.dumps(x, ensure_ascii=False, separators=(',', ':')).replace("'", "''") + "'::json"
T = {
 'eras': ("with ins as (insert into public.artist_eras (artist_slug,from_year,to_year,sound,tags,source_url,source_name,palette) "
          "select x.s,x.f,x.t,x.snd,array(select json_array_elements_text(x.tags)),x.u,x.n,x.p from json_to_recordset({J}) as x(s text,f int,t int,snd text,tags json,u text,n text,p text) "
          "join public.artists a on a.slug=x.s where not exists (select 1 from public.artist_eras e where e.artist_slug=x.s and e.from_year=x.f) returning 1) select count(*) from ins;"),
 'tags': ("with ins as (insert into public.artist_sound_tags (artist_slug,tag,source_url) select x.s,x.tag,x.u from json_to_recordset({J}) as x(s text,tag text,u text) "
          "join public.artists a on a.slug=x.s on conflict (artist_slug,tag) do nothing returning 1) select count(*) from ins;"),
 'aliases': ("with ins as (insert into public.artist_aliases (artist_slug,alias,kind,source_url) select x.s,x.a,x.k,x.u from json_to_recordset({J}) as x(s text,a text,k text,u text) "
          "join public.artists a on a.slug=x.s on conflict (artist_slug,alias) do nothing returning 1) select count(*) from ins;"),
 'press': ("with ins as (insert into public.artist_press (artist_id,artist_slug,title,publication,url,date_published,type) select a.id,x.s,x.t,x.p,x.u,x.d::date,'feature' from json_to_recordset({J}) as x(s text,t text,p text,u text,d text) "
          "join public.artists a on a.slug=x.s on conflict (artist_slug,url) do nothing returning 1) select count(*) from ins;"),
 'mixes': ("with ins as (insert into public.artist_tracklists (artist_slug,mix_title,url,tracks) select x.s,x.t,x.u,'[]'::jsonb from json_to_recordset({J}) as x(s text,t text,u text) "
          "join public.artists a on a.slug=x.s on conflict (artist_slug,url) do nothing returning 1), "
          "fill as (update public.artists a set mix_url=f.u from (select distinct on (x.s) x.s,x.u from json_to_recordset({J}) as x(s text,t text,u text) order by x.s) f where a.slug=f.s and a.mix_url is null returning 1) "
          "select (select count(*) from ins) ins, (select count(*) from fill) filled;"),
 'spotify': ("with up as (update public.artists a set spotify=x.u from json_to_recordset({J}) as x(s text,u text) where a.slug=x.s and (a.spotify is null or a.spotify='') returning 1) select count(*) from up;"),
 'bio': ("with up as (update public.artists a set bio=x.b from json_to_recordset({J}) as x(s text,b text) where a.slug=x.s and (a.bio is null or length(trim(a.bio))<20) returning 1) select count(*) from up;"),
 'releases': ("with ins as (insert into public.artist_discography (artist_slug,artist_id,title,release_type,release_date,year,label,source_url) "
          "select x.s,a.id,x.ti,x.ty,x.d::date,x.y,x.l,x.u from json_to_recordset({J}) as x(s text,ti text,ty text,y int,d text,l text,u text) join public.artists a on a.slug=x.s "
          "where not exists (select 1 from public.artist_discography d where d.artist_slug=x.s and lower(d.title)=lower(x.ti)) on conflict do nothing returning 1) select count(*) from ins;"),
 'ids': ("with ins as (insert into public.artist_external_ids (artist_slug,scheme,value,url,confidence,evidence) select x.s,x.k,x.v,x.u,'medium','sourced research 2026-11-03' "
          "from json_to_recordset({J}) as x(s text,k text,v text,u text) join public.artists a on a.slug=x.s on conflict (artist_slug,scheme) do nothing returning 1) select count(*) from ins;"),
}
n = 0
for k, sql in T.items():
    r = rows[k]
    if k == 'bio': r = [{'s': x['s'], 'b': x['b']} for x in r]
    for i in range(0, len(r), 70):
        chunk = r[i:i + 70]
        open(f'{D}/sql/{k}_{i // 70}.sql', 'w').write(sql.replace('{J}', lit(chunk)))
        n += 1
print(n, 'files'); os.system(f'ls -S {D}/sql | head -40; wc -c {D}/sql/* | tail -1')
