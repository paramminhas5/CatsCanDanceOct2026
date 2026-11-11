/**
 * Attribution: where a visitor came from (UTM / click ids, first touch per session) and what they
 * tell us when they convert ("how did you hear about us"). Stored through the log_lead_signal RPC
 * (migration 070) and joined to orders, RSVPs, signups and contact messages in marketing.leads_feed.
 * Everything here is best effort: it never blocks or breaks a form.
 */
import { supabase } from "@/lib/supabase";

const KEY = "ccd_attr";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "ref"] as const;

export type Attribution = Partial<Record<(typeof PARAMS)[number] | "landing", string>>;

/** Call once on load. Keeps the first touch of the session; a new campaign click replaces it. */
export function captureLanding() {
  if (typeof window === "undefined") return;
  try {
    const q = new URLSearchParams(window.location.search);
    const hit: Attribution = {};
    for (const p of PARAMS) {
      const v = q.get(p);
      if (v) hit[p] = v.slice(0, 120);
    }
    const existing = sessionStorage.getItem(KEY);
    if (Object.keys(hit).length || !existing) {
      hit.landing = window.location.pathname.slice(0, 120);
      sessionStorage.setItem(KEY, JSON.stringify(hit));
    }
  } catch {}
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Attribution;
  } catch {
    return {};
  }
}

export type SignalForm = "ticket" | "rsvp" | "signup" | "contact" | "promoter" | "artist" | "event";

/** Records how someone heard about CCD at the moment they convert. Fire and forget. */
export function logLeadSignal(s: { form: SignalForm; email: string; ref?: string | null; heardFrom?: string | null; whatsapp?: string | null }) {
  if (!s.email) return;
  void Promise.resolve(
    supabase.rpc("log_lead_signal", {
      p_form: s.form,
      p_ref: s.ref ?? null,
      p_email: s.email.trim().toLowerCase(),
      p_heard_from: s.heardFrom?.trim() || null,
      p_whatsapp: s.whatsapp?.trim() || null,
      p_utm: getAttribution(),
      p_page: typeof window !== "undefined" ? window.location.pathname : null,
    }),
  ).catch(() => {});
}
