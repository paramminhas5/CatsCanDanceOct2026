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

interface Props {
  event: EventRow;
  slug: string;
}

export default function EventSlugPage({ event, slug }: Props) {
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
