import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import heroCenter from "@/assets/hero-center.svg";
import catLeft from "@/assets/cat-left.svg";
import catRight from "@/assets/cat-right.svg";
import catHeadphones from "@/assets/cat-headphones.png";
import catHandstand from "@/assets/cat-handstand.png";
import catCap from "@/assets/cat-cap.png";
import catHpDance from "@/assets/cat-headphones-dance.png";
import { useDisco } from "@/contexts/DiscoContext";
import DiscoBall from "@/components/DiscoBall";
import Lasers from "@/components/Lasers";
import { parseEventDate } from "@/lib/parse-date";
import { imgUrl } from "@/lib/img";

// next/image with priority handles critical image preloading automatically.
// No manual preload needed.

/** Hook to detect mobile viewport (avoids parallax computations on small screens) */
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/** Returns the next upcoming event — dynamic from static content, matches real slugs */
function useNextEvent() {
  const [next] = useState<{ title: string; date: string; venue: string; slug: string } | null>({
    title: "BANGALORE — CCD × SOCIAL",
    date: "Sun, Jun 28, 2026",
    venue: "Social, Indiranagar",
    slug: "ccdxsocial-01",
  });
  const [daysAway, setDaysAway] = useState<number | null>(null);

  useEffect(() => {
    const d = parseEventDate("Sun, Jun 28, 2026");
    if (d) {
      d.setHours(16, 0, 0, 0); // 4 PM IST
      const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
      if (diff >= 0 && diff <= 60) setDaysAway(diff);
    }
  }, []);

  return { next, daysAway };
}

const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const { disco } = useDisco();
  const reduce = useReducedMotion();
  const isMobile = useIsMobile();
  const { next, daysAway } = useNextEvent();

  // Skip all parallax on mobile or when reduced motion is preferred
  const skipParallax = reduce || isMobile;

  // Big bottom side cats
  const leftX = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "-180%"]);
  const leftY = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "-30%"]);
  const leftRot = useTransform(scrollYProgress, [0, 1], skipParallax ? [0, 0] : [0, -45]);
  const rightX = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "180%"]);
  const rightY = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "-30%"]);
  const rightRot = useTransform(scrollYProgress, [0, 1], skipParallax ? [0, 0] : [0, 45]);

  const djY = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "18%"]);

  // Four flank cats — simplified: only X drift + shared opacity (skip rotate to save GPU)
  const flankDriftL = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "-120%"]);
  const flankDriftR = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "120%"]);
  const flankOpacity = useTransform(scrollYProgress, [0, 0.6], skipParallax ? [1, 1] : [1, 0]);

  // Headline scales up as cats fly out
  const titleScale = useTransform(scrollYProgress, [0, 1], skipParallax ? [1, 1] : [1, 1.25]);
  const titleY = useTransform(scrollYProgress, [0, 1], skipParallax ? ["0%", "0%"] : ["0%", "-6%"]);

  const starRotA = useTransform(scrollYProgress, [0, 1], skipParallax ? [0, 0] : [0, 360]);
  const starRotB = useTransform(scrollYProgress, [0, 1], skipParallax ? [0, 0] : [0, -360]);

  const flankBase = "absolute z-30 pointer-events-none drop-shadow-[6px_6px_0_hsl(var(--ink))] wiggle w-24 md:w-40";

  const FLANK_CATS = [
    { id: "cap",        src: catCap,        pos: "top-[28%] left-[6%] md:top-[26%] md:left-[14%]",   x: flankDriftL },
    { id: "hpDance",    src: catHpDance,    pos: "top-[28%] right-[6%] md:top-[26%] md:right-[14%]", x: flankDriftR },
    { id: "headphones", src: catHeadphones, pos: "top-[52%] left-[6%] md:top-[54%] md:left-[14%]",   x: flankDriftL },
    { id: "handstand",  src: catHandstand,  pos: "top-[52%] right-[6%] md:top-[54%] md:right-[14%]", x: flankDriftR },
  ];

  return (
    <>
      <section ref={ref} id="home" className="relative h-screen overflow-hidden bg-electric-blue">
        {disco && <Lasers />}
        {disco && (
          <div className="absolute top-[10vh] md:top-0 left-1/2 -translate-x-1/2 z-40 scale-75 md:scale-100 origin-top">
            <DiscoBall />
          </div>
        )}

        <motion.div
          style={{ rotate: starRotA }}
          className="absolute top-24 left-6 md:top-28 md:left-16 z-10 w-16 md:w-32 text-acid-yellow drop-shadow-[6px_6px_0_hsl(var(--ink))]"
          aria-hidden
        >
          <Star />
        </motion.div>
        <motion.div
          style={{ rotate: starRotB }}
          className="absolute top-32 right-6 md:top-40 md:right-20 z-10 w-14 md:w-28 text-magenta drop-shadow-[6px_6px_0_hsl(var(--ink))]"
          aria-hidden
        >
          <Star />
        </motion.div>

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center pointer-events-none">
          <motion.h1
            style={{ scale: titleScale, y: titleY, transformOrigin: "center center" }}
            className="font-display text-[15vw] md:text-[11vw] leading-[0.85] text-cream drop-shadow-[6px_6px_0_hsl(var(--ink))] -mt-4 md:-mt-6"
          >
            CATS<br/>CAN<br/>DANCE
          </motion.h1>
          <p className="sr-only">
            Cats Can Dance is a Bangalore-based event organiser hosting the best underground dance music parties and electronic events in Bangalore, India.
          </p>
        </div>

        {/* All cats grouped */}
        <div className="contents">
          {/* DJ cat — slightly overlaps the headline */}
          <motion.div
            style={{ y: djY }}
            className="absolute inset-x-0 mx-auto bottom-20 md:-bottom-8 z-30 w-[100%] md:w-[92%] min-w-[300px] max-w-[820px] pointer-events-none"
          >
            <Image
              src={heroCenter}
              alt=""
              aria-hidden
              priority
              className="w-full h-auto drop-shadow-[10px_10px_0_hsl(var(--ink))]"
            />
          </motion.div>

          {/* Four flank cats bracketing the wordmark — simplified transforms */}
          {FLANK_CATS.map((c) => (
            <motion.div
              key={c.id}
              style={{ x: c.x, opacity: flankOpacity }}
              className={`${flankBase} ${c.pos}`}
            >
              <img src={imgUrl(c.src)} alt="" aria-hidden loading="lazy" className="w-full h-auto" />
            </motion.div>
          ))}

          {/* Big bottom side cats */}
          <motion.div
            style={{ x: leftX, y: leftY, rotate: leftRot }}
            className="absolute bottom-28 md:bottom-4 left-1 md:left-10 z-40 w-32 md:w-56 drop-shadow-[6px_6px_0_hsl(var(--ink))]"
          >
            <Image src={catLeft} alt="" aria-hidden priority className="w-full h-auto wiggle" />
          </motion.div>
          <motion.div
            style={{ x: rightX, y: rightY, rotate: rightRot }}
            className="absolute bottom-28 md:bottom-4 right-1 md:right-10 z-40 w-32 md:w-56 drop-shadow-[6px_6px_0_hsl(var(--ink))]"
          >
            <Image src={catRight} alt="" aria-hidden priority className="w-full h-auto wiggle" />
          </motion.div>
        </div>

        {/* Urgency strip — shows when an event is ≤60 days away */}
        {next && daysAway !== null && (
          <div className="absolute top-[72px] md:top-[80px] inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
            <Link
              href={`/events/${next.slug}`}
              className="pointer-events-auto inline-flex items-center gap-3 bg-acid-yellow text-ink border-4 border-ink px-4 py-2 font-display text-xs md:text-sm uppercase tracking-widest chunk-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform"
            >
              <span className="inline-block w-2 h-2 bg-magenta rounded-full animate-pulse shrink-0" aria-hidden />
              <span>
                ▶ {next.title} — {next.venue}
              </span>
              <span className="bg-ink text-acid-yellow px-2 py-0.5 text-[10px] font-display uppercase">RSVP →</span>
            </Link>
          </div>
        )}

        {/* Desktop buttons */}
        <div className="hidden md:flex absolute inset-x-0 bottom-16 z-50 flex-row gap-3 justify-center px-4">
          <a href="#early-access" className="bg-magenta text-cream font-display text-xl px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform text-center">
            JOIN THE PACK
          </a>
          <a href="#drops" className="bg-acid-yellow text-ink font-display text-xl px-6 py-3 border-4 border-ink chunk-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-transform text-center">
            SEE THE DROPS
          </a>
        </div>

        {/* Mobile buttons */}
        <div className="md:hidden absolute inset-x-0 bottom-6 z-50 flex flex-col gap-3 justify-center px-6">
          <a href="#early-access" className="bg-magenta text-cream font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow text-center">
            JOIN THE PACK
          </a>
          <a href="#drops" className="bg-acid-yellow text-ink font-display text-lg px-6 py-3 border-4 border-ink chunk-shadow text-center">
            SEE THE DROPS
          </a>
        </div>
      </section>
    </>
  );
};

const Star = () => (
  <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
    <path
      d="M50 2 L60 38 L98 40 L68 62 L80 98 L50 76 L20 98 L32 62 L2 40 L40 38 Z"
      stroke="hsl(var(--ink))"
      strokeWidth="5"
      strokeLinejoin="round"
    />
  </svg>
);

export default Hero;
