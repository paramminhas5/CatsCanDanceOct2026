/**
 * Share: opens the phone's share sheet with the card image and a tracked link. On desktop it
 * copies the link, with a WhatsApp fallback. Shows the card as a preview when `preview` is on.
 */
import { useState } from "react";
import { cardUrl, shareCard, type ShareKind } from "@/lib/share";

type Props = { kind: ShareKind; target: string; path: string; text: string; label?: string; extra?: Record<string, string>; className?: string; preview?: boolean };

export default function ShareButton({ kind, target, path, text, label = "Share", extra, className = "", preview = false }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "shared" | "opened" | "failed">("idle");
  const go = async () => {
    setState("busy");
    const r = await shareCard({ kind, target, path, text, extra });
    setState(r);
    setTimeout(() => setState("idle"), 2200);
  };
  const msg = state === "copied" ? "Link copied" : state === "shared" ? "Shared" : state === "opened" ? "Opening WhatsApp" : state === "busy" ? "Making your card…" : label;
  return (
    <span className="inline-flex flex-col items-start gap-2">
      <button type="button" onClick={go} disabled={state === "busy"} className={`inline-flex items-center gap-2 font-display text-sm px-4 py-2.5 border-4 border-ink bg-cream text-ink chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-70 ${className}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" aria-hidden><path d="M12 3v13M6 9l6-6 6 6M4 14v6h16v-6" /></svg>
        {msg}
      </button>
      {preview && <img src={cardUrl(kind, target, "link", extra)} alt="" loading="lazy" className="w-full max-w-[360px] border-4 border-ink" />}
    </span>
  );
}
