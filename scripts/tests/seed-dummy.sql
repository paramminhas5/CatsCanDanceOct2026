-- Seeds 15 dummy members (dummy01..dummy15@example.com) and two clearly labelled test nights.
-- Idempotent: run cleanup-dummy.sql first (this file does it for you).
-- Passwords are NOT set here. Run scripts/tests/set-dummy-passwords.mjs with your OPS_TOKEN to set them.
-- (psql: \i cleanup-dummy.sql first; the Supabase SQL editor: paste cleanup-dummy.sql above this)

do $$
declare
  i int; u uuid; names text[] := array['Aarav','Bela','Chirag','Divya','Esha','Farhan','Gauri','Hari','Isha','Jai','Kiara','Lakshman','Meera','Nikhil','Ojas'];
  cities text[] := array['Bangalore','Bengaluru','Bengaluru','bengaluru ','Bengaluru','Bengaluru','Bengaluru','Bengaluru','Bengaluru','Mumbai','Mumbai','Bombay','Delhi NCR','Delhi','Gurgaon'];
  future_slug text := 'test-night-dummy'; past_slug text := 'test-night-past';
  tier_free uuid; tier_ga uuid; crew_a uuid; q jsonb; j jsonb; em text;
begin
  insert into public.events(slug,title,date,event_date,published,status,city,venue,rsvp_open,capacity,blurb)
  values (future_slug,'TEST NIGHT (dummy data, delete me)',to_char(current_date+14,'DD Mon YYYY'),current_date+14,true,'upcoming','Bengaluru','Test Venue',true,100,'Dummy night for testing. Not a real event.'),
         (past_slug,'TEST NIGHT PAST (dummy data, delete me)',to_char(current_date-3,'DD Mon YYYY'),current_date-3,true,'past','Bengaluru','Test Venue',false,100,'Dummy night for testing. Not a real event.');
  insert into public.ticket_tiers(event_slug,name,price_inr,capacity,max_per_order,active,sort_order) values (future_slug,'Free list',0,50,2,true,1) returning id into tier_free;
  insert into public.ticket_tiers(event_slug,name,price_inr,capacity,max_per_order,active,sort_order) values (future_slug,'GA',500,20,4,true,2) returning id into tier_ga;

  for i in 1..15 loop
    u := md5('ccddummy'||i)::uuid; em := 'dummy'||lpad(i::text,2,'0')||'@example.com';
    insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                           confirmation_token, recovery_token, email_change, email_change_token_new, created_at, updated_at)
    values (u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',em,now(),
            '{"provider":"email","providers":["email"]}','{}','','','','',now(),now());
    insert into auth.identities(id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u, jsonb_build_object('sub',u::text,'email',em,'email_verified',true), 'email', u::text, now(), now(), now());
    q := case when i%2=1 then '{"good_night":"loud","when":"late","arrive":"with crew","crew":"Yes","pregame":"Yes","pets":"Cat"}' else '{"good_night":"chill","when":"early","arrive":"solo","crew":"Yes","pregame":"Sometimes","pets":"Dog"}' end::jsonb;
    insert into public.members(id,email,display_name,city,genres,quiz,phone)
    values (u,em,names[i]||' (dummy)',public.city_norm(cities[i]),case when i%3=0 then array['Techno','House'] when i%3=1 then array['House','Disco'] else array['Drum & Bass','Jungle'] end,q,'+91900000'||lpad(i::text,4,'0'));
  end loop;

  -- dummy01 is staff (door check-in, vouching), dummy02 is a host.
  perform set_config('ccd.allow_role_change','1',true);
  update public.members set role='staff' where email='dummy01@example.com';
  update public.members set role='host' where email='dummy02@example.com';
  perform set_config('ccd.allow_role_change','0',true);

  -- Upcoming night: dummy01-09 and dummy10-12 hold free tickets; dummy13 has an RSVP only; dummy14,15 have neither.
  for i in 1..12 loop
    j := public.create_ticket_order(future_slug, names[i]||' (dummy)', 'dummy'||lpad(i::text,2,'0')||'@example.com', '9000000000',
                                    jsonb_build_array(jsonb_build_object('tier',tier_free,'qty',1)), case when i%2=0 then 'own' else 'platform' end);
  end loop;
  insert into public.event_rsvps(event_slug,name,email,plus_ones) values (future_slug,'Meera (dummy)','dummy13@example.com',0);

  -- Crew pool: dummy03-08 (Bengaluru, ticketed) joined; dummy09 ticketed but not joined; dummy10-12 (Mumbai) joined (other city).
  for i in array[3,4,5,6,7,8,10,11,12] loop
    perform set_config('request.jwt.claim.sub', md5('ccddummy'||i)::uuid::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub',md5('ccddummy'||i)::uuid,'email','dummy'||lpad(i::text,2,'0')||'@example.com','role','authenticated')::text, true);
    perform public.join_crew_pool(future_slug);
  end loop;

  -- Past night with a formed crew (dummy03-07) so "go again" can be tested.
  insert into public.crews(event_slug,name,pre_spot,captain_id) values (past_slug,'Crew 1 Bengaluru','Test Bar, 30 minutes before',md5('ccddummy3')::uuid) returning id into crew_a;
  insert into public.crew_pool(event_slug,member_id,crew_id) select past_slug, md5('ccddummy'||x)::uuid, crew_a from generate_series(3,7) x;
end $$;
