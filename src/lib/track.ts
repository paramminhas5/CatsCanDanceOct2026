/**
 * Product analytics: Vercel Web Analytics custom events. Ten events that say whether each loop works.
 * Names are fixed here so dashboards stay stable. No personal data in properties.
 */
import { track as vtrack } from "@vercel/analytics";

export type Event =
  | "find_night"      // opened What's on or filtered it
  | "going"           // said I'm going
  | "join_crew"
  | "play_preview"    // played a 30 second preview
  | "book_request"    // sent a booking request
  | "claim"           // claimed an artist page
  | "share"           // shared a card
  | "open_school"
  | "points_redeem"   // spent points on a perk
  | "invite_join";    // a new member joined with a friend's invite link

export function track(e: Event, props?: Record<string, string | number | boolean | null>) {
  try { vtrack(e, props ?? {}); } catch {}
}
