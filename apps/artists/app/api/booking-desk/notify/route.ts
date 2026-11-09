/** After a message or an action, mail whoever has not heard yet. Takes no input, so it cannot send arbitrary mail. */
import { NextResponse } from "next/server";
import { notifyBookings } from "@/lib/booking-actions";

export async function POST() {
  try { await notifyBookings(); } catch { /* mail is best effort */ }
  return NextResponse.json({ ok: true });
}
