"use client";
/** Follow (board F38-A-Artist). Signed-in members follow through follow_artist; others are sent to sign in first. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFollow } from "@/lib/booking-actions";

export default function FollowButton({ slug, name, initial = false, size = "l", icon = false }: { slug: string; name: string; initial?: boolean; size?: "l" | "m" | "s"; icon?: boolean }) {
  const [on, setOn] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const click = () =>
    start(async () => {
      const r = await setFollow(slug, !on);
      if (r.ok) { setOn(!on); setMsg(null); return; }
      if (/sign in/i.test(r.error ?? "")) { router.push(`/sign-in?next=/${slug}`); return; }
      setMsg(r.error ?? "Could not save.");
    });
  const cls = `k-btn ${on ? "k-btn--ghost" : "k-btn--key"} ${size !== "m" ? `k-btn--${size}` : ""} ${icon ? "k-btn--icon" : ""}`;
  return (
    <>
      <button type="button" className={cls} onClick={click} disabled={pending} aria-pressed={on} aria-label={icon ? `${on ? "Following" : "Follow"} ${name}` : undefined}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{on ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}</svg>
        {!icon && (on ? "Following" : "Follow")}
      </button>
      {msg && <span role="alert" className="text-sm" style={{ color: "#ffb020" }}>{msg}</span>}
    </>
  );
}
