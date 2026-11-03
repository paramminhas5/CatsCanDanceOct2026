-- Bio fixes and Instagram handles, approved by Param on 3 Nov 2026 (16:31 IST). Sources in 02_bios_proposed.md.
update artists set bio = 'Midnight Traffic is Rishi, a Hyderabad-based techno producer and DJ on Qilla Records. He played Boiler Room Hyderabad in May 2022 with Nikki Nair, Parris and SUCHI. His track Mantis is on Qilla''s Chakravyuh compilation (2024). In April 2026 he played DOMMUNE''s BROAD.J series in Japan.' where slug = 'midnight-traffic';
update artists set bio = 'Murthovic (MSR Murthy) is a Hyderabad DJ, producer, sound practitioner and researcher with close to 20 years in electronic music, and a Magnetic Fields regular. With visual artist Thiruda (Avinash Kumar) he created Elsewhere In India, a transmedia project that joins game engine technology with live performance, set in 2079 with digital avatars of both artists. Their project Jal, Jungle, Zameen debuted at Magnetic Fields Nomads in Khetri, Rajasthan in February 2026: a 60-minute live electronica set with hereditary musicians Gopika, Sawai, Jakir, Dilip and Roshan on kamaycha, morchang, bhapang, khartal and dholak. He has also played audiovisual Bharatnatyam DJ sets in Hyderabad (2023).' where slug = 'murthovic';
update artists set bio = 'Discokid is the DJ name of Fatema Hakim, a disco and funk DJ from India. Her property Paradise Disco hosted the first Disco Diwali in 2021. She played Mixmag''s The Lab Goa in January 2022.' where slug = 'discokid';
update artists set bio = 'chrms is Veer Kowli, a Mumbai producer making future bass and electro. His releases include Lover Boy (2019) and PILOT on Hypercolour Records (2024).' where slug = 'chrms';
update artists set bio = 'Prismer is Rohan Kale, a New Delhi producer and DJ making explorative, bass-driven electronic music that runs from techno and jungle to house, dubstep, breakbeat and disco. He first got into electronic music in London in 2010. His early releases came out on Boxout.FM, Reel Long Overdub and Tokyo Hell. He has shared stages with DJ Stingray, Pangaea, Denham Audio, Ivy Lab and Rider Shafique, and played Magnetic Fields, Bass Camp, Grasslands (Nepal) and Boiler Room Delhi NCR (June 2024). He played The Warehouse Project India in October 2025; his Mumbai set came out on Apple Music. He started the Delhi party series Mixed Feelings, made as a safe space for marginalised communities.' where slug = 'prismer';
update artists set bio = 'dreamstates is a Mumbai-based DJ playing house, techno, breakbeat, acid and electro. He hosts the monthly Boxout.fm show Cosmic Claps and has played DGTL India 2025, Echoes of Earth and Magnetic Fields.' where slug = 'dreamstates';
update artists set bio = replace(replace(bio, 'Siddharth Gupta', 'Sidharth Gupta'), 'Rishabh Singh', 'Rishabh Bhan Singh') where slug = 'green-park';
update artists set bio = replace(bio, 'Will Clark ', 'Will Clarke ') where slug = 'okedo';
update artists set bio = replace(bio, 'Doppleganger', 'Doppelganger') where slug = 'dualist-inquiry';
update artists set bio = replace(bio, 'Kiss Nuka is a Mumbai-based producer and audiovisual artist making', 'Kiss Nuka is a producer and audiovisual artist, based between India and Spain, making') where slug = 'kiss-nuka';
update artists set bio = replace(bio, 'now based in Amsterdam', 'now based in Berlin') where slug = 'hunee';
-- Instagram handles as the artists' MusicBrainz, Discogs or Wild City pages give them
update artists set instagram = 'sheralb_' where slug = 'sheral';
update artists set instagram = 'audio_units' where slug = 'audio-units';
update artists set instagram = 'indo.warehouse' where slug = 'indo-warehouse';
update artists set instagram = 'anishkumarmusic' where slug = 'anish-kumar';
update artists set instagram = 'nikki__nair' where slug = 'nikki-nair';
update artists set instagram = 'komorebi.music' where slug = 'komorebi';
-- Murthovic release title per Qilla Records
update artist_discography set title = replace(title, 'Banuae Riddim', 'Banaue Riddim'), updated_at = now() where artist_slug = 'murthovic' and title like 'Banuae Riddim%';

-- Scope rule (Param, 3 Nov 2026): artists with no South Asian link are hidden (reversible: set status back to 'approved').
update artists set status='hidden', verify_note = concat_ws(' | ', nullif(verify_note,''), 'Hidden 3 Nov 2026: no South Asian link (scope rule, Param OK)'), updated_at=now()
where status='approved' and slug in ('pariah','photonz','gazzi','nazira','masalo','violet','hunee','tao-fu','adam-port','alex-kassian','blawan','deena-abdelwahed','dj-fart-in-the-club','francis-mercier','haai','karenn','maribou-state','mochakk','onra','palms-trax','ross-from-friends','simo-cell');
