/**
 * /events/[slug] — Static-generated event detail page.
 *
 * Strategy:
 *  - getStaticPaths: pre-render known slugs from the static content catalogue.
 *  - getStaticProps: fetch the event from Supabase. Uses the service key when set,
 *    otherwise the public anon key (events are publicly readable), then the static catalogue.
 *    Unpublished nights 404 unless they are in the static catalogue.
 *  - revalidate: 5s ISR.
 *
 * The EventDetail component receives the event as a prop and renders immediately.
 */
import type { GetStaticPaths, GetStaticProps } from "next";
import { getStaticEventRow, EVENT_ROWS } from "@/content/events";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { EventRow } from "@/types/events";
import EventDetailPage from "@/pages/EventDetail";
import PromoterNight, { type PromoterNightProps } from "@/components/promoters/PromoterNight";

interface Props {
  event: EventRow;
  slug: string;
  /** Set when the night belongs to a promoter (migration 056): it renders in their look. */
  promoterNight?: PromoterNightProps | null;
}

export default function EventSlugPage({ event, slug, promoterNight }: Props) {
  if (promoterNight) return <PromoterNight {...promoterNight} />;
  // key is handled by _app.tsx via router.asPath — forces remount on navigation
  return <EventDetailPage event={event} slug={slug} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = Object.keys(EVENT_ROWS).map((slug) => ({ params: { slug } }));
  return { paths, fallback: "blocking" };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = (params?.slug as string) ?? "";

  let event: EventRow | null = null;

  // 1. Supabase: service key if the server has it, otherwise the anon key (events are public).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const supabase = getSupabaseAdmin() ?? (url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null);
  if (supabase) {
    try {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (data && (data as any).published !== false) event = data as EventRow;
      // A promoter's night: fetch their look and whether CCD tickets are on, and render it in their colours.
      if (data && (data as any).published !== false && (data as any).promoter_id) {
        const d = data as any;
        const [{ data: p }, { count }] = await Promise.all([
          supabase.from("promoters").select("slug,name,accent,logo_url,tagline,instagram,status").eq("id", d.promoter_id).maybeSingle(),
          supabase.from("ticket_tiers").select("id", { count: "exact", head: true }).eq("event_slug", slug).eq("active", true),
        ]);
        if (p && (p as any).status === "approved") {
          const pr = p as any;
          return {
            props: {
              event: d as EventRow, slug,
              promoterNight: {
                night: { slug, title: d.title, date: d.date ?? null, event_date: d.event_date ?? null, start_time: d.start_time ?? null, venue: d.venue ?? null, city: d.city ?? null,
                  blurb: d.blurb ?? null, lineup: d.lineup ?? [], genres: d.genres ?? [], poster_url: d.poster_url ?? null, ticket_url: d.ticket_url ?? null, rsvp_open: d.rsvp_open ?? false, capacity: d.capacity ?? null },
                promoter: { slug: pr.slug, name: pr.name, accent: pr.accent ?? "blue", logo_url: pr.logo_url ?? null, tagline: pr.tagline ?? null, instagram: pr.instagram ?? null },
                hasTiers: (count ?? 0) > 0,
              },
            },
            revalidate: 30,
          };
        }
        return { notFound: true };
      }
    } catch {
      // Supabase unavailable — fall through to static
    }
  }

  // 2. Static fallback
  if (!event) {
    event = getStaticEventRow(slug);
  }

  // 3. For known slugs, always prefer curated static fields over stale Supabase data.
  //    title, lineup: must match the live show exactly.
  //    blurb, date: controlled by static content for SEO consistency.
  //    poster_url: use Supabase if it has a real URL (admin-uploaded), otherwise
  //                fall back to the static local path (served from public/posters/).
  const staticRow = getStaticEventRow(slug);
  if (staticRow && event) {
    event = {
      ...event,
      title:      staticRow.title,
      lineup:     staticRow.lineup     ?? event.lineup,
      blurb:      staticRow.blurb      ?? event.blurb,
      date:       staticRow.date       ?? event.date,
      poster_url: staticRow.poster_url || event.poster_url,
    };
  }

  // 4. Unknown slug → 404
  if (!event) {
    return { notFound: true };
  }

  return {
    props: { event, slug },
    revalidate: 5,
  };
};
