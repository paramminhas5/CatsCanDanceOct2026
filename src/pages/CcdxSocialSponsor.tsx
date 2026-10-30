import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";
import PartnerContactDialog from "@/components/PartnerContactDialog";
import { Link } from "@/lib/compat-router";

// ── Partnership tier data ──────────────────────────────────────────────────────
const TIERS = [
  {
    slug: "series-partner",
    name: "SERIES PARTNER",
    icon: "🐾",
    scope: "All 4 shows",
    color: "bg-electric-blue text-cream",
    chipColor: "bg-acid-yellow text-ink",
    price: "Full series",
    headline: "Be the name everyone remembers",
    deliverables: [
      "Headline logo on all event materials — posters, socials, stage",
      "Dedicated activation space at all 4 shows",
      "Stage naming rights at the Delhi show",
      "Co-branded content package (photo + video) from every show",
      "3 dedicated social posts + stories across CCD channels",
      "Brand mention in every RSVP confirmation email",
      "Logo on CCD website for the full series",
      "2 guest passes per show",
    ],
    cta: "Best fit for: pet brands, lifestyle brands, beverages, outdoor brands wanting max reach",
  },
  {
    slug: "show-partner",
    name: "SHOW PARTNER",
    icon: "✦",
    scope: "One show of your choice",
    color: "bg-magenta text-cream",
    chipColor: "bg-cream text-ink",
    price: "Per show",
    headline: "Own a single afternoon end to end",
    deliverables: [
      "Headline logo at your chosen show",
      "Dedicated activation space",
      "Co-branded content package from that show",
      "1 dedicated social post + stories",
      "Brand mention in that show's RSVP emails",
      "Logo on event page for the duration",
      "2 passes to the show",
    ],
    cta: "Best fit for: local brands, product launches, pet and lifestyle brands",
  },
  {
    slug: "community-partner",
    name: "COMMUNITY PARTNER",
    icon: "🌿",
    scope: "All shows, light touch",
    color: "bg-lime text-ink",
    chipColor: "bg-ink text-lime",
    price: "Entry level",
    headline: "Show up everywhere, simply",
    deliverables: [
      "Logo across all event materials (below fold)",
      "Social tag in one round-up post per show",
      "Mention in event comms and on the website",
      "2 passes split across the series",
    ],
    cta: "Best fit for: indie brands, local businesses, NGOs, community organisations",
  },
];

// ── Who should partner ─────────────────────────────────────────────────────────
const WHO = [
  { icon: "🐾", label: "Pet food & nutrition brands" },
  { icon: "✂️", label: "Grooming & wellness brands" },
  { icon: "👗", label: "Pet accessories & fashion" },
  { icon: "🎧", label: "Audio & lifestyle brands" },
  { icon: "🍺", label: "Beverages & F&B brands" },
  { icon: "📸", label: "Photo & creative services" },
  { icon: "🏕️", label: "Outdoor & adventure brands" },
  { icon: "💊", label: "Pet health & supplements" },
];

// ── Series shows data ─────────────────────────────────────────────────────────
const SHOWS = [
  { num: "01", name: "BANGALORE",  date: "Sun, 29 Jun 2026", tagline: "BROAD · WELCOMING · FIRST IMPRESSION", bg: "bg-electric-blue", text: "text-cream", slug: "ccdxsocial-01" },
  { num: "02", name: "BOMBAY",     date: "July 2026",         tagline: "BOMBAY · CCD × SOCIAL",               bg: "bg-magenta",       text: "text-cream", slug: "ccdxsocial-02" },
  { num: "03", name: "HYDERABAD",  date: "August 2026",       tagline: "HYDERABAD · CCD × SOCIAL",            bg: "bg-ink",           text: "text-cream", slug: "ccdxsocial-03" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
const CcdxSocialSponsor = () => (
  <main className="bg-background text-foreground">
    <SEO
      title="Partner with CCD × Social | Cats Can Dance"
      description="Partner with the CCDxSocial series — 4 shows across Bangalore, Bombay, Hyderabad and Delhi. Pet-friendly outdoor afternoons and underground dance music. Reach an engaged community of pet parents and music fans."
      path="/ccdxsocial/sponsor"
    />
    <Nav />

    <PageHero
      eyebrow="PARTNERSHIP PROPOSAL"
      title={<>BE PART OF<br />SOMETHING<br />DIFFERENT.</>}
      bg="bg-electric-blue"
      textColor="text-cream"
      eyebrowColor="text-acid-yellow"
    >
      <p className="text-cream/80 font-medium text-xl max-w-2xl mt-4">
        Four shows. Four cities. An engaged community of pet parents and music fans — together every
        Sunday from June to October 2026. Partner a single show or the whole series.
      </p>
      <div className="flex flex-wrap gap-3 mt-6">
        {["~200 pax per show", "4 cities", "Pets welcome", "Jun–Oct 2026", "Free entry · RSVP only"].map((f) => (
          <span key={f} className="bg-white/10 border border-white/20 text-cream font-display text-xs px-3 py-1.5">{f}</span>
        ))}
      </div>
    </PageHero>

    <Marquee bg="bg-acid-yellow" items={["BANGALORE · BOMBAY · HYDERABAD · DELHI", "JUN–OCT 2026", "PARTNER A SHOW", "PARTNER THE SERIES", "PETS + DANCE MUSIC"]} />


    {/* ── The opportunity ── */}
    <section className="bg-cream border-b-4 border-ink py-16 md:py-24 bg-grain">
      <div className="container grid md:grid-cols-2 gap-10 md:gap-16">
        <div>
          <p className="font-display text-magenta text-xl mb-4">/ THE OPPORTUNITY</p>
          <h2 className="font-display text-ink text-4xl md:text-6xl leading-[0.9] mb-6">
            A CROWD THAT<br />ACTUALLY CARES.
          </h2>
          <p className="text-ink/80 font-medium text-lg mb-4">
            The CCDxSocial series brings together two of the most passionate communities in Bangalore:
            animal lovers and electronic music fans. These aren't passive attendees — they're here for
            something specific, and they spend money on the things they love.
          </p>
          <p className="text-ink/70 font-medium">
            Outdoor afternoon from 4 PM with a vendor market and pets welcome throughout, into an
            underground dance floor after dark. Approximately 200 people per show, larger format in
            Delhi. Your brand is not a banner — it's part of the experience.
          </p>        </div>
        <div className="space-y-4">
          {[
            { label: "Per show capacity",  value: "~200 pax",       bg: "bg-acid-yellow" },
            { label: "Grand finale",       value: "2,000+ pax",     bg: "bg-magenta text-cream" },
            { label: "Series total reach", value: "3,000+ across 4 events", bg: "bg-electric-blue text-cream" },
            { label: "Audience profile",   value: "Urban 24–45, pet parents + electronic music fans", bg: "bg-lime" },
            { label: "Content output",     value: "Photo + video from every show, shared with sponsors", bg: "bg-cream border-4 border-ink" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border-4 border-ink chunk-shadow p-4 flex items-center justify-between gap-4`}>
              <span className="font-display text-sm uppercase opacity-70">{s.label}</span>
              <span className="font-display text-base md:text-xl text-right">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── The shows ── */}
    <section className="bg-ink border-b-4 border-ink py-16 md:py-24">
      <div className="container">
        <p className="font-display text-acid-yellow text-xl mb-4">/ THE SERIES</p>
        <h2 className="font-display text-cream text-4xl md:text-6xl leading-[0.9] mb-10">
          FOUR SHOWS.<br />FOUR CITIES.
        </h2>
        <div className="grid md:grid-cols-3 gap-0 border-4 border-ink overflow-hidden mb-4">
          {SHOWS.map((s) => (
            <div key={s.num} className={`${s.bg} ${s.text} border-r-4 border-ink last:border-r-0 p-6`}>
              <p className="font-display text-xs opacity-60 mb-2">SHOW {s.num}</p>
              <h3 className="font-display text-3xl md:text-4xl mb-2 leading-none">{s.name}</h3>
              <p className="font-display text-xs opacity-60 tracking-widest mb-3">{s.tagline}</p>
              <p className="font-display text-sm opacity-80">{s.date}</p>
              <p className="font-display text-xs opacity-50 mt-1">~200 pax · 4PM–close</p>
            </div>
          ))}
        </div>
        <div className="bg-acid-yellow border-4 border-ink chunk-shadow-lg p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="inline-block bg-ink text-cream font-display text-xs px-3 py-1 border-2 border-ink mb-3">SHOW 04 · DATE TBA</span>
            <h3 className="font-display text-ink text-4xl md:text-5xl leading-[0.9] mb-2">DELHI — LARGE FORMAT</h3>
            <p className="text-ink/70 font-medium max-w-lg">The fourth and largest show. Full outdoor stage, larger capacity, full lineup TBA. The biggest partnership opportunity in the series.</p>
          </div>
          <div className="shrink-0 text-center">
            <p className="font-display text-ink text-4xl mb-1">DELHI</p>
            <p className="font-display text-ink/60 text-xs uppercase">October 2026</p>
          </div>
        </div>
      </div>
    </section>


    {/* ── Sponsor tiers ── */}
    <section className="bg-cream border-b-4 border-ink py-16 md:py-24">
      <div className="container">
        <p className="font-display text-magenta text-xl mb-4">/ PARTNERSHIP TIERS</p>
        <h2 className="font-display text-ink text-4xl md:text-6xl leading-[0.9] mb-4">
          PARTNER A SHOW.<br />OR THE WHOLE THING.
        </h2>
        <p className="text-ink/70 font-medium text-lg max-w-2xl mb-10">
          Pick a single show or back the whole series. Every tier includes real presence —
          not a logo in a corner. We build the activation with you.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div key={tier.slug} className={`${tier.color} border-4 border-ink chunk-shadow-lg flex flex-col`}>
              <div className="p-6 md:p-7 border-b-4 border-ink">
                <div className="text-3xl mb-3">{tier.icon}</div>
                <span className={`inline-block ${tier.chipColor} font-display text-xs px-2 py-1 border-2 border-ink mb-3`}>{tier.scope}</span>
                <h3 className="font-display text-3xl md:text-4xl leading-none mb-2">{tier.name}</h3>
                <p className="font-medium opacity-80 text-sm">{tier.headline}</p>
              </div>
              <div className="p-6 md:p-7 flex-1 flex flex-col">
                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-sm font-medium opacity-90">
                      <span className="mt-1 shrink-0 opacity-60">★</span>
                      {d}
                    </li>
                  ))}
                </ul>
                <p className="text-xs opacity-60 font-medium mb-4">{tier.cta}</p>
                <PartnerContactDialog
                  kind="sponsors"
                  defaultReason={`${tier.name} — ${tier.scope}`}
                  defaultMessage={`Hi, I'm interested in the ${tier.name} partnership for the CCDxSocial series. Please send me more details.`}
                  trigger={
                    <button type="button" className="w-full bg-ink text-cream font-display text-base px-5 py-3 border-4 border-ink hover:bg-magenta transition-colors">
                      ENQUIRE NOW →
                    </button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Who should sponsor ── */}
    <section className="bg-acid-yellow border-b-4 border-ink py-16 md:py-20">
      <div className="container">
        <p className="font-display text-ink/60 text-xl mb-4">/ WHO SHOULD PARTNER</p>
        <h2 className="font-display text-ink text-4xl md:text-5xl leading-[0.9] mb-10">
          YOUR BRAND BELONGS HERE<br />IF YOU CARE ABOUT THIS.
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {WHO.map((w) => (
            <div key={w.label} className="bg-cream border-4 border-ink chunk-shadow p-4 flex flex-col items-center text-center gap-2">
              <span className="text-3xl">{w.icon}</span>
              <span className="font-display text-ink text-sm leading-tight">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── What you get ── */}
    <Marquee bg="bg-lime" items={["STAGE PRESENCE", "CO-BRANDED CONTENT", "EMAIL REACH", "SOCIAL POSTS", "ON-SITE ACTIVATION", "BRANDED EXPERIENCE"]} />

    <section className="bg-cream border-b-4 border-ink py-16 md:py-24 bg-grain">
      <div className="container grid md:grid-cols-2 gap-10 md:gap-16">
        <div>
          <p className="font-display text-magenta text-xl mb-4">/ WHAT YOU GET</p>
          <h2 className="font-display text-ink text-4xl md:text-5xl leading-[0.9] mb-6">
            MORE THAN A LOGO.
          </h2>
          <p className="text-ink/80 font-medium text-lg">
            Every partner at CCDxSocial is integrated into the experience — not pasted on top of it.
            We build the activation with you so it actually makes sense in the room.
          </p>
        </div>
        <ul className="space-y-3">
          {[
            ["🎪", "On-site activation space", "Your own area in the outdoor pet zone or event floor"],
            ["📸", "Content assets", "Professional photo + video from every show you sponsor, yours to use"],
            ["📣", "Social reach", "CCD Instagram, email newsletter, event pages — targeted pet + music fans"],
            ["🤝", "Co-branding", "Your brand alongside CCD on all materials for your shows"],
            ["🎟️", "Guest access", "Passes for your team to attend and experience the events"],
            ["📊", "Post-event report", "Attendance, content delivery, social stats — sent within a week of each show"],
          ].map(([icon, title, desc]) => (
            <li key={title} className="bg-cream border-4 border-ink chunk-shadow p-4 flex gap-3">
              <span className="text-2xl shrink-0">{icon}</span>
              <div>
                <p className="font-display text-ink text-base">{title}</p>
                <p className="text-ink/60 text-sm font-medium">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* ── CTA ── */}
    <section className="bg-magenta border-b-4 border-ink py-16 md:py-24">
      <div className="container text-center">
        <p className="font-display text-acid-yellow text-xl mb-4">/ LET'S TALK</p>
        <h2 className="font-display text-cream text-5xl md:text-7xl leading-[0.85] mb-6 drop-shadow-[6px_6px_0_hsl(var(--ink))]">
          READY TO<br />PARTNER?
        </h2>
        <p className="text-cream/80 font-medium text-lg max-w-xl mx-auto mb-10">
          Fill in the form and we'll get back to you within 24 hours with the full partnership proposal.
          All tiers are open to conversation — we'd rather build something that works for both sides.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <PartnerContactDialog
            kind="sponsors"
            defaultReason="Partnership enquiry — CCDxSocial"
            trigger={
              <button type="button" className="bg-acid-yellow text-ink font-display text-2xl px-10 py-5 border-4 border-ink chunk-shadow-lg hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">
                GET THE PARTNERSHIP PROPOSAL →
              </button>
            }
          />
          <a href="mailto:hello@catscandance.com?subject=CCDxSocial%20Partnership" className="bg-transparent text-cream font-display text-lg px-8 py-4 border-4 border-cream hover:bg-ink transition-colors">
            EMAIL US DIRECTLY
          </a>
        </div>
        <p className="mt-8 text-cream/60 font-display text-sm">
          hello@catscandance.com · @catscan.dance
        </p>
      </div>
    </section>

    {/* ── Link back ── */}
    <section className="bg-cream border-b-4 border-ink py-10">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-display text-ink text-lg">Want to see the full series overview?</p>
        <div className="flex gap-3">
          <a href="/ccdxsocial" className="bg-ink text-cream font-display text-sm px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-transform">VIEW PROPOSAL →</a>
          <Link to="/events" className="bg-cream text-ink font-display text-sm px-5 py-3 border-4 border-ink hover:bg-acid-yellow transition-colors">SEE ALL EVENTS →</Link>
        </div>
      </div>
    </section>

    <Footer />
  </main>
);

export default CcdxSocialSponsor;
