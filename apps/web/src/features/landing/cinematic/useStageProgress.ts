import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;
function ensure() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function useStageProgress(
  sectionRef: RefObject<HTMLElement | null>,
  opts?: {
    start?: string;
    end?: string;
    enabled?: boolean;
  }
) {
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    ensure();
    const el = sectionRef.current;
    if (!el) return;

    if (opts?.enabled === false) {
      setProgress(0);
      return;
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start: opts?.start ?? "top top",
      end: opts?.end ?? "bottom bottom",
      scrub: 0.25,
      invalidateOnRefresh: true,
      onUpdate: (self) => setProgress(self.progress),
    });

    return () => st.kill();
  }, [sectionRef, opts?.start, opts?.end, opts?.enabled]);

  return { progress };
}
