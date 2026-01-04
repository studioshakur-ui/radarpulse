import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let _registered = false;
function ensureScrollTrigger() {
  if (_registered) return;
  gsap.registerPlugin(ScrollTrigger);
  _registered = true;
}

type UseChapterProgressOpts = {
  start?: string;
  end?: string;
  scrub?: boolean | number;
  pin?: boolean;
  enabled?: boolean;

  /**
   * If true (default), hook stores progress in React state => re-renders on scroll.
   * If false, you should use onUpdate to consume progress without re-rendering.
   */
  state?: boolean;

  /** Called on each ScrollTrigger update (useful to push into a store). */
  onUpdate?: (progress: number) => void;

  /**
   * If true (default), state updates are throttled to RAF.
   * Recommended to reduce micro-jank when state=true.
   */
  throttleRaf?: boolean;
};

export function useChapterProgress(ref: RefObject<HTMLElement | null>, opts?: UseChapterProgressOpts) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const latestRef = useRef(0);

  useLayoutEffect(() => {
    ensureScrollTrigger();
    const el = ref.current;
    if (!el) return;

    if (opts?.enabled === false) {
      setProgress(0);
      return;
    }

    const stateEnabled = opts?.state !== false;
    const throttle = opts?.throttleRaf !== false;

    const st = ScrollTrigger.create({
      trigger: el,
      start: opts?.start ?? "top top",
      end: opts?.end ?? "+=200%",
      scrub: opts?.scrub ?? true,
      pin: opts?.pin ?? true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        opts?.onUpdate?.(p);

        if (!stateEnabled) return;

        if (!throttle) {
          setProgress(p);
          return;
        }

        latestRef.current = p;
        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setProgress(latestRef.current);
        });
      },
    });

    // A refresh right after init helps avoid the tiny "jump" on first scroll.
    ScrollTrigger.refresh();

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      st.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ref,
    opts?.enabled,
    opts?.start,
    opts?.end,
    opts?.scrub,
    opts?.pin,
    opts?.state,
    opts?.throttleRaf,
    opts?.onUpdate,
  ]);

  return progress;
}
