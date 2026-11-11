/**
 * Meta pixel. Off unless NEXT_PUBLIC_META_PIXEL_ID is set in Vercel, so nothing loads until Param
 * turns paid ads on. Conversion events carry an eventID that the server repeats through the
 * Conversions API (src/lib/capi.ts) so Meta counts each conversion once.
 */
export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Fbq = (cmd: "track" | "trackCustom" | "init", event: string, params?: Record<string, unknown>, opts?: { eventID?: string }) => void;

function fbq(): Fbq | undefined {
  if (typeof window === "undefined" || !PIXEL_ID) return undefined;
  return (window as unknown as { fbq?: Fbq }).fbq;
}

export type Conversion =
  | { kind: "ticket_free"; slug: string; orderId: string }
  | { kind: "ticket_checkout"; slug: string; value: number }
  | { kind: "purchase"; slug: string; orderId: string; value: number }
  | { kind: "rsvp"; slug: string }
  | { kind: "signup"; source: string }
  | { kind: "contact"; reason?: string };

/** Event ids shared with the server so browser + server events dedupe. */
export const purchaseEventId = (orderId: string) => `ccd_purchase_${orderId}`;

export function convert(c: Conversion) {
  const f = fbq();
  if (!f) return;
  try {
    switch (c.kind) {
      case "ticket_free":
        return f("track", "CompleteRegistration", { content_name: c.slug, value: 0, currency: "INR" }, { eventID: `ccd_order_${c.orderId}` });
      case "ticket_checkout":
        return f("track", "InitiateCheckout", { content_name: c.slug, value: c.value, currency: "INR" });
      case "purchase":
        return f("track", "Purchase", { content_name: c.slug, value: c.value, currency: "INR" }, { eventID: purchaseEventId(c.orderId) });
      case "rsvp":
        return f("track", "CompleteRegistration", { content_name: c.slug, value: 0, currency: "INR" });
      case "signup":
        return f("track", "Lead", { content_name: c.source });
      case "contact":
        return f("track", "Contact", c.reason ? { content_name: c.reason } : {});
    }
  } catch {}
}

export function pageView() {
  try {
    fbq()?.("track", "PageView");
  } catch {}
}
