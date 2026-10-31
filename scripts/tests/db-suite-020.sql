-- CCD database test suite, part 2 (migrations 020 and 021): crew safety, phone check, go-again crews, promo codes,
-- refunds, email bookkeeping, guest list, city waitlist, artist claim linking. Self-contained: makes its own users,
-- runs in one transaction and ALWAYS rolls back, so nothing is kept. Safe on the live project.
-- Run it the same way as db-suite.sql. The first line of the report says ALL PASSED or FAILED n.

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
create or replace function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

do $$
declare tok text; i int; j jsonb; a uuid; b uuid; sid uuid; tier_free uuid; tier_ga uuid; vcode text; nn int;
begin
  select token into tok from public.ops_config limit 1;
  for i in 1..16 loop
    insert into auth.users(id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (md5('zzsuite'||i)::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zz-suite-'||i||'@example.com','{}','{}',now(),now());
    perform pg_temp.act(i);
    perform public.join_member('Suite '||i, 'Bengaluru', array['techno']);
    perform public.save_taste_quiz('{"good_night":"loud","when":"late","arrive":"solo"}'::jsonb, '+9190000'||lpad(i::text,5,'0'));
  end loop;
  perform pg_temp.chk('16 members ready', (select count(*) from public.members where email like 'zz-suite-%') = 16);

  -- ---- 020 setup: a go-again night (8 members, identical quiz, 4 mutual pairs) and a promo night
  insert into public.events(slug,title,event_date,published,status,city,rsvp_open) values ('zz-suite-ga','ZZ GA Night',current_date+8,true,'upcoming','Bengaluru',true);
  insert into public.events(slug,title,event_date,published,status,city,venue,rsvp_open) values ('zz-suite-promo','ZZ Promo Night',current_date+9,true,'upcoming','Bengaluru','Venue',true);
  update public.members set quiz = '{"good_night":"loud","when":"late","arrive":"solo"}'::jsonb, city = 'Bengaluru' where email in (select 'zz-suite-'||g||'@example.com' from generate_series(1,8) g);
  for i in 1..8 loop
    perform pg_temp.act(i);
    perform public.rsvp('zz-suite-ga','Suite '||i,'zz-suite-'||i||'@example.com',0);
    j := public.join_crew_pool('zz-suite-ga');
    if (j->>'ok')<>'true' then perform pg_temp.chk('ga pool join '||i, false, j::text); end if;
  end loop;
  for i in 1..4 loop
    insert into public.go_again(event_slug, from_member, to_member) values ('zz-suite-ga', md5('zzsuite'||(2*i-1))::uuid, md5('zzsuite'||(2*i))::uuid), ('zz-suite-ga', md5('zzsuite'||(2*i))::uuid, md5('zzsuite'||(2*i-1))::uuid) on conflict do nothing;
  end loop;
  j := public.ops_form_crews(tok, 'zz-suite-ga', 'Bar');
  perform pg_temp.chk('go-again night formed 2 crews of 4', (j->>'ok')='true' and (j->>'crews')::int = 2, j::text);
  perform pg_temp.chk('mutual go-again pairs share a crew',
    (select count(*) from generate_series(1,4) gs(k) where (select crew_id from public.crew_pool where event_slug='zz-suite-ga' and member_id = md5('zzsuite'||(2*k-1))::uuid)
        = (select crew_id from public.crew_pool where event_slug='zz-suite-ga' and member_id = md5('zzsuite'||(2*k))::uuid)) = 4);

  -- ---- reports and bans
  select p1.member_id, p2.member_id into a, b from public.crew_pool p1 join public.crew_pool p2 on p2.crew_id = p1.crew_id and p2.member_id <> p1.member_id
     where p1.event_slug = 'zz-suite-ga' limit 1;
  perform set_config('request.jwt.claim.sub', a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',a,'email','x@example.com','role','authenticated')::text, true);
  perform pg_temp.chk('report a crew mate', (public.report_crew_mate('zz-suite-ga', b, 'was rude')->>'ok')='true');
  perform pg_temp.act(16);
  perform pg_temp.chk('cannot report someone outside your crew', (public.report_crew_mate('zz-suite-ga', b, 'x')->>'ok')<>'true');
  perform pg_temp.chk('ops sees the open report', jsonb_array_length(public.ops_crew_reports(tok)) >= 1);
  perform public.ops_resolve_report(tok, (select id from public.crew_reports where reported = b limit 1), 'ban');
  perform pg_temp.chk('ban sets banned_at', (select banned_at from public.members where id = b) is not null);
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub',b,'email','x@example.com','role','authenticated')::text, true);
  perform pg_temp.chk('banned member cannot join a crew', (public.join_crew_pool('zz-suite-ga')->>'ok')<>'true');
  begin perform public.ops_resolve_report('wrong', gen_random_uuid(), 'ban'); perform pg_temp.chk('resolve report refuses a wrong token', false);
  exception when others then perform pg_temp.chk('resolve report refuses a wrong token', true); end;

  -- ---- phone requirement (user 16 has a ticket-less account; use RSVP for the promo night)
  update public.members set phone = null where id = md5('zzsuite16')::uuid;
  perform pg_temp.act(16);
  perform public.rsvp('zz-suite-promo','Suite 16','zz-suite-16@example.com',0);
  j := public.join_crew_pool('zz-suite-promo');
  perform pg_temp.chk('crew pool asks for a phone number first', (j->>'ok')<>'true' and j->>'need' = 'phone', j::text);
  perform pg_temp.chk('short phone number refused', (public.set_my_phone('123')->>'ok')<>'true');
  perform pg_temp.chk('phone saved', (public.set_my_phone('+91 98765 43210')->>'ok')='true');
  j := public.join_crew_pool('zz-suite-promo');
  perform pg_temp.chk('joins the pool once a phone is saved', (j->>'ok')='true', j::text);

  -- ---- promo codes
  perform public.ops_upsert_tier(tok, 'zz-suite-promo', 'Free', 0, 20);
  perform public.ops_upsert_tier(tok, 'zz-suite-promo', 'GA', 500, 5);
  select id into tier_free from public.ticket_tiers where event_slug='zz-suite-promo' and name='Free';
  select id into tier_ga from public.ticket_tiers where event_slug='zz-suite-promo' and name='GA';
  perform public.ops_upsert_promo(tok, 'zz10', 'zz-suite-promo', 50, null, 1, null, true);
  perform pg_temp.act(4);
  j := public.create_ticket_order('zz-suite-promo','Suite 4','zz-suite-4@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_ga,'qty',1)),'platform','zz10');
  perform pg_temp.chk('promo takes 50% off 500', (j->>'ok')='true' and (j->>'amount_inr')::int = 250 and (j->>'discount_inr')::int = 250, j::text);
  perform pg_temp.act(5);
  j := public.create_ticket_order('zz-suite-promo','Suite 5','zz-suite-5@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_ga,'qty',1)),'platform','zz10');
  perform pg_temp.chk('promo with no uses left is refused', (j->>'ok')<>'true', j::text);
  j := public.create_ticket_order('zz-suite-promo','Suite 5','zz-suite-5@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_ga,'qty',1)),'platform','nope');
  perform pg_temp.chk('unknown promo is refused', (j->>'ok')<>'true', j::text);

  -- ---- email data and refunds
  perform pg_temp.act(6);
  j := public.create_ticket_order('zz-suite-promo','Suite 6','zz-suite-6@example.com','9000000000', jsonb_build_array(jsonb_build_object('tier',tier_free,'qty',1)),'platform');
  sid := (j->>'order_id')::uuid;
  perform pg_temp.chk('email data is available before sending', (public.ops_order_email_data(tok, sid)->>'ok')='true');
  perform public.ops_mark_order_emailed(tok, sid);
  perform pg_temp.chk('email data is empty once marked sent', (public.ops_order_email_data(tok, sid)->>'ok') is distinct from 'true');
  j := public.ops_refund_order(tok, sid, 'test');
  perform pg_temp.chk('refund succeeds', (j->>'ok')='true', j::text);
  perform pg_temp.chk('refund voids its tickets', (select count(*) from public.tickets where order_id = sid and voided_at is null) = 0);
  perform pg_temp.chk('refunded order no longer shows tickets', (select count(*) from public.my_tickets(sid, 'zz-suite-6@example.com')) = 0);
  perform pg_temp.chk('refunding twice is refused', (public.ops_refund_order(tok, sid, 'again')->>'ok')<>'true');

  -- ---- guest list
  perform pg_temp.act(1);
  perform pg_temp.chk('guest list refuses an ordinary member', (public.guest_list('zz-suite-promo')->>'ok')<>'true');
  perform public.ops_set_member_role(tok, 'zz-suite-2@example.com', 'host');
  perform pg_temp.act(2);
  j := public.guest_list('zz-suite-promo');
  perform pg_temp.chk('host sees the guest list', (j->>'ok')='true' and jsonb_array_length(j->'guests') >= 1, left(j::text, 200));

  -- ---- city waitlist
  perform pg_temp.anon();
  perform public.signup('zz-suite-w@example.com','city:Pune');
  perform pg_temp.chk('city waitlist lists Pune', exists (select 1 from jsonb_array_elements(public.ops_city_waitlist(tok)) x where x->>'city' = 'Pune'));
  perform public.ops_city_waitlist_done(tok, 'Pune');
  perform pg_temp.chk('city waitlist clears after notice', not exists (select 1 from jsonb_array_elements(public.ops_city_waitlist(tok)) x where x->>'city' = 'Pune'));

  -- ---- artist claim becomes control
  select slug into vcode from public.artists limit 1;
  perform public.submit_artist('claim', vcode, 'Suite Artist', 'zz-suite-1@example.com', 'Bengaluru', 'techno', '@suite_artist', null, null, 'bio bio bio');
  perform public.ops_set_inbox_status(tok, 'artist', (select id from public.artist_submissions where email = 'zz-suite-1@example.com' and kind = 'claim' order by created_at desc limit 1), 'approved');
  perform pg_temp.act(1);
  perform pg_temp.chk('approved claim links the artist to the member', (public.my_artist()->>'slug') = vcode, public.my_artist()::text);
  j := public.update_my_artist('A suite bio', null, null, null, null, null, null, null);
  perform pg_temp.chk('linked member can edit the page', (j->>'ok')='true' and (select bio from public.artists where slug = vcode) = 'A suite bio', j::text);
  perform pg_temp.act(3);
  perform pg_temp.chk('other members have no artist page', public.my_artist() = 'null'::jsonb and (public.update_my_artist('x',null,null,null,null,null,null,null)->>'ok')<>'true');

  -- ---- report
  select count(*) into nn from t_res where not ok;
  raise exception E'%\n%', case when nn=0 then 'ALL PASSED ('||(select count(*) from t_res)||' checks)' else 'FAILED '||nn||' of '||(select count(*) from t_res) end,
     (select string_agg(case when ok then 'PASS ' else 'FAIL ' end || name || coalesce(' [' || info || ']', ''), E'\n' order by n) from t_res);
end $$;
