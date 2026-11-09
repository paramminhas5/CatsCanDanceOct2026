/**
 * The invite your guests open (board H39-Invite): the party, who is playing, how many are coming,
 * and an RSVP (rsvp RPC: throttled, honours the capacity). Tickets link out when the party sells them.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Readout, ButtonLink, Cat, Sticker } from "@ccd/ui";
import { productLink } from "@ccd/brand";
import Rsvp from "@/components/Rsvp";
import { select, rpc } from "@/lib/rpc";

export const revalidate = 60;
type Ev = { slug: string; title: string; event_date: string | null; date: string | null; start_time: string | null; venue: string | null; city: string | null; blurb: string | null; lineup: string[] | null; poster_url: string | null; ticket_url: string | null; rsvp_open: boolean | null; capacity: number | null; genres: string[] | null };

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const [e] = await select<Ev>(`events?slug=eq.${slug}&published=is.true&select=slug,title,event_date,date,start_time,venue,city,blurb,lineup,poster_url,ticket_url,rsvp_open,capacity,genres&limit=1`, 60);
  if (!e) return null;
  const count = await rpc<number | { count?: number }>("rsvp_count", { p_event_slug: slug }, 60);
  const n = typeof count === "number" ? count : count?.count ?? null;
  return { e, n };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug);
  return r ? { title: r.e.title, description: [r.e.venue, r.e.city].filter(Boolean).join(", ") || "You are invited." } : { title: "Not found" };
}

export default async function Invite({ params }: { params: Promise<{ slug: string }> }) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { e, n } = r;
  const when = e.event_date ?? e.date;
  const d = when ? new Date(`${when}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : null;
  return (
    <main className="k-root">
      <section className="k-wrap grid items-start gap-10 py-10 md:grid-cols-[1fr_440px] md:py-14">
        <div>
          <span className="k-m" style={{ color: "var(--k-pc)" }}>You are invited</span>
          <h1 className="k-d mt-3 text-[52px] md:text-[88px]">{e.title}</h1>
          <p className="k-b mt-4 text-[18px]">{[d, e.start_time?.slice(0, 5), e.venue, e.city].filter(Boolean).join(" · ")}</p>
          {e.lineup?.length ? <p className="mt-6 text-[20px] font-semibold">{e.lineup.join(", ")}</p> : null}
          {e.blurb && <p className="k-b mt-4 max-w-[60ch] whitespace-pre-line">{e.blurb}</p>}
          <div className="mt-8 max-w-[520px]"><Readout cells={[{ value: n, label: "Coming" }, { value: e.capacity, label: "Capacity" }]} /></div>
        </div>
        <aside className="k-plinth relative p-6">
          <Sticker style={{ right: -14, top: -18 }}>{e.ticket_url ? "Tickets" : "Free"}<br />entry</Sticker>
          {e.ticket_url ? (
            <div className="grid gap-4">
              <b className="text-[19px]">This party sells tickets</b>
              <ButtonLink variant="key" size="l" href={e.ticket_url} target="_blank" rel="noopener">Get tickets</ButtonLink>
            </div>
          ) : e.rsvp_open ? (
            <Rsvp slug={e.slug} />
          ) : (
            <p className="k-b">RSVPs are closed for this party.</p>
          )}
          <a href={productLink("ccd", `/nights/${e.slug}`)} className="k-b mt-5 block text-sm">See it on Nights</a>
          <div className="mt-4"><Cat name="yellow" height={64} /></div>
        </aside>
      </section>
    </main>
  );
}
