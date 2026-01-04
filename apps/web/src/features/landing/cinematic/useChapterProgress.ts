import { RefObject } from "react";
import { useScroll } from "framer-motion";

/**
 * Returns a MotionValue (scrollYProgress) in [0..1] for a given section.
 * Use with useMotionValueEvent(...) to react without forcing React re-render.
 */
export function useChapterProgress(ref: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({
    target: ref,
    // 0 when section top hits viewport top, 1 when section bottom hits viewport top
    offset: ["start start", "end start"],
  });

  return scrollYProgress;
}
