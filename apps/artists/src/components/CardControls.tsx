"use client";
/**
 * The two things you do from an artist card without opening it (Param, 13 Nov 2026: "instead of the follow button
 * maybe a play button, a like button, a heart on top"): a heart to follow, and play for 30 seconds of their latest
 * release. One preview plays at a time across the page.
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFollow } from "@/lib/booking-actions";

let current: { audio: HTMLAudioElement; stop: () => void } | null = null;

export function CardHeart({ slug, name }: { slug: string; name: string }) {
  const [on, setOn] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const click = () => start(async () => {
    const r = await setFollow(slug, !on);
    if (r.ok) { setOn(!on); return; }
    if (/sign in/i.test(r.error ?? "")) router.push(`/sign-in?next=/artists`);
  });
  return (
    <button type="button" className={`aa-heart${on ? " on" : ""}`} onClick={click} disabled={pending} aria-pressed={on} aria-label={`${on ? "Unfollow" : "Follow"} ${name}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.3 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function CardPlay({ track, name }: { track: string; name: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  useEffect(() => () => { if (current?.stop === stopSelf) current.stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function stopSelf() { current?.audio.pause(); current = null; setState("idle"); }
  const click = async () => {
    if (state === "playing") { stopSelf(); return; }
    current?.stop();
    setState("loading");
    try {
      const r = await fetch(`/api/deezer/track/${track}`);
      const j = await r.json();
      if (!j.preview) throw new Error("none");
      const audio = new Audio(j.preview);
      audio.volume = 0.85;
      audio.onended = () => stopSelf();
      current = { audio, stop: stopSelf };
      await audio.play();
      setState("playing");
    } catch { setState("idle"); }
  };
  return (
    <button type="button" className={`aa-play${state === "playing" ? " on" : ""}`} onClick={() => void click()} aria-label={`${state === "playing" ? "Stop" : "Play"} ${name}`}>
      {state === "playing"
        ? <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
        : state === "loading" ? <span className="aa-spin" aria-hidden="true" />
        : <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5Z" fill="currentColor" /></svg>}
    </button>
  );
}
