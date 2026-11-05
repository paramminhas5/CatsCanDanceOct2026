// Static scene data for city pages, global scene pages, and genre pages.

export type CityScene = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  accentColor: string; // tailwind bg class
  textColor: string;
  activeGenres: string[];
  keyVenues: string[];
  starterPlaylistEmbed: string | null; // YouTube embed ID
};

export const CITY_SCENES: CityScene[] = [
  {
    slug: "bengaluru",
    name: "Bengaluru",
    tagline: "House, disco, jungle and D&B.",
    description:
      "Bengaluru's club nights lean on house, disco, jungle and drum & bass, with garage and techno too. Cats Can Dance started here with a Wednesday night at Bar Wild in Indiranagar in April 2025.",
    accentColor: "bg-electric-blue",
    textColor: "text-cream",
    activeGenres: ["House", "Disco", "Jungle", "Drum & Bass", "Garage", "Techno"],
    keyVenues: ["Bar Wild", "The Humming Tree", "Indiranagar Social", "Kitty Ko"],
    starterPlaylistEmbed: "PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSK",
  },
  {
    slug: "mumbai",
    name: "Mumbai",
    tagline: "Techno, house and Afro house.",
    description:
      "Mumbai has regular techno and house nights, many of them at antiSOCIAL in Lower Parel. Afro house, minimal and more experimental sets turn up too. Sandunes, an electronic producer and composer, is based here.",
    accentColor: "bg-magenta",
    textColor: "text-cream",
    activeGenres: ["Techno", "House", "Afro House", "Minimal", "Experimental"],
    keyVenues: ["antiSOCIAL", "Khar Social"],
    starterPlaylistEmbed: null,
  },
  {
    slug: "delhi",
    name: "Delhi",
    tagline: "Techno, minimal and house.",
    description:
      "Delhi and Gurgaon have a long-running techno and house scene. Kohra, a Delhi DJ and producer, founded the label Qilla Records in 2011. Hamza Rahimtula, who makes deep house, is also based in Delhi.",
    accentColor: "bg-ink",
    textColor: "text-cream",
    activeGenres: ["Techno", "Minimal", "Industrial", "Ambient", "House"],
    keyVenues: ["Dirty Good", "Room XO", "Bianco", "Cosy Box", "KAI"],
    starterPlaylistEmbed: null,
  },
  {
    slug: "goa",
    name: "Goa",
    tagline: "Goa trance started here.",
    description:
      "Goa trance grew out of beach parties in North Goa in the late 1980s and early 1990s, and spread worldwide as psytrance. Goa still hosts parties and festivals, from beach clubs to one-off events.",
    accentColor: "bg-lime",
    textColor: "text-ink",
    activeGenres: ["Goa Trance", "Psytrance", "Techno", "Ambient", "World"],
    keyVenues: ["The Loft at Ānamiva", "JUNA", "RROV"],
    starterPlaylistEmbed: null,
  },
  {
    slug: "hyderabad",
    name: "Hyderabad",
    tagline: "Techno, breaks, electro and house.",
    description:
      "Boiler Room came to Hyderabad in May 2022. Murthovic, a Hyderabad DJ and producer, played it, and so did the US-based producer Nikki Nair.",
    accentColor: "bg-orange",
    textColor: "text-ink",
    activeGenres: ["Techno", "Breakbeat", "Electro", "House"],
    keyVenues: [],
    starterPlaylistEmbed: null,
  },
  {
    slug: "pune",
    name: "Pune",
    tagline: "House, techno and live electronics.",
    description:
      "Pune is a few hours from Mumbai and has a large student population. Its nights mix house, techno, funk and disco, with some live electronic sets.",
    accentColor: "bg-acid-yellow",
    textColor: "text-ink",
    activeGenres: ["House", "Techno", "Live Electronics", "Funk", "Disco"],
    keyVenues: [],
    starterPlaylistEmbed: null,
  },
];


// ─── Global Scenes ────────────────────────────────────────────────────────────

export type GlobalScene = {
  slug: string;
  name: string;
  city: string;
  decade: string;
  tagline: string;
  origin: string;
  indiaConnection: string;
  keyArtists: string[];
  starterTracks: { title: string; artist: string; youtubeId: string }[];
  accentColor: string;
  textColor: string;
  bpm: string;
  relatedGenres: string[];
};

export const GLOBAL_SCENES: GlobalScene[] = [
  {
    slug: "detroit-techno",
    name: "Detroit Techno",
    city: "Detroit, USA",
    decade: "1980s",
    tagline: "Where techno started.",
    origin:
      "Techno came out of Detroit in the mid-1980s. Juan Atkins, Derrick May and Kevin Saunderson, school friends from nearby Belleville, mixed Kraftwerk, funk and electro using synths and drum machines. Atkins released records as Model 500.",
    indiaConnection:
      "Techno is played across India's big cities. In Delhi, Kohra's label Qilla Records has put out Indian techno and house since 2011.",
    keyArtists: ["Juan Atkins", "Derrick May", "Kevin Saunderson", "Underground Resistance", "Jeff Mills"],
    starterTracks: [
      { title: "No UFOs", artist: "Model 500", youtubeId: "SHMaEa4Mj7c" },
      { title: "Strings of Life", artist: "Derrick May", youtubeId: "8dIDmYkTBLk" },
      { title: "Good Life", artist: "Inner City", youtubeId: "k4jk7vw7KFc" },
    ],
    accentColor: "bg-ink",
    textColor: "text-cream",
    bpm: "130–145",
    relatedGenres: ["Techno", "Industrial Techno", "Electro"],
  },
  {
    slug: "chicago-house",
    name: "Chicago House",
    city: "Chicago, USA",
    decade: "1980s",
    tagline: "Where house started.",
    origin:
      "House took its name from the Warehouse, a Chicago club where Frankie Knuckles was the resident DJ from 1977. Early house paired disco's 4/4 kick with drum machines and cheap synths. Its first crowds were mostly Black and gay.",
    indiaConnection:
      "Deep, tech and soulful house all come from this root. Cats Can Dance nights in Bengaluru play house alongside disco, jungle and drum & bass.",
    keyArtists: ["Frankie Knuckles", "Larry Heard", "Marshall Jefferson", "Jesse Saunders"],
    starterTracks: [
      { title: "Your Love", artist: "Frankie Knuckles", youtubeId: "rBOA2Kk0oBc" },
      { title: "Can You Feel It", artist: "Larry Heard", youtubeId: "P2JgFVH3-Cs" },
      { title: "Move Your Body", artist: "Marshall Jefferson", youtubeId: "O3UJaYAR3BI" },
    ],
    accentColor: "bg-acid-yellow",
    textColor: "text-ink",
    bpm: "120–130",
    relatedGenres: ["House", "Deep House", "Tech House", "Soulful House"],
  },
  {
    slug: "london-jungle",
    name: "London Jungle / Drum & Bass",
    city: "London, UK",
    decade: "1990s",
    tagline: "Breakbeats and sub-bass, around 170 BPM.",
    origin:
      "Jungle came out of London's rave scene in the early 1990s. It mixed breakbeat hardcore with the bass, reggae and MC culture of Jamaican sound systems. By the mid-90s the music was mostly called drum & bass.",
    indiaConnection:
      "Cats Can Dance nights in Bengaluru play jungle and drum & bass.",
    keyArtists: ["Goldie", "LTJ Bukem", "Grooverider", "Fabio", "4hero", "DJ Hype"],
    starterTracks: [
      { title: "Inner City Life", artist: "Goldie", youtubeId: "gXXFbsB1koo" },
      { title: "Horizons", artist: "LTJ Bukem", youtubeId: "u-fJADVAqKc" },
      { title: "Mr Kirk's Nightmare", artist: "4hero", youtubeId: "FT1pQUFnQCs" },
    ],
    accentColor: "bg-lime",
    textColor: "text-ink",
    bpm: "160–180",
    relatedGenres: ["Jungle", "Drum & Bass", "Liquid DnB", "Neurofunk"],
  },
  {
    slug: "berlin-techno",
    name: "Berlin Techno",
    city: "Berlin, Germany",
    decade: "1990s",
    tagline: "Techno in empty buildings after the Wall fell.",
    origin:
      "After the Berlin Wall fell in 1989, empty buildings in the old East became clubs. Tresor opened in 1991 in a vault under a former department store. Berghain opened in 2004 in a former power station. Berlin techno tends to be harder and darker than Detroit's, and clubs often run through the weekend.",
    indiaConnection:
      "For techno in India, see the Delhi city page and the techno genre page.",
    keyArtists: ["Marcel Dettmann", "Ben Klock", "Surgeon", "DVS1"],
    starterTracks: [
      { title: "Cascade", artist: "Marcel Dettmann", youtubeId: "8GVFPuBYa4c" },
      { title: "Accelerator", artist: "Ben Klock", youtubeId: "oNvqIh6H8rY" },
    ],
    accentColor: "bg-ink",
    textColor: "text-cream",
    bpm: "136–145",
    relatedGenres: ["Techno", "Industrial Techno", "Dark Techno"],
  },
  {
    slug: "uk-garage",
    name: "UK Garage",
    city: "London, UK",
    decade: "1990s",
    tagline: "Pitched-up vocals and shuffled beats.",
    origin:
      "UK garage came out of London in the mid-1990s and spread through pirate radio. It took US house and R&B and made them faster and more syncopated, with chopped and pitched vocals. Grime and dubstep grew out of it.",
    indiaConnection:
      "Cats Can Dance nights in Bengaluru play garage alongside house, disco and jungle.",
    keyArtists: ["Todd Edwards", "MJ Cole", "DJ EZ", "Artful Dodger", "Craig David"],
    starterTracks: [
      { title: "Re-Rewind", artist: "Artful Dodger ft. Craig David", youtubeId: "mRfSM-0jBiM" },
      { title: "Sincere", artist: "MJ Cole", youtubeId: "3zPBbTz1xkA" },
    ],
    accentColor: "bg-electric-blue",
    textColor: "text-cream",
    bpm: "130–135",
    relatedGenres: ["UK Garage", "Grime", "Bassline", "2-Step"],
  },
  {
    slug: "nyc-house",
    name: "New York House",
    city: "New York, USA",
    decade: "1980s–90s",
    tagline: "Paradise Garage, Larry Levan and vocal house.",
    origin:
      "Larry Levan was the resident DJ at the Paradise Garage in New York from 1977 to 1987. Its crowd was mostly Black, Latino and gay. New York house, often called garage after the club, leans on gospel and soul vocals.",
    indiaConnection:
      "For house in India, see the house and disco genre pages.",
    keyArtists: ["Larry Levan", "François Kevorkian", "Masters At Work", "Todd Terry", "Louie Vega"],
    starterTracks: [
      { title: "The Basement", artist: "Kenny Dope presents The Bucketheads", youtubeId: "MQiWqSmNOdw" },
      { title: "Work", artist: "Masters At Work", youtubeId: "hT4e-1W-Ys8" },
    ],
    accentColor: "bg-magenta",
    textColor: "text-cream",
    bpm: "120–128",
    relatedGenres: ["Soulful House", "Vocal House", "Deep House", "Garage"],
  },
  {
    slug: "goa-trance",
    name: "Goa Trance",
    city: "Goa, India",
    decade: "1980s–90s",
    tagline: "Trance from the beaches of North Goa.",
    origin:
      "Goa trance grew out of beach parties in North Goa run by Western travellers in the late 1980s and early 1990s. DJs such as Goa Gil played long sets there. The sound spread to Europe and Israel in the 90s and became psytrance.",
    indiaConnection:
      "Goa trance started in India, in North Goa.",
    keyArtists: ["Goa Gil", "Astral Projection", "Man With No Name", "Juno Reactor", "Infected Mushroom"],
    starterTracks: [
      { title: "Trust in Trance", artist: "Astral Projection", youtubeId: "SPlSZPsepbI" },
      { title: "Outside the Asylum", artist: "Man With No Name", youtubeId: "dFtmFkAVA80" },
    ],
    accentColor: "bg-lime",
    textColor: "text-ink",
    bpm: "145–160",
    relatedGenres: ["Goa Trance", "Psytrance", "Forest", "Full-On"],
  },
];


// ─── Genre Pages ──────────────────────────────────────────────────────────────

export type GenrePage = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  bpm: string;
  origin: string;
  originDecade: string;
  indianScene: string;
  keyIndianArtists: string[];
  globalLandmarks: string[];
  starterTracks: { title: string; artist: string; youtubeId: string }[];
  accentColor: string;
  textColor: string;
  relatedGlobalScene: string | null;
};

export const GENRE_PAGES: GenrePage[] = [
  {
    slug: "techno",
    name: "Techno",
    tagline: "Repetitive, machine-made dance music from Detroit.",
    description:
      "Techno is built on a steady 4/4 kick, synth lines and drum machines, usually between 130 and 150 BPM. Tracks repeat and change slowly, so DJs often mix them in long blends.",
    bpm: "130–150",
    origin: "Detroit, USA",
    originDecade: "1980s",
    indianScene:
      "Kohra, a Delhi DJ and producer, has run the label Qilla Records since 2011. Murthovic, from Hyderabad, played Boiler Room there in 2022. Techno nights run in Delhi, Mumbai and Bengaluru.",
    keyIndianArtists: ["Kohra", "Murthovic", "BLOT!"],
    globalLandmarks: ["Movement Festival Detroit", "Berghain Berlin", "Tresor Berlin", "fabric London"],
    starterTracks: [
      { title: "No UFOs", artist: "Model 500", youtubeId: "SHMaEa4Mj7c" },
      { title: "Strings of Life", artist: "Derrick May", youtubeId: "8dIDmYkTBLk" },
    ],
    accentColor: "bg-ink",
    textColor: "text-cream",
    relatedGlobalScene: "detroit-techno",
  },
  {
    slug: "house",
    name: "House",
    tagline: "Four to the floor, from Chicago.",
    description:
      "House has a kick drum on every beat, a bassline, chords and often a vocal. It started in Chicago in the early 1980s, in clubs with mostly Black and gay crowds.",
    bpm: "120–135",
    origin: "Chicago, USA",
    originDecade: "1980s",
    indianScene:
      "House is played at club nights in most Indian cities. Hamza Rahimtula in Delhi makes deep house; his album Origins with Rajasthan Folkstars came out on Sol Selectas in 2025. Cats Can Dance nights in Bengaluru play house.",
    keyIndianArtists: ["Hamza Rahimtula", "Kohra", "BLOT!"],
    globalLandmarks: ["The Warehouse Chicago", "Paradise Garage NYC", "Fabric London", "DC-10 Ibiza"],
    starterTracks: [
      { title: "Your Love", artist: "Frankie Knuckles", youtubeId: "rBOA2Kk0oBc" },
      { title: "Can You Feel It", artist: "Larry Heard", youtubeId: "P2JgFVH3-Cs" },
    ],
    accentColor: "bg-acid-yellow",
    textColor: "text-ink",
    relatedGlobalScene: "chicago-house",
  },
  {
    slug: "jungle-dnb",
    name: "Jungle / Drum & Bass",
    tagline: "Breakbeats at around 170 BPM.",
    description:
      "Jungle and drum & bass are built on chopped-up drum breaks at 160 to 180 BPM over heavy sub-bass. They came out of London in the early 1990s and borrow a lot from Jamaican sound system culture.",
    bpm: "160–180",
    origin: "London, UK",
    originDecade: "1990s",
    indianScene:
      "Cats Can Dance nights in Bengaluru play jungle and drum & bass.",
    keyIndianArtists: [],
    globalLandmarks: ["Fabric Room Two London", "Metalheadz Sundays (Blue Note London)", "Hospital Records"],
    starterTracks: [
      { title: "Inner City Life", artist: "Goldie", youtubeId: "gXXFbsB1koo" },
      { title: "Horizons", artist: "LTJ Bukem", youtubeId: "u-fJADVAqKc" },
    ],
    accentColor: "bg-lime",
    textColor: "text-ink",
    relatedGlobalScene: "london-jungle",
  },
  {
    slug: "uk-garage",
    name: "UK Garage",
    tagline: "Shuffled beats and pitched vocals.",
    description:
      "UK garage takes house and R&B and makes them faster and more syncopated, with pitched-up vocals. It came out of London in the mid-1990s through pirate radio. Grime and dubstep grew out of it.",
    bpm: "130–135",
    origin: "London, UK",
    originDecade: "1990s",
    indianScene:
      "Cats Can Dance nights in Bengaluru play garage.",
    keyIndianArtists: [],
    globalLandmarks: ["Ministry of Sound London", "Twice as Nice nights", "Kiss 100 FM"],
    starterTracks: [
      { title: "Re-Rewind", artist: "Artful Dodger ft. Craig David", youtubeId: "mRfSM-0jBiM" },
      { title: "Sincere", artist: "MJ Cole", youtubeId: "3zPBbTz1xkA" },
    ],
    accentColor: "bg-electric-blue",
    textColor: "text-cream",
    relatedGlobalScene: "uk-garage",
  },
  {
    slug: "disco",
    name: "Disco",
    tagline: "Before house, there was disco.",
    description:
      "Disco came out of New York clubs in the early 1970s, with mostly Black, Latino and gay crowds. It made the steady 4/4 kick and the all-night DJ set standard. House grew directly out of it.",
    bpm: "110–130",
    origin: "New York, USA",
    originDecade: "1970s",
    indianScene:
      "Hindi film music had a disco era in the late 1970s and 1980s, led by Bappi Lahiri's soundtracks. Cats Can Dance nights in Bengaluru play disco.",
    keyIndianArtists: ["Bappi Lahiri"],
    globalLandmarks: ["Studio 54 NYC", "Paradise Garage NYC", "The Loft NYC"],
    starterTracks: [
      { title: "I Feel Love", artist: "Donna Summer", youtubeId: "k5HWR1JGgyM" },
      { title: "Le Freak", artist: "Chic", youtubeId: "wlVDEHoJJCk" },
    ],
    accentColor: "bg-magenta",
    textColor: "text-cream",
    relatedGlobalScene: null,
  },
  {
    slug: "ambient",
    name: "Ambient",
    tagline: "Music for a room, not a dance floor.",
    description:
      "Ambient music sets a mood rather than asking for attention. Brian Eno named it with Music for Airports in 1978. Chill-out rooms at early UK raves played it between dance sets.",
    bpm: "60–90 (or none)",
    origin: "UK / Global",
    originDecade: "1970s–80s",
    indianScene:
      "Sandunes is a Mumbai electronic producer and composer. Dualist Inquiry is a Delhi electronica producer.",
    keyIndianArtists: ["Sandunes", "Dualist Inquiry"],
    globalLandmarks: ["chill-out rooms of early UK raves", "Kompakt label Germany"],
    starterTracks: [
      { title: "Music For Airports (1/1)", artist: "Brian Eno", youtubeId: "vNwYtllyt3Q" },
    ],
    accentColor: "bg-electric-blue",
    textColor: "text-cream",
    relatedGlobalScene: null,
  },
];
