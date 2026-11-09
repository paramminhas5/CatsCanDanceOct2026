-- 066: Hire directory (Param, 9 Nov 2026: "more research, more top dudes; first we build a directory and then get them on board").
--
-- hire_vendors holds every gear owner, crew, visual artist, photographer, producer and venue we research for Hire,
-- with the track record and the page it came from. Private for now: RLS on, no public policy. Ops reads and
-- updates outreach status through token-guarded RPCs. A public view for onboarded vendors comes with the Hire pages
-- (designed on the canvas first). Additive only.

create table if not exists public.hire_vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kinds text[] not null default '{}',
  tier text not null default 'local' check (tier in ('top','strong','local','listing')),
  base_city text,
  serves text[] not null default '{}',
  brands text[] not null default '{}',
  track_record text,
  people text,
  contact_email text,
  contact_phone text,
  website text,
  instagram text,
  price_note text,
  sources text[] not null default '{}',
  status text not null default 'researched' check (status in ('researched','contacted','talking','onboarded','declined','hidden')),
  outreach_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hire_vendors_kinds_ok check (kinds <@ array['sound','dj_gear','lights','visuals','photo','video','stage','soundsystem','promotion','distributor','venue','production']::text[])
);

alter table public.hire_vendors enable row level security;
revoke all on public.hire_vendors from anon, authenticated;

create or replace function public.ops_hire_vendors(p_token text) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform ops_check(p_token);
  return coalesce((select json_agg(v order by
      case v.tier when 'top' then 0 when 'strong' then 1 when 'local' then 2 else 3 end, v.name)
    from hire_vendors v where v.status <> 'hidden'), '[]'::json);
end $$;

create or replace function public.ops_set_hire_vendor(p_token text, p_slug text, p_status text, p_note text default null) returns json
language plpgsql security definer set search_path = public as $$
declare r hire_vendors;
begin
  perform ops_check(p_token);
  update hire_vendors
     set status = coalesce(p_status, status),
         outreach_note = coalesce(p_note, outreach_note),
         updated_at = now()
   where slug = p_slug
  returning * into r;
  if r.id is null then raise exception 'no vendor %', p_slug; end if;
  return row_to_json(r);
end $$;

revoke all on function public.ops_hire_vendors(text) from public;
revoke all on function public.ops_set_hire_vendor(text, text, text, text) from public;
grant execute on function public.ops_hire_vendors(text) to anon, authenticated;
grant execute on function public.ops_set_hire_vendor(text, text, text, text) to anon, authenticated;

-- Seed: research rounds 1 to 3, 9 Nov 2026. Every row keeps the pages its facts came from.
insert into public.hire_vendors (slug, name, kinds, tier, base_city, serves, brands, track_record, people, contact_email, contact_phone, website, instagram, price_note, sources, outreach_note) values
-- Premium systems: who holds the keys
('superwaves','Superwaves','{sound,distributor}','top','Mumbai','{India}','{Funktion-One,Martin Audio,DiGiCo}','Listed by Funktion-One as its dealer and rental partner in India. PALM top 50 sound rental 2025.','Gurvinder Singh Saini','rinku@superwaves.co.in','+91 98692 12921','superwaves.co.in',null,null,'{https://funktion-one.com/distributors/,https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Gmail draft ready, not sent'),
('audio-and-beyond','Audio & Beyond (Electronics Mart India)','{distributor}','top','Hyderabad','{India}','{Funktion-One}','Funktion-One India partner since July 2025. Installed Four Seasons and The Nines in Mumbai, Big Bull Hyderabad, Epitome Pune. Launch showcase in Mumbai, May 2026.','Rishabh Jain (MD)','Rishabh.jain@audioandbeyond.in','+91 86888 89900',null,null,null,'{https://funktion-one.com/distributors/,https://www.musicunplugged.in/news/trade_news_info/3403/0}','Gmail draft ready, not sent'),
('sound-redefined','Sound Redefined','{distributor}','top','Delhi','{India}','{Danley,Union Audio}','Exclusive Danley distributor in India.','Dipankar','dipankar@soundredefined.in',null,'soundredefined.in','soundredefined',null,'{https://www.soundredefined.in/distribution}','Gmail draft ready, not sent'),
('acoustic-arts','Acoustic Arts','{distributor}','top','Delhi','{India}','{Void,Powersoft,Biamp}','Void Acoustics distributor in India.',null,null,null,'acoustic-arts.com',null,null,'{https://www.acoustic-arts.com/void}','Contact form on site'),
-- Big shows with electronic track records
('sound-com','Sound.com','{sound}','top',null,'{India}','{JBL,L-Acoustics}','Sound for every stage at Sunburn Goa 2014. Hardwell in Mumbai. India''s first L-Acoustics L2 rental partner (Jan 2026). PALM top 50.','Warren D''Souza (founder)',null,null,null,null,null,'{https://www.online-sound.com/blogs/blog/65267-sound-com-powers-the-eight-edition-of-asia-s-largest-electronic-dance-music-festival-sunburn-goa-2014,https://www.e-techasia.com/2026/01/05/sound-com-makes-history-as-indias-first-l-acoustics-l2-rental-partner/,https://www.headlinerhub.com/india-s-audio-evolution.html}','Find contact'),
('mega-sound','Mega Sound India (MSIPL)','{sound}','top','Udaipur','{India}','{L-Acoustics,DiGiCo}','Lollapalooza India 2024 and 2025, Sunburn Goa 2024, Maroon 5 in Mumbai, AP Dhillon 360 shows.','Siddharth Chauhan (audio director)',null,null,'megasound.in',null,null,'{https://lsionline.com/news/mega-sound-delivers-for-lollapalooza-india,https://www.livedesignonline.com/news/maroon-5-makes-epic-debut-india-mega-sound,https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
('snl-pro','Sound & Light Professionals (SNL Pro)','{sound}','top','Mumbai','{India}','{L-Acoustics}','NH7, Sunburn, David Guetta, Swedish House Mafia, Snoop Dogg India tour, Global Citizen Festival India.','Manish Mavani (director)',null,null,null,null,null,'{https://lsionline.com/news/sound-light-professionals-adds-l-acoustics-k1--7hs23k,https://www.mixonline.com/live-sound/sr-providers-team-for-indias-largest-fest}','Find contact'),
('audio-design','Audio Design','{sound}','top','Delhi','{India}','{L-Acoustics}','David Guetta, Martin Garrix, Tiesto, Hardwell, Lady Gaga. Global Citizen Festival India.','Navneet Wadhwa (director)',null,null,null,null,null,'{https://audiomediainternational.com/audio-design-india-invests-in-l-acoustics-k2/,https://www.mixonline.com/live-sound/sr-providers-team-for-indias-largest-fest}','Find contact'),
('electrocraft','Electrocraft','{sound,stage}','top',null,'{India}','{L-Acoustics,Midas,Prolyte}','Lead sound supplier, Global Citizen Festival India, Mumbai. PALM top 50.','Roger Drego',null,null,null,null,null,'{https://www.mixonline.com/live-sound/sr-providers-team-for-indias-largest-fest,https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
('mss-world','MSS World (Modern Stage Services)','{production,sound}','top',null,'{India}','{L-Acoustics}','Production at Magnetic Fields 2023. First L-Acoustics K2, Jashn-e-Rekhta Delhi, Dec 2025.','Davinder Wadhwa, Pratik Wadhwa',null,null,null,null,null,'{https://ocupus.in/work/magfields-2023,https://www.e-techasia.com/2026/01/06/mss-world-ups-the-ante-with-first-l-acoustics-k2-investment/}','Find contact'),
('reynolds','Reynold''s Sound and Light Services','{sound,lights,visuals}','top','Bengaluru','{India}','{d&b,Meyer Sound,DiGiCo,Clay Paky,Liantronics}','Deadmau5, David Guetta, Metallica, Iron Maiden, Guns N'' Roses India tour.','Felix Remedios (MD)',null,null,'reynoldonline.com',null,null,'{https://avalliance.com/av-companies/reynolds-sound-and-lighting-services/,https://www.tpimagazine.com/rained-off-bangalore-concert-provides-perfect-opportunity-for-pr-lighting-guru-somayaji-lights-rising-star-prateek-kuhad-with-xr-480-bws/}','Find email'),
('j-davis-prosound','J Davis Prosound and Lighting','{sound,lights}','strong','Bengaluru','{India}','{L-Acoustics,d&b}','Global Citizen Festival India. L-Acoustics for about 20 years; d&b CCL and XSL added 2025.','Santana Davis (MD)',null,null,'jdavisprosound.com',null,null,'{https://www.mixonline.com/live-sound/sr-providers-team-for-indias-largest-fest,https://www.e-techasia.com/2025/06/14/j-davis-prosound-lighting-powers-up-with-db-audiotechnik-and-sennheiser/}','Find email'),
('pro-sound-india','Pro Sound India','{sound}','strong','Bengaluru','{India}','{L-Acoustics,Nexo,DiGiCo,Avid}','Concerts up to 15,000 people. L-Acoustics K2 and Kara II. Since 2006.','Jiten Jariwala, Rajiv Jariwala',null,null,null,null,null,'{https://www.lsionline.com/news/bengaluru-s-pro-sound-invests-in-l-acoustics/,https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
('stylus-sound','Stylus Sound and Lighting','{sound,lights}','strong','Bengaluru','{India}','{d&b,JBL,RCF,DiGiCo}','PALM top 50 sound rental 2025: concerts, festivals, backline support.',null,null,null,null,null,null,'{https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find email'),
('pp-sound-lights','PP Sound Lights Productions','{sound,lights}','strong','Mumbai','{India}','{d&b,L-Acoustics}','PALM top 50 sound rental 2025.',null,null,null,null,null,null,'{https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
('njsm','NJ''s Sound Machine (NJSM)','{sound}','strong','Mumbai','{India}','{d&b,L-Acoustics,JBL}','PALM top 50 sound rental 2025.',null,null,null,null,null,null,'{https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
('soundmindz','Soundmindz','{sound,lights}','strong','Mumbai','{India}','{JBL,DiGiCo,grandMA3}','Super Sonic India, IPL. PALM top 50.',null,null,null,null,null,null,'{https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
('global-sound-management','Global Sound Management','{sound}','strong',null,'{India}','{L-Acoustics}','A.R. Rahman, Shankar-Ehsaan-Loy. PALM top 50.',null,null,null,null,null,null,'{https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
-- Club scale and DJ gear, Bengaluru
('entertainment-nine','Entertainment Nine','{sound,lights}','local','Bengaluru','{Bengaluru}','{}','Sound for nightclubs, bars and live bands; rents sharpies, moving heads, consoles, LED walls.','Ganesh','ganesh@entertainmentnine.com','+91 99009 00433','entertainmentnine.com',null,null,'{https://www.entertainmentnine.com/sound-systems-bengaluru,http://entertainmentnine.com/lighting-dealers-and-rentals.html}','Gmail draft ready, not sent'),
('shriram-visuals','Shriram Visuals','{sound}','local','Bengaluru','{Bengaluru}','{JBL,QSC}','DJ sound on JBL 918 subs, tops and stage monitors.',null,'support@shriramvisuals.com','+91 99867 93055','shriramvisuals.com',null,null,'{https://www.shriramvisuals.com/dj-sound-system-rental-bangalore}','Gmail draft ready, not sent'),
('prym-audio','Prym Audio','{sound}','local','Bengaluru','{Bengaluru}','{}','Built the system at Pebble, The Jungle Lounge (2021 article).','Sreekumar Gopinathan',null,null,null,null,null,'{https://homegrown.co.in/homegrown-explore/8-music-venues-with-the-best-sound-systems-across-india}','Find contact'),
('technorent','TechnoRent','{lights,sound}','local','Bengaluru','{Bengaluru}','{}','Lighting rental with public prices. HSR Layout and Kudlu.',null,null,'+91 95380 30389','technorent.in',null,'Per day: moving head Rs 3,000, sharpy Rs 3,000, blinder Rs 2,800, LED par Rs 349','{https://technorent.in/rent-event-lighting-bangalore/}','Call'),
('the-backline-company','The Backline Company','{dj_gear}','strong','Mumbai','{Mumbai,Delhi NCR,Bengaluru,Goa,Jaipur,Udaipur}','{}','Backline rental that quotes from a rider. AKON India tour (Nov 2025), Sonu Nigam. DJ gear not listed.',null,'hello@thebacklinecompany.com','+91 80824 70247','thebacklinecompany.com','thebacklinecompany',null,'{https://www.thebacklinecompany.com/,https://www.thebacklinecompany.com/the-company}','Gmail draft ready, not sent'),
('partymap-just-blr','Partymap Academy at Just BLR','{dj_gear}','local','Bengaluru','{Bengaluru}','{Pioneer DJ}','DJ school inside Just BLR, Brigade Road, with Pioneer CDJs and a club mixer. Rental not stated.',null,null,null,'partymapacademy.com','partymapacademy',null,'{https://www.partymapacademy.com/blog/learn-dj-in-real-nightclub-in-bengaluru/}','Ask about hire'),
('media-capital','Media Capital','{dj_gear}','listing','Bengaluru','{Bengaluru}','{Pioneer DJ}','Sells the CDJ-3000 in Bengaluru. Sale, not rental.',null,'contactmediacapital@gmail.com','+91 84317 07077','mediacapitalstore.in',null,'CDJ-3000 Rs 2,50,990 (sale)','{https://www.mediacapitalstore.in/pioneer-dj-cdj3000-professional-dj-multi-player/pid-2230014096}','Gmail draft ready (house kit price), not sent'),
-- Hand-built soundsystems
('bfr-sound-system','BFR Sound System (Bass Foundation Roots)','{soundsystem}','top','Delhi','{India}','{}','Jamaican-style stacks built by Taus. Tours and sets up gigs directly with people; needs only a generator.','Delhi Sultanate',null,null,null,null,null,'{https://raiot.in/bfr-sound-system-arrives-in-meghalaya/}','DM'),
('reggae-rajahs','Reggae Rajahs (10,000 Lions)','{soundsystem}','top','Delhi','{India}','{}','Soundsystem crew since 2009; helped run Goa Sunsplash.','Raghav Dang, MoCity, General Zooz',null,null,null,null,null,'{https://homegrown.co.in/amp/story/homegrown-creators/hyderabad-gets-its-very-own-jamaican-style-hand-crafted-sound-system}','DM'),
('monkey-sound-system','Monkey Sound System (Bass Sanskriti)','{soundsystem}','top','Hyderabad','{India}','{}','5-way, 14,000 W Jamaican-style system built by Taus in Goa (2022).','Dakta Dub (Bala Subramanyam)',null,null,null,null,null,'{https://homegrown.co.in/amp/story/homegrown-creators/hyderabad-gets-its-very-own-jamaican-style-hand-crafted-sound-system}','DM'),
-- Lighting and show design
('ssl-media','SSL Media','{lights,visuals,sound}','top','Mumbai','{India}','{Robe}','Largest Robe stock in India, 1,000+ moving lights. Eric Prydz, Coldplay, Ed Sheeran, Guns N'' Roses in India.','Ulhas Sahasrabuddhe (CEO)',null,null,null,null,null,'{https://www.mondodr.com/?p=46722}','Find contact'),
('hmbl-live-design','HMBL Live Design','{lights,visuals,stage}','top','Guwahati','{India}','{grandMA,Resolume,Notch}','Sunburn Goa 2019, Alan Walker India tour 2022, Arijit Singh world tour. Books lighting designers, VJs and laserists.',null,null,'+91 76570 21140','hmbl.in','hmblentertainment',null,'{https://www.hmbl.in/livedesign}','Call'),
('guru-somayaji','Guru Somayaji','{lights}','top','Bengaluru','{India}','{}','Lighting designer. Lit Prateek Kuhad in Bengaluru (2019); designs shows for The Humming Tree; co-designed Anirudh''s show in Chennai (369 Design Lab).','Guru Somayaji',null,null,null,null,null,'{https://www.tpimagazine.com/rained-off-bangalore-concert-provides-perfect-opportunity-for-pr-lighting-guru-somayaji-lights-rising-star-prateek-kuhad-with-xr-480-bws/,https://www.mondodr.com/?p=46722}','Find contact'),
('abhishek-roy','Abhishek Roy','{lights}','strong','Mumbai','{India}','{}','Lighting engineer for Prateek Kuhad.','Abhishek Roy',null,null,null,null,null,'{https://www.tpimagazine.com/rained-off-bangalore-concert-provides-perfect-opportunity-for-pr-lighting-guru-somayaji-lights-rising-star-prateek-kuhad-with-xr-480-bws/}','Find contact'),
('sandeep-devasia','Sandeep M Devasia','{lights}','strong',null,'{India}','{Clay Paky}','Lighting designer, Banyan Tree at Sixth Sense Festival, Bengaluru (Feb 2023).','Sandeep M Devasia',null,null,null,null,null,'{https://www.thealpd.org.uk/news/17824/claypaky-fixtures-chosen-for-banyan-tree-installation-at-immersive-sixth-sense-festival}','Find contact'),
('systematic-inc','Systematic Inc','{lights}','strong','Mumbai','{India}','{Clay Paky}','Salim-Sulaiman Live. PALM top 50.',null,null,null,null,null,null,'{https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
('aaquib-wani-design','Aaquib Wani Design','{stage,visuals}','top',null,'{India}','{}','Sunburn main stage and identity 2024, Lollapalooza India 2025, Hanumankind at Lollapalooza, creative direction for Prateek Kuhad''s Silhouettes tour.',null,null,null,'aaquibwani.com',null,null,'{https://www.aaquibwani.com/pktour}','Find contact'),
('men-at-work','Men At Work SMPL','{stage}','strong','Mumbai','{India}','{}','Staging, trussing, kabuki drops, hydraulic lifts. PALM top 50.',null,null,null,null,null,null,'{https://www.palmtechnology.in/uploads/TOP-50-Sound-Audio-Rental---PALM-September-October-2025-adebcb078e73a44e7200da819817100a.pdf}','Find contact'),
-- Visuals
('mantis-shrimp-creative','Mantis Shrimp Creative','{visuals,stage}','top',null,'{India}','{}','Stage visuals and sets: LED, projection mapping, holograms. Magnetic Fields, 15 acts.','Kunal Singh (co-founder)',null,null,null,null,null,'{https://www.deccanherald.com/india/karnataka/bengaluru/visuals-in-live-shows-a-big-draw-in-bengaluru-1202433.html}','Find handle'),
('studio-ocupus','Studio Ocupus','{visuals}','top','Goa','{India}','{TouchDesigner}','Projection mapping and live visuals at Magnetic Fields 2023 (with Aural Eye). Dualist Inquiry visuals at Magnetic Fields and Lollapalooza; Sequel''s Timelapse.','Yash Chandak (co-founder)',null,null,'ocupus.in','ocupus.studio',null,'{https://animatorsguild.com/2024/09/15/wired-for-wonder-in-conversation-with-studio-ocupus/,https://ocupus.in/work/magfields-2023}','DM'),
('cursorama','Cursorama','{visuals}','top','Mumbai','{India}','{TouchDesigner,Resolume}','Dark, strobing techno visuals. Unbox (Bangalore), Ozora, EyeMyth.',null,null,null,null,null,null,'{https://vjbooking.com/artists/cursorama}','Message via VJBooking'),
('vj-kaycee','VJ KayCee','{visuals}','top','Bengaluru','{India}','{}','Described as the first VJ in South India (2007). Festivals, tours with international DJs, IPL LED wall.',null,null,null,null,null,null,'{https://deccanherald.com/india/karnataka/bengaluru/visual-element-entertainment-2254020}','Find handle'),
('vj-harish','VJ Harish (Harish Kumar)','{visuals}','strong','Bengaluru','{India}','{Resolume}','Visuals for Vachan Chinnappa; Skip Intro AV project; IPL.','Harish Kumar',null,null,null,null,null,'{https://www.deccanherald.com/content/524372/visual-wizardry-work.html,https://deccanherald.com/india/karnataka/bengaluru/visual-element-entertainment-2254020}','Find handle'),
('thiruda','Thiruda (Avinash Kumar)','{visuals}','strong',null,'{India}','{}','With Murthovic at Bangalore International Centre; VJ at Video Riot, Mumbai, 2025.','Avinash Kumar',null,null,null,null,null,'{https://www.deccanherald.com/india/karnataka/bengaluru/visuals-in-live-shows-a-big-draw-in-bengaluru-1202433.html,https://www.district.in/events/eyemyth-x-skipabeat-video-riot-jun20-2025-buy-tickets}','Find handle'),
('tejas-nair-spryk','Tejas Nair (Spryk)','{visuals}','strong',null,'{India}','{}','Audio-visual commission at Magnetic Fields (2019).','Tejas Nair',null,null,null,null,null,'{https://www.pressreader.com/india/india-today/20191216/282093458615523}','Find handle'),
('optikbloom','Optikbloom','{visuals,video}','strong',null,'{India}','{}','Visual graphics and video documentation, Magnetic Fields 2023.',null,null,null,null,null,null,'{https://ocupus.in/work/magfields-2023}','Find handle'),
('vj-nirav','VJ Nirav','{visuals}','strong','Mumbai','{India}','{Resolume}','Club VJ since 2008; projection mapping.',null,null,null,null,null,null,'{https://vjbooking.com/artists/vj-nirav}','Message via VJBooking'),
('gaurav-singh-nijjer','Gaurav Singh Nijjer','{visuals}','local','Bengaluru','{Bengaluru}','{TouchDesigner,Resolume}','Real-time visuals, mostly theatre and installations so far.','Gaurav Singh Nijjer','gauravnijjer@gmail.com',null,'gauravnijjer.com',null,null,'{https://www.gauravnijjer.com/role/real-time-visual-artist-bangalore}','Gmail draft ready, not sent'),
-- Photo and video
('rithvik-ar','Rithvik AR','{photo}','strong',null,'{India}','{}','Concert photographer: Lollapalooza, Echoes of Earth, NH7, Bandland; Boris Brejcha, Afrojack, M.I.A.; G-Eazy India tour 2024.','Rithvik AR',null,null,null,'rithvik.ar',null,'{https://www.ticketfairy.com/word/2024/12/18/in-conversation-with-indian-concert-photographer-rithvik-ar}','DM'),
('joseph-fernandes','Joseph Fernandes','{photo}','strong','Mumbai','{India}','{}','Concert photographer: antiSOCIAL Mumbai, G5A, High Spirits Pune.','Joseph Fernandes',null,null,'behance.net/josephdfernandes',null,null,'{https://www.ticketfairy.com/word/2024/12/17/in-conversation-with-indian-concert-photographer-joseph-fernandes}','Find contact'),
('alric-fernandes','Alric Fernandes','{photo,video}','strong','Mumbai','{India}','{}','Photo and video: Mahindra Blues Festival 2024; led the photo team at SpokenFest 2024; antiSOCIAL.','Alric Fernandes',null,null,null,'alricfphotography',null,'{https://www.ticketfairy.com/word/2024/12/19/tfword-in-conversation-with-indias-concert-photographers-and-videographers-spotlighting-alric-fernandes}','DM'),
-- Producers and promoters who know everyone
('swordfish-events','Swordfish Events and Entertainment','{production}','top','Bengaluru','{India}','{}','Production company for Sixth Sense Festival (2023). Roshan Netalkar runs Echoes of Earth.','Roshan Netalkar',null,null,null,null,null,'{https://www.thealpd.org.uk/news/17824/claypaky-fixtures-chosen-for-banyan-tree-installation-at-immersive-sixth-sense-festival,https://www.pressreader.com/india/mint-kolkata/20240511/281715504709882}','Ask for referrals'),
('spacebound','Spacebound','{production,promotion}','strong',null,'{Bengaluru}','{}','Ran Technosphere at Manpho Convention Centre, Bengaluru (Sept 2024) with Anyasa and Sequ3l.','Karan Singh (CEO)',null,null,null,null,null,'{https://www.passionateinmarketing.com/the-ultimate-pop-up-club-night-experience-technosphere-lands-in-bengaluru/}','Promoter call'),
('wild-city','Wild City','{production,promotion}','top',null,'{India}','{}','Music magazine and events agency that co-organises Magnetic Fields.','Munbir Chawla (co-founder)',null,null,'thewildcity.com',null,null,'{https://www.pressreader.com/india/india-today/20191216/282093458615523}','Ask for referrals'),
('eyemyth','EyeMyth Media Arts Festival','{visuals,production}','strong',null,'{India}','{}','Media arts festival that books India''s VJs; ran Video Riot with Skip-A-Beat (antiSOCIAL Mumbai, June 2025).',null,null,null,null,null,null,'{https://www.district.in/events/eyemyth-x-skipabeat-video-riot-jun20-2025-buy-tickets}','Ask for referrals'),
-- Venues with proper systems
('cloud-nyn','Cloud Nyn','{venue}','strong','Bengaluru','{Bengaluru}','{Funktion-One}','Venue with a Funktion-One system (2021 article, check it still runs).',null,null,null,null,null,null,'{https://homegrown.co.in/homegrown-explore/8-music-venues-with-the-best-sound-systems-across-india}','Check'),
('big-bull-hyderabad','Big Bull','{venue}','strong','Hyderabad','{Hyderabad}','{Funktion-One}','30,000 sq ft club with India''s first Funktion-One Vero system (opened March 2025).',null,null,null,null,null,null,'{https://www.thestyle.world/unveiling-big-bull-indias-first-tech-forward-nightclub/}','Reference venue')
on conflict (slug) do nothing;
