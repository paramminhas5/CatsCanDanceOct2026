/**
 * The booking contract in plain English (plan ccd/v2-plan.md section 8). Built from the terms stored in
 * booking_contracts.body (migration 067), in three versions: a club set, a festival slot, a private party.
 * The words are a first draft for one lawyer review before real money moves; the page says so.
 */
export type ContractBody = {
  artist: { slug: string; name: string };
  organiser: { name: string; org: string | null };
  date: string | null; city: string | null; venue: string | null; room_size: number | null;
  set_length: string | null; set_time: string | null;
  fee_inr: number; deposit_pct: number; deposit_inr: number; balance_inr: number; ccd_fee_inr: number; artist_gets_inr: number;
  rider: string | null; tech: string | null; travel_terms: string | null; included: string | null; cancellation_terms: string | null; notes: string | null;
};
export type Kind = "club" | "festival" | "private";
export type Contract = {
  version: number; kind: Kind; body: ContractBody; status: "draft" | "signed" | "void"; body_hash: string | null;
  artist_signed: { name: string; at: string } | null; requester_signed: { name: string; at: string } | null;
  deposit_paid_at: string | null; balance_paid_at: string | null; balance_method: string | null; updated_at: string; role: "artist" | "requester";
};

export const KINDS: { key: Kind; label: string; line: string }[] = [
  { key: "club", label: "Club set", line: "A set at a club or bar night" },
  { key: "festival", label: "Festival", line: "A slot on a festival or a big stage" },
  { key: "private", label: "Private party", line: "A wedding, a house party or a company night" },
];

const inr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-IN")}`;
const day = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "the agreed date");

/** The contract as numbered sections, each a heading and its lines. */
export function clauses(b: ContractBody, kind: Kind): { h: string; p: string[] }[] {
  const org = b.organiser.org ? `${b.organiser.name} for ${b.organiser.org}` : b.organiser.name;
  const where = [b.venue, b.city].filter(Boolean).join(", ") || "the agreed venue";
  const cancelDefault =
    kind === "private"
      ? "If the organiser cancels more than 30 days before, the deposit is returned less any travel already booked. Within 30 days, the deposit is kept. Within 7 days, the full fee is due."
      : kind === "festival"
        ? "If the organiser cancels more than 45 days before, the deposit is returned. Within 45 days, the deposit is kept. Within 14 days, the full fee is due."
        : "If the organiser cancels more than 14 days before, the deposit is returned. Within 14 days, the deposit is kept. Within 72 hours, the full fee is due.";
  return [
    { h: "Who this is between", p: [`${b.artist.name} (the artist) and ${org} (the organiser). Cats Can Dance arranged the booking and keeps the record of it.`] },
    {
      h: "The show",
      p: [
        `${b.artist.name} plays ${where} on ${day(b.date)}.`,
        [b.set_length ? `Set: ${b.set_length}.` : null, b.set_time ? `Set time: ${b.set_time}.` : null, b.room_size ? `Room: about ${b.room_size} people.` : null].filter(Boolean).join(" ") || "Set length and time as agreed in the thread.",
        kind === "festival" ? "The organiser shares the running order and stage times at least 7 days before." : kind === "private" ? "The organiser tells the artist about the guests, the space and any music they should avoid at least 7 days before." : "The organiser shares the night's running order at least 3 days before.",
      ],
    },
    {
      h: "The fee",
      p: [
        `The fee is ${inr(b.fee_inr)}.`,
        b.deposit_inr > 0 ? `A deposit of ${inr(b.deposit_inr)} (${b.deposit_pct}%) is paid through Cats Can Dance when both sides sign. Cats Can Dance holds it until after the show.` : "There is no deposit.",
        `The balance of ${inr(b.balance_inr)} is paid by the end of the night, through Cats Can Dance or directly to the artist. The artist marks it paid in the thread.`,
        `Cats Can Dance's fee is 10% of the artist's fee (${inr(b.ccd_fee_inr)}), taken from the artist's side. The artist receives ${inr(b.artist_gets_inr)}. The organiser pays nothing on top.`,
      ],
    },
    { h: "Tech and rider", p: [b.tech ? `Tech: ${b.tech}` : "Tech as agreed in the thread.", b.rider ? `Rider: ${b.rider}` : "No rider beyond water and a safe place to keep gear.", b.included ? `Included in the fee: ${b.included}` : ""].filter(Boolean) },
    { h: "Travel and stay", p: [b.travel_terms || (b.city ? `If the show is outside the artist's city, the organiser covers return travel and a night's stay unless the thread says otherwise.` : "As agreed in the thread.")] },
    { h: "If the organiser cancels", p: [b.cancellation_terms || cancelDefault] },
    { h: "If the artist cancels", p: ["The deposit is returned in full within 7 days. The artist helps find a replacement if they can. Missing a show without a real reason (illness, travel failure, an emergency) can mean the page shows the cancellation."] },
    { h: "Things outside anyone's control", p: ["If the show cannot happen because of weather, a government order, a venue closure or anything like it, neither side owes the other more than what was already spent, and the deposit is returned less any costs both sides agree."] },
    { h: "Recording and photos", p: ["The organiser may photograph and film the show for its own channels and credits the artist. Selling a recording of the set needs the artist's written OK."] },
    { h: "Disputes", p: ["Both sides first try to sort it out in the thread. If they cannot, Cats Can Dance looks at the thread and this contract and suggests a fair outcome. This does not take away anyone's legal rights. Indian law applies; courts in Bengaluru."] },
    ...(b.notes ? [{ h: "Also agreed", p: [b.notes] }] : []),
  ];
}
