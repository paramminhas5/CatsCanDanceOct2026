/** Small actions shared by the event page and the ticket pass: add to calendar, share, directions. */
import { shareCard, type ShareKind } from "@/lib/share";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { downloadIcs, googleCalendarUrl, type NightLike } from "@/lib/nights";

const base = "inline-flex items-center gap-2 font-display text-sm md:text-base px-4 py-2.5 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue/50";

export function AddToCalendar({ night, time, url, tone = "light" }: { night: NightLike; time?: string | null; url: string; tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const g = googleCalendarUrl(night, { time, url });
  if (!g) return null;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}
        className={`${base} ${tone === "dark" ? "bg-ink text-cream" : "bg-cream text-ink"}`}>
        Add to calendar
      </button>
      {open && (
        <div role="menu" className="absolute z-30 mt-2 left-0 min-w-[200px] bg-cream text-ink border-4 border-ink chunk-shadow">
          <a role="menuitem" href={g} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
            className="block px-4 py-3 font-bold hover:bg-acid-yellow focus:bg-acid-yellow focus:outline-none">Google Calendar</a>
          <button role="menuitem" type="button" onClick={() => { downloadIcs(night, { time, url }); setOpen(false); }}
            className="block w-full text-left px-4 py-3 font-bold border-t-2 border-ink/15 hover:bg-acid-yellow focus:bg-acid-yellow focus:outline-none">Apple or Outlook (.ics)</button>
        </div>
      )}
    </div>
  );
}

/** Share a night. With `card`, shares the card image and a tracked link (src/lib/share.ts). */
export function ShareButton({ title, text, url, tone = "light", label = "Share", card }: { title: string; text?: string; url: string; tone?: "light" | "dark"; label?: string; card?: { kind: ShareKind; target: string; path: string } }) {
  return (
    <button type="button" className={`${base} ${tone === "dark" ? "bg-ink text-cream" : "bg-cream text-ink"}`}
      onClick={async () => {
        if (card) {
          const r = await shareCard({ ...card, text: text ?? title });
          if (r === "copied") toast.success("Link copied");
          return;
        }
        if (typeof navigator.share === "function") {
          try { await navigator.share({ title, text, url }); return; } catch (e: any) { if (e?.name === "AbortError") return; }
        }
        try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Could not copy the link"); }
      }}>
      {label}
    </button>
  );
}

export function DirectionsLink({ href, tone = "light" }: { href: string | null; tone?: "light" | "dark" }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${tone === "dark" ? "bg-ink text-cream" : "bg-cream text-ink"}`}>
      Directions
    </a>
  );
}
