/**
 * The Host front page (boards W39-Host, W39-HostScroll). Throw a party and run it from one app.
 * Seven steps in the order a night comes together, a house-party block and what it costs.
 */
import { ButtonLink, SectionHead, Cat, Readout } from "@ccd/ui";
import { productLink } from "@ccd/brand";

const STEPS = [
  { t: "Make the party", d: "Name, date, place and a few words. Two minutes.", href: "/make" },
  { t: "Send the invite", d: "Share the link. People say they are coming, and you see who.", href: "/parties" },
  { t: "List it on Nights", d: "Ticketed or free, it shows up where people look for nights.", href: "/promote" },
  { t: "Book artists", d: "Pick from Artists by your date and budget. One ask can go to three.", href: productLink("artists", "/artists?mode=book") },
  { t: "Book gear", d: "Decks, sound and lights. Tell us what you need and we sort it.", href: "/gear" },
  { t: "Run the door", d: "Scan tickets and the guest list. Works with no signal.", href: "/door" },
  { t: "See how it went", d: "A report the next morning: who came, when, and what the door took.", href: "/door" },
];

export default function HostFront() {
  return (
    <main className="k-root">
      <section className="k-wrap grid items-center gap-12 pt-10 md:grid-cols-[1fr_1.05fr] md:pt-14">
        <div className="k-rv">
          <h1 className="k-d text-[56px] md:text-[96px]">Throw a party.<br />Run it from one app.</h1>
          <p className="k-b mt-6 max-w-[540px] text-[18px] md:text-[19px]">Make the party in two minutes, list it on Nights, book artists and gear, run the door and see how it went.</p>
          <div className="mt-8 flex flex-wrap gap-3"><ButtonLink variant="key" size="l" href="/make">Make a party</ButtonLink><ButtonLink size="l" href="#how">See how it works</ButtonLink></div>
          <p className="k-b mt-5 text-sm">For promoters, venues, and anyone throwing a party.</p>
        </div>
        <div className="k-rvs relative grid h-[420px] place-items-center overflow-hidden rounded-[28px] md:h-[600px]" style={{ background: "radial-gradient(90% 110% at 70% 20%, color-mix(in srgb, var(--k-pc) 85%, #fff), var(--k-pc) 50%, color-mix(in srgb, var(--k-pc) 75%, #000))" }}>
          <Cat name="yellow" height={340} move="still" />
        </div>
      </section>

      <section id="how" className="k-wrap k-section">
        <SectionHead title="How a night comes together" sub="Seven steps, one app. Artists come from Artists, and the party shows up on Nights." />
        <ol className="mt-10 grid list-none gap-6 p-0 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="k-rvs">
              <a href={s.href} className="k-surface block h-full rounded-[22px] p-6 no-underline">
                <span className="k-m" style={{ color: "var(--k-pc)" }}>0{i + 1}</span>
                <b className="mt-2 block text-[20px] font-semibold">{s.t}</b>
                <span className="k-b mt-2 block text-[15px]">{s.d}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="k-wrap k-section">
        <div className="k-surface k-rvs grid items-center gap-10 rounded-[28px] p-8 md:grid-cols-2 md:p-16">
          <div>
            <h2 className="k-d text-[44px] md:text-[56px]">A house party works too</h2>
            <p className="k-b mt-4 text-[18px]">No tickets, no venue. Make a party page, share the link, see who is coming.</p>
          </div>
          <div className="flex justify-center"><Cat name="yellow" height={220} /></div>
        </div>
      </section>

      <section className="k-wrap k-section">
        <SectionHead title="What it costs" sub="Free while we start. Later, a share of paid tickets only, never of the artist's fee." />
        <div className="mt-8 max-w-[860px]"><Readout cells={[{ value: "Free", label: "Party pages and RSVPs" }, { value: "Free", label: "The door" }, { value: "Their rate", label: "Artists, nothing on top" }]} /></div>
      </section>

      <section className="k-wrap k-section">
        <div className="k-rvs rounded-[28px] p-8 text-[#0a0a0b] md:p-16" style={{ background: "var(--k-pc)" }}>
          <h2 className="k-d text-[52px] md:text-[84px]" style={{ color: "#0a0a0b" }}>Make your first party.</h2>
          <div className="mt-7"><a href="/make" className="k-btn k-btn--l no-underline" style={{ background: "#0a0a0b", color: "#fff" }}>Make a party</a></div>
        </div>
      </section>
    </main>
  );
}
