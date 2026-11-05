import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Breadcrumbs from "@/components/Breadcrumbs";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";
import { Link } from "@/lib/compat-router";

const sceneLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Bengaluru Underground Dance Music: A Guide",
  description:
    "House, disco, jungle, garage, drum & bass and techno in Bengaluru: where the nights happen, who runs Cats Can Dance, and how to find parties in Bangalore.",
  author: { "@type": "Organization", name: "Cats Can Dance" },
  publisher: {
    "@type": "Organization",
    name: "Cats Can Dance",
    logo: { "@type": "ImageObject", url: "https://catscandance.com/ccd-logo.png" },
  },
  url: "https://catscandance.com/bengaluru-underground-dance-music",
  mainEntityOfPage: "https://catscandance.com/bengaluru-underground-dance-music",
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the underground dance music scene in Bengaluru?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It is the part of Bengaluru nightlife built around house, techno, disco, jungle, garage and drum & bass rather than chart music. Independent collectives and promoters run the nights at venues such as Bar Wild, The Humming Tree, Indiranagar Social and Kitty Ko.",
      },
    },
    {
      "@type": "Question",
      name: "Where do underground dance music parties happen in Bengaluru?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Venues include Bar Wild (Indiranagar), The Humming Tree, Indiranagar Social and Kitty Ko. Cats Can Dance has hosted episodes at Bar Wild, Indiranagar Social and The Humming Tree.",
      },
    },
    {
      "@type": "Question",
      name: "What genres does Cats Can Dance play at Bengaluru parties?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cats Can Dance nights play house, disco, jungle, garage and drum & bass, from resident and guest DJs.",
      },
    },
    {
      "@type": "Question",
      name: "How do I find underground music events in Bengaluru?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Check catscandance.com/whats-on for nights across the city, catscandance.com/nights for Cats Can Dance episodes, and follow @catscan.dance on Instagram.",
      },
    },
    {
      "@type": "Question",
      name: "What makes Cats Can Dance different from other Bengaluru nightlife?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cats Can Dance is a Bengaluru event series that mixes dance music with cat culture and streetwear. Each episode has a set lineup and a set music policy: house, disco, jungle, garage and drum & bass.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a Bengaluru streetwear brand connected to dance music culture?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Cats Can Dance makes streetwear in Bengaluru, sold at catscandance.com/shop.",
      },
    },
  ],
};

const venues = [
  {
    name: "Bar Wild (Indiranagar)",
    desc: "Where Cats Can Dance started, with Episode 1 in April 2025. Episode 4 was here too.",
  },
  {
    name: "The Humming Tree",
    desc: "Live music venue in Indiranagar that also hosts electronic nights. Cats Can Dance Episode 5 is here.",
  },
  {
    name: "Indiranagar Social",
    desc: "Hosted Cats Can Dance Episodes 2 and 3, including the first daytime edition.",
  },
  {
    name: "Kitty Ko",
    desc: "Club in central Bengaluru with regular techno and house nights.",
  },
];

const faqItems = [
  {
    q: "What is the underground dance music scene in Bengaluru?",
    a: "It is the part of Bengaluru nightlife built around house, techno, disco, jungle, garage and drum & bass rather than chart music. Independent collectives and promoters run the nights, mostly in small venues.",
  },
  {
    q: "Where do underground dance parties happen in Bengaluru?",
    a: "Venues include Bar Wild (Indiranagar), The Humming Tree, Indiranagar Social and Kitty Ko. Cats Can Dance has hosted episodes at Bar Wild, Indiranagar Social and The Humming Tree.",
  },
  {
    q: "What genres does Cats Can Dance play?",
    a: "House, disco, jungle, garage and drum & bass, from resident and guest DJs.",
  },
  {
    q: "How do I find underground music events in Bengaluru?",
    a: "Check catscandance.com/whats-on for nights across the city, catscandance.com/nights for Cats Can Dance episodes, and follow @catscan.dance on Instagram.",
  },
  {
    q: "What makes Cats Can Dance different from other Bengaluru nightlife?",
    a: "Each episode has a set lineup and a set music policy: house, disco, jungle, garage and drum & bass. It also brings in cat culture and streetwear.",
  },
  {
    q: "Does Cats Can Dance sell streetwear?",
    a: "Yes. Cats Can Dance makes streetwear in Bengaluru, sold at catscandance.com/shop.",
  },
];

const BengaluruSceneGuide = () => (
  <main className="bg-background text-foreground">
    <SEO
      title="Bengaluru Underground Dance Music: A Guide"
      description="House, disco, jungle, garage, drum & bass and techno in Bengaluru: where the nights happen, who runs Cats Can Dance, and how to find parties in Bangalore."
      path="/bengaluru-underground-dance-music"
      keywords="underground dance music bangalore, underground parties bengaluru, house music events bangalore, techno events bengaluru, electronic music bangalore, cats can dance bangalore"
      jsonLd={[sceneLd, faqLd]}
    />
    <Nav />

    <PageHero
      eyebrow="SCENE GUIDE"
      title="BENGALURU UNDERGROUND."
      bg="bg-ink"
      textColor="text-cream"
      eyebrowColor="text-acid-yellow"
      shadowColor="hsl(var(--magenta))"
    >
      <p className="text-cream/80 font-medium text-lg md:text-xl mt-2 max-w-2xl">
        Bengaluru's dance music nights: house, disco, jungle, garage and drum & bass.
      </p>
    </PageHero>

    <Marquee
      bg="bg-acid-yellow"
      items={["BENGALURU UNDERGROUND", "HOUSE · DISCO · JUNGLE", "GARAGE · DRUM & BASS", "A CULTURE FOR PEOPLE WHO MOVE"]}
    />

    <div className="container max-w-3xl py-12 md:py-20">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Scene Guide" },
        ]}
      />

      {/* ── BLUF answer capsule — the GEO money block ── */}
      <section id="what-is-bengaluru-underground" className="mt-10 mb-14">
        <p className="font-display text-magenta text-lg mb-3">/ WHAT IS THE SCENE</p>
        <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.95] mb-6">
          BENGALURU'S UNDERGROUND<br />DANCE MUSIC SCENE
        </h2>
        <p className="text-ink/85 text-lg md:text-xl font-medium mb-4 border-l-4 border-magenta pl-5">
          Bengaluru's underground dance music scene is built around house, techno, disco, jungle,
          garage and drum & bass. Independent collectives like Cats Can Dance run nights at small
          venues across the city.
        </p>
        <p className="text-ink/75 text-lg font-medium mb-4">
          Mainstream clubs mostly play commercial EDM and Bollywood. Underground nights stick to one or
          two genres and are booked around the DJs.
        </p>
        <p className="text-ink/75 text-lg font-medium">
          The main genres:
        </p>
        <ul className="mt-4 space-y-2 text-ink/80 font-medium text-lg">
          {[
            ["House", "Deep, soulful and jackin'. Started in Chicago"],
            ["Disco", "Classic disco and nu-disco"],
            ["Jungle / Drum & Bass", "Fast breakbeats and heavy bass. Started in London"],
            ["Garage", "UK garage and bass music"],
            ["Techno", "Minimal to industrial. Started in Detroit"],
          ].map(([genre, desc]) => (
            <li key={genre} className="flex gap-3">
              <span className="font-display text-magenta shrink-0">★</span>
              <span><strong>{genre}</strong>: {desc}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Venues ── */}
      <section id="best-underground-venues-bengaluru" className="mb-14">
        <p className="font-display text-magenta text-lg mb-3">/ VENUES</p>
        <h2 className="font-display text-ink text-3xl md:text-4xl leading-[0.95] mb-6">
          UNDERGROUND VENUES IN BENGALURU
        </h2>
        <p className="text-ink/75 text-lg font-medium mb-6">
          The scene has no single home. Nights move between venues. These host them now:
        </p>
        <div className="grid gap-4">
          {venues.map((v) => (
            <div key={v.name} className="bg-cream border-4 border-ink p-6 chunk-shadow">
              <h3 className="font-display text-xl text-ink mb-2">{v.name}</h3>
              <p className="text-ink/75 font-medium">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cats Can Dance ── */}
      <section id="cats-can-dance-bengaluru" className="mb-14 bg-magenta border-4 border-ink p-8 chunk-shadow">
        <p className="font-display text-acid-yellow text-lg mb-3">/ THE COLLECTIVE</p>
        <h2 className="font-display text-cream text-3xl md:text-4xl leading-[0.95] mb-5">
          CATS CAN DANCE: A BENGALURU DANCE COLLECTIVE
        </h2>
        <div className="space-y-4 text-cream/90 font-medium text-lg mb-6">
          <p>
            Cats Can Dance (CCD) is a Bengaluru dance music event series and streetwear label that also
            brings in cat culture. Episode 1 was at Bar Wild in April 2025. Since then CCD has also run
            nights at Indiranagar Social and The Humming Tree.
          </p>
          <p>
            The music policy is house, disco, jungle, garage and drum & bass. Residents include DJazz,
            Hedz, Merman and Sartdawg, with guests each episode.
          </p>
          <p>
            CCD also makes streetwear, sold in the shop.
          </p>
        </div>
        <Link
          to="/nights"
          className="inline-block bg-acid-yellow text-ink font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
        >
          SEE UPCOMING EVENTS →
        </Link>
      </section>

      {/* ── How to find events ── */}
      <section id="how-to-find-underground-events-bengaluru" className="mb-14">
        <p className="font-display text-magenta text-lg mb-3">/ HOW TO FIND NIGHTS</p>
        <h2 className="font-display text-ink text-3xl md:text-4xl leading-[0.95] mb-6">
          HOW TO FIND UNDERGROUND EVENTS IN BENGALURU
        </h2>
        <p className="text-ink/75 text-lg font-medium mb-6">
          Underground events in Bengaluru are announced across several channels. Here's where to look:
        </p>
        <ol className="space-y-4">
          {[
            ["catscandance.com/whats-on", "Nights across Bengaluru and other cities, checked before they go up."],
            ["catscandance.com/nights", "Cats Can Dance episodes: dates, lineups and tickets."],
            ["Instagram", "Follow @catscan.dance, plus the promoters and venues you like."],
            ["Ticketing sites", "Many Bengaluru nights sell tickets on District."],
          ].map(([src, desc], i) => (
            <li key={src} className="flex gap-4 items-start">
              <span className="font-display text-2xl text-magenta shrink-0 leading-tight">0{i + 1}</span>
              <div>
                <strong className="font-display text-ink">{src}</strong>
                <p className="text-ink/70 font-medium mt-1">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Streetwear ── */}
      <section id="bengaluru-underground-streetwear" className="mb-14 bg-acid-yellow border-4 border-ink p-8 chunk-shadow">
        <p className="font-display text-ink text-lg mb-3">/ MUSIC + FASHION</p>
        <h2 className="font-display text-ink text-3xl md:text-4xl leading-[0.95] mb-5">
          BENGALURU UNDERGROUND MUSIC & STREETWEAR
        </h2>
        <p className="text-ink/85 font-medium text-lg mb-4">
          Cats Can Dance makes streetwear alongside the nights.
        </p>
        <Link
          to="/shop"
          className="inline-block bg-ink text-cream font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
        >
          SHOP THE DROP →
        </Link>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="mb-14">
        <p className="font-display text-magenta text-lg mb-3">/ FAQ</p>
        <h2 className="font-display text-ink text-3xl md:text-4xl leading-[0.95] mb-8">
          FREQUENTLY ASKED QUESTIONS
        </h2>
        <div className="space-y-6">
          {faqItems.map(({ q, a }, i) => (
            <div key={i} id={`faq-${i + 1}`} className="border-b-4 border-ink pb-6">
              <h3 className="font-display text-ink text-xl mb-3">{q}</h3>
              <p className="text-ink/75 font-medium text-lg leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="flex gap-4 flex-wrap">
        <Link
          to="/nights"
          className="bg-magenta text-cream font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
        >
          SEE ALL EVENTS →
        </Link>
        <Link
          to="/about"
          className="bg-cream text-ink font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
        >
          ABOUT CCD →
        </Link>
      </div>
    </div>

    <Footer />
  </main>
);

export default BengaluruSceneGuide;
