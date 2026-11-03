/**
 * The request panel in a drawer: from the right on desktop, from the bottom on phones.
 * Escape and the backdrop close it. Body scroll is locked while open.
 */
import { useEffect, useRef } from "react";
import RequestPanel from "@/components/booking/RequestPanel";
import type { MiniArtist } from "@/lib/desk";

export default function RequestDrawer({ open, onClose, artists, onRemove, initial }: {
  open: boolean; onClose: () => void; artists: MiniArtist[]; onRemove?: (slug: string) => void;
  initial?: { date?: string; city?: string; budget?: string };
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => box.current?.focus(), 30);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-label="Request to book">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/70 cursor-default" />
      <div ref={box} tabIndex={-1} className="relative w-full md:w-[520px] max-h-[92vh] md:max-h-none md:h-full overflow-y-auto bg-background border-t-4 md:border-t-0 md:border-l-4 border-ink focus:outline-none">
        <div className="sticky top-0 z-10 flex justify-end bg-background/95 px-4 pt-3 pb-2">
          <button type="button" onClick={onClose} className="font-display px-3 py-1.5 border-4 border-ink bg-cream hover:bg-ink hover:text-cream">Close</button>
        </div>
        <div className="px-4 pb-8">
          <RequestPanel id="drawer-req" artists={artists} onRemove={onRemove} initial={initial} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
