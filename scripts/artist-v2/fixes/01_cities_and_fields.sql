-- Artist record fixes, 3 Nov 2026 (night). Non-bio fields only; bio edits wait for Param.
-- Each change is backed by the source noted. Run once; it only touches the listed rows and columns.
begin;

-- From abroad but stored as India (from_city was a default, not a fact)
update artists set based_city = 'Amsterdam, Netherlands', from_city = 'United Kingdom' where slug = 'pariah';      -- Discogs: British producer and DJ based in Amsterdam
update artists set from_city = 'Lisbon, Portugal' where slug = 'photonz';                                         -- RA review of Nuit, Beatportal: Lisbon DJ
update artists set from_city = 'Linares, Spain' where slug = 'gazzi';                                             -- Neo2 (2023): born in Linares, Jaen
update artists set from_city = 'Kazakhstan' where slug = 'nazira';                                                -- Mixmag: from Kazakhstan, grew up in Taraz
update artists set based_city = null, from_city = 'East London, UK' where slug = 'shama-anwar';                   -- Wild City #167: East London native, British-born, Bangladesh-raised
update artists set from_city = 'Amsterdam, Netherlands' where slug = 'masalo';                                    -- DGTL, Mixmag Asia: Amsterdam born and raised

-- Bases that were out of date (checked on the pages below on 3 Nov 2026)
update artists set based_city = 'Berlin, Germany', from_city = 'Bochum, Germany' where slug = 'hunee';            -- hunee.bandcamp.com location: Berlin, Germany
update artists set based_city = 'London, UK', from_city = 'Oslo, Norway' where slug = 'suchi';                     -- RA bio: Oslo-raised, London-made; Ghungroo EP notes (2024): Oslo-born, based in London
update artists set based_city = 'India and Spain' where slug = 'kiss-nuka';                                       -- onehouse.com (her agency): based between India and Spain
update artists set based_city = 'Mumbai, India' where slug = 'chrms';                                             -- Wild City, Rolling Stone India: Mumbai producer Veer Kowli
update artists set based_city = 'Mumbai, India' where slug = 'dreamstates';                                       -- DGTL India artist page, Mixmag Asia: Mumbai-based DJ

-- Members and spelling
update artists set members = 'Shatrunjai Dewan', website = null where slug = 'monophonik';                         -- Mixmag, RA, Wild City spell Dewan; website held thewildcity.com
update artists set members = 'Arpan Kumar, Sidharth Gupta, Rishabh Bhan Singh' where slug = 'green-park';          -- allparksaregreen.bandcamp.com, Rolling Stone India
update artists set members = 'Will Clarke, Ishaan Gandhi' where slug = 'okedo';                                   -- Wild City 2019, 2020
update artists set members = null where slug = 'violet' and members = 'PT';                                       -- country code in the wrong field
update artists set members = null where slug = 'anushka' and members = 'IN';                                      -- country code in the wrong field

-- Links
update artists set soundcloud = 'https://soundcloud.com/stalvartjohn' where slug = 'stalvart-john';                -- old link returns 404; stalvartjohn is live and titled Stalvart John
update artists set instagram = 'jatayusounds' where slug = 'jatayu';                                              -- jatayumusic.com (the band's own site) links jatayusounds

commit;
