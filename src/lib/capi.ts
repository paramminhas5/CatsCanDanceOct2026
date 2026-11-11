/**
 * Meta Conversions API (server side). Off unless both NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_TOKEN
 * are set. Sends the same event_id as the browser pixel so Meta dedupes. No personal data is sent:
 * only the browser cookies Meta set itself (_fbp, _fbc), IP and user agent for matching.
 */
import type { NextApiRequest } from "next";

export async function sendCapi(req: NextApiRequest, ev: { name: "Purchase" | "CompleteRegistration" | "Lead"; eventId: string; value?: number; currency?: string; url?: string }) {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID, token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return;
  const fwd = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();
  const user_data: Record<string, string> = {};
  if (fwd || req.socket?.remoteAddress) user_data.client_ip_address = fwd || String(req.socket.remoteAddress);
  if (req.headers["user-agent"]) user_data.client_user_agent = String(req.headers["user-agent"]);
  if (req.cookies?._fbp) user_data.fbp = req.cookies._fbp;
  if (req.cookies?._fbc) user_data.fbc = req.cookies._fbc;
  const body = {
    data: [
      {
        event_name: ev.name,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: "website",
        event_source_url: ev.url ?? String(req.headers.referer ?? "https://catscandance.com"),
        user_data,
        custom_data: ev.value !== undefined ? { value: ev.value, currency: ev.currency ?? "INR" } : { currency: ev.currency ?? "INR" },
      },
    ],
  };
  try {
    await fetch(`https://graph.facebook.com/v23.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
  } catch {}
}
