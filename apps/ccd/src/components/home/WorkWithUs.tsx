/**
 * Work with us: one slim strip that sends each kind of partner to their page.
 * Replaces the full contact form on the home; each page below has its own form.
 */
import Link from "next/link";
import catDj from "@/assets/cat-headphones.png";
import { imgUrl } from "@/lib/img";
import { LINKS, productLink } from "@ccd/brand";

const WAYS = [
  { href: productLink("artists", LINKS.artists.home), who: "Artists", line: "Claim your page, post tour dates, take bookings.", tone: "bg-electric-blue text-cream", external: true },
  { href: "/for-venues", who: "Venues", line: "Host an Episode, or list your nights on What's on.", tone: "bg-cream text-ink", external: false },
  { href: productLink("gate", LINKS.gate.home), who: "Promoters", line: "Run your night with Gate: your page, tickets, lists and the door.", tone: "bg-magenta text-cream", external: true },
  { href: "/press", who: "Brands and press", line: "Collabs, partnerships and interviews.", tone: "bg-ink text-cream", external: false },
];

export default function WorkWithUs() {
  return (
    <section id="contact" className="relative bg-acid-yellow text-ink border-b-4 border-ink py-14 md:py-20 overflow-hidden">
      <img src={imgUrl(catDj)} alt="" aria-hidden className="wiggle hidden md:block absolute right-6 top-8 w-28 drop-shadow-[5px_5px_0_hsl(var(--ink))] pointer-events-none" />
      <div className="container">
        <p className="font-display text-magenta text-xs md:text-sm uppercase tracking-[0.2em] mb-3">Work with us</p>
        <h2 className="font-display text-[2.4rem] sm:text-5xl md:text-6xl leading-[0.92] mb-8 md:mb-10">Got a night, a venue or a page?</h2>
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {WAYS.map((w) => {
            const cls = `group flex flex-col justify-between min-h-[150px] p-5 border-4 border-ink shadow-[6px_6px_0_0_hsl(var(--ink))] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_hsl(var(--ink))] transition-all ${w.tone}`;
            const inner = (
              <>
                <span className="font-display text-2xl leading-none">{w.who}</span>
                <span className="text-sm leading-snug opacity-90 mt-3">{w.line}</span>
                <span className="font-display text-sm mt-4 group-hover:translate-x-1 transition-transform">Go →</span>
              </>
            );
            return w.external
              ? <a key={w.href} href={w.href} className={cls}>{inner}</a>
              : <Link key={w.href} href={w.href} className={cls}>{inner}</Link>;
          })}
        </div>
        <p className="mt-7 text-sm">Anything else: <a href="mailto:hello@catscandance.com" className="font-bold underline underline-offset-4 decoration-2">hello@catscandance.com</a>. We read everything.</p>
      </div>
    </section>
  );
}
