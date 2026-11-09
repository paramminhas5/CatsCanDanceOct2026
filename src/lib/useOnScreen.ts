import { useEffect, useState, type RefObject } from "react";

/** True while the element is on screen (with a margin). Demos only run their timers while visible. */
export function useOnScreen(ref: RefObject<Element | null>, margin = "120px") {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return on;
}
