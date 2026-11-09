/**
 * Every Cats Can Dance email (plan ccd/v2-plan.md section 9). One layout: a dark header in the product's
 * colour with the white cat, a plain title, a few lines, one button, then the four apps in the footer.
 * Table markup with inline styles, so Gmail, Apple Mail and Outlook draw it the same. Plain strings, no
 * React, so the Next 14 and Next 16 apps share it. Every template returns { subject, preheader, html, text }.
 *
 * Copy rules: plain and direct, no em dashes, no hype. Say what happened and what to do next.
 */

export type Product = "ccd" | "artists" | "gate" | "school";
export type Mail = { subject: string; preheader: string; html: string; text: string };
type Row = [string, string];

const PRODUCT: Record<Product, { name: string; colour: string; ink: string; url: string; cat: string }> = {
  ccd: { name: "Nights", colour: "#2563EB", ink: "#FFFFFF", url: "https://catscandance.com", cat: "dance" },
  artists: { name: "Artists", colour: "#B6EF36", ink: "#0A0A0B", url: "https://artists.catscandance.com", cat: "dance" },
  gate: { name: "Host", colour: "#FFE600", ink: "#0A0A0A", url: "https://gate.catscandance.com", cat: "dance" },
  school: { name: "School", colour: "#FF4D8D", ink: "#0A0A0B", url: "https://school.catscandance.com", cat: "dance" },
};

/** Where the email images live (the cat PNGs are in apps/ccd/public/email). */
const ASSETS = () => (typeof process !== "undefined" && process.env.MAIL_ASSETS_URL) || "https://catscandance.com";

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeHref = (u: string) => (/^(https?:|mailto:)/i.test(u) ? u : "#");
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,monospace";

export type Layout = {
  product: Product;
  preheader: string;
  eyebrow?: string;
  title: string;
  lines: string[];                       // paragraphs, plain text (escaped here)
  rows?: Row[];                          // a small facts table: [label, value]
  code?: string;                         // a big code (ticket, sign-in) shown in mono
  quote?: string;                        // someone's own words (a booking message, a review note)
  cta?: { label: string; href: string };
  after?: string[];                      // small print under the button
};

export function layout(l: Layout): string {
  const p = PRODUCT[l.product];
  const rows = l.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-top:1px solid #26262b">${l.rows
        .map(([k, v]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #26262b;font:500 13px ${FONT};color:#9b9a97;width:38%">${esc(k)}</td><td style="padding:12px 0;border-bottom:1px solid #26262b;font:600 15px ${FONT};color:#F2F0EB">${esc(v)}</td></tr>`)
        .join("")}</table>`
    : "";
  const code = l.code ? `<div style="margin:22px 0 0;padding:18px;border-radius:14px;background:#16161a;text-align:center;font:700 26px ${MONO};letter-spacing:4px;color:#F2F0EB">${esc(l.code)}</div>` : "";
  const quote = l.quote ? `<div style="margin:20px 0 0;padding:4px 0 4px 16px;border-left:3px solid ${p.colour};font:400 16px/1.55 ${FONT};color:#F2F0EB">${esc(l.quote)}</div>` : "";
  const cta = l.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0"><tr><td bgcolor="${p.colour}" style="border-radius:26px"><a href="${esc(safeHref(l.cta.href))}" style="display:inline-block;padding:15px 28px;font:700 16px ${FONT};color:${p.ink};text-decoration:none;border-radius:26px">${esc(l.cta.label)}</a></td></tr></table>`
    : "";
  const after = (l.after ?? []).map((t) => `<p style="margin:14px 0 0;font:400 13px/1.5 ${FONT};color:#9b9a97">${esc(t)}</p>`).join("");
  const apps = (Object.keys(PRODUCT) as Product[])
    .map((k) => `<td style="padding:0 14px 0 0;font:600 12px ${FONT}"><span style="display:inline-block;width:7px;height:7px;border-radius:4px;background:${PRODUCT[k].colour};margin-right:6px"></span><a href="${PRODUCT[k].url}" style="color:#c9c8c4;text-decoration:none">${PRODUCT[k].name}</a></td>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(l.title)}</title></head>
<body style="margin:0;padding:0;background:#050505">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(l.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050505"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td bgcolor="${p.colour}" style="border-radius:22px 22px 0 0;padding:22px 24px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td valign="top" style="font:800 15px ${FONT};letter-spacing:.5px;color:${p.ink};text-transform:uppercase">Cats Can Dance<br><span style="font:600 12px ${MONO};letter-spacing:1px;opacity:.7">${esc(p.name)}</span></td>
    <td align="right" valign="bottom"><img src="${ASSETS()}/email/cat-${p.cat}.png" width="76" height="100" alt="" style="display:block;border:0"></td>
  </tr></table>
</td></tr>
<tr><td bgcolor="#0E0E10" style="border-radius:0 0 22px 22px;padding:30px 26px 32px">
  ${l.eyebrow ? `<div style="font:600 11px ${MONO};letter-spacing:1.5px;text-transform:uppercase;color:#9b9a97">${esc(l.eyebrow)}</div>` : ""}
  <h1 style="margin:${l.eyebrow ? "10px" : "0"} 0 0;font:800 30px/1.08 ${FONT};letter-spacing:-.5px;color:#F2F0EB">${esc(l.title)}</h1>
  ${l.lines.map((t) => `<p style="margin:14px 0 0;font:400 16px/1.55 ${FONT};color:#c9c8c4">${esc(t)}</p>`).join("")}
  ${quote}${rows}${code}${cta}${after}
</td></tr>
<tr><td style="padding:22px 6px 0">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>${apps}</tr></table>
  <p style="margin:14px 0 0;font:400 12px/1.5 ${FONT};color:#6f6e6b">Cats Can Dance, Bengaluru. One sign-in for all four. You got this because of something you did on Cats Can Dance. Questions: reply to this email or write to hello@catscandance.com.</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

const text = (l: Layout) =>
  [l.title, "", ...l.lines, ...(l.rows ?? []).map(([k, v]) => `${k}: ${v}`), l.code ? `\n${l.code}` : "", l.cta ? `\n${l.cta.label}: ${l.cta.href}` : "", ...(l.after ?? []), "", "Cats Can Dance, Bengaluru. hello@catscandance.com"]
    .filter((x) => x !== undefined)
    .join("\n");
/** Any other message in the same design: a title, a few lines, maybe a quote and one button. */
export const note = (o: { product: Product; subject: string; title: string; lines: string[]; preheader?: string; eyebrow?: string; quote?: string; rows?: Row[]; cta?: { label: string; href: string }; after?: string[] }): Mail =>
  mail(o.subject, { product: o.product, preheader: o.preheader ?? o.lines[0] ?? o.title, eyebrow: o.eyebrow, title: o.title, lines: o.lines, quote: o.quote, rows: o.rows, cta: o.cta, after: o.after });

const mail = (subject: string, l: Layout): Mail => ({ subject, preheader: l.preheader, html: layout(l), text: text(l) });
const first = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] || "there";

/* ───────────────────────── All ───────────────────────── */

/** Sign-in link. Supabase sends this one; paste signInTemplate() into Auth, Email templates, Magic link. */
export const signIn = (o: { link: string }) =>
  mail("Your sign-in link", { product: "ccd", preheader: "Tap to sign in. The link works once.", title: "Tap to sign in", lines: ["This signs you in to Nights, Artists, Host and School. The link works once and runs out in an hour."], cta: { label: "Sign in", href: o.link }, after: ["Did not ask for this? Ignore it and nothing happens."] });
/** The same email with Supabase's own placeholder, for the dashboard template. */
export const signInTemplate = () => layout({ product: "ccd", preheader: "Tap to sign in. The link works once.", title: "Tap to sign in", lines: ["This signs you in to Nights, Artists, Host and School. The link works once and runs out in an hour."], cta: { label: "Sign in", href: "https://catscandance.com" }, after: ["Did not ask for this? Ignore it and nothing happens."] }).replace('href="https://catscandance.com" style="display:inline-block;padding:15px', 'href="{{ .ConfirmationURL }}" style="display:inline-block;padding:15px');

/* ───────────────────────── Nights ───────────────────────── */

export const tickets = (o: { name?: string | null; night: string; when: string; where: string; codes: string[]; paid: boolean; link: string; again?: boolean }) =>
  mail(`Your tickets: ${o.night}`, {
    product: "ccd", preheader: `${o.night}, ${o.when}. Your QR is inside.`, eyebrow: o.again ? "Here they are again" : o.paid ? "Paid" : "Free ticket",
    title: o.again ? "Your tickets" : "You are in.",
    lines: [`Hi ${first(o.name)}, ${o.paid ? "your tickets are paid" : "your ticket is confirmed"} for ${o.night}. Open your tickets for the QR, or show these codes at the door, one per person.`],
    rows: [["When", o.when], ["Where", o.where], ["Tickets", String(o.codes.length)]],
    code: o.codes.join("   "), cta: { label: "Open your tickets", href: o.link },
    after: ["Cannot make it? Pass your ticket on at face value from the same page."],
  });

export const crewReady = (o: { name?: string | null; night: string; meet: string; at: string; people: string[]; link: string }) =>
  mail(`Your crew for ${o.night}`, {
    product: "ccd", preheader: `Meet at ${o.at}, ${o.meet}.`, eyebrow: "Your crew", title: "Your crew is ready",
    lines: [`Hi ${first(o.name)}, you are going with ${o.people.join(", ")}. We matched you on how you like a night.`],
    rows: [["Meet", o.meet], ["At", o.at]],
    cta: { label: "Open your crew", href: o.link }, after: ["Your number stays private. Message the crew in the app."],
  });

export const listAnswer = (o: { name?: string | null; night: string; yes: boolean; when: string; link: string }) =>
  mail(o.yes ? `You are on the list: ${o.night}` : `${o.night}: the list is full`, {
    product: "ccd", preheader: o.yes ? "Your QR is inside." : "The host could not fit you in this time.", title: o.yes ? "You are on the list" : "Not this time",
    lines: o.yes ? [`Hi ${first(o.name)}, the host said yes for ${o.night}, ${o.when}. Show the QR at the door.`] : [`Hi ${first(o.name)}, the list for ${o.night} is full. There are more nights this week.`],
    cta: o.yes ? { label: "Open your QR", href: o.link } : { label: "See this week", href: o.link },
  });

export const reminder = (o: { name?: string | null; night: string; when: "tomorrow" | "tonight"; time: string; where: string; link: string; crew?: string }) =>
  mail(o.when === "tonight" ? `Tonight: ${o.night}` : `Tomorrow: ${o.night}`, {
    product: "ccd", preheader: `${o.time}, ${o.where}.`, eyebrow: o.when === "tonight" ? "Tonight" : "Tomorrow", title: o.night,
    lines: [o.when === "tonight" ? "Doors open soon. Your QR is ready and works with no signal." : "Tomorrow night. Your QR is ready."],
    rows: [["Doors", o.time], ["Where", o.where], ...(o.crew ? ([["Crew", o.crew]] as Row[]) : [])],
    cta: { label: "Open your ticket", href: o.link },
  });

export const stub = (o: { name?: string | null; night: string; count: number; link: string }) =>
  mail(`Your stub from ${o.night}`, {
    product: "ccd", preheader: "It is in your set now, with the photos.", eyebrow: "The morning after", title: "Your stub is in",
    lines: [`Hi ${first(o.name)}, ${o.night} is in your set. That makes ${o.count} ${o.count === 1 ? "night" : "nights"}. The photos are up.`],
    cta: { label: "See your set and photos", href: o.link }, after: ["Share your stub and the link brings your friends to the next one."],
  });

export const newDateNear = (o: { name?: string | null; artist: string; date: string; city: string; venue?: string; link: string }) =>
  mail(`${o.artist} plays ${o.city}`, {
    product: "artists", preheader: `${o.date}${o.venue ? `, ${o.venue}` : ""}.`, eyebrow: "Someone you follow", title: `${o.artist} plays ${o.city}`,
    lines: [`Hi ${first(o.name)}, you follow ${o.artist}, so you hear first.`],
    rows: [["When", o.date], ...(o.venue ? ([["Where", o.venue]] as Row[]) : []), ["City", o.city]],
    cta: { label: "See the night", href: o.link },
  });

/* ───────────────────────── Host ───────────────────────── */

export const rsvpIn = (o: { name?: string | null; party: string; when: string; where: string; plus: number; link: string; host?: string }) =>
  mail(`You are on the list: ${o.party}`, {
    product: "gate", preheader: `${o.when}. Your QR is inside.`, eyebrow: "You are going", title: "You are on the list",
    lines: [`Hi ${first(o.name)}, you are going to ${o.party}${o.host ? `, ${o.host}'s party` : ""}${o.plus > 0 ? ` with ${o.plus} more` : ""}. Show the QR at the door.`],
    rows: [["When", o.when], ["Where", o.where]],
    cta: { label: "Open your invite", href: o.link }, after: ["Plans changed? Tap the link and say you cannot make it, so someone else gets the spot."],
  });

export const partyLive = (o: { name?: string | null; party: string; when: string; link: string; manage: string; listed: boolean }) =>
  mail(`${o.party} is live`, {
    product: "gate", preheader: "Share the invite. Names land in Who's coming.", eyebrow: "Your party", title: `${o.party} is live`,
    lines: [`Hi ${first(o.name)}, your invite is up for ${o.when}. Send it to the group chat and names land in Who's coming as people say yes.`, o.listed ? "You asked to list it on Nights. CCD looks at it within a day." : "It is link only, so only people with the invite see it."],
    rows: [["Invite", o.link.replace(/^https?:\/\//, "")]],
    cta: { label: "Open your party", href: o.manage },
  });

export const doorTeam = (o: { night: string; when: string; by?: string; link: string }) =>
  mail(`You are on the door for ${o.night}`, {
    product: "gate", preheader: `${o.when}. Sign in with this email to open the door.`, eyebrow: "The door", title: "You are on the door",
    lines: [`${o.by ? `${o.by} added you` : "You were added"} to the door team for ${o.night}, ${o.when}. Sign in with this email on the night and the scanner opens. It keeps working with no signal.`],
    cta: { label: "Open the door", href: o.link },
  });

export const howItWent = (o: { name?: string | null; night: string; inside: number; noShows: number; peak?: string; link: string }) =>
  mail(`How ${o.night} went`, {
    product: "gate", preheader: `${o.inside} came in.`, eyebrow: "The morning after", title: "How it went",
    lines: [`Hi ${first(o.name)}, here is ${o.night} in numbers.`],
    rows: [["Came in", String(o.inside)], ["No-shows", String(o.noShows)], ...(o.peak ? ([["Busiest", o.peak]] as Row[]) : [])],
    cta: { label: "See the full report", href: o.link }, after: ["Throw the next one from the same page. Your guest list carries over."],
  });

/* ───────────────────────── Artists ───────────────────────── */

export const claimPage = (o: { name: string; records: number; shows: number; link: string }) =>
  mail(`${o.name}, your page is live`, {
    product: "artists", preheader: "Every era and every record, on one page. Claim it.", eyebrow: "Your page", title: "Your page is live",
    lines: [`Hi ${o.name}, we put your page together from your releases, your shows and what has been written about you. Every fact has a source.`, "Claim it and it is yours to run: see your fans, pin their notes, post dates and take bookings."],
    rows: [["Records", String(o.records)], ["Shows", String(o.shows)]],
    cta: { label: "Claim your page", href: o.link }, after: ["Free. Nothing changes on your page until you change it."],
  });

export const bookingAsk = (o: { artist: string; from: string; date: string; city: string; offer?: string; link: string }) =>
  mail(`New ask for ${o.date}`, {
    product: "artists", preheader: `${o.from}, ${o.city}.`, eyebrow: "New booking ask", title: `${o.from} wants you on ${o.date}`,
    lines: [`Hi ${first(o.artist)}, a new ask came in. Say yes, make an offer back, or pass.`],
    rows: [["Date", o.date], ["City", o.city], ...(o.offer ? ([["Offer", o.offer]] as Row[]) : [])],
    cta: { label: "Answer the ask", href: o.link },
  });

export const bookingAnswered = (o: { name?: string | null; artist: string; stage: string; date: string; link: string }) =>
  mail(`${o.artist}: ${o.stage}`, {
    product: "artists", preheader: `For ${o.date}.`, eyebrow: "Booking", title: `${o.artist} answered`,
    lines: [`Hi ${first(o.name)}, ${o.artist} moved your ask for ${o.date} to: ${o.stage}.`],
    cta: { label: "Open the thread", href: o.link },
  });

export const contractToSign = (o: { name?: string | null; artist: string; date: string; fee: string; deposit: string; link: string }) =>
  mail(`Contract to sign: ${o.artist}, ${o.date}`, {
    product: "artists", preheader: "Read it, sign it, and the date is held.", eyebrow: "Contract", title: "Your contract is ready",
    lines: [`Hi ${first(o.name)}, the contract for ${o.artist} on ${o.date} is ready. Read it and sign. Once both of you sign and the deposit is paid, the date is held.`],
    rows: [["Fee", o.fee], ["Deposit", o.deposit]],
    cta: { label: "Read and sign", href: o.link },
  });

export const deposit = (o: { name?: string | null; artist: string; date: string; amount: string; held: boolean; link: string }) =>
  mail(o.held ? `Deposit held: ${o.artist}, ${o.date}` : `Paid out: ${o.artist}, ${o.date}`, {
    product: "artists", preheader: o.held ? "The date is locked." : "The money is on its way to the artist.", eyebrow: o.held ? "Deposit held" : "Paid", title: o.held ? "The date is locked" : "Paid out",
    lines: [o.held ? `Hi ${first(o.name)}, we are holding ${o.amount} for ${o.artist} on ${o.date}. It goes to the artist after the show.` : `Hi ${first(o.name)}, ${o.amount} for ${o.date} is on its way to your bank.`],
    cta: { label: "Open the booking", href: o.link },
  });

export const newOrder = (o: { artist: string; item: string; buyer: string; city: string; link: string }) =>
  mail(`New order: ${o.item}`, {
    product: "artists", preheader: `${o.buyer}, ${o.city}.`, eyebrow: "Your shop", title: "Someone bought from your shop",
    lines: [`Hi ${first(o.artist)}, ${o.buyer} in ${o.city} bought ${o.item}. Pack it and mark it sent.`],
    cta: { label: "See the order", href: o.link },
  });

/* ───────────────────────── Gear and promoters ───────────────────────── */

export const gearRequest = (o: { name?: string | null; kit: string; date: string; quote?: string; link: string }) =>
  mail(o.quote ? `Your quote: ${o.kit}` : `We got your request: ${o.kit}`, {
    product: "gate", preheader: o.quote ? `${o.quote} for ${o.date}.` : "Owners answer within a day.", eyebrow: "Gear", title: o.quote ? "Here is your quote" : "We got your request",
    lines: [o.quote ? `Hi ${first(o.name)}, an owner can do ${o.kit} on ${o.date}.` : `Hi ${first(o.name)}, we sent your request for ${o.kit} on ${o.date} to owners near you. You hear back within a day.`],
    rows: o.quote ? [["Kit", o.kit], ["Date", o.date], ["Quote", o.quote]] : [["Kit", o.kit], ["Date", o.date]],
    cta: { label: o.quote ? "See the quote" : "See your request", href: o.link },
  });

export const promoterReview = (o: { what: string; approved: boolean; note?: string; link: string; night?: boolean }) =>
  mail(o.approved ? `${o.what} is ${o.night ? "live" : "approved"}` : `${o.what}: one thing to fix`, {
    product: "gate", preheader: o.approved ? "You are good to go." : "Fix it and send it again.", eyebrow: "CCD review", title: o.approved ? (o.night ? `${o.what} is live` : `${o.what} is approved`) : "One thing to fix",
    lines: o.approved ? [o.night ? `${o.what} is on Nights now. Share it.` : "You can make nights under your name and in your colours now. The first ten promoters get 5% on paid tickets for six months."] : [`We looked at ${o.what}. ${o.note ?? "Something needs a change before it goes up."}`],
    cta: { label: o.approved ? "Open it" : "Fix it", href: o.link },
  });

/* ───────────────────────── The /ops preview ───────────────────────── */

const S = "https://catscandance.com";
/** Every email with sample data, for the /ops/emails preview. Sample data only; never sent to real people. */
export const SAMPLES: { key: string; group: string; when: string; mail: () => Mail }[] = [
  { key: "sign-in", group: "All", when: "Every sign-in (Supabase template)", mail: () => signIn({ link: `${S}/join` }) },
  { key: "tickets", group: "Nights", when: "After payment", mail: () => tickets({ name: "Aditi", night: "Episode 05", when: "Wed 25 Nov, 20:00", where: "The Humming Tree, Bengaluru", codes: ["CCD-4F7K", "CCD-9Q2M"], paid: true, link: `${S}/tickets/order` }) },
  { key: "crew", group: "Nights", when: "18:00 on the night", mail: () => crewReady({ name: "Aditi", night: "Episode 05", meet: "Third Wave, 12th Main", at: "21:15", people: ["Kiran", "Rohan", "Priya"], link: `${S}/me` }) },
  { key: "list-yes", group: "Nights", when: "When the host says yes", mail: () => listAnswer({ name: "Aditi", night: "DOMi & JD Beck", yes: true, when: "Fri 21 Nov", link: `${S}/me` }) },
  { key: "reminder", group: "Nights", when: "The day before and the day of", mail: () => reminder({ name: "Aditi", night: "Episode 05", when: "tonight", time: "20:00", where: "The Humming Tree", link: `${S}/me`, crew: "Kiran, Rohan, Priya" }) },
  { key: "stub", group: "Nights", when: "The morning after", mail: () => stub({ name: "Aditi", night: "Episode 05", count: 5, link: `${S}/me` }) },
  { key: "new-date", group: "Nights", when: "When an artist you follow posts a date", mail: () => newDateNear({ name: "Aditi", artist: "Sandunes", date: "Sat 6 Dec", city: "Bengaluru", venue: "Bflat", link: "https://artists.catscandance.com/sandunes" }) },
  { key: "rsvp", group: "Host", when: "After an RSVP", mail: () => rsvpIn({ name: "Aditi", party: "Rooftop at Meera's", when: "Sat 15 Nov, 21:00", where: "Indiranagar, Bengaluru", plus: 1, link: "https://gate.catscandance.com/i/example", host: "Meera" }) },
  { key: "party-live", group: "Host", when: "After publishing", mail: () => partyLive({ name: "Meera", party: "Rooftop at Meera's", when: "Sat 15 Nov", link: "https://gate.catscandance.com/i/example", manage: "https://gate.catscandance.com/parties", listed: false }) },
  { key: "door-team", group: "Host", when: "When added to the door", mail: () => doorTeam({ night: "Rooftop at Meera's", when: "Sat 15 Nov", by: "Meera", link: "https://gate.catscandance.com/door" }) },
  { key: "how-it-went", group: "Host", when: "The morning after", mail: () => howItWent({ name: "Meera", night: "Rooftop at Meera's", inside: 48, noShows: 6, peak: "23:00 to 23:15", link: "https://gate.catscandance.com/parties" }) },
  { key: "claim", group: "Artists", when: "Claim campaign", mail: () => claimPage({ name: "Sandunes", records: 24, shows: 16, link: "https://artists.catscandance.com/claim" }) },
  { key: "ask", group: "Artists", when: "When an ask arrives", mail: () => bookingAsk({ artist: "Sandunes", from: "Bflat", date: "Sat 6 Dec", city: "Bengaluru", offer: "₹60k", link: "https://artists.catscandance.com/bookings" }) },
  { key: "answered", group: "Artists", when: "Every stage change", mail: () => bookingAnswered({ name: "Rhea", artist: "Sandunes", stage: "Offer back, ₹70k", date: "Sat 6 Dec", link: "https://artists.catscandance.com/bookings" }) },
  { key: "contract", group: "Artists", when: "When a contract is drafted", mail: () => contractToSign({ name: "Rhea", artist: "Sandunes", date: "Sat 6 Dec", fee: "₹70,000", deposit: "₹21,000 (30%)", link: "https://artists.catscandance.com/bookings" }) },
  { key: "deposit", group: "Artists", when: "On payment", mail: () => deposit({ name: "Rhea", artist: "Sandunes", date: "Sat 6 Dec", amount: "₹21,000", held: true, link: "https://artists.catscandance.com/bookings" }) },
  { key: "order", group: "Artists", when: "On a shop sale", mail: () => newOrder({ artist: "Sandunes", item: "Hand of Thought, vinyl", buyer: "Aditi", city: "Pune", link: "https://artists.catscandance.com/me" }) },
  { key: "gear", group: "Gear", when: "On request and quote", mail: () => gearRequest({ name: "Meera", kit: "2x CDJ-3000, DJM-900", date: "Sat 15 Nov", quote: "₹9,000", link: "https://gate.catscandance.com/gear" }) },
  { key: "promoter", group: "Promoters", when: "CCD review", mail: () => promoterReview({ what: "Dirty Disco", approved: true, link: "https://gate.catscandance.com/promote" }) },
];
