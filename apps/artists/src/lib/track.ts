/**
 * Product analytics: Vercel Web Analytics custom events, through the script the layout loads
 * (window.va). No package needed, no personal data in properties. Names are fixed so dashboards stay stable.
 */
export type Event =
  | "play_preview"    // played a 30 second preview
  | "book_request"    // sent a booking request
  | "claim"           // claimed an artist page
  | "share"           // shared a card
  | "follow"
  | "find_artist";    // searched or filtered the index

type Va = (kind: "event", payload: { name: string; data?: Record<string, string | number | boolean | null> }) => void;

export function track(e: Event, props?: Record<string, string | number | boolean | null>) {
  try {
    const va = (window as unknown as { va?: Va }).va;
    va?.("event", { name: e, data: props ?? {} });
  } catch { /* analytics off */ }
}
