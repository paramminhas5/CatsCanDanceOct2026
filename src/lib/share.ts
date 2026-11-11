/**
 * Share cards and the loop. A card is an image at /api/card/<kind>/<target>; the share link carries
 * ?ref=<id> so opens can be counted against shares (log_share, migration 048). No personal data.
 */
import { track } from "@/lib/track";
import { supabase } from "@/lib/supabase";
import { myInviteCode } from "@/lib/points";

export type ShareKind = "going" | "night" | "artist" | "tour" | "episode" | "booked" | "beat";
// Links and card images use the site the visitor is on (previews and production alike); the canonical domain on the server.
const site = () => (typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "https://catscandance.com");

/** A short id for this browser so shares and opens can be joined without identifying anyone. */
export function shareRef(): string {
  try {
    let r = localStorage.getItem("ccd:ref");
    if (!r) { r = Math.random().toString(36).slice(2, 10); localStorage.setItem("ccd:ref", r); }
    return r;
  } catch { return "anon"; }
}

export const cardUrl = (kind: ShareKind, target: string, size: "story" | "link" = "story", extra: Record<string, string> = {}) =>
  `${site()}/api/card/${kind}/${encodeURIComponent(target)}?${new URLSearchParams({ size, ...extra })}`;

// A signed-in member's shares also carry their invite code (&i=), so friends who join from it count as their invite.
export const shareLink = (path: string, kind: ShareKind, target: string) => {
  const i = myInviteCode();
  return `${site()}${path}${path.includes("?") ? "&" : "?"}ref=${shareRef()}&via=${kind}:${encodeURIComponent(target).slice(0, 80)}${i ? `&i=${i}` : ""}`;
};

export function logShare(kind: ShareKind, target: string, action: "share" | "open", channel?: string) {
  if (action === "share") track("share", { kind, channel: channel ?? null });
  supabase.rpc("log_share", { p_kind: kind, p_target: target, p_action: action, p_ref: shareRef(), p_channel: channel ?? null }).then(() => {}, () => {});
}

/** Call once on page load: a visit from a shared link counts as an open for that card. */
export function logOpenFromRef() {
  try {
    const q = new URLSearchParams(window.location.search);
    const via = q.get("via");
    if (!q.get("ref") || !via) return;
    const [kind, target] = via.split(":");
    if (!kind || !target) return;
    const k = `ccd:opened:${via}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    supabase.rpc("log_share", { p_kind: kind, p_target: decodeURIComponent(target), p_action: "open", p_ref: q.get("ref"), p_channel: null }).then(() => {}, () => {});
  } catch {}
}

export type ShareResult = "shared" | "copied" | "opened" | "failed";

/** Share the card image and link through the phone's share sheet; fall back to WhatsApp or the clipboard. */
export async function shareCard(opts: { kind: ShareKind; target: string; path: string; text: string; extra?: Record<string, string> }): Promise<ShareResult> {
  const { kind, target, path, text, extra } = opts;
  const link = shareLink(path, kind, target);
  const img = cardUrl(kind, target, "story", extra);
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav?.share) {
    try {
      let files: File[] | undefined;
      try {
        const blob = await fetch(img).then((r) => (r.ok ? r.blob() : Promise.reject()));
        const f = new File([blob], `ccd-${kind}.png`, { type: "image/png" });
        if (nav.canShare?.({ files: [f] })) files = [f];
      } catch {}
      await nav.share({ title: "Cats Can Dance", text: `${text} ${link}`, url: files ? undefined : link, files });
      logShare(kind, target, "share", files ? "sheet-image" : "sheet");
      return "shared";
    } catch (e: any) {
      if (e?.name === "AbortError") return "failed";
    }
  }
  try {
    await nav?.clipboard?.writeText(`${text} ${link}`);
    logShare(kind, target, "share", "copy");
    return "copied";
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
    logShare(kind, target, "share", "whatsapp");
    return "opened";
  }
}
