/**
 * SmoothScroll — wraps the app with Lenis v1.x for butter-smooth scrolling.
 * 
 * Uses `lenis/react` ReactLenis provider at the root level.
 * Framer Motion's useScroll works natively with Lenis because
 * Lenis drives the real scrollY — no integration hacks needed.
 * 
 * Respects prefers-reduced-motion automatically.
 * 
 * Hash navigation: listens for hash changes and uses Lenis.scrollTo()
 * to smoothly scroll to anchors without fighting native scroll.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { useRouter } from "next/router";

interface SmoothScrollProps {
  children: React.ReactNode;
}

/**
 * Handles hash-based navigation through Lenis instead of native scroll.
 * This prevents Lenis from intercepting and cancelling anchor scrolls.
 */
function LenisHashHandler() {
  const lenis = useLenis();
  const router = useRouter();

  useEffect(() => {
    if (!lenis) return;

    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const el = document.querySelector(hash);
        if (el) {
          // Use Lenis API to scroll to the element
          lenis.scrollTo(el as HTMLElement, { offset: -80, duration: 1.2 });
        }
      }
    };

    // Handle initial hash on page load (after hydration)
    const timeout = setTimeout(scrollToHash, 100);

    // Handle hash changes from click navigation
    const onHashChange = () => scrollToHash();
    window.addEventListener("hashchange", onHashChange);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [lenis, router.asPath]);

  return null;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  return (
    <ReactLenis
      root
      options={{
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        syncTouch: false,
        prevent: (node: Element) => {
          return node.closest("[data-lenis-prevent]") !== null;
        },
      }}
    >
      <LenisHashHandler />
      {children}
    </ReactLenis>
  );
}
