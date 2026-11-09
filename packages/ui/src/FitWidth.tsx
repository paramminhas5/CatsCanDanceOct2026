"use client";
/**
 * The web boards are drawn at 1440 wide. Below that, the page is zoomed to fit the window so it keeps
 * the canvas layout instead of breaking it. One listener, no layout work beyond setting zoom.
 */
import { useEffect } from "react";

export default function FitWidth({ width = 1440, selector = ".v4.web", min = 0 }: { width?: number; selector?: string; min?: number }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const fit = () => {
      // Below `min` the page reflows with its own mobile CSS instead of zooming.
      const z = window.innerWidth < min ? 1 : Math.min(1, window.innerWidth / width);
      el.style.width = z < 1 ? `${width}px` : "";
      el.style.zoom = z < 1 ? String(z) : "";
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [width, selector, min]);
  return null;
}
