/**
 * ScrollToTop — scrolls to top on route change.
 *
 * Works with Lenis smooth scroll by using both:
 * 1. Lenis's own scrollTo(0) method (handles the smooth scroll container)
 * 2. window.scrollTo as fallback (in case Lenis isn't ready)
 */
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useLenis } from "lenis/react";

const ScrollToTop = () => {
  const router = useRouter();
  const lenis = useLenis();

  useEffect(() => {
    // Skip if navigating to a hash anchor
    if (window.location.hash) return;

    // Use Lenis scrollTo if available, otherwise native
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [router.asPath, lenis]);

  return null;
};

export default ScrollToTop;
