insert into public.artist_external_ids (artist_slug, scheme, value, url, confidence, evidence)
select v.slug, 'deezer', v.id, 'https://www.deezer.com/artist/'||v.id, v.conf, v.ev from (values
('hunee','443381','high','MusicBrainz feb974b4-031d-4f20-b072-91f506d6c6dd releases link 1 Deezer album(s) (59901542) by Deezer artist 443381 (Hunee)'),
('violet','202463397','high','MusicBrainz 82a5fdf0-cc4f-4c81-b6e8-829ace0d4cb4 releases link 2 Deezer album(s) (296717022, 402709327) by Deezer artist 202463397 (Violet)'),
('karenn','2949621','high','MusicBrainz b0911e1f-fa1f-44a7-b5bd-48747f084265 releases link 1 Deezer album(s) (151734872) by Deezer artist 2949621 (Karenn)'),
('deena-abdelwahed','10610707','high','MusicBrainz b0e2365c-8c2f-4eba-bcae-592bc45e6d17 releases link 2 Deezer album(s) (452759715, 74615042) by Deezer artist 10610707 (Deena Abdelwahed)'),
('haai','11544631','high','MusicBrainz c4dff60e-6cf9-4308-8bef-7d88bc0a6a27 releases link 21 Deezer album(s) (1008778111, 155735512, 158374132) by Deezer artist 11544631 (HAAi)')) as v(slug,id,conf,ev) join public.artists a on a.slug=v.slug
on conflict (artist_slug, scheme) do nothing;
