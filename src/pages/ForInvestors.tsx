import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";
import PartnerContactDialog from "@/components/PartnerContactDialog";

const bullets = [
  "Nights: our Episodes, and What's on, nights across India with a credible artist or promoter behind each",
  "Crews: say you are going and get matched with 3 to 6 people from your city",
  "Artists: sourced pages for South Asian electronic artists, with booking requests and tour dates",
  "School: learn to produce and DJ, free for now",
];

const ForInvestors = () => (
  <main className="bg-background text-foreground">
    <SEO
      title="For investors · Cats Can Dance"
      description="Cats Can Dance is Param Minhas and Satwik Harisenany in Bengaluru: our own nights, a list of nights across India, sourced artist pages and a free school for producing and DJing."
      path="/for-investors"
    />
    <Nav />
    <PageHero
      eyebrow="FOR INVESTORS"
      title={<>WHAT WE<br/>ARE BUILDING.</>}
      bg="bg-electric-blue"
      textColor="text-cream"
      eyebrowColor="text-acid-yellow"
    />
    <Marquee bg="bg-acid-yellow" />
    <section className="bg-ink text-cream border-b-4 border-ink py-24 md:py-32">
      <div className="container grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="font-display text-4xl md:text-6xl text-cream leading-[0.95] mb-6">
            NIGHTS.<br/>ARTISTS.<br/>SCHOOL.
          </h2>
          <p className="text-cream/80 text-lg md:text-xl font-medium mb-6">
            We are Param Minhas (Merman) and Satwik Harisenany (Sartdawg), in Bengaluru. We have run four Episodes since April 2025; the fifth is at The Humming Tree on 25 Nov. If you want to talk, write to us.
          </p>
          <PartnerContactDialog
            kind="investors"
            trigger={
              <button
                type="button"
                className="inline-block bg-acid-yellow text-ink font-display text-xl px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
              >
                TALK TO US →
              </button>
            }
          />
        </div>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={b} className="bg-cream border-4 border-cream p-4 font-display text-lg md:text-xl text-ink flex gap-3">
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

export default ForInvestors;
