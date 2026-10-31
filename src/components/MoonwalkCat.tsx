import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import catSprite from "@/assets/cat-headphones.png";
import { imgUrl } from "@/lib/img";

const MoonwalkCat = () => {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const x = useTransform(scrollYProgress, [0, 1], ["-10vw", "110vw"]);

  // Delay mount until after initial page load to avoid blocking first paint
  useEffect(() => {
    const id = requestIdleCallback
      ? requestIdleCallback(() => setMounted(true))
      : setTimeout(() => setMounted(true), 2000) as unknown as number;
    return () => {
      if (typeof cancelIdleCallback !== "undefined") cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  if (reduce || !mounted) return null;

  return (
    <motion.div
      aria-hidden
      style={{ x }}
      className="fixed bottom-3 left-0 z-[60] pointer-events-none"
    >
      {/* Use CSS animation for the bounce instead of framer-motion's animate prop
          which fires a JS callback on every frame. CSS animations run on the
          compositor thread and don't block the main thread. */}
      <img
        src={imgUrl(catSprite)}
        alt=""
        loading="lazy"
        className="w-12 md:w-20 drop-shadow-[4px_4px_0_hsl(var(--ink))] -scale-x-100 animate-bounce-gentle"
      />
    </motion.div>
  );
};

export default MoonwalkCat;
