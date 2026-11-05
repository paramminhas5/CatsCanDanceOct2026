/**
 * What we are building: one line on the platform, then a tile per product.
 * Each tile jumps to its section below. Cats hop when you hover or scroll.
 */
import catCap from "@/assets/cat-cap.png";
import catHandstand from "@/assets/cat-handstand.png";
import catHeadphones from "@/assets/cat-headphones.png";
import { imgUrl } from "@/lib/img";

type Props = { weekCount: number; artistCount: number };

const TILE =
  "group relative block overflow-hidden border-4 border-ink bg-cream p-6 text-ink no-underline shadow-[8px_8px_0_0_hsl(var(--ink))] transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0_0_hsl(var(--ink))] min-h-[230px]";

function Tile({ href, n, name, line, live, color, dot, cat, delay }: { href: string; n: string; name: string; line: string; live: string; color: string; dot: string; cat: string; delay: string }) {
  return (
    <a href={href} className={`${TILE} ccd-rise ${delay}`}>
      <span className={`absolute inset-y-0 left-0 w-[10px] ${color}`} aria-hidden />
      <span className="font-display text-xs uppercase tracking-[0.2em] text-ink/70">{n}</span>
      <span className="block font-display text-4xl md:text-5xl leading-[0.95] mt-2 mb-3">{name}</span>
      <span className="block text-[15px] font-semibold max-w-[22ch]">{line}</span>
      <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]">
        <i className={`inline-block h-2 w-2 rounded-full ccd-blink ${dot}`} aria-hidden />
        {live}
      </span>
      <img
        src={cat}
        alt=""
        aria-hidden
        loading="lazy"
        className="wiggle absolute -right-2 -bottom-3 w-24 md:w-32 drop-shadow-[4px_4px_0_hsl(var(--ink))] transition-transform duration-300 group-hover:-translate-y-3 group-hover:-rotate-6 group-hover:scale-105"
      />
    </a>
  );
}

export default function Overview({ weekCount, artistCount }: Props) {
  return (
    <section className="bg-cream bg-grain border-b-4 border-ink py-14 md:py-24 overflow-hidden">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10 mb-10 md:mb-12">
          <div>
            <p className="font-display text-magenta text-xs md:text-sm uppercase tracking-[0.2em] mb-3">What this site does</p>
            <h2 className="font-display text-ink text-[2.6rem] sm:text-6xl md:text-7xl leading-[0.92]">
              Nights, artists<br className="hidden md:block" /> and a school<br className="hidden md:block" /> in one place.
            </h2>
          </div>
          <p className="text-ink/75 text-base md:text-lg leading-relaxed max-w-[40ch]">
            Find a night across India and people to go with. Look up South Asian electronic artists and book them.
            Learn to produce and DJ. We run it from Bengaluru, where we also throw our own nights.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 md:gap-7">
          <Tile
            href="#nights-product" n="01" name="Nights" delay="ccd-d1"
            line="Nights across India, a crew to go with, and our own Episodes in Bengaluru."
            live={`${weekCount} nights this week`} color="bg-electric-blue" dot="bg-electric-blue" cat={imgUrl(catCap)}
          />
          <Tile
            href="#artists-product" n="02" name="Artists" delay="ccd-d2"
            line="South Asian electronic artists. Listen, read up, send a booking request."
            live={`${artistCount} on the roster`} color="bg-acid-yellow" dot="bg-acid-yellow border-2 border-ink" cat={imgUrl(catHandstand)}
          />
          <Tile
            href="#school" n="03" name="School" delay="ccd-d3"
            line="Learn to produce and DJ on a real instrument. Free for now."
            live="Web, iPhone, Android" color="bg-magenta" dot="bg-magenta" cat={imgUrl(catHeadphones)}
          />
        </div>
      </div>
    </section>
  );
}
