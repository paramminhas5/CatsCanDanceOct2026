/**
 * Web push reminders (migration 050). Free, no provider: the browser keeps the subscription and
 * /api/cron/reminders sends "your night is tomorrow" and "an artist you follow has a new date".
 * Off until NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in Vercel.
 */
import { supabase } from "@/lib/supabase";

export const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!VAPID;

const b64 = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "This browser can't do reminders. On iPhone, add the site to your Home Screen first." };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Notifications are blocked for this site in your browser settings." };
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { data, error } = await supabase.rpc("save_push_subscription", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
  if (error || !(data as any)?.ok) return { ok: false, error: (data as any)?.error ?? "Could not save. Try again." };
  return { ok: true };
}

export async function disablePush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) { await supabase.rpc("drop_push_subscription", { p_endpoint: sub.endpoint }); await sub.unsubscribe(); }
}
