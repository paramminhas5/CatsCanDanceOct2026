-- 004: Real CCD Episode history (confirmed by Param, 30 Oct 2026) and residents.
-- Ep 1 Bar Wild, Ep 2 + Ep 3 Indiranagar Social, Ep 4 Bar Wild.
-- The CCD x Social city tour (Bombay, Hyderabad, Delhi finale) did not happen: kept unpublished, marked cancelled.

-- Episode 2 was the first CCD x Social night; keep its slug so existing RSVPs stay attached.
update public.events set
  title = 'Episode 2', episode_no = 2, event_date = '2026-06-28', date = 'Sun, Jun 28, 2026',
  venue = 'Indiranagar Social', city = 'Bengaluru', status = 'past', published = true, rsvp_open = false,
  series_label = 'CCD × Social', start_time = '4 PM',
  blurb = 'First daytime edition. Outdoor pet zone from 4 PM, dance floor from 8.',
  poster_url = '/posters/ep02.jpg', sort_order = 2
where slug = 'ccdxsocial-01';

insert into public.events (slug, title, episode_no, date, event_date, city, venue, blurb, lineup, status, published,
  pet_friendly, start_time, poster_url, sort_order, rsvp_open)
values
  ('episode-1', 'Episode 1', 1, 'Wed, Apr 2, 2025', '2025-04-02', 'Bengaluru', 'Bar Wild',
   'Where it started. A Wednesday at Bar Wild in Indiranagar.', '{}', 'past', true, false, null, null, 1, false),
  ('episode-3', 'Episode 3', 3, 'Sun, Aug 16, 2026', '2026-08-16', 'Bengaluru', 'Indiranagar Social',
   'Breakbeat, UKG, house and bass. Pets outdoors, music indoors, merch and activities.', '{}', 'past', true, true,
   '4 PM', '/posters/ep03.jpg', 3, false),
  ('episode-4', 'Episode 4', 4, 'Sat, Sep 26, 2026', '2026-09-26', 'Bengaluru', 'Bar Wild',
   'Back to Bar Wild, 7 PM till late.', '{Bombie,Dwell,Sartdawg,Merman}', 'past', true, false,
   '7 PM', '/posters/ep04.jpg', 4, false)
on conflict (slug) do nothing;

update public.events set status = 'cancelled', published = false
where slug in ('ccdxsocial-02', 'ccdxsocial-03', 'ccdxsocial-mega');

-- Residents. Sartdawg was mis-spelt "Startdawg" in the old seed.
update public.artists set slug = 'sartdawg', name = 'SARTDAWG' where slug = 'startdawg'
  and not exists (select 1 from public.artists where slug = 'sartdawg');

update public.artists set is_resident = true, featured = true, played_ccd = true where slug in ('merman', 'sartdawg');
update public.artists set played_ccd = true where slug in ('shantam');

insert into public.artists (slug, name, kind, based_city, bio, genres, is_resident, featured, played_ccd, status, source)
values
  ('djazz', 'DJAZZ', 'musician', 'Bengaluru', 'CCD resident selector.', '{House,Disco}', true, true, true, 'approved', 'manual'),
  ('hedz', 'HEDZ', 'musician', 'Bengaluru', 'CCD resident selector.', '{Jungle,"Drum & Bass"}', true, true, true, 'approved', 'manual'),
  ('bombie', 'BOMBIE', 'musician', 'Bengaluru', 'Played CCD Episode 4 at Bar Wild.', '{}', false, false, true, 'approved', 'manual'),
  ('dwell', 'DWELL', 'musician', 'Bengaluru', 'Played CCD Episode 4 at Bar Wild.', '{}', false, false, true, 'approved', 'manual'),
  ('agent-bugs', 'AGENT BUGS', 'musician', 'Bengaluru', 'Played CCD Episode 2 at Indiranagar Social.', '{}', false, false, true, 'approved', 'manual'),
  ('groovier', 'GROOVIER', 'musician', 'Bengaluru', 'Played CCD Episode 2 at Indiranagar Social.', '{}', false, false, true, 'approved', 'manual')
on conflict (slug) do update set played_ccd = true;

-- Resolve the build_log items this answers
update public.build_log set status = 'shipped', updated_at = now(),
  detail = 'Ep1 Bar Wild (2 Apr 2025), Ep2 Indiranagar Social (28 Jun 2026), Ep3 Indiranagar Social (16 Aug 2026), Ep4 Bar Wild (26 Sep 2026). Social tour cancelled.'
where title = 'Confirm CCD event history and next Episode';
update public.build_log set status = 'shipped', updated_at = now(),
  detail = 'Residents: Merman, Sartdawg (founders), Djazz, Hedz.'
where title like 'Confirm residents%';
