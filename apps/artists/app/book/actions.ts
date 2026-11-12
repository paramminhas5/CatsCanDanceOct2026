"use server";
/**
 * The ask form's action. Reads the form, sends it through sendBookingRequest (zod-checked, anon
 * SECURITY DEFINER RPC request_booking_v2) and returns either an error to show or where to go next.
 */
import { sendBookingRequest } from "@/lib/booking-actions";

export type AskState = { error: string | null; done: { id: string; key: string; artist_slug: string }[] | null };

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function sendAsk(_prev: AskState, fd: FormData): Promise<AskState> {
  const slugs = fd.getAll("a").map(String).filter((x) => /^[a-z0-9-]{1,80}$/.test(x)).slice(0, 3);
  if (!slugs.length) return { error: "Pick at least one artist.", done: null };
  const room = Number(s(fd, "room"));
  const r = await sendBookingRequest({
    slugs,
    date: s(fd, "date"),
    city: s(fd, "city"),
    venue: s(fd, "venue"),
    room: Number.isFinite(room) && room > 0 ? room : null,
    set: s(fd, "set"),
    budget: s(fd, "budget"),
    other: s(fd, "other"),
    message: s(fd, "message"),
    name: s(fd, "name"),
    email: s(fd, "email"),
    org: s(fd, "org"),
    hp: s(fd, "website"),
  });
  if (!r.ok) return { error: r.error, done: null };
  return { error: null, done: r.requests.map(({ id, key, artist_slug }) => ({ id, key, artist_slug })) };
}
