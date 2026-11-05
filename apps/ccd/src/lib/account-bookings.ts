/**
 * Booking requests for Your account (/me): the ones you sent and, if you own an artist page, the ones
 * sent to you. Read-only. The booking desk itself (threads, counters, accept, confirm) is the Artists
 * product; /me only lists the rows and links across. Same RPCs as the desk (migration 041).
 *
 * Visitors who booked without an account keep their thread keys in localStorage under `ccd:booking-keys`
 * (written by the desk); those threads are listed too.
 */
import { supabase } from "@/lib/supabase";

export type BookingRow = {
  id: string; role: "requester" | "artist"; stage: string; artist_slug: string; artist: string | null; photo_url: string | null; name: string;
  org: string | null; city: string | null; event_date: string | null; venue: string | null; budget_band: string | null; fee_inr: number | null;
  last_actor: string | null; created_at: string; updated_at: string; key?: string;
};

function savedKeys(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem("ccd:booking-keys") ?? "[]");
    return Array.isArray(v) ? v.map((k: { key?: string }) => k?.key).filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export async function loadMyBookings(): Promise<BookingRow[]> {
  const rows: BookingRow[] = [];
  const { data: session } = await supabase.auth.getSession();
  if (session.session) {
    const { data, error } = await supabase.rpc("my_booking_threads");
    if (!error && Array.isArray(data)) rows.push(...(data as BookingRow[]));
  }
  const keys = savedKeys();
  if (keys.length) {
    const { data, error } = await supabase.rpc("booking_threads_by_keys", { p_keys: keys });
    if (!error && Array.isArray(data)) for (const x of data as BookingRow[]) if (!rows.some((y) => y.id === x.id)) rows.push(x);
  }
  return rows.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
}
