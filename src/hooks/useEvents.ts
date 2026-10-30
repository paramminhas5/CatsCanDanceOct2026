/**
 * useEvents — fetch events from Supabase with static fallback.
 * 
 * Usage:
 *   const { data: events, isLoading } = useEvents();
 *   const { data: events } = useEvents({ series: "ccdxsocial" });
 *   const { data: events } = useEvents({ status: "upcoming" });
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { EVENT_ROWS } from "@/content/events";
import type { EventRow } from "@/types/events";

interface UseEventsOptions {
  series?: string;
  status?: string;
  slug?: string;
  limit?: number;
}

export function useEvents(options: UseEventsOptions = {}) {
  return useQuery<EventRow[]>({
    queryKey: ["events", options],
    queryFn: async () => {
      let query = supabase.from("events").select("*").order("sort_order");

      if (options.series) query = query.eq("series", options.series);
      if (options.status) query = query.eq("status", options.status);
      if (options.slug) query = query.eq("slug", options.slug);
      if (options.limit) query = query.limit(options.limit);

      const { data, error } = await query;

      if (error || !data?.length) {
        // Fallback to static content
        let events = Object.values(EVENT_ROWS) as EventRow[];
        if (options.series) events = events.filter((e) => e.series === options.series);
        if (options.status) events = events.filter((e) => e.status === options.status);
        if (options.slug) events = events.filter((e) => e.slug === options.slug);
        if (options.limit) events = events.slice(0, options.limit);
        return events;
      }

      return data as EventRow[];
    },
    staleTime: 60_000, // 1 minute
  });
}

/**
 * useEvent — fetch a single event by slug.
 */
export function useEvent(slug: string) {
  return useQuery<EventRow | null>({
    queryKey: ["event", slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        // Fallback to static content
        return (EVENT_ROWS as Record<string, EventRow>)[slug] ?? null;
      }

      return data as EventRow;
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}
