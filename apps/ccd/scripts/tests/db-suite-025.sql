-- 025 self-serve roles. Run in one transaction; it raises at the end so nothing is kept.
-- Expect: adopt_new assigned 1, owns zz-test-act (pending, not public), tamper ignored (role=member, verified=false),
-- submit_hosted_event ok published=false and role becomes host, promoter flag true, claim adopt assigned 1 with merman still approved.
do $$
declare u uuid; em text; r jsonb; out text := ''; v_slug text;
begin
  select id, email into u, em from members where email like 'dummy1_@example.com' and role='member' order by email limit 1;
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'email', em, 'role','authenticated')::text, true);
  insert into artist_submissions(kind,name,email,based_city,instagram) values ('new','ZZ Test Act',em,'Pune','zztest');
  out := out || 'adopt_new=' || adopt_my_pending()::text;
  select slug into v_slug from artists where owner_member = u; out := out || ' owns=' || coalesce(v_slug,'none');
  update members set host_verified = true, is_promoter = true, role='owner' where id = u;
  out := out || ' role=' || (select role from members where id=u) || ' verified=' || (select host_verified from members where id=u);
  r := submit_hosted_event('ZZ Test Night', current_date+10, '9pm','Pune','Venue',null,null,null,null);
  out := out || ' event=' || r::text || ' role_after=' || (select role from members where id=u);
  r := become_promoter('ZZ','Pune','zz','bio'); out := out || ' promoter=' || (select is_promoter from members where id=u)::text;
  update artists set owner_member = null where slug = v_slug;
  insert into artist_submissions(kind,artist_slug,name,email,instagram) values ('claim','merman','Merman',em,'merman');
  out := out || ' claim=' || adopt_my_pending()::text || ' merman_status=' || (select status from artists where slug='merman');
  raise exception 'RESULT %', out;
end $$;
