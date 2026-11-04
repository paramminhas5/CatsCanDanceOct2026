/**
 * Artists on the home: six roster picks with photos and sound tags, then the next
 * tour dates in one strip. Hidden when there are no artists with photos.
 */
import Link from "next/link";
import type { HomeArtist } from "@/lib/home";
import type { TouringDate } from "@/lib/ccd-db";

type Props = { roster: HomeArtist[]; count: number; tour: TouringDate[] };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };

export default function Roster({ roster, count, tour }: Props) {
  if (!roster.length) return null;
  return (
    <section id="artists" className="bg-cream bg-grain border-b-4 border-ink py-12 md:py-20">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="font-display text-sm uppercase tracking-[0.2em] mb-2 text-ink"><span className="bg-acid-yellow px-2 py-0.5">Artists · the roster</span></p>
            <h2 className="font-display text-ink text-4xl sm:text-5xl md:text-6xl leading-[0.95]">They play.</h2>
            <p className="text-ink/70 text-lg mt-3 max-w-2xl">{count} South Asian electronic artists with sourced pages: mixes, releases, gigs, who they've played with. Book any of them from their page.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/artists" className="bg-acid-yellow text-ink font-display text-base px-5 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform">All artists →</Link>
          </div>
        </div>

        <ul className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto md:overflow-visible pb-4 md:pb-0 -mx-8 px-8 md:mx-0 md:px-0 snap-x">
          {roster.map((a) => (
            <li key={a.slug} className="shrink-0 w-[62vw] sm:w-[40vw] md:w-auto snap-start">
              <Link href={`/artists/${a.slug}`} className="group block border-4 border-ink bg-ink text-cream overflow-hidden h-full">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img src={a.photo_url ?? ""} alt={a.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink to-transparent" />
                  {a.is_resident && <span className="absolute top-2 left-2 bg-magenta text-cream font-display text-[10px] uppercase tracking-widest px-2 py-1 border-2 border-ink">Resident</span>}
                  {!a.is_resident && a.played_ccd && <span className="absolute top-2 left-2 bg-acid-yellow text-ink font-display text-[10px] uppercase tracking-widest px-2 py-1 border-2 border-ink">Played CCD</span>}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-lg leading-tight">{a.name}</p>
                    {a.based_city && <p className="text-xs text-cream/70">{a.based_city}</p>}
                  </div>
                </div>
                {a.genres?.length ? (
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-acid-yellow truncate">{a.genres.slice(0, 2).join(" · ")}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        {tour.length > 0 && (
          <div className="mt-8 md:mt-10 border-4 border-ink bg-cream">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b-4 border-ink">
              <p className="font-display text-sm uppercase tracking-[0.2em]">On tour · Strays</p>
              <Link href="/tour" className="text-sm font-semibold underline underline-offset-4 decoration-2">All tour dates →</Link>
            </div>
            <ul className="divide-y-2 divide-ink/15">
              {tour.map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                  <span className="font-display text-ink w-24 shrink-0">{short(t.from_date)}{t.to_date !== t.from_date ? ` to ${short(t.to_date)}` : ""}</span>
                  <Link href={`/artists/${t.artist_slug}`} className="font-semibold hover:underline underline-offset-4 decoration-2 truncate">{t.artist_name}</Link>
                  <span className="text-ink/60 ml-auto shrink-0">{t.city}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
