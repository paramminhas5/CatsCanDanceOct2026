import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";

const roles = [
  { who: "The venue", does: ["Runs the bar and the door", "Holds the room and the licence", "Keeps the sound system in shape"] },
  { who: "Cats Can Dance", does: ["Brings the crowd and the lineup", "Sets the production direction", "Films the night and posts the content"] },
  { who: "The partner (optional)", does: ["A brand or ops partner with a clear slot", "Access to the crowd, not a banner", "Agreed up front, in writing"] },
];

const steps = [
  { n: "01", t: "Pick the room", d: "A room that cares about sound and fits the night. Small rooms first. Cap the guest list and RSVP only." },
  { n: "02", t: "Write the one-page brief", d: "Date, hours, genres, who does what, what the venue earns, what we film. One page both sides sign off." },
  { n: "03", t: "Book the lineup", d: "Mix of residents and guests. Artists get soundcheck, a full set recording and photo or video. Open decks if the room suits it." },
  { n: "04", t: "Add the extra layer", d: "The thing that makes it ours: pet-friendly outdoors, merch, treats, a partner activity. One extra layer, not five." },
  { n: "05", t: "Film everything", d: "Every set is filmed. The content is the product after the night is over." },
  { n: "06", t: "Close the loop", d: "Recap post, numbers to the venue, lineup and partner notes into the template for the next one." },
];

const proof = [
  { h: "CCD x Social, Indiranagar", p: "Two afternoons at Social, Indiranagar: 28 June 2026 and 16 August 2026. House, breaks, UKG and drum and bass inside, pet activities outside from 4 to 8 pm, merch and treats, open decks. Shantam, Sartdawg and Agent Bugs were on the first poster." },
  { h: "Bar Wild, Indiranagar", p: "Our most regular room. Episode 1 on 2 April 2025 and Episode 4 on 26 September 2026. A 26 seater, so the programming has to carry the room: listening, small lineups, nothing wasted." },
  { h: "The bigger pitch", p: "The original idea was a pet lifestyle festival: three shows at Social Bengaluru and a finale for 2,000 to 3,000 people, co-marketed with the venue, with a pet brand as sponsor and an ops partner. We scrapped the series. The format stayed." },
];

export default function Playbook() {
  return (
    <>
      <SEO
        title="Playbook: how Cats Can Dance works with venues and brands | Cats Can Dance"
        description="The collaborator format behind CCD x Social and our nights at Bar Wild, and how any venue or brand can run it."
        path="/playbook"
      />
      <main className="bg-background text-foreground min-h-screen">
        <Nav />
        <PageHero eyebrow="PARTNER · PLAYBOOK" title="HOW WE RUN A NIGHT WITH YOU." bg="bg-red-600" textColor="text-cream" eyebrowColor="text-acid-yellow">
          <p className="text-cream font-medium text-lg max-w-2xl">
            CCD x Social was the first version. Bar Wild is the small-room version. This is the format underneath both, written so a venue or a brand can pick it up and run it with us.
          </p>
          <a href="mailto:partnerships@catscandance.com?subject=Playbook" className="inline-block mt-6 bg-ink text-cream font-display px-6 py-3 border-4 border-ink chunk-shadow hover:-translate-y-0.5 transition-transform">
            RUN ONE WITH US →
          </a>
        </PageHero>

        <section className="container py-6 md:py-8">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Playbook" }]} />
        </section>

        <section className="container pb-16">
          <p className="font-display text-magenta text-base md:text-lg mb-3">/ WHO DOES WHAT</p>
          <h2 className="font-display text-ink text-3xl md:text-5xl mb-8">THE SPLIT.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((r) => (
              <div key={r.who} className="border-4 border-ink bg-cream p-5 chunk-shadow">
                <h3 className="font-display text-xl mb-3">{r.who}</h3>
                <ul className="space-y-2 font-medium">{r.does.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-acid-yellow border-y-4 border-ink py-14 md:py-20">
          <div className="container">
            <p className="font-display text-ink text-base md:text-lg mb-3">/ THE TEMPLATE</p>
            <h2 className="font-display text-ink text-3xl md:text-5xl mb-8">SIX STEPS. SAME EVERY TIME.</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {steps.map((s) => (
                <div key={s.n} className="border-4 border-ink bg-cream p-5 chunk-shadow">
                  <p className="font-display text-magenta text-2xl">{s.n}</p>
                  <h3 className="font-display text-xl mb-2">{s.t}</h3>
                  <p className="font-medium">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-16">
          <p className="font-display text-magenta text-base md:text-lg mb-3">/ WHAT WE DID</p>
          <h2 className="font-display text-ink text-3xl md:text-5xl mb-8">WHERE IT HAS RUN.</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {proof.map((p) => (
              <article key={p.h} className="border-4 border-ink bg-cream p-5 chunk-shadow">
                <h3 className="font-display text-xl mb-3">{p.h}</h3>
                <p className="font-medium">{p.p}</p>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-10">
            <Link href="/episodes" className="font-display border-4 border-ink px-5 py-3 bg-acid-yellow chunk-shadow hover:-translate-y-0.5 transition-transform">SEE THE EPISODES →</Link>
            <Link href="/for-venues" className="font-display border-4 border-ink px-5 py-3 bg-cream chunk-shadow hover:-translate-y-0.5 transition-transform">FOR VENUES →</Link>
          </div>
        </section>
        <Footer />
      </main>
    </>
  );
}
