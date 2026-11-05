/**
 * /gate: the door app as a product (Param, 5 Nov 2026: "it's a cool product on its own if it can integrate with other QRs").
 * What it does, Free and Pro (billing off until flag gate_billing is on: everyone gets Pro), and how to start.
 * The app itself is /door (noindex). This page is the one search engines should find.
 */
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const SITE = "https://catscandance.com";

const FEATURES: [string, string][] = [
  ["Scan any phone", "The phone camera reads QR tickets. Green to let them in, red if it was already used or refunded."],
  ["Tickets from anywhere", "Import the attendee list from District, BookMyShow, Skillbox, Insider or any CSV. Their QR codes and booking IDs scan here too."],
  ["Guests add their own", "Guests who bought elsewhere add their booking before the night, with a screenshot, so their name is already on your list."],
  ["Works with no signal", "The list lives on the phone. Scans keep working in a basement and sync when the signal comes back."],
  ["Many doors, one count", "Run three phones on one door. The first scan wins, so the same ticket can't get in twice."],
  ["Guest list and plus-ones", "Search a name, tap them in, count a party of five in as they arrive."],
  ["Walk-ins and UPI", "Add walk-ins with what they paid. UPI shows a QR for the exact amount, paid straight to your UPI id."],
  ["Pass-outs", "Scan people out for a smoke, scan them back in. They keep their place."],
  ["Live count for the venue", "A link for the venue manager: how many are inside against capacity, no names."],
  ["The report", "Turnout, no-shows, the busiest 15 minutes, takings by method and how many had been to a CCD night before."],
];

const FAQ: [string, string][] = [
  ["Do I have to sell tickets on CCD to use it?", "No. Import the list from wherever you sell, add your guest list, and take walk-ins. CCD tickets scan too if you use them."],
  ["Which ticket platforms does it work with?", "Anything that gives you an attendee or booking export: District, BookMyShow, Skillbox, Insider and others. Download the CSV, import it, and their codes scan at your door."],
  ["Does it work offline?", "Yes. Open the door while you have signal and the list is saved on the phone. Scans, the guest list and walk-ins all work offline and sync later."],
  ["What does it cost?", "Free while we launch. Later there will be a Free plan and a Pro plan. Free keeps every feature with up to 100 imported outside guests a night; Pro has no limit. We will tell you the price before anything changes."],
  ["Who can use it?", "Promoters running nights on CCD, and their door team. Apply at /promote. Venues and artists running their own nights can apply the same way."],
];

const ld = [
  {
    "@context": "https://schema.org", "@type": "SoftwareApplication", name: "CCD Gate", applicationCategory: "BusinessApplication",
    operatingSystem: "Any phone with a browser", url: `${SITE}/gate`,
    description: "Door app for club nights in India: QR ticket scanning, guest list, walk-ins with UPI, pass-outs, a live count and a report. Imports tickets from District, BookMyShow and Skillbox. Works offline.",
    offers: { "@type": "Offer", price: 0, priceCurrency: "INR" },
    publisher: { "@type": "Organization", name: "Cats Can Dance", url: SITE },
  },
  { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
];

export default function GatePage() {
  return (
    <main className="bg-cream text-ink min-h-screen">
      <SEO title="Gate: QR check-in and guest list app for club nights | Cats Can Dance"
        description="Scan QR tickets, run the guest list, take walk-ins with UPI and count the room on any phone. Imports tickets from District, BookMyShow and Skillbox. Works offline. Free while we launch."
        path="/gate" jsonLd={ld} />
      <Nav />
      <section className="bg-ink text-cream border-b-4 border-ink pt-28 pb-12">
        <div className="container max-w-5xl">
          <p className="font-display text-acid-yellow text-lg">GATE · THE CCD DOOR</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.9] mt-2">The door, sorted.</h1>
          <p className="mt-4 text-lg md:text-xl text-cream/85 max-w-2xl">
            One phone runs your whole entry: QR tickets, the guest list, walk-ins and the count. Tickets from District, BookMyShow and Skillbox scan here too.
            It keeps working when the basement has no signal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/promote" className="font-display text-xl px-6 py-3 bg-acid-yellow text-ink border-4 border-cream">Use it for your night</Link>
            <Link href="/door" className="font-display text-xl px-6 py-3 border-4 border-cream">Open the door</Link>
          </div>
        </div>
      </section>

      <section className="container max-w-5xl py-12">
        <h2 className="font-display text-3xl md:text-4xl leading-none">How a night runs</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["Before", "Import the lists from wherever you sold. Add your door team by email."],
            ["Guests", "People who bought elsewhere add their booking on your night page, so you have their name."],
            ["Doors", "Every phone on the door scans, searches names and adds walk-ins. One count across all of them."],
            ["After", "The report: who came, when, what the door took, who came back."],
          ].map(([t, d], i) => (
            <li key={t} className="border-4 border-ink bg-white p-4">
              <p className="font-display text-sm text-ink/60">0{i + 1}</p>
              <p className="font-display text-xl leading-tight">{t}</p>
              <p className="text-sm mt-1 text-ink/80">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container max-w-5xl pb-12">
        <h2 className="font-display text-3xl md:text-4xl leading-none">What it does</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {FEATURES.map(([t, d]) => (
            <li key={t} className="border-4 border-ink bg-white p-4">
              <p className="font-display text-lg leading-tight">{t}</p>
              <p className="text-sm mt-1 text-ink/80">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-acid-yellow border-y-4 border-ink">
        <div className="container max-w-5xl py-12">
          <h2 className="font-display text-3xl md:text-4xl leading-none">Plans</h2>
          <p className="mt-2 font-bold">Everything is free while we launch. Every account gets Pro until we switch billing on, and we will tell you first.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="border-4 border-ink bg-cream p-5">
              <p className="font-display text-2xl">Free</p>
              <ul className="mt-3 space-y-1.5 text-sm list-disc pl-5">
                <li>Every door feature on this page</li>
                <li>CCD tickets, the free list and walk-ins with no limit</li>
                <li>Up to 100 guests a night imported from other platforms</li>
              </ul>
            </div>
            <div className="border-4 border-ink bg-ink text-cream p-5 shadow-[6px_6px_0_0_hsl(var(--ink))]">
              <p className="font-display text-2xl text-acid-yellow">Pro</p>
              <ul className="mt-3 space-y-1.5 text-sm list-disc pl-5">
                <li>Everything in Free</li>
                <li>No limit on guests imported from District, BookMyShow, Skillbox and the rest</li>
                <li>Monthly, for promoters and artists who run nights often. Price before billing starts.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container max-w-3xl py-12">
        <h2 className="font-display text-3xl md:text-4xl leading-none">Questions</h2>
        <div className="mt-5 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="border-4 border-ink bg-white p-4">
              <summary className="font-display text-lg cursor-pointer">{q}</summary>
              <p className="mt-2 text-ink/80">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8"><Link href="/promote" className="font-display text-xl px-6 py-3 bg-acid-yellow border-4 border-ink inline-block">Apply to run your night on CCD</Link></p>
      </section>
      <Footer />
    </main>
  );
}
