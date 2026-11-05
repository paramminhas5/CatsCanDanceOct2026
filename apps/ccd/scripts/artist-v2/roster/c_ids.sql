insert into public.artist_external_ids (artist_slug, scheme, value, url, confidence, evidence)
select v.slug, 'deezer', v.id, 'https://www.deezer.com/artist/'||v.id, v.conf, v.ev from (values
('alex-kassian','7032931','high','MusicBrainz 5b778294-f826-43ce-a35f-dd6395de640e -> Deezer 7032931'),
('maribou-state','1380470','high','MusicBrainz 72034a05-bcd8-40c2-8255-3ee4ac0e7ef0 -> Deezer 1380470'),
('palms-trax','7494214','high','MusicBrainz bba6534d-f62c-4c7d-aa74-f9a7696113c1 -> Deezer 7494214'),
('sunju-hargun','1002294','high','MusicBrainz c2d5ec16-e8b9-4570-91d2-b1e8854a2059 -> Deezer 1002294'),
('lost-stories','1351220','high','MusicBrainz c18980b6-a89b-4d9b-8467-7b2a98631fe3 -> Deezer 1351220'),
('esa','9091500','high','our Spotify link -> MusicBrainz b1b6fa89-1343-4340-b12f-a7e96ebce3eb -> Deezer 9091500'),
('komorebi','5948862','medium','MusicBrainz cbc7e517-1011-4048-ba19-bc5956b96e35 -> Deezer 5948862. Deezer profile mixes in other artists named Komorebi; only releases on her labels were loaded.'),
('adam-port','262264','high','MusicBrainz 870549f3-6266-496f-a019-5762aadb713c -> Deezer 262264'),
('anish-sood','4943579','high','MusicBrainz 78361be1-bcb4-4758-8281-5b8e17286231 -> Deezer 4943579'),
('simo-cell','8043185','high','MusicBrainz b37b759e-715e-4e7c-ac07-776e6a9450d4 -> Deezer 8043185'),
('weird-sounding-dude','6208430','high','MusicBrainz de3c8bdb-36ab-48c4-aaaf-afdca647d63b -> Deezer 6208430'),
('anish-kumar','4105435','high','MusicBrainz 191d61e8-d809-457b-8025-196e75cb9ff4 -> Deezer 4105435'),
('audio-units','1511447','high','MusicBrainz 0b00f1fa-be3e-4d33-8727-70a7a56ffcc2 -> Deezer 1511447'),
('masalo','11816539','high','our Spotify link -> MusicBrainz 33638220-5f3b-4779-ad33-b8eb849eebd0 -> Deezer 11816539'),
('midnight-traffic','2082791','high','MusicBrainz 7e506ec0-d651-4a3a-8330-8c1e17c3e925 -> Deezer 2082791'),
('nikki-nair','49201222','high','MusicBrainz 485c0d0f-d23d-4615-bfcc-e15a2d7a9bad -> Deezer 49201222'),
('blawan','1064916','high','MusicBrainz c27d4389-390e-497c-9a41-dd446ace742c -> Deezer 1064916'),
('francis-mercier','5180873','high','MusicBrainz a6fdfbc9-f587-4f02-bb59-1577636fd10b -> Deezer 5180873'),
('madame-gandhi','12036406','high','MusicBrainz 931bce3e-a2b2-430c-a98c-ea772925b299 -> Deezer 12036406'),
('mochakk','13698309','high','MusicBrainz 35321b91-98ca-4a78-b34f-cb113722eab9 -> Deezer 13698309'),
('photonz','1047155','high','our Spotify link -> MusicBrainz 96ed3ecd-55e7-4dd3-82e3-60c65da031bf -> Deezer 1047155'),
('ross-from-friends','8902830','high','MusicBrainz 8a562b21-af9e-4b6a-8c43-327cdf6713b0 -> Deezer 8902830'),
('yung-raj','49322572','high','MusicBrainz e28b515e-a1eb-42d8-af70-f4cc0a524dd1 -> Deezer 49322572'),
('reble','14384615','high','MusicBrainz 0a14e86f-9305-4de7-8b6d-2f8998dc2cdc -> Deezer 14384615'),
('onra','179788','high','MusicBrainz e6a76b1d-2cbb-4587-9c09-6b7333638a0a -> Deezer 179788')
) v(slug,id,conf,ev)
where not exists (select 1 from public.artist_external_ids x where x.artist_slug = v.slug and x.scheme = 'deezer') returning 1;