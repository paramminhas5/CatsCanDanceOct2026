/**
 * Booking calls for the ticket box, the ticket page and the ticket pass.
 * Each call prefers the newer RPCs from migration 037 and falls back to the
 * older ones, so the pages keep working before and after 037 is applied.
 */
import { supabase } from "@/lib/supabase";

export type Tier = {
  id: string;
  name: string;
  description: string | null;
  price_inr: number;
  max_per_order: number;
  remaining: number;
  capacity: number | null;
  sold_out: boolean;
};

export async function loadTiers(slug: string): Promise<Tier[]> {
  const v2 = await supabase.rpc("event_tiers", { p_slug: slug });
  if (!v2.error && Array.isArray(v2.data)) return v2.data as Tier[];
  const v1 = await supabase.rpc("public_tiers", { p_slug: slug });
  return ((v1.data as any[]) ?? []).map((t) => ({
    ...t,
    description: null,
    capacity: null,
    sold_out: Number(t.remaining) < 1,
  }));
}

export type Buzz = { tickets: number; rsvps: number; going: number; likes: number };

export async function loadBuzz(slug: string): Promise<Buzz> {
  const v2 = await supabase.rpc("night_buzz", { p_slug: slug });
  if (!v2.error && v2.data) {
    const d = v2.data as any;
    return { tickets: Number(d.tickets ?? 0), rsvps: Number(d.rsvps ?? 0), going: Number(d.going ?? 0), likes: Number(d.likes ?? 0) };
  }
  const [nc, rc] = await Promise.all([supabase.rpc("night_counts"), supabase.rpc("rsvp_count", { p_event_slug: slug })]);
  const row = ((nc.data as any[]) ?? []).find((x) => x.event_slug === slug);
  return { tickets: 0, rsvps: Number(rc.data ?? 0), going: Number(row?.going ?? 0), likes: Number(row?.likes ?? 0) };
}

/** People who have a ticket, an RSVP or said they're going. Overlaps are possible, so this is a floor, not an exact head count. */
export const buzzCount = (b: Buzz) => Math.max(b.tickets + b.rsvps, b.going);

export type PromoCheck = { ok: true; code: string; discount_inr: number } | { ok: false; error: string; unchecked?: boolean };

export async function checkPromo(slug: string, code: string, subtotal: number): Promise<PromoCheck> {
  const { data, error } = await supabase.rpc("check_promo", { p_slug: slug, p_code: code, p_subtotal: subtotal });
  // Before 037 there is no preview: the code is checked when the order is placed.
  if (error) return { ok: false, error: "We'll check this code when you place the order.", unchecked: true };
  const d = data as any;
  return d?.ok ? { ok: true, code: d.code, discount_inr: Number(d.discount_inr ?? 0) } : { ok: false, error: d?.error ?? "That code does not work." };
}

export async function joinWaitlist(slug: string, name: string, email: string): Promise<{ ok: boolean; position?: number; error?: string }> {
  const { data, error } = await supabase.rpc("join_event_waitlist", { p_slug: slug, p_name: name, p_email: email });
  if (error) return { ok: false, error: "The waiting list is not open yet. Follow @catscandance on Instagram for drops." };
  const d = data as any;
  return d?.ok ? { ok: true, position: d.position } : { ok: false, error: d?.error ?? "Could not add you." };
}

export type PlacedOrder = { order_id: string; free: boolean; amount_inr: number; discount_inr: number };

export async function placeOrder(input: {
  slug: string; name: string; email: string; phone: string; items: { tier: string; qty: number }[]; promo?: string | null;
}): Promise<PlacedOrder> {
  const { data, error } = await supabase.rpc("create_ticket_order", {
    p_slug: input.slug, p_name: input.name, p_email: input.email, p_phone: input.phone,
    p_items: input.items, p_source: "platform", p_promo: input.promo?.trim() || null,
  });
  if (error) throw new Error("Could not reach the box office. Check your connection and try again.");
  const d = data as any;
  if (!d?.ok) throw new Error(d?.error ?? "Could not place the order.");
  return { order_id: d.order_id, free: !!d.free, amount_inr: Number(d.amount_inr ?? 0), discount_inr: Number(d.discount_inr ?? 0) };
}

export type PassTicket = {
  code: string; tier: string | null; holder_name: string; event_slug: string; event_title: string | null;
  event_date: string | null; venue: string | null; checked_in: boolean; status?: string; order_id?: string;
};

export async function orderTickets(orderId: string, email: string): Promise<PassTicket[]> {
  const { data } = await supabase.rpc("my_tickets", { p_order: orderId, p_email: email });
  return (data as PassTicket[]) ?? [];
}

/** All tickets for the signed-in member's email. Empty when signed out or before 037. */
export async function memberTickets(): Promise<PassTicket[] | null> {
  const s = await supabase.auth.getSession();
  if (!s.data.session) return null;
  const { data, error } = await supabase.rpc("my_member_tickets");
  if (error) return [];
  return (data as PassTicket[]) ?? [];
}
