import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";
import PartnerContactDialog from "@/components/PartnerContactDialog";

const bullets = [
  "We book the lineup: our residents plus guests",
  "We promote the night and run the guest list",
  "We can run the door: every guest has a QR ticket or a name on our list, checked in at entry",
  "We shoot photos and clips you can use",
  "You run the bar. Split and any minimum agreed per night",
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Who runs the bar and the door?", acceptedAnswer: { "@type": "Answer", text: "The venue runs the bar. We bring the lineup, the crowd, the promotion and the photos and clips afterwards, and we can run the door with our own QR tickets and guest list. The split and any minimum are agreed per Episode." } },
    { "@type": "Question", name: "How do I propose my venue?", acceptedAnswer: { "@type": "Answer", text: "Use the Partner With Us form on this page or email hello@catscandance.com with venue capacity, sound system details, and a few photos." } },
  ],
};

const ForVenues = () => (
  <main className="bg-background text-foreground">
    <SEO
      title="For venues · Cats Can Dance"
      description="Host a Cats Can Dance Episode in Bengaluru. We book the lineup, bring the crowd, promote the night and can run the door with QR tickets and a guest list. You run the bar. Tell us about your room."
      path="/for-venues"
      jsonLd={[faqLd]}
    />
    <Nav />
    <PageHero
      eyebrow="VENUE PARTNERS"
      title={<>HOST AN<br/>EPISODE.</>}
      bg="bg-lime"
      textColor="text-ink"
      eyebrowColor="text-magenta"
      shadow={false}
    >
      <p className="font-display text-ink/80 text-xl sm:text-2xl md:text-3xl max-w-2xl">
        Our Episodes have run at Bar Wild and Indiranagar Social. Episode 5 is at The Humming Tree on 25 Nov.
      </p>
    </PageHero>
    <Marquee bg="bg-acid-yellow" />
    <section className="bg-cream border-b-4 border-ink py-16 md:py-24 lg:py-32 bg-grain">
      <div className="container grid md:grid-cols-2 gap-10 md:gap-12">
        <div>
          <h2 className="font-display text-ink leading-[0.95] mb-6 text-3xl sm:text-4xl md:text-6xl break-words">
            WHO DOES WHAT.
          </h2>
          <p className="text-ink/80 text-base sm:text-lg md:text-xl font-medium mb-6">
            Send us your capacity, your sound system and a few photos of the room. If it fits, we plan a night together.
          </p>
          <PartnerContactDialog
            kind="venues"
            trigger={
              <button
                type="button"
                className="inline-block bg-magenta text-cream font-display text-lg sm:text-xl px-5 sm:px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
              >
                PARTNER WITH US →
              </button>
            }
          />
        </div>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={b} className="bg-lime border-4 border-ink chunk-shadow p-3 sm:p-4 font-display text-base sm:text-lg md:text-xl text-ink flex gap-3">
              <span className="text-magenta">0{i + 1}</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
    <Footer />
  </main>
);

export default ForVenues;
