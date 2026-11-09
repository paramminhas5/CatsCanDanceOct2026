/**
 * What each For page says (plan ccd/v2-plan.md section 10). Prices are the published ones from
 * ccd/how-ccd-makes-money.md; anything not built yet is marked "soon" and says so on the page.
 */
import { productLink } from "@ccd/brand";
import type { ForConfig } from "./ForPage";

export const FOR_ARTISTS = (): ForConfig => ({
  key: "artists",
  seo: { title: "For artists · Cats Can Dance", description: "Your page is already here: every era, every record and every show, kept up to date. Claim it, share it, see your fans, take bookings in one thread and post your tour." },
  eyebrow: "For DJs, live acts, VJs and photographers",
  title: "Your page is already here.",
  lead: "We built pages for South Asian artists from their releases, their shows and what has been written about them. Every fact has a source. Claim yours and it is yours to run.",
  colour: "#B6EF36",
  primary: { label: "Claim your page", href: productLink("artists", "/claim") },
  secondary: { label: "Find your page", href: productLink("artists", "/artists") },
  gets: [
    { app: "Artists", title: "Your whole story on one page", shot: "A40-Artist", body: "Your page opens on your records and your eras. Fans play your music, pick an era and see every show you played in it.", bullets: ["Every release, playable, with the tracklist", "Your eras, each with its own colour", "One card with your eras and records, made for your story"] },
    { app: "Artists", title: "Your fans, and where they are", shot: "F38-A-Fans", body: "See who follows you, city by city. Fans leave a line on your page about a show or a record; you choose which ones show and pin three.", bullets: ["Followers by city", "Fan notes you approve and pin", "Followers hear first when you post a date near them"] },
    { app: "Artists", title: "Bookings in one thread", shot: "F38-A-Bookings", body: "Promoters and hosts ask with a date and an offer in your range. You say yes, offer back or pass, and every step sits in one thread.", bullets: ["Your range, shown when someone asks", "Ask, offer back, confirm", "A contract and a deposit held for you (being built now)"] },
    { app: "Artists", title: "Tour dates that reach people", shot: "F38-A-Tour", body: "Post a run of dates or the nights you are free. Followers in each city are told, and promoters looking for that date see you.", bullets: ["Post a tour in a minute", "Open dates go to promoters", "Every date lands on Nights"] },
    { app: "Artists", title: "Sell your music and merch", shot: "F38-A-Shop", soon: true, body: "Put your releases and merch on your page. Fans buy them where they already listen to you.", bullets: ["Records, tapes and merch", "Your own licence on every track you upload", "You pack and send; we handle the payment"] },
    { app: "Host", title: "Throw your own night", shot: "H39-Make", body: "Make a party page in two minutes, take RSVPs or sell tickets, and run the door from your phone.", bullets: ["An invite in your colours", "Guest list or tickets", "A door that works with no signal"] },
  ],
  free: ["Your page, and claiming it", "Your profile card and share links", "Followers and fan notes", "Tour dates and open dates", "Making a party and running the door"],
  costs: [["Bookings", "10% of your fee, shown on the quote"], ["Your shop (when it opens)", "10% of each sale"], ["Paid tickets to your own party", "5%"]],
  loop: { title: "Share it once, it keeps working", body: "Your card goes in your story. Fans who tap it land on your page, follow you, and hear first when you play their city. Promoters see who follows you before they ask." },
  cat: "dance",
  faqs: [
    ["How do I claim my page?", "Tap Claim your page, sign in with your email, and we check it is you, usually within a day. If we sent you a claim link, it is yours in two minutes."],
    ["I am not on it yet.", "Add yourself from the claim page with your links and a mix. We check every page by hand before it goes live."],
    ["Will you change my bio?", "No. Nothing on your page changes without a source, and nothing you wrote changes unless you change it."],
    ["How do I play an Episode?", "Send us a mix and what you would play. We book each Episode around the lineup."],
  ],
  contact: { kind: "artists", label: "Play our Episodes", line: "Our own nights in Bengaluru. Send a mix and tell us what you would play." },
});

export const FOR_VENUES = (): ForConfig => ({
  key: "venues",
  seo: { title: "For venues · Cats Can Dance", description: "Run your nights on Host: a door that works offline, tickets from other sites on one list, artists and gear for the night, a live count, and a report the morning after. List them on Nights." },
  eyebrow: "For clubs, bars and rooftops",
  title: "Run your next night on Host.",
  lead: "The door, the list and the count, on one phone. Tickets from District, Skillbox or BookMyShow sit on the same list as yours, and it keeps working when the signal drops.",
  colour: "#FFE600",
  primary: { label: "Make a night", href: productLink("gate", "/make") },
  secondary: { label: "Try the door", href: productLink("gate", "/door") },
  gets: [
    { app: "Host", title: "A door built for 1 am", shot: "H39-Door", body: "Scan and the screen goes green or red, with a buzz. Several phones on one door share one count, and the first scan wins.", bullets: ["Works with no signal and catches up later", "Tickets from other sites on one list", "Pass-outs and undo"] },
    { app: "Nights", title: "List your nights where people look", shot: "S34-Discover", body: "Nights is what people in your city open when they want to go out. A credible night goes on the week, with your poster.", bullets: ["Your poster on the week", "Guest list, tickets or both", "People come in crews, not just alone"] },
    { app: "Artists", title: "Book the lineup", shot: "H39-BookArtists", body: "See who is free on your date, hear them, and ask with an offer in their range.", bullets: ["Who is free on your date", "One thread per booking", "DJs, live acts, VJs and photographers"] },
    { app: "Gear", title: "Kit for the night", shot: "H39-Gear", body: "Ask for decks, sound or lights for a date. Owners near you answer.", bullets: ["CDJs, mixers, sound and lights", "Delivered and collected", "Asked from the party page"] },
    { app: "Host", title: "Know how it went", shot: "H39-Report", body: "Arrivals by the quarter hour, no-shows, what each ticket type did and what the door took, the next morning.", bullets: ["A live count link for your floor staff", "The report the morning after", "Export everything"] },
  ],
  free: ["The door app and scanner", "Guest lists, as many as you like", "Tickets from other sites", "The live count and the report"],
  costs: [["Paid tickets on your own link", "5%"], ["Tickets sold through Nights", "8%, inside the price shown"], ["Host Pro (no ticket fee, door team, guest history)", "₹1,999 a month, later"]],
  loop: { title: "Every guest list grows the next one", body: "People who come in with a crew bring new people. The ones who came stay on your list for the next night, and the night page sends them back." },
  cat: "dance",
  faqs: [
    ["Can I keep my ticketing?", "Yes. Import your District, Skillbox or BookMyShow list, or let guests add their own ticket, and scan it at the same door."],
    ["What if the internet dies?", "The list lives on the phone. Scans keep working and sync when the signal is back."],
    ["How many people on the door?", "As many as you like. Add them by email; they sign in on the night."],
    ["Who sees my night?", "Link-only nights are seen only by people with the invite. Listed nights go on Nights after a quick check."],
  ],
  contact: { kind: "venues", label: "Talk to us", line: "Want us to run a night at your place, or set up your team? Write to us." },
});

export const FOR_PROMOTERS = (): ForConfig => ({
  key: "promoters",
  seo: { title: "For promoters · Cats Can Dance", description: "Your nights under your name and in your colours, with tickets or a free guest list, crews that bring new people, and a door that works offline. The first ten promoters pay 5% for six months." },
  eyebrow: "For collectives, series and promoters",
  title: "Your nights, under your name.",
  lead: "A page for your series in your colours, every night on Nights, tickets on your own link or a free guest list, and the door on Host. The first ten promoters pay 5% on paid tickets for six months.",
  colour: "#FF4D8D",
  primary: { label: "Apply as a founding promoter", href: productLink("gate", "/promote") },
  secondary: { label: "Make a night now", href: productLink("gate", "/make") },
  gets: [
    { app: "Host", title: "Your page and your look", shot: "H39-Invite", body: "Your series gets its own page with your logo, cover and colour. Every night you make shows up there and on Nights.", bullets: ["Your colours on every night", "Your team on the dashboard", "Every night checked by us, usually within a day"] },
    { app: "Nights", title: "People who would not come alone", shot: "S34-Crew", body: "Solo guests get matched into crews of 3 to 6 at 18:00 on the day, with a place to meet. They come, and they come back.", bullets: ["Crews matched on how people like a night", "Women-only crews if they want", "Numbers stay private"] },
    { app: "Host", title: "Tickets or the guest list", shot: "H39-RSVP", body: "Sell tickets on your own link or run a free guest list you approve. Regulars are marked, so saying yes is one tap.", bullets: ["Yes to all regulars at once", "Their QR goes out straight away", "Tickets from other sites on the same list"] },
    { app: "Host", title: "The door and the report", shot: "H39-Door", body: "A scanner that works with no signal, a live count for the floor, and the report the next morning.", bullets: ["Several doors, one count", "Arrivals by the quarter hour", "What the door took"] },
  ],
  free: ["Your promoter page", "Free nights and guest lists", "Crews", "The door and the report"],
  costs: [["Founding promoters, first six months", "5% on paid tickets"], ["After that, tickets through Nights", "8%, inside the price shown"], ["Paid tickets on your own link", "5%"], ["A promoted slot on the week", "₹500 to ₹5,000 a night, marked as promoted"]],
  loop: { title: "The guide stays worth reading", body: "Only nights with someone credible behind them go up, and a promoted slot is always marked. That is why people trust the week, and why your night gets seen." },
  cat: "dance",
  faqs: [
    ["Who can apply?", "Anyone who throws nights. We look at what you have thrown before and say yes or tell you what to fix, usually within a day."],
    ["What is the founding promoters club?", "The first ten promoters pay 5% on paid tickets for six months, get a say in what we build next, and get their nights on our page."],
    ["Can I use my own ticket link?", "Yes. Put your link on the night, or sell through us. Either way the door scans both."],
    ["Do you take a cut of free nights?", "No. Free nights and guest lists stay free."],
  ],
  contact: { kind: "general", label: "Ask us something", line: "Questions about fees, payouts or your series? Write to us.", message: "I run a series and want to know more about Host: " },
});

export const FOR_BRANDS = (): ForConfig => ({
  key: "brands",
  seo: { title: "For brands · Cats Can Dance", description: "Partner on a Cats Can Dance Episode and the content around it: our own nights in Bengaluru, a page of 150k people who go out, and the artists behind the scene." },
  eyebrow: "For brands",
  title: "Be part of the night, not an ad on it.",
  lead: "We throw our own nights, run a page of about 150,000 people who go out, and know the artists. Partner on an Episode and the content around it.",
  colour: "#2563EB",
  primary: { label: "Talk to us", href: "mailto:hello@catscandance.com?subject=Brand%20partnership" },
  gets: [
    { app: "Nights", title: "An Episode with you in it", shot: "S34-Night", body: "Our Episodes run about once a month in Bengaluru, with a lineup we pick. A partner shapes something on the night that people remember.", bullets: ["One partner per Episode", "On the poster and the night page", "Photos and video from the night"] },
    { app: "Nights", title: "The page, and the content", shot: "S34-BeenTo", body: "The page posts the scene every day. Partner content is made the same way as everything else we post, so people watch it.", bullets: ["About 150,000 people who go out", "Made by us, in our voice", "Every link tracked"] },
    { app: "Artists", title: "The artists behind it", shot: "A40-Artist", body: "We know the South Asian artists in the scene, and their fans follow them on our pages. Work with them through us.", bullets: ["Artist collaborations", "Bookings in one thread", "Every artist's page is public"] },
  ],
  free: ["A call to see if it fits"],
  costs: [["Episode partnership", "Priced per Episode, with the content"]],
  faqs: [
    ["Do you run ads?", "No banners, ever. Partners are part of the night and the content around it."],
    ["Can we pick the artists?", "We pick the lineup. We can build something with an artist who fits."],
  ],
  contact: { kind: "sponsors", label: "Send us a brief", line: "Tell us what you want people to feel. We will tell you if it fits." },
});

export const FOR_GEAR = (): ForConfig => ({
  key: "gear",
  seo: { title: "For gear owners · Cats Can Dance", description: "List your decks, sound and lights. Hosts on Cats Can Dance ask for kit for their parties, and we send the requests to owners near them." },
  eyebrow: "For rental companies and people with kit",
  title: "Your kit, at more parties.",
  lead: "Hosts on Host ask for decks, sound and lights for their nights. We send each request to owners near them. Free for now while we get the handovers right.",
  colour: "#FF8A3D",
  primary: { label: "List your kit", href: "mailto:hello@catscandance.com?subject=List%20my%20kit" },
  gets: [
    { app: "Gear", title: "Requests from real nights", shot: "H39-Gear", body: "Every request comes from a party with a date, a place and a size, so you know what you are quoting for.", bullets: ["CDJs, mixers, sound and lights", "Date, place and size on every request", "Owners near the party first"] },
    { app: "Host", title: "Asked from the party page", shot: "H39-Home", body: "Gear is a step on every party, next to artists and the door, so hosts ask when they are planning, not on the day.", bullets: ["One of the seven steps", "Quote in the thread", "Premium kit listed first"] },
  ],
  free: ["Listing your kit", "Requests and quoting, for now"],
  costs: [["Rentals, once we run handovers", "15% from the owner, 5% from the renter"]],
  faqs: [["Who handles delivery?", "You do for now. Once we run handovers, we can do it for you."], ["What kit do hosts ask for?", "Mostly CDJs and a mixer, then sound and lights."]],
  contact: { kind: "general", label: "Tell us what you have", line: "Send us your list and the areas you cover.", message: "I have kit to list: " },
});
