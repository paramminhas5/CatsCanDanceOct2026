-- CCD database test suite, part 3 (migration 022): artist portfolio, media, booking inbox, answers, requester status.
-- Self-contained, one transaction, ALWAYS rolls back. The report is the error text; line 1 says ALL PASSED or FAILED n.
do $$
declare tok text; v text; a uuid := md5('zz22-artist')::uuid; o uuid := md5('zz22-other')::uuid; h uuid := md5('zz22-host')::uuid;
  j jsonb; r json; bid uuid; mid uuid; res text := ''; fails int := 0; pass int := 0;
begin
  select token into tok from public.ops_config limit 1;
  select slug into v from public.artists where status='approved' and owner_member is null order by name limit 1;
  insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',e,'{}','{}',now(),now()
  from (values (a,'zz22-artist@example.com'),(o,'zz22-other@example.com'),(h,'zz22-host@example.com')) t(u,e);
  create temp table if not exists t22(name text, ok boolean, info text) on commit drop;
  insert into events(slug,title,event_date,published,status,city,rsvp_open) values ('zz22-night','ZZ22 Night',current_date+20,true,'upcoming','Bengaluru',true);

  -- artist claims and joins
  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform public.submit_artist('claim', v, 'ZZ22 Artist','zz22-artist@example.com','Bengaluru','techno','@zz22','',null,'bio');
  perform public.ops_set_inbox_status(tok,'artist',(select id from artist_submissions where email='zz22-artist@example.com' order by created_at desc limit 1),'approved');
  perform set_config('request.jwt.claim.sub',a::text,true); perform set_config('request.jwt.claims',json_build_object('sub',a,'email','zz22-artist@example.com','role','authenticated')::text,true);
  perform public.join_member('ZZ22 Artist','Bengaluru',array['techno']);
  insert into t22 values ('artist linked', (public.my_artist()->>'slug')=v, null);

  -- profile: set, keep with null, clear with empty string
  j := public.update_my_artist('Bio one',null,null,'@ig1',null,null,null,null);
  insert into t22 values ('set bio and instagram', (j->>'ok')='true' and (select instagram from artists where slug=v)='@ig1', null);
  j := public.update_my_artist(null,null,null,null,null,null,null,null);
  insert into t22 values ('null keeps everything', (select instagram from artists where slug=v)='@ig1' and (select bio from artists where slug=v)='Bio one', null);
  j := public.update_my_artist('',null,null,'',null,null,null,null);
  insert into t22 values ('empty string clears a field', (select instagram from artists where slug=v) is null and (select bio from artists where slug=v) is null, null);
  j := public.update_my_artist(null,null,null,null,null,null,null,'http://insecure.example/p.jpg');
  insert into t22 values ('photo link must be https', (j->>'ok')<>'true', j::text);
  j := public.update_my_artist(null,null,null,null,null,null,null,'https://example.com/p.jpg');
  insert into t22 values ('https photo link saved', (j->>'ok')='true' and (select photo_url from artists where slug=v)='https://example.com/p.jpg', null);

  -- media
  j := public.add_my_media('photo','https://example.com/1.jpg','Live at ZZ');
  insert into t22 values ('add photo', (j->>'ok')='true', j::text);
  j := public.add_my_media('mix','https://soundcloud.com/zz/mix',null);
  insert into t22 values ('add mix', (j->>'ok')='true', null);
  insert into t22 values ('bad kind refused', ((public.add_my_media('gif','https://example.com/x',null))->>'ok')<>'true', null);
  insert into t22 values ('non-https refused', ((public.add_my_media('mix','javascript:alert(1)',null))->>'ok')<>'true', null);
  insert into t22 values ('my_media lists 2', jsonb_array_length(public.my_media())=2, public.my_media()::text);
  insert into t22 values ('public media shows on approved artist', (select jsonb_array_length(public.artist_media_public(v)))=2, null);
  for i in 1..30 loop perform public.add_my_media('press','https://example.com/p'||i,null); end loop;
  insert into t22 values ('30 item cap', (select count(*) from artist_media where artist_slug=v)=30, (select count(*)::text from artist_media where artist_slug=v));
  insert into t22 values ('over cap refused', ((public.add_my_media('press','https://example.com/over',null))->>'ok')<>'true', null);

  -- another member cannot touch this artist
  select id into mid from artist_media where artist_slug=v limit 1;
  perform set_config('request.jwt.claim.sub',o::text,true); perform set_config('request.jwt.claims',json_build_object('sub',o,'email','zz22-other@example.com','role','authenticated')::text,true);
  perform public.join_member('ZZ22 Other','Bengaluru',array['house']);
  insert into t22 values ('other member cannot add media', ((public.add_my_media('mix','https://example.com/z',null))->>'ok')<>'true', null);
  insert into t22 values ('other member cannot remove media', ((public.remove_my_media(mid))->>'ok')<>'true' and exists(select 1 from artist_media where id=mid), null);
  insert into t22 values ('other member sees no artist inbox', public.my_booking_requests()='[]'::jsonb, null);

  -- host books for their hosted night
  perform set_config('request.jwt.claim.sub',h::text,true); perform set_config('request.jwt.claims',json_build_object('sub',h,'email','zz22-host@example.com','role','authenticated')::text,true);
  perform public.join_member('ZZ22 Host','Bengaluru',array['techno']);
  r := public.request_booking(v,'ZZ22 Host','zz22-host@example.com','ZZ Bar','Bengaluru',current_date+20,'40000','Two hour set please','zz22-night');
  insert into t22 values ('host booking saved with night and member', (r->>'ok')='true' and exists(select 1 from booking_requests where email='zz22-host@example.com' and event_slug='zz22-night' and member_id=h), null);
  r := public.request_booking(v,'ZZ22 Host','zz22-host@example.com',null,null,null,null,null,'no-such-night');
  insert into t22 values ('unknown night slug ignored not fatal', exists(select 1 from booking_requests where email='zz22-host@example.com' and event_slug is null), null);
  insert into t22 values ('host sees own request, waiting', (select count(*) from jsonb_array_elements(public.my_bookings()) e where e->>'response' is null)=2, public.my_bookings()::text);

  -- visitor books (anon), later artist answers
  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{"role":"anon"}',true);
  r := public.request_booking(v,'ZZ Venue','zz22-venue@example.com','Venue','Mumbai',current_date+40,'90000','Club night',null);
  insert into t22 values ('visitor booking saved', (r->>'ok')='true', null);
  insert into t22 values ('anon cannot read artist inbox', public.my_booking_requests()='[]'::jsonb, null);
  insert into t22 values ('anon cannot respond', ((public.respond_booking((select id from booking_requests where email='zz22-venue@example.com' limit 1),'interested',null))->>'ok')<>'true', null);

  perform set_config('request.jwt.claim.sub',a::text,true); perform set_config('request.jwt.claims',json_build_object('sub',a,'email','zz22-artist@example.com','role','authenticated')::text,true);
  insert into t22 values ('artist sees 3 requests', jsonb_array_length(public.my_booking_requests())=3, null);
  select id into bid from booking_requests where email='zz22-venue@example.com' limit 1;
  insert into t22 values ('artist bad response refused', ((public.respond_booking(bid,'maybe',null))->>'ok')<>'true', null);
  j := public.respond_booking(bid,'interested','My fee is 80k plus travel');
  insert into t22 values ('artist answers interested', (j->>'ok')='true' and (select artist_response from booking_requests where id=bid)='interested', null);
  j := public.respond_booking((select id from booking_requests where email='zz22-host@example.com' and event_slug='zz22-night'),'declined','Away that week');
  insert into t22 values ('artist declines, request closed', (select status from booking_requests where email='zz22-host@example.com' and event_slug='zz22-night')='closed', null);

  -- other artist (member o) cannot answer
  perform set_config('request.jwt.claim.sub',o::text,true); perform set_config('request.jwt.claims',json_build_object('sub',o,'email','zz22-other@example.com','role','authenticated')::text,true);
  insert into t22 values ('other member cannot answer a request', ((public.respond_booking(bid,'declined',null))->>'ok')<>'true' and (select artist_response from booking_requests where id=bid)='interested', null);

  -- requester sees the answer; email queue works once
  perform set_config('request.jwt.claim.sub',h::text,true); perform set_config('request.jwt.claims',json_build_object('sub',h,'email','zz22-host@example.com','role','authenticated')::text,true);
  insert into t22 values ('host sees decline with note', exists(select 1 from jsonb_array_elements(public.my_bookings()) e where e->>'response'='declined' and e->>'note'='Away that week'), null);
  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{"role":"anon"}',true);
  begin perform public.ops_booking_answers('wrong'); insert into t22 values ('answers queue refuses wrong token', false, null); exception when others then insert into t22 values ('answers queue refuses wrong token', true, null); end;
  insert into t22 values ('answers queue lists 2 unsent', jsonb_array_length(public.ops_booking_answers(tok))>=2, null);
  perform public.ops_mark_booking_answer_emailed(tok, bid);
  insert into t22 values ('marked answer leaves the queue', not exists(select 1 from jsonb_array_elements(public.ops_booking_answers(tok)) e where (e->>'id')::uuid=bid), null);

  -- storage
  insert into t22 values ('artist-media bucket exists and is public', exists(select 1 from storage.buckets where id='artist-media' and public), null);
  insert into t22 values ('storage policy limits writes to own folder', exists(select 1 from pg_policies where schemaname='storage' and policyname='artist media upload own folder'), null);

  select count(*) filter (where not ok), count(*) filter (where ok) into fails, pass from t22;
  select string_agg(case when ok then 'PASS ' else 'FAIL ' end || name || coalesce(' -- '||info,''), E'\n' order by ok, name) into res from t22;
  raise exception E'%\n%', case when fails=0 then 'ALL PASSED ('||pass||')' else 'FAILED '||fails||' of '||(pass+fails) end, res;
end $$;
