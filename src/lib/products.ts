import { SCHOOL_URL } from "./ccd-db";

export type Product = { name: string; verb: string; href: string; line: string; external?: boolean; live: boolean };

// One product per job. All sit under Cats Can Dance.
// verb = the plain name (nav, titles, URLs); name = the nickname used in copy.
export const PRODUCTS: Product[] = [
  { name: "Episodes", verb: "Our nights", href: "/nights", line: "The nights we run. Tickets, lineups, your crew.", live: true },
  { name: "Gig guide", verb: "What's on", href: "/whats-on", line: "Underground nights across India, checked by hand.", live: true },
  { name: "Book an artist", verb: "Artists", href: "/artists", line: "DJs, live acts and bands. Request a booking.", live: true },
  { name: "Strays", verb: "On tour", href: "/tour", line: "Who is playing where. Artists post dates, promoters book them.", live: true },
  { name: "CCD.SCHOOL", verb: "Learn", href: SCHOOL_URL, line: "Learn to DJ and produce.", external: true, live: true },
  { name: "Nine Lives", verb: "Adopt", href: "/adopt", line: "Animal welfare groups across India.", live: true },
  { name: "Merch", verb: "Shop", href: "/shop", line: "Drops and streetwear.", live: false },
  { name: "Mixes", verb: "Listen", href: "/listen", line: "Mixes and playlists.", live: false },
];
