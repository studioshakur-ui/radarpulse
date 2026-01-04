import React, { useEffect, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Global smooth scrolling with Lenis.
 *
 * Notes:
 * - Keeps native scroll container (window) to avoid complex scrollerProxy.
 * - Syncs ScrollTrigger updates for pinned chapters / progress-driven scenes.
 * - Auto-disables on reduced-motion.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  const options = useMemo(
    () => ({
      // "balanced" → premium feel without feeling like a gimmick.
      lerp: 0.1,
      wheelMultiplier: 0.9,
      touchMultiplier: 0.8,
      smoothWheel: true,
      smoothTouch: false,
    }),
    []
  );

  useEffect(() => {
    if (reduce) return;

    const lenis = new Lenis(options);

    // Keep ScrollTrigger in lockstep.
    lenis.on("scroll", () => ScrollTrigger.update());

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // If user resizes or content loads, refresh pin positions.
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [options, reduce]);

  return <>{children}</>;
}
