-- CCD database test suite, part 4 (migration 023): pre-filled artist facts and approval. One transaction, ALWAYS rolls back.
do $$
declare tok text; v text; a uuid := md5('zz23-artist')::uuid; o uuid := md5('zz23-other')::uuid; fid uuid; fid2 uuid; j jsonb; r json; fails int; pass int; res text;
begin
  select token into tok from public.ops_config limit 1;
  select slug into v from public.artists where status='approved' and owner_member is null order by name desc limit 1;
  insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',e,'{}','{}',now(),now() from (values (a,'zz23-artist@example.com'),(o,'zz23-other@example.com')) t(u,e);
  create temp table t23(name text, ok boolean, info text) on commit drop;
  delete from public.artist_facts where artist_slug = v;

  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{"role":"anon"}',true);
  r := public.ops_propose_facts(tok, jsonb_build_array(
    jsonb_build_object('artist_slug',v,'section','plays','label','Track: Test One','source','Deezer','confidence','medium','dedupe','t1'),
    jsonb_build_object('artist_slug',v,'section','listens','label','Some Artist','source','Deezer','confidence','low','dedupe','l1'),
    jsonb_build_object('artist_slug',v,'section','upcoming','label','Future Night','detail','Venue, City','event_date',(current_date+10)::text,'source','Scene list','confidence','high','dedupe','u1'),
    jsonb_build_object('artist_slug',v,'section','upcoming','label','Past Night','event_date',(current_date-10)::text,'source','Scene list','confidence','high','dedupe','u2'),
    jsonb_build_object('artist_slug','no-such-artist','section','plays','label','X','source','x','dedupe','x')));
  insert into t23 values ('ops propose adds 4, skips unknown artist', (r->>'added')::int = 4, r::text);
  r := public.ops_propose_facts(tok, jsonb_build_array(jsonb_build_object('artist_slug',v,'section','plays','label','Track: Test One','source','Deezer','dedupe','t1')));
  insert into t23 values ('duplicate proposal adds nothing', (r->>'added')::int = 0, null);
  begin perform public.ops_propose_facts('wrong', '[]'::jsonb); insert into t23 values ('propose refuses wrong token', false, null); exception when others then insert into t23 values ('propose refuses wrong token', true, null); end;
  begin insert into artist_facts(artist_slug,section,label,source,dedupe) values (v,'nonsense','x','x','x'); insert into t23 values ('bad section refused', false, null); exception when check_violation then insert into t23 values ('bad section refused', true, null); end;

  insert into t23 values ('nothing public before approval', public.artist_profile_public(v) = '{}'::jsonb, public.artist_profile_public(v)::text);
  insert into t23 values ('summary needs token and counts proposed', (public.ops_artist_facts_summary(tok)->>'proposed')::int >= 4, null);

  select id into fid from artist_facts where artist_slug=v and dedupe='t1';
  perform public.ops_review_fact(tok, fid, 'approved');
  insert into t23 values ('owner approves a fact, it goes public', public.artist_profile_public(v) ? 'plays', public.artist_profile_public(v)::text);
  insert into t23 values ('owner approval recorded', (select reviewed_by from artist_facts where id=fid)='owner', null);
  perform public.ops_review_fact(tok, (select id from artist_facts where artist_slug=v and dedupe='u2'), 'approved');
  insert into t23 values ('past dates are hidden even if approved', not (public.artist_profile_public(v) ? 'upcoming'), public.artist_profile_public(v)::text);
  r := public.ops_approve_facts_bulk(tok, 'high', null);
  insert into t23 values ('bulk approve high confidence', (select status from artist_facts where artist_slug=v and dedupe='u1')='approved' and (select status from artist_facts where artist_slug=v and dedupe='l1')='proposed', null);
  insert into t23 values ('future date now public', (public.artist_profile_public(v)->'upcoming'->0->>'label')='Future Night', null);

  -- artist link
  perform public.submit_artist('claim', v, 'ZZ23','zz23-artist@example.com','Bengaluru','techno','@zz23','',null,'bio');
  perform public.ops_set_inbox_status(tok,'artist',(select id from artist_submissions where email='zz23-artist@example.com' order by created_at desc limit 1),'approved');
  perform set_config('request.jwt.claim.sub',a::text,true); perform set_config('request.jwt.claims',json_build_object('sub',a,'email','zz23-artist@example.com','role','authenticated')::text,true);
  perform public.join_member('ZZ23','Bengaluru',array['techno']);
  insert into t23 values ('artist sees own facts', jsonb_array_length(public.my_artist_facts()) = 4, null);
  select id into fid2 from artist_facts where artist_slug=v and dedupe='l1';
  j := public.review_my_fact(fid2, 'maybe');
  insert into t23 values ('bad review value refused', (j->>'ok')<>'true', null);
  j := public.review_my_fact(fid2, 'approved', 'Some Artist (edited)');
  insert into t23 values ('artist approves with an edit', (j->>'ok')='true' and (select label from artist_facts where id=fid2)='Some Artist (edited)' and (select edited from artist_facts where id=fid2) and (select reviewed_by from artist_facts where id=fid2)='artist', null);
  j := public.review_my_fact(fid, 'rejected');
  insert into t23 values ('artist rejects, it leaves the public page', not ((public.artist_profile_public(v)->'plays') is not null), public.artist_profile_public(v)::text);
  insert into artist_facts(artist_slug,section,label,source,confidence,dedupe) values (v,'expect','Test expect','x','medium','e1');
  j := public.approve_my_facts('medium');
  insert into t23 values ('artist approve-all covers medium, not low', (j->>'approved')::int = 1 and (select status from artist_facts where artist_slug=v and dedupe='e1')='approved', j::text);

  -- another member cannot touch
  perform set_config('request.jwt.claim.sub',o::text,true); perform set_config('request.jwt.claims',json_build_object('sub',o,'email','zz23-other@example.com','role','authenticated')::text,true);
  perform public.join_member('ZZ23 Other','Bengaluru',array['house']);
  insert into t23 values ('other member sees no facts', public.my_artist_facts() = '[]'::jsonb, null);
  j := public.review_my_fact(fid2, 'rejected');
  insert into t23 values ('other member cannot review', (j->>'ok')<>'true' and (select status from artist_facts where id=fid2)='approved', null);
  j := public.approve_my_facts('low');
  insert into t23 values ('other member approve-all changes nothing', (j->>'approved')::int = 0, null);

  -- anon
  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{"role":"anon"}',true);
  insert into t23 values ('anon reads public approved facts', public.artist_profile_public(v) ? 'expect', null);
  insert into t23 values ('internal builder runs (ops)', (public.ops_build_internal_facts(tok)->>'ok')='true', null);

  select count(*) filter (where not ok), count(*) filter (where ok) into fails, pass from t23;
  select string_agg(case when ok then 'PASS ' else 'FAIL ' end || name || coalesce(' -- '||info,''), E'\n' order by ok, name) into res from t23;
  raise exception E'%\n%', case when fails=0 then 'ALL PASSED ('||pass||')' else 'FAILED '||fails||' of '||(pass+fails) end, res;
end $$;
