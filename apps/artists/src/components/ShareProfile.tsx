"use client";
/**
 * Share this page: opens a sheet with the profile card (their eras and records on one image), then
 * shares it through the phone's sheet with the link, or copies the link, or saves the image.
 * The link carries ?ref= so opens are counted (log_share). Plan ccd/v2-plan.md 5.3.
 */
import { useEffect, useState } from "react";
import { cardUrl, logShare, shareLink } from "@/lib/share";

export default function ShareProfile({ slug, name, owner = false, size = "l" }: { slug: string; name: string; owner?: boolean; size?: "l" | "m" }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);

  // Start drawing the card as soon as someone reaches for the button.
  const warm = () => { try { const i = new Image(); i.src = cardUrl("profile", slug, "story"); } catch { /* ignore */ } };
  const show = () => { setImg(cardUrl("profile", slug, "story")); setNote(null); setOpen(true); };
  const text = owner ? `My page on Cats Can Dance: every era, every record.` : `${name} on Cats Can Dance: every era, every record.`;

  const share = async () => {
    const link = shareLink(`/${slug}`, "profile", slug);
    try {
      if (navigator.share) {
        let files: File[] | undefined;
        try {
          const blob = await fetch(cardUrl("profile", slug, "story")).then((r) => (r.ok ? r.blob() : Promise.reject()));
          const f = new File([blob], `${slug}-on-cats-can-dance.png`, { type: "image/png" });
          if (navigator.canShare?.({ files: [f] })) files = [f];
        } catch { /* share the link alone */ }
        await navigator.share({ title: name, text: `${text} ${link}`, url: files ? undefined : link, files });
        logShare("profile", slug, "share", files ? "sheet-image" : "sheet");
        return;
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
    }
    await copy();
  };
  const copy = async () => {
    const link = shareLink(`/${slug}`, "profile", slug);
    try { await navigator.clipboard.writeText(link); setNote("Link copied."); logShare("profile", slug, "share", "copy"); }
    catch { setNote(link); }
  };
  const wa = () => {
    const link = shareLink(`/${slug}`, "profile", slug);
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`, "_blank", "noopener");
    logShare("profile", slug, "share", "whatsapp");
  };

  return (
    <>
      <button type="button" className={`k-btn k-btn--ghost${size === "l" ? " k-btn--l" : ""}`} onClick={show} onPointerEnter={warm} onFocus={warm} aria-label={`Share ${name}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
        <span className="sp-lbl">Share</span>
      </button>
      {open && (
        <div className="sp-scrim" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="sp-sheet" role="dialog" aria-modal="true" aria-label={`Share ${name}`}>
            <button type="button" className="ax-x" onClick={() => setOpen(false)} aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            <div className="sp-card">
              <span className="k-m">Drawing the card</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img && <img src={img} alt={`${name}: their eras and records on one card`} />}
            </div>
            <div className="sp-side">
              <h2 className="k-d">{owner ? "Your page, on one card" : `Share ${name}`}</h2>
              <p className="k-b">{owner ? "Every era and every record, ready for your story. The link opens your page." : "Their eras and records on one card. The link opens this page."}</p>
              <div className="sp-acts">
                <button type="button" className="k-btn k-btn--key k-btn--l" onClick={share}>Share</button>
                <button type="button" className="k-btn k-btn--ghost k-btn--l" onClick={wa}>WhatsApp</button>
                <button type="button" className="k-btn k-btn--ghost k-btn--l" onClick={copy}>Copy link</button>
                <a className="k-btn k-btn--ghost k-btn--l" href={cardUrl("profile", slug, "story")} download={`${slug}-on-cats-can-dance.png`} onClick={() => logShare("profile", slug, "share", "download")}>Save the image</a>
              </div>
              {note && <p className="k-b mt-3 text-sm" role="status">{note}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
