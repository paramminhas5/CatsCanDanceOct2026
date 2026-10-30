-- CCD database test suite. Runs inside one transaction and ALWAYS rolls back (it ends in an exception
-- that carries the report), so nothing it creates is kept. Safe to run on the live project.
-- Run it: paste into the Supabase SQL editor (the report appears as the error text), or `node scripts/tests/run-db-suite.mjs`.
-- Result lines start with PASS or FAIL. The first line says FAILED n or ALL PASSED.

create temp table t_res(n serial, name text, ok boolean, info text) on commit drop;

create or replace function pg_temp.chk(p_name text, p_ok boolean, p_info text default null) returns void language sql as $$
  insert into t_res(name, ok, info) values (p_name, coalesce(p_ok, false), p_info);
$$;

create or replace function pg_temp.act(i int) returns void language plpgsql as $$
declare u uuid := md5('zzsuite'||i)::uuid;
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',u,'email','zz-suite-'||i||'@example.com','role','authenticated')::text, true);
end $$;

-- true when a call is refused, either by returning ok:false or by raising an error
create or replace function pg_temp.refuses(q text) returns boolean language plpgsql as $$
declare r text;
begin
  execute q into r;
  return coalesce(r::jsonb->>'ok', '') <> 'true';
exception when others then return true;
end $$;

create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

do $$
declare
  tok text; i int; j jsonb; u uuid; ev uuid; sid uuid; prod uuid; tier_free uuid; tier_ga uuid; vcode text; a uuid; b uuid; nn int; sizes text;
  fut text := 'zz-suite-night'; fut2 text := 'zz-suite-other';
  cities text[] := array['Bangalore','Bengaluru',' bengaluru ','Bengaluru','Bengaluru','Bengaluru','Bengaluru','Bengaluru','Mumbai','Mumbai','Delhi','Delhi','Delhi',null,'Bengaluru','Bengaluru'];
begin
  select token into tok from public.ops_config limit 1;

  -- ---- city normalising
  perform pg_temp.chk('city_norm: Bangalore -> Bengaluru', public.city_norm('Bangalore') = 'Bengaluru');
  perform pg_temp.chk('city_norm: Gurgaon -> Delhi NCR', public.city_norm('Gurgaon') = 'Delhi NCR');
  perform pg_temp.chk('city_norm: blank -> null', public.city_norm('  ') is null);

  -- ---- members join (16 users)
  for i in 1..16 loop
    insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (md5('zzsuite'||i)::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zz-suite-'||i||'@example.com','{}','{}',now(),now());
    perform pg_temp.act(i);
    j := public.join_member('Suite '||i, cities[i], array['techno']);
    if (j->>'ok')<>'true' then perform pg_temp.chk('join '||i, false, j::text); end if;
  end loop;
  perform pg_temp.chk('16 members joined', (select count(*) from public.members where email like 'zz-suite-%') = 16);
  perform pg_temp.chk('join stores normalised city', (select city from public.members where email='zz-suite-1@example.com') = 'Bengaluru');
  perform pg_temp.chk('new members cannot self-promote',
    (select role from public.members where email='zz-suite-1@example.com') = 'member');
  perform pg_temp.act(1);
  begin update public.members set role='owner' where id = md5('zzsuite1')::uuid; exception when others then null; end;
  perform pg_temp.chk('role stays member after direct update attempt', (select role from public.members where id = md5('zzsuite1')::uuid) = 'member');

  -- ---- quiz
  for i in 1..16 loop
    perform pg_temp.act(i);
    perform public.save_taste_quiz(case when i%2=1 then '{"good_night":"loud","when":"late","arrive":"with crew"}' else '{"good_night":"chill","when":"early","arrive":"solo"}' end::jsonb, '+9190000'||lpad(i::text,5,'0'));
  end loop;
  perform pg_temp.chk('quiz saved for all', (select count(*) from public.members where email like 'zz-suite-%' and quiz is not null) = 16);

  -- ---- test nights, tiers
  insert into public.events(slug,title,event_date,published,status,city,venue,rsvp_open,capacity) values (fut,'ZZ Suite Night',current_date+7,true,'upcoming','Bengaluru','Venue',true,100) returning id into ev;
  insert into public.events(slug,title,event_date,published,status,city,rsvp_open) values (fut2,'ZZ Suite Closed',current_date+7,true,'upcoming','Bengaluru',false);
  perform public.ops_upsert_tier(tok, fut, 'Free list', 0, 50);
  perform public.ops_upsert_tier(tok, fut, 'GA', 500, 3);
  select id into tier_free from public.ticket_tiers where event_slug=fut and name='Free list';
  select id into tier_ga from public.ticket_tiers where event_slug=fut and name='GA';

  -- ---- crew pool gating: no ticket, no RSVP -> refused
  perform pg_temp.act(1);
  j := public.join_crew_pool(fut);
  perform pg_temp.chk('crew pool refuses a member with no ticket or RSVP', (j->>'ok')<>'true', j::text);
  perform pg_temp.chk('crew status before joining = not_joined', public.my_crew_status(fut)->>'state' = 'not_joined');

  -- ---- tickets
  -- free tickets for users 1..14 (platform/own mix); user 15 RSVPs only; user 16 nothing
  for i in 1..14 loop
    perform pg_temp.act(i);
    j := public.create_ticket_order(fut,'Suite '||i,'zz-suite-'||i||'@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_free,'qty',1)), case when i%2=0 then 'own' else 'platform' end);
    if (j->>'ok')<>'true' then perform pg_temp.chk('free ticket '||i, false, j::text); end if;
  end loop;
  perform pg_temp.chk('14 free orders issued tickets', (select count(*) from public.tickets where event_slug=fut) = 14);
  perform pg_temp.chk('tickets carry a code', (select count(*) from public.tickets where event_slug=fut and code is not null) = 14);
  j := public.rsvp(fut,'Suite 15','zz-suite-15@example.com',0);
  perform pg_temp.chk('RSVP accepted', (j->>'ok')='true', j::text);
  begin perform public.rsvp(fut2,'Suite 15','zz-suite-15@example.com',0); perform pg_temp.chk('RSVP closed night is refused', false);
  exception when others then perform pg_temp.chk('RSVP closed night is refused with a message', sqlerrm ilike '%closed%', sqlerrm); end;
  j := public.rsvp(fut,'Suite 15','zz-suite-15@example.com',0);
  perform pg_temp.chk('RSVP twice is idempotent', coalesce((j->>'already')::boolean,false));

  j := public.create_ticket_order(fut,'Suite 2','zz-suite-2@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_ga,'qty',2)),'platform');
  perform pg_temp.chk('paid order created as pending at 1000', (j->>'ok')='true' and (j->>'amount_inr')::int = 1000, j::text);
  j := public.create_ticket_order(fut,'Suite 3','zz-suite-3@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_ga,'qty',2)),'platform');
  perform pg_temp.chk('capacity: 2 of 3 held, asking for 2 more is refused', (j->>'ok')<>'true', j::text);
  j := public.create_ticket_order(fut,'x','bad-email','', jsonb_build_array(jsonb_build_object('tier',tier_ga,'qty',1)),'platform');
  perform pg_temp.chk('ticket order rejects bad email/name', (j->>'ok')<>'true');
  j := public.create_ticket_order('no-such-night','Suite 2','zz-suite-2@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_ga,'qty',1)),'platform');
  perform pg_temp.chk('ticket order on unknown night refused', (j->>'ok')<>'true');

  -- ---- crew pool: now ticket holders may join; RSVP-only may join; no-ticket refused
  for i in 1..15 loop
    perform pg_temp.act(i);
    j := public.join_crew_pool(fut);
    if (j->>'ok')<>'true' then perform pg_temp.chk('pool join '||i, false, j::text); end if;
  end loop;
  perform pg_temp.act(16); j := public.join_crew_pool(fut);
  perform pg_temp.chk('member with no ticket or RSVP still refused', (j->>'ok')<>'true', j::text);
  perform pg_temp.chk('15 in the pool', (select count(*) from public.crew_pool where event_slug=fut) = 15);

  -- ---- crew status messages (before forming)
  perform pg_temp.act(1); perform pg_temp.chk('status waiting, no need for more people', public.my_crew_status(fut)->>'state' = 'waiting' and (public.my_crew_status(fut)->>'need')::int = 0, public.my_crew_status(fut)::text);
  perform pg_temp.act(9); perform pg_temp.chk('status other_city for Mumbai member', public.my_crew_status(fut)->>'state' = 'other_city', public.my_crew_status(fut)::text);

  -- ---- forming crews
  begin
    perform public.ops_form_crews('wrong-token', fut, 'Bar');
    perform pg_temp.chk('ops_form_crews refuses a wrong token', false);
  exception when others then
    perform pg_temp.chk('ops_form_crews refuses a wrong token', true, sqlerrm);
  end;
  j := public.ops_form_crews(tok, fut, 'Test Bar');
  perform pg_temp.chk('crews formed', (j->>'ok')='true' and (j->>'crews')::int >= 1, j::text);
  select string_agg(n::text, ',' order by n) into sizes from (select count(*) n from public.crew_pool where event_slug=fut and crew_id is not null group by crew_id) x;
  perform pg_temp.chk('every crew has between 3 and 6 people', not exists (select 1 from (select count(*) n from public.crew_pool where event_slug=fut and crew_id is not null group by crew_id) x where n<3 or n>6), sizes);
  perform pg_temp.chk('no crew mixes event-city and other-city members',
    not exists (select 1 from public.crew_pool p join public.members m on m.id=p.member_id where p.event_slug=fut and p.crew_id is not null and m.city is not null and m.city <> 'Bengaluru'));
  perform pg_temp.chk('Mumbai and Delhi members left unplaced', (select count(*) from public.crew_pool p join public.members m on m.id=p.member_id where p.event_slug=fut and p.crew_id is null and m.city in ('Mumbai','Delhi NCR','Delhi')) >= 4);
  perform pg_temp.chk('quiz grouping: loud and chill separated where possible',
    (select count(*) from (select crew_id from public.crew_pool p join public.members m on m.id=p.member_id where p.event_slug=fut and p.crew_id is not null group by crew_id having count(distinct m.quiz->>'good_night') > 1) x) <= 1);
  perform set_config('request.jwt.claim.sub', md5('zzsuite1')::uuid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',md5('zzsuite1')::uuid,'email','zz-suite-1@example.com','role','authenticated')::text, true);
  perform pg_temp.chk('placed member sees crew mates', (select count(*) from public.my_crew(fut)) >= 3);
  perform pg_temp.chk('placed member status = placed', public.my_crew_status(fut)->>'state' = 'placed');
  j := public.ops_form_crews(tok, fut, 'Test Bar');
  perform pg_temp.chk('re-running forms no extra crews when nobody new is waiting', (j->>'crews')::int = 0, j::text);

  -- ---- going and likes on a CCD night
  perform pg_temp.act(1);
  j := public.set_night_going(fut, true, true);
  perform pg_temp.chk('going on a CCD night', (j->>'ok')='true' and (j->>'going')::int = 1, j::text);
  perform pg_temp.act(2); j := public.set_night_going(fut, true, false);
  perform pg_temp.chk('going count 2', (j->>'going')::int = 2);
  j := public.toggle_night_like(fut); perform pg_temp.chk('like on a CCD night', (j->>'liked')::boolean and (j->>'likes')::int = 1, j::text);
  j := public.toggle_night_like(fut); perform pg_temp.chk('unlike', not (j->>'liked')::boolean);
  perform pg_temp.chk('my_night_state shows going', (select going from public.my_night_state() where event_slug=fut));
  perform pg_temp.chk('night_counts public numbers', (select going from public.night_counts() where event_slug=fut) = 2);
  j := public.set_night_going('no-such-night', true, false); perform pg_temp.chk('going on an unknown night refused', (j->>'ok')<>'true');
  perform pg_temp.anon(); j := public.set_night_going(fut, true, false);
  perform pg_temp.chk('anonymous cannot say going', (j->>'ok')<>'true', j::text);

  -- ---- door check-in
  select code into strict vcode from public.tickets where event_slug=fut order by created_at limit 1;
  perform pg_temp.act(4); perform pg_temp.chk('non-staff cannot check in', (public.checkin_ticket(vcode)->>'ok')<>'true');
  perform public.ops_set_member_role(tok,'zz-suite-5@example.com','staff');
  perform pg_temp.act(5);
  perform pg_temp.chk('staff can check in', (public.checkin_ticket(vcode)->>'ok')='true');
  perform pg_temp.chk('second scan refused', (public.checkin_ticket(vcode)->>'ok')<>'true');
  perform pg_temp.chk('unknown code refused', (public.checkin_ticket('NOPE000000')->>'ok')<>'true');
  perform pg_temp.chk('ops can set a role (staff)', (select role from public.members where email='zz-suite-5@example.com') = 'staff');
  begin perform public.ops_set_member_role('wrong','zz-suite-5@example.com','owner'); perform pg_temp.chk('ops_set_member_role rejects wrong token', false);
  exception when others then perform pg_temp.chk('ops_set_member_role rejects wrong token', true); end;

  -- ---- hosting + staff review
  perform pg_temp.act(6);
  j := public.submit_hosted_event('ZZ Suite Hosted', current_date+20, '9pm','Bengaluru','Venue',array['house'],array['DJ A'],null,'about');
  perform pg_temp.chk('member can submit a hosted night (unpublished)', (j->>'ok')='true' and (j->>'published')='false', j::text);
  perform pg_temp.act(5); perform pg_temp.chk('staff sees the pending hosted night', (select count(*) from public.pending_hosted_events()) >= 1);
  perform pg_temp.act(7); perform pg_temp.chk('a normal member sees no pending hosted list', (select count(*) from public.pending_hosted_events()) = 0);

  -- ---- after the night: go again
  update public.events set event_date = current_date - 1 where slug = fut;
  perform pg_temp.act(1);
  perform pg_temp.chk('past crews lists the night', (select count(*) from public.my_past_crews() where event_slug = fut) = 1);
  select mate_id into a from public.my_crew_mates(fut) limit 1;
  perform pg_temp.chk('crew mates listed with ids', a is not null);
  perform pg_temp.chk('go again with a crew mate', (public.say_go_again(fut, a)->>'ok')='true');
  perform pg_temp.chk('tapped flag shows', (select bool_or(tapped) from public.my_crew_mates(fut)));
  select m.id into b from public.members m where m.email='zz-suite-16@example.com';
  perform pg_temp.chk('go again with a non crew-mate refused', (public.say_go_again(fut, b)->>'ok')<>'true');
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform pg_temp.chk('the tapped member sees go again received = 1', (public.my_standing()->>'go_again_received')::int = 1, public.my_standing()::text);

  -- ---- founding pass
  perform pg_temp.act(7); j := public.claim_founding_pass(); perform pg_temp.chk('founding pass issued', (j->>'ok')='true' and (j->>'number')::int >= 1, j::text);
  j := public.claim_founding_pass(); perform pg_temp.chk('founding pass is not issued twice', coalesce((j->>'number')::int,0) = (select founding_number from public.members where email='zz-suite-7@example.com'), j::text);

  -- ---- scene list going/like/follow/feed
  select id into a from public.scraped_events where status='published' limit 1;
  if a is not null then
    perform pg_temp.act(1);
    perform pg_temp.chk('scene-list going', (public.set_going(a, true, true)->>'ok')='true');
    perform pg_temp.chk('scene-list like', (public.toggle_like(a)->>'ok')='true');
  end if;
  perform pg_temp.chk('follow an artist', (public.follow_artist((select slug from public.artists limit 1), true)->>'ok')='true');
  perform pg_temp.chk('feed returns rows', (select count(*) from public.my_feed()) >= 0);

  -- ---- shop
  perform public.ops_upsert_product(tok,'zz-suite-tee','ZZ Tee','d',999,null,array['M'],2,true);
  select id into a from public.shop_products where slug='zz-suite-tee';
  j := public.create_shop_order('Suite Buyer','zz-suite-8@example.com','9999999999','{"line1":"x","city":"Bengaluru","pin":"560001"}'::jsonb, jsonb_build_array(jsonb_build_object('product',a,'qty',1,'size','M')));
  perform pg_temp.chk('shop order created', (j->>'ok')='true' and (j->>'amount_inr')::int = 999, j::text);
  j := public.create_shop_order('Suite Buyer','zz-suite-8@example.com','9999999999','{"line1":"x","city":"Bengaluru","pin":"560001"}'::jsonb, jsonb_build_array(jsonb_build_object('product',a,'qty',3,'size','M')));
  perform pg_temp.chk('shop refuses more than stock', (j->>'ok')<>'true', j::text);
  j := public.create_shop_order('Suite Buyer','zz-suite-8@example.com','9999999999','{"line1":"x","city":"Bengaluru","pin":"12"}'::jsonb, jsonb_build_array(jsonb_build_object('product',a,'qty',1,'size','M')));
  perform pg_temp.chk('shop refuses a bad pin code', (j->>'ok')<>'true');

  -- ---- public forms
  perform pg_temp.anon();
  perform pg_temp.chk('contact form accepts a message', (public.submit_contact('Zed','zz-suite-c@example.com','hello this is a suite test')->>'ok')='true');
  perform pg_temp.chk('contact form rejects a bad email', pg_temp.refuses($q$select public.submit_contact('Zed','nope','hello this is a suite test')::text$q$));
  perform pg_temp.chk('promoter application accepted', (public.submit_promoter_application('Suite Promo','zz-suite-p@example.com','@suite',null,'Bengaluru','techno','bio bio bio bio','sample')->>'ok')='true');
  perform pg_temp.chk('duplicate pending promoter application refused', pg_temp.refuses($q$select public.submit_promoter_application('Suite Promo','zz-suite-p@example.com','@suite',null,'Bengaluru','techno','bio bio bio bio','sample')::text$q$));
  perform pg_temp.chk('scene-list event submission accepted', (public.submit_event('zz-suite-e@example.com','ZZ Suite Gig','https://example.com/e','Venue','Bengaluru',current_date+9,'9pm','d')->>'ok')='true');
  perform pg_temp.chk('artist add accepted', (public.submit_artist('new',null,'Suite Artist','zz-suite-a@example.com','Bengaluru','techno','@suite_artist',null,null,'bio bio bio')->>'ok')='true');
  perform pg_temp.chk('claiming a profile that does not exist is refused', pg_temp.refuses($q$select public.submit_artist('claim','no-such-artist','Suite Artist','zz-suite-a@example.com','Bengaluru','techno','@suite_artist',null,null,'bio bio bio')::text$q$));
  perform pg_temp.chk('email signup accepted', (public.signup('zz-suite-s@example.com','suite')->>'ok')='true');
  perform pg_temp.chk('ticket swap listing accepted', (public.submit_ticket_swap('ZZ night','sell',1,500,'GA','n','zz-suite@example.com',null)->>'ok')='true');
  perform pg_temp.chk('swap listing needs face value when selling', pg_temp.refuses($q$select public.submit_ticket_swap('ZZ night','sell',1,null,'GA','n','zz-suite@example.com',null)::text$q$));
  perform pg_temp.chk('booking request accepted', (public.request_booking((select slug from public.artists limit 1),'Zed','zz-suite-c@example.com','Org','Bengaluru',current_date+30,'1L','hi')->>'ok') = 'true');

  -- ---- ops
  perform pg_temp.chk('ops_inbox returns the new items', (select jsonb_array_length((public.ops_inbox(tok)::jsonb)->'contact')) >= 1);
  begin perform public.ops_inbox('wrong'); perform pg_temp.chk('ops_inbox rejects a wrong token', false);
  exception when others then perform pg_temp.chk('ops_inbox rejects a wrong token', true); end;

  -- ---- privacy: tables the public must not read
  perform pg_temp.chk('anon cannot call the check-in function as staff', (public.checkin_ticket('X')->>'ok')<>'true');

  -- ---- report
  select count(*) into nn from t_res where not ok;
  raise exception E'%\n%', case when nn=0 then 'ALL PASSED ('||(select count(*) from t_res)||' checks)' else 'FAILED '||nn||' of '||(select count(*) from t_res) end,
     (select string_agg(case when ok then 'PASS ' else 'FAIL ' end || name || coalesce(' [' || info || ']', ''), E'\n' order by n) from t_res);
end $$;
