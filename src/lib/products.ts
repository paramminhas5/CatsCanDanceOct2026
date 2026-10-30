import { SCHOOL_URL } from "./ccd-db";

export type Product = { name: string; verb: string; href: string; line: string; external?: boolean; live: boolean };

// One product per job. All sit under Cats Can Dance.
export const PRODUCTS: Product[] = [
  { name: "Episodes", verb: "Go", href: "/episodes", line: "Our own nights. Dates, lineups, RSVP.", live: true },
  { name: "Prowl", verb: "Find", href: "/prowl", line: "What is on across India this month. Submit yours.", live: true },
  { name: "Litter", verb: "Book", href: "/litter", line: "The artist roster. Send a booking request.", live: true },
  { name: "Tour", verb: "Tour", href: "/tour", line: "Who is touring where. Post your dates, promoters book you.", live: true },
  { name: "CCD.SCHOOL", verb: "Learn", href: SCHOOL_URL, line: "Music production lessons and missions.", external: true, live: true },
  { name: "Nine Lives", verb: "Adopt", href: "/nine-lives", line: "Animal welfare groups across India.", live: true },
  { name: "Scratch", verb: "Wear", href: "/scratch", line: "Drops and streetwear.", live: false },
  { name: "Catwalk", verb: "Listen", href: "/catwalk", line: "Mixes, playlists and the label.", live: false },
];
