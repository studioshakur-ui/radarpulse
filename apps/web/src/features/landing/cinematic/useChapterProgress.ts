import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let _registered = false;
function ensureScrollTrigger() {
  if (_registered) return;
  gsap.registerPlugin(ScrollTrigger);
  _registered = true;
}

export function useChapterProgress(
  ref: RefObject<HTMLElement | null>,
  opts?: {
    start?: string;
    end?: string;
    scrub?: boolean | number;
    pin?: boolean;
    enabled?: boolean;
  }
) {
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    ensureScrollTrigger();
    const el = ref.current;
    if (!el) return;

    if (opts?.enabled === false) {
      setProgress(0);
      return;
    }

    const st = ScrollTrigger.create({
      trigger: el,
      start: opts?.start ?? "top top",
      end: opts?.end ?? "+=200%",
      scrub: opts?.scrub ?? true,
      pin: opts?.pin ?? true,
      anticipatePin: 1,
      onUpdate: (self) => setProgress(self.progress),
    });

    return () => {
      st.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  return progress;
}
