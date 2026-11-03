-- Param's answers, 3 Nov 2026 (17:35 IST): Baawra spelling, Okedo is Ishaan Gandhi, Sodhi is Arjun Sodhi,
-- no unverified claims from artists. Old values kept here so each change can be undone.

-- Baawra (was name BAWRA, based_city India, bio 'DGTL India 2025 domestic lineup.'). Slug stays 'bawra' so links keep working.
-- Sources: DGTL artist page (dgtl-festival.com/en/artists/baawra), Wild City #264 uploads (SoundCloud, Mixcloud), his SoundCloud baawra.
update artists set name = 'BAAWRA', based_city = 'Pune, India',
  bio = 'Baawra is Hiten Mutreja, a Pune DJ and a core member of the MAUSHI collective. His sets lean on understated, hypnotic minimal techno. He played DGTL India in 2025 and recorded Wild City #264 in 2026.'
  where slug = 'bawra';
insert into artist_aliases (artist_slug, alias, kind, source_url) values ('bawra', 'Bawra', 'also_known_as', 'https://dgtl-festival.com/en/artists/baawra') on conflict (artist_slug, alias) do nothing;

-- Okedo (was members 'Will Clarke, Ishaan Gandhi', based_city 'New Delhi, India', bio about a duo).
-- Sources: Wild City (Aug 2022, the name once belonged to a duo), Mixmag Asia (2023, production moniker of Ishaan Gandhi),
-- okedo.bandcamp.com (London/New Delhi), Wild City and Mixmag Asia on Okedolo and New Fusion Movements.
update artists set members = 'Ishaan Gandhi', based_city = 'London and New Delhi',
  bio = 'Okedo is the production name of Ishaan Gandhi, based between London and New Delhi. It started as a duo with Will Clarke. Okedo made the EP New Fusion Movements with Pluto Monkey (2023), the joint project Okedolo with Dolorblind (Season 1, 2022) and the two Soft Serve releases (2025).'
  where slug = 'okedo';

-- Sodhi (was no bio, no links). Param confirmed: Arjun Sodhi, Delhi.
-- Sources: 8 Ball Radio (Mixcloud), boxout.fm (YouTube description, Boxout Wednesdays 260), Goa Sunsplash artist page.
update artists set based_city = 'New Delhi, India', instagram = coalesce(instagram, 'arjunsodhi11'),
  bio = 'Sodhi is Arjun Sodhi, a bass music DJ from New Delhi who spent his formative years in London. His sets mix grime, bass, hip-hop, afrobeats and dancehall with soundsystem music. He has hosted a monthly show on boxout.fm, toured the UK in 2022 (Corsica Studios in London, Celtronic Festival in Derry) and then played Magnetic Fields.'
  where slug = 'sodhi' and (bio is null or length(trim(bio)) < 20);

-- Bullzeye (was 'One of the most booked DJs in India. Played alongside Carl Cox, Dixon, Nina Kraviz. Paradiso Amsterdam, Ritter Butzke Berlin.').
-- None of those claims has a source. What sources show: his mixes for Furthur, Boshed (Goa), Minitech Recordings Radio,
-- Raipur Underground Community, and his own upload of a set at Der Weisse Hase, Berlin, 29 July 2023.
update artists set bio = 'Bullzeye is an Indian DJ. His mixes have run on Furthur, Boshed in Goa, Minitech Recordings Radio and the Raipur Underground Community podcast, and he recorded a set at Der Weisse Hase in Berlin in July 2023.'
  where slug = 'bullzeye';

-- Sodhi research (pass 2b, held until Param confirmed identity): one era, two sound tags, five mixes, featured mix.
-- Loaded the same day with the rows in research/pass2b/out8.json (sodhi entry).
