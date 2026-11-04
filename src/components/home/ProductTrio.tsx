/**
 * The three products, side by side. Each card: verb, one plain line, nickname,
 * its colour, its cat, one live number and one action. Below them, the loop:
 * how one product feeds the next.
 */
import Link from "next/link";
import catHeadphones from "@/assets/cat-headphones.png";
import catCap from "@/assets/cat-cap.png";
import catHandstand from "@/assets/cat-handstand.png";
import { imgUrl } from "@/lib/img";

export type Stat = { n: number | string; label: string };

type Props = {
  goOut: Stat;
  artists: Stat;
  learn: Stat;
};

const CARD = "relative border-4 border-ink bg-cream flex flex-col min-h-[300px] md:min-h-[340px] overflow-hidden group";

function Card({
  verb, product, nick, line, href, cta, color, text, cat, stat, catPos,
}: {
  verb: string; product: string; nick: string; line: string; href: string; cta: string;
  color: string; text: string; cat: string; stat: Stat; catPos: string;
}) {
  return (
    <article className={`${CARD} chunk-shadow`}>
      <div className={`${color} ${text} border-b-4 border-ink px-5 py-4 flex items-baseline justify-between gap-3`}>
        <p className="font-display text-xs uppercase tracking-[0.2em]">{product}</p>
        <p className="text-xs font-semibold opacity-80">aka {nick}</p>
      </div>
      <div className="p-5 md:p-6 flex-1 flex flex-col">
        <h3 className="font-display text-4xl md:text-5xl leading-[0.9] text-ink mb-3">{verb}</h3>
        <p className="text-ink/80 text-base md:text-lg max-w-[26ch] mb-6">{line}</p>
        <div className="mt-auto flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-4xl md:text-5xl leading-none text-ink tabular-nums">{stat.n}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/60 mt-1">{stat.label}</p>
          </div>
          <Link
            href={href}
            className={`${color} ${text} font-display text-sm md:text-base px-4 py-3 border-4 border-ink shadow-[4px_4px_0_0_hsl(var(--ink))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform whitespace-nowrap`}
          >
            {cta}
          </Link>
        </div>
      </div>
      <img
        src={cat}
        alt=""
        aria-hidden
        loading="lazy"
        className={`absolute w-20 md:w-28 drop-shadow-[4px_4px_0_hsl(var(--ink))] pointer-events-none transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-3 ${catPos}`}
      />
    </article>
  );
}

export default function ProductTrio({ goOut, artists, learn }: Props) {
  return (
    <section id="products" className="bg-cream bg-grain border-b-4 border-ink py-12 md:py-20">
      <div className="container">
        <div className="mb-8 md:mb-12 max-w-3xl">
          <p className="font-display text-magenta text-sm uppercase tracking-[0.2em] mb-3">Three products, one scene</p>
          <h2 className="font-display text-ink text-4xl sm:text-5xl md:text-6xl leading-[0.95]">
            You go. They play.<br className="hidden sm:block" /> You make.
          </h2>
          <p className="text-ink/80 text-lg md:text-xl mt-4 max-w-2xl">
            Cats Can Dance is three products that share one scene: the nights (ours and everyone's, with a crew to go with), the artists (their pages, their bookings, their tours), and the school.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <Card
            product="Go out"
            nick="Episodes · the gig guide · crews"
            verb="You go."
            line="Our own Episodes, plus every other night worth leaving the house for, checked by hand. See who's going and never go alone."
            href="/whats-on"
            cta="Find a night"
            color="bg-electric-blue"
            text="text-cream"
            cat={imgUrl(catCap)}
            catPos="right-3 top-16 md:top-14"
            stat={goOut}
          />
          <Card
            product="Artists"
            nick="the roster · Strays"
            verb="They play."
            line="A page for every South Asian electronic artist that stays current on its own. Book them from the page, at home or on tour."
            href="/artists"
            cta="Meet the roster"
            color="bg-acid-yellow"
            text="text-ink"
            cat={imgUrl(catHandstand)}
            catPos="right-2 top-14 md:top-12"
            stat={artists}
          />
          <Card
            product="Learn"
            nick="CCD.SCHOOL"
            verb="You make."
            line="Produce, DJ and mix on an instrument that runs in the browser and talks to Ableton. Every lesson adds to a track you keep."
            href="/school"
            cta="Open the school"
            color="bg-magenta"
            text="text-cream"
            cat={imgUrl(catHeadphones)}
            catPos="right-3 top-16 md:top-14"
            stat={learn}
          />
        </div>

        {/* The loop */}
        <div className="mt-10 md:mt-14 border-4 border-ink bg-ink text-cream px-5 py-5 md:px-8 md:py-6">
          <ol className="grid sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-3 text-sm md:text-base font-semibold">
            {[
              ["Find a night, ours or anyone's", "/whats-on", "text-electric-blue"],
              ["See who's going, get a crew", "/me", "text-electric-blue"],
              ["Follow the lineup to their pages", "/artists", "text-acid-yellow"],
              ["Book them, at home or on tour", "/tour", "text-acid-yellow"],
              ["Learn to play like them", "/school", "text-magenta"],
            ].map(([label, href, color], i) => (
              <li key={label} className="flex items-start gap-3">
                <span className={`font-display text-xl leading-none ${color}`}>{String(i + 1).padStart(2, "0")}</span>
                <Link href={href} className="hover:underline underline-offset-4 decoration-2">{label}</Link>
              </li>
            ))}
          </ol>
          <p className="text-cream/60 text-sm mt-4">One night, one artist, one account, everywhere on the site. Each product stands on its own. Together they close the loop: the people who go are the people who book are the people who learn.</p>
        </div>
      </div>
    </section>
  );
}
