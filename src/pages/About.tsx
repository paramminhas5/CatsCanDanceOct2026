import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Team from "@/components/Team";
import SectionReveal from "@/components/SectionReveal";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";

const pillars = [
  { label: "NIGHTS", desc: "Our own Episodes in Bengaluru, and What's on: nights across India, each with an artist or promoter we trust behind it.", bg: "bg-magenta", text: "text-cream" },
  { label: "ARTISTS", desc: "Pages for South Asian electronic artists: releases, shows, mixes and a booking form. Every fact has a source.", bg: "bg-acid-yellow", text: "text-ink" },
  { label: "SCHOOL", desc: "Learn to produce and DJ on a real instrument. Free for now.", bg: "bg-lime", text: "text-ink" },
];

const aboutLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Cats Can Dance",
  url: "https://catscandance.com/about",
  description: "Cats Can Dance is a Bengaluru crew run by Param Minhas and Satwik Harisenany. We throw our own nights, keep a hand-checked list of nights across India, publish artist pages and run a school.",
};

const aboutFaqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Cats Can Dance?",
      acceptedAnswer: { "@type": "Answer", text: "Cats Can Dance (CCD) is a Bengaluru crew. We throw our own nights, called Episodes, list other nights across India that someone credible stands behind, publish pages for South Asian electronic artists, and run CCD.SCHOOL for learning to produce and DJ." },
    },
    {
      "@type": "Question",
      name: "Where is Cats Can Dance based?",
      acceptedAnswer: { "@type": "Answer", text: "Bengaluru. Our Episodes have been at Bar Wild and Indiranagar Social, and Episode 5 is at The Humming Tree." },
    },
    {
      "@type": "Question",
      name: "How do I go to a Cats Can Dance night?",
      acceptedAnswer: { "@type": "Answer", text: "Our own nights and tickets are at catscandance.com/nights. Other nights we rate are at catscandance.com/whats-on." },
    },
    {
      "@type": "Question",
      name: "Who are the Cats Can Dance residents?",
      acceptedAnswer: { "@type": "Answer", text: "DJazz, Hedz, Merman (Param) and Sartdawg (Satwik), with guests each Episode." },
    },
  ],
};

const About = () => (
  <main className="bg-background text-foreground">
    <SEO
      title="About | Cats Can Dance"
      description="Cats Can Dance is a Bengaluru crew run by Param and Satwik: our own nights, a hand-checked list of nights across India, artist pages and a school."
      path="/about"
      jsonLd={[aboutLd, aboutFaqLd]}
    />
    <Nav />
    <PageHero
      eyebrow="ABOUT"
      title="WHO WE ARE."
      bg="bg-magenta"
      textColor="text-cream"
      eyebrowColor="text-acid-yellow"
      shadowColor="hsl(var(--ink))"
    >
      <p className="text-cream/90 font-display text-2xl md:text-3xl mt-2">TWO DJS FROM BENGALURU.</p>
    </PageHero>

    {/* Mission */}
    <section className="bg-cream border-b-4 border-ink py-12 md:py-20 bg-grain">
      <div className="container max-w-4xl">
        <p className="font-display text-magenta text-lg md:text-xl mb-3">/ HOW IT STARTED</p>
        <h2 className="font-display text-ink text-3xl md:text-5xl leading-[0.95] mb-6">
          ONE NIGHT AT<br/>BAR WILD.
        </h2>
        <div className="space-y-4 text-ink/85 text-lg md:text-xl font-medium">
          <p>
            Cats Can Dance is Param (Merman) and Satwik (Sartdawg). Episode 1 was at Bar Wild in April 2025.
            We have done four so far, and Episode 5 is at The Humming Tree on 25 November.
          </p>
          <p>
            Finding a good night in India still means knowing the right person. So we built what we wanted:
            the nights worth going to, checked by hand, pages for the artists we play, and a school for
            learning to make the music.
          </p>
        </div>
      </div>
    </section>

    {/* What we do */}
    <section className="bg-ink border-b-4 border-ink py-12 md:py-20">
      <div className="container">
        <p className="font-display text-acid-yellow text-lg md:text-xl mb-3">/ WHAT WE DO</p>
        <h2 className="font-display text-cream text-3xl md:text-5xl leading-[0.95] mb-8 drop-shadow-[5px_5px_0_hsl(var(--magenta))]">
          THREE THINGS.
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {pillars.map((p) => (
            <div key={p.label} className={`${p.bg} ${p.text} border-4 border-ink chunk-shadow p-6`}>
              <p className="font-display text-3xl md:text-4xl mb-2">{p.label}</p>
              <p className="font-medium leading-snug">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <Marquee bg="bg-acid-yellow" items={["NIGHTS", "ARTISTS", "SCHOOL", "BENGALURU"]} />
    <SectionReveal><Team /></SectionReveal>
    <Footer />
  </main>
);

export default About;
