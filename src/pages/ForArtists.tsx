import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import Marquee from "@/components/Marquee";
import SEO from "@/components/SEO";
import PartnerContactDialog from "@/components/PartnerContactDialog";
import ArtistSubmitForm from "@/components/ArtistSubmitForm";
import ArtistStory from "@/components/home/ArtistStory";
import type { ArtistStory as Story } from "@/lib/home";

const bullets = [
  "Curated crowd that cares about music",
  "Content assets: full sets, clips, photos",
  "Stronger personal brand association",
  "Collabs, merch, community building",
  "Repeat bookings and ecosystem value",
];

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "How do DJs get booked at Cats Can Dance?", acceptedAnswer: { "@type": "Answer", text: "Send a 30-60 minute mix link, your Instagram, and one line on what you'd play in our room to hello@catscandance.com. We listen to everything; we book per Episode based on lineup balance." } },
    { "@type": "Question", name: "What genres does CCD book in Bangalore?", acceptedAnswer: { "@type": "Answer", text: "House, disco, UK garage, breaks, drum & bass, jungle, and dub techno. We don't book commercial EDM or top-40 sets." } },
    { "@type": "Question", name: "Do you book artists from outside Bangalore?", acceptedAnswer: { "@type": "Answer", text: "Yes. We book Indian and international artists for special editions. Travel and accommodation are negotiated per booking." } },
    { "@type": "Question", name: "What do you provide besides the gig?", acceptedAnswer: { "@type": "Answer", text: "Full set recording, photo and video assets you can use, soundcheck time, and a curated room of 200-400 people who listen. Plus a feature on /playlists and our newsletter." } },
  ],
};

const ForArtists = ({ story = null }: { story?: Story | null }) => (
  <main className="bg-background text-foreground">
    <SEO
      title="For artists · Cats Can Dance"
      description="Your artist page, kept current: gigs, releases and press added as they happen, bookings as proper briefs, tour dates in thirty seconds. Claim yours. Play our Episodes in Bengaluru."
      path="/for-artists"
      jsonLd={[faqLd]}
    />
    <Nav />
    <PageHero
      eyebrow="FOR ARTISTS"
      title={<>YOUR PAGE.<br/>KEPT CURRENT.<br/>BOOKABLE.</>}
      bg="bg-orange"
      textColor="text-ink"
      eyebrowColor="text-cream"
      shadow={false}
    />
    <Marquee bg="bg-magenta" />
    <ArtistStory story={story} />
    <section className="bg-cream border-b-4 border-ink py-24 md:py-32 bg-grain">
      <div className="container grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="font-display text-4xl md:text-6xl text-ink leading-[0.95] mb-6">
            PLAY OUR<br/>EPISODES.
          </h2>
          <p className="text-ink/80 text-lg md:text-xl font-medium mb-6">
            Small rooms in Bengaluru, a crowd that came for the music, and your set recorded with photos and clips you can use.
          </p>
          <div className="flex flex-wrap gap-3">
            <PartnerContactDialog
              kind="artists"
              trigger={
                <button
                  type="button"
                  className="inline-block bg-magenta text-cream font-display text-xl px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
                >
                  PLAY WITH US →
                </button>
              }
            />
            <a
              href="#claim"
              className="inline-block bg-acid-yellow text-ink font-display text-xl px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform"
            >
              GET ON THE ROSTER →
            </a>
          </div>
        </div>
        <ul className="space-y-3">
          {bullets.map((b, i) => (
            <li key={b} className="bg-orange border-4 border-ink chunk-shadow p-4 font-display text-lg md:text-xl text-ink flex gap-3">
              <span className="text-cream">0{i + 1}</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
    <section id="claim" className="bg-ink border-b-4 border-ink py-16 md:py-20">
      <div className="container grid md:grid-cols-2 gap-10 items-start">
        <div>
          <p className="font-display text-acid-yellow text-xs uppercase tracking-[0.3em] mb-2">/ ALREADY AN ARTIST?</p>
          <h2 className="font-display text-3xl md:text-4xl text-cream uppercase leading-tight">
            ADD YOURSELF.<br/>OR CLAIM YOUR PAGE.
          </h2>
          <p className="text-cream/60 mt-3 max-w-md">
            Send your links and a mix. We check every profile by hand, then it goes live on the roster. Already listed? Claim your page below, or ask us for a claim link and it is yours in two minutes. Tour dates go up at <Link href="/tour#post" className="underline">/tour</Link>.
          </p>
          <Link
            href="/artists"
            className="inline-block mt-6 bg-transparent text-cream font-display text-sm px-8 py-3 border-4 border-cream/40 hover:border-cream hover:bg-cream/10 transition-colors text-center"
          >
            BROWSE THE ROSTER
          </Link>
        </div>
        <ArtistSubmitForm />
      </div>
    </section>
    <Footer />
  </main>
);

export default ForArtists;
