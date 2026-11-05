/**
 * Camera QR scanner for the door. Uses the browser's BarcodeDetector where it exists (Chrome on Android)
 * and jsQR everywhere else (iPhone Safari). Runs about 10 times a second on a downscaled frame,
 * so it stays quick on a cheap phone. Same code twice within 2.5 seconds is ignored.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Props = { onCode: (code: string) => void; paused?: boolean };

export default function Scanner({ onCode, paused }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const pausedRef = useRef(paused);
  const [state, setState] = useState<"idle" | "starting" | "on" | "denied" | "none">("idle");
  const [torch, setTorch] = useState<boolean | null>(null);
  pausedRef.current = paused;

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("none"); return; }
    setState("starting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      stream.current = s;
      const v = video.current!;
      v.srcObject = s;
      v.setAttribute("playsinline", "true");
      await v.play();
      const caps = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as any;
      setTorch(caps.torch ? false : null);
      setState("on");
    } catch (e: any) {
      setState(e?.name === "NotAllowedError" ? "denied" : "none");
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (state !== "on") return;
    let alive = true;
    const Detector = (window as any).BarcodeDetector;
    let detector: any = null;
    if (Detector) { try { detector = new Detector({ formats: ["qr_code"] }); } catch { detector = null; } }
    // jsQR only loads on phones without a built-in detector (iPhone Safari), so Android never downloads it.
    let jsQR: ((d: Uint8ClampedArray, w: number, h: number, o?: any) => { data: string } | null) | null = null;
    if (!detector) import("jsqr").then((m) => { jsQR = m.default as any; }).catch(() => {});
    if (!canvas.current) canvas.current = document.createElement("canvas");
    const ctx = canvas.current.getContext("2d", { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;

    const hit = (raw: string) => {
      const now = Date.now();
      if (raw === last.current.code && now - last.current.at < 2500) return;
      last.current = { code: raw, at: now };
      onCode(raw);
    };

    const tick = async () => {
      if (!alive) return;
      const v = video.current;
      if (v && v.readyState >= 2 && !pausedRef.current) {
        try {
          if (detector) {
            const found = await detector.detect(v);
            if (found?.[0]?.rawValue) hit(found[0].rawValue);
          } else if (ctx && jsQR) {
            const w = 480, h = Math.round((v.videoHeight / Math.max(1, v.videoWidth)) * w) || 360;
            canvas.current!.width = w; canvas.current!.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const q = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
            if (q?.data) hit(q.data);
          }
        } catch { /* a bad frame: try the next one */ }
      }
      setTimeout(tick, 100);
    };
    tick();
    return () => { alive = false; };
  }, [state, onCode]);

  const flip = async () => {
    const t = stream.current?.getVideoTracks()[0];
    if (!t || torch === null) return;
    try { await t.applyConstraints({ advanced: [{ torch: !torch } as any] }); setTorch(!torch); } catch { setTorch(null); }
  };

  return (
    <div className="relative bg-ink border-4 border-cream aspect-[4/3] w-full overflow-hidden">
      <video ref={video} muted playsInline className={`absolute inset-0 w-full h-full object-cover ${state === "on" ? "" : "hidden"}`} />
      {state === "on" && (
        <>
          <div aria-hidden className="absolute inset-[14%] border-4 border-acid-yellow pointer-events-none" />
          {torch !== null && (
            <button type="button" onClick={flip} className={`absolute top-3 right-3 font-display text-sm px-3 py-2 border-4 border-ink ${torch ? "bg-acid-yellow text-ink" : "bg-cream text-ink"}`}>
              {torch ? "Light off" : "Light"}
            </button>
          )}
          {paused && <div className="absolute inset-0 bg-ink/60" />}
        </>
      )}
      {state !== "on" && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          {state === "denied" ? (
            <p className="text-cream">The camera is blocked. Allow it for this site in your browser settings, then reload. You can still type codes or search by name.</p>
          ) : state === "none" ? (
            <p className="text-cream">No camera here. Type the code below or search by name.</p>
          ) : (
            <button type="button" onClick={start} disabled={state === "starting"}
              className="font-display text-2xl px-8 py-5 bg-acid-yellow text-ink border-4 border-ink shadow-[6px_6px_0_0_hsl(var(--cream))]">
              {state === "starting" ? "Starting…" : "Start scanning"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
