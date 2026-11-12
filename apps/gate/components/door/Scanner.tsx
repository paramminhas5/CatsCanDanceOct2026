"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/refs, react-hooks/purity, react-hooks/set-state-in-effect, react/no-unescaped-entities, @next/next/no-img-element --
   Ported unchanged from apps/ccd, where this door runs in production. The stricter React compiler rules in this app
   flag patterns it relies on (the scan loop reads refs during render; camera and audio APIs are typed loosely).
   Rewrite to the new rules in a later pass, with the door e2e test (scripts/door/e2e.cjs) as the guard. */
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
    <div className="door-frame">
      <div className="door-view">
        <video ref={video} muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: state === "on" ? "block" : "none" }} />
        {state === "on" && paused && <div style={{ position: "absolute", inset: 0, background: "rgba(5,5,5,.55)" }} />}
        {state !== "on" && (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 18, textAlign: "center" }}>
            {state === "denied" ? (
              <p style={{ fontSize: 14, margin: 0 }}>The camera is blocked. Allow it for this site in your browser settings, then reload. You can still type codes or search by name.</p>
            ) : state === "none" ? (
              <p style={{ fontSize: 14, margin: 0 }}>No camera here. Type the code below or search by name.</p>
            ) : (
              <button type="button" onClick={start} disabled={state === "starting"} className="key" style={{ border: 0, cursor: "pointer", font: "inherit", fontWeight: 600, padding: "0 22px" }}>
                {state === "starting" ? "Starting" : "Start scanning"}
              </button>
            )}
          </div>
        )}
      </div>
      <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
      {state === "on" && !paused && <div className="door-laser" aria-hidden="true" />}
      {state === "on" && torch !== null && (
        <button type="button" onClick={flip} className="pill" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: -46, border: 0, cursor: "pointer", ...(torch ? { background: "var(--pc)", color: "var(--pi)", boxShadow: "none" } : {}) }}>
          {torch ? "Light off" : "Light"}
        </button>
      )}
    </div>
  );
}
