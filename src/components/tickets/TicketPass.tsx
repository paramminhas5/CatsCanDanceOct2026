/**
 * TicketPass: one ticket as a physical stub. Night on top, tear line, QR below.
 * Tap the QR for a full-screen, high-contrast version for the door scanner.
 * "Save image" draws the ticket onto a canvas so it works offline from the camera roll.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { PassTicket } from "@/lib/booking";

type Props = {
  t: PassTicket;
  when: string;
  venue: string | null;
  index: number;
  total: number;
  fresh?: boolean;
};

export default function TicketPass({ t, when, venue, index, total, fresh }: Props) {
  const [qr, setQr] = useState("");
  const [big, setBig] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(t.code, { margin: 1, width: 560, errorCorrectionLevel: "M" }).then(setQr).catch(() => {});
  }, [t.code]);

  async function saveImage() {
    if (!qr) return;
    try { await (document as any).fonts?.ready; } catch {}
    const W = 720, H = 1180, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    const ink = "#020617", cream = "#e7e5e4", red = "#dc2626", acid = "#b6ef36";
    g.fillStyle = ink; g.fillRect(0, 0, W, H);
    g.fillStyle = cream; g.fillRect(16, 16, W - 32, H - 32);
    g.fillStyle = red; g.fillRect(16, 16, W - 32, 420);
    g.fillStyle = acid; g.font = "bold 28px 'Space Grotesk', sans-serif"; g.fillText("CATS CAN DANCE", 56, 84);
    g.fillStyle = cream; g.font = "88px 'Bowlby One', sans-serif";
    const title = (t.event_title ?? t.event_slug).toUpperCase();
    wrap(g, title, 56, 190, W - 112, 86);
    g.font = "bold 32px 'Space Grotesk', sans-serif"; g.fillText(when, 56, 370); g.fillText(venue ?? "", 56, 410);
    g.setLineDash([14, 12]); g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 460); g.lineTo(W - 40, 460); g.stroke(); g.setLineDash([]);
    const img = new Image(); img.src = qr; await img.decode();
    g.fillStyle = "#ffffff"; g.fillRect(150, 500, 420, 420); g.drawImage(img, 160, 510, 400, 400);
    g.fillStyle = ink; g.textAlign = "center";
    g.font = "bold 44px monospace"; g.fillText(t.code.split("").join(" "), W / 2, 990);
    g.font = "bold 30px 'Space Grotesk', sans-serif"; g.fillText([t.holder_name, t.tier].filter(Boolean).join("  /  "), W / 2, 1050);
    g.font = "24px 'Space Grotesk', sans-serif"; g.fillText(`Ticket ${index + 1} of ${total}. Show this at the door.`, W / 2, 1100);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = `ccd-${t.event_slug}-${t.code}.png`; a.click();
  }

  const used = t.checked_in;
  return (
    <article className="relative border-4 border-ink bg-cream text-ink chunk-shadow print-in" style={{ animationDelay: `${index * 90}ms` }}
      aria-label={`Ticket ${index + 1} of ${total} for ${t.event_title ?? t.event_slug}`}>
      <div className="bg-magenta text-cream px-5 pt-5 pb-6">
        <div className="flex items-start justify-between gap-3">
          <p className="font-bold text-acid-yellow text-sm">Cats Can Dance</p>
          <p className="text-sm font-bold tabular">{index + 1} of {total}</p>
        </div>
        <h2 className="font-display text-4xl leading-[0.85] mt-2 break-words" style={{ filter: "drop-shadow(3px 3px 0 hsl(var(--ink)))" }}>
          {(t.event_title ?? t.event_slug).toUpperCase()}
        </h2>
        <p className="font-bold mt-3">{when}</p>
        {venue && <p className="font-bold">{venue}</p>}
      </div>
      <div className="py-5"><div className="perf" aria-hidden /></div>
      <div className="px-5 pb-6 text-center">
        <button type="button" onClick={() => setBig(true)} className="mx-auto block bg-white p-2 border-4 border-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-blue/50"
          aria-label="Show the QR code full screen">
          {qr ? <img src={qr} alt={`QR code for ticket ${t.code}`} width={220} height={220} className={`w-[220px] h-[220px] ${used ? "opacity-30" : ""}`} />
            : <span className="block w-[220px] h-[220px] bg-ink/10" />}
        </button>
        <p className="mt-3 font-mono text-2xl font-bold tracking-[0.25em]">{t.code}</p>
        <p className="mt-1 font-bold">{t.holder_name}{t.tier ? <span className="font-normal text-ink/70"> · {t.tier}</span> : null}</p>
        {used && <p className="mt-2 font-bold text-magenta">Checked in</p>}
        <div className="mt-4 flex justify-center gap-4 text-sm font-bold">
          <button type="button" onClick={() => setBig(true)} className="underline underline-offset-4">Full screen</button>
          <button type="button" onClick={saveImage} className="underline underline-offset-4">Save image</button>
        </div>
      </div>
      {fresh && index === 0 && (
        <span aria-hidden className="stamp-in pointer-events-none absolute right-4 top-24 md:top-20 font-display text-3xl px-3 py-1 border-4 border-acid-yellow text-acid-yellow">YOU&apos;RE IN</span>
      )}

      <Dialog open={big} onOpenChange={setBig}>
        <DialogContent className="max-w-md bg-white border-4 border-ink p-6 text-center">
          <DialogTitle className="font-display text-2xl">{(t.event_title ?? t.event_slug).toUpperCase()}</DialogTitle>
          {qr && <img src={qr} alt={`QR code for ticket ${t.code}`} className="w-full max-w-[360px] mx-auto" />}
          <p className="font-mono text-3xl font-bold tracking-[0.25em]">{t.code}</p>
          <p className="font-bold">{t.holder_name}</p>
          <p className="text-sm text-ink/70">Turn your screen brightness up at the door.</p>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "", yy = y, lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > max && line) { g.fillText(line, x, yy); line = w; yy += lh; lines++; if (lines >= 2) break; }
    else line = test;
  }
  if (line) g.fillText(line, x, yy);
}
