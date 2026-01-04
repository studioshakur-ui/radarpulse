import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cx } from "@/lib/utils";

/**
 * Hero visual: "photo-like" glass + energy, with optional Rive.
 *
 * We ship a high-quality fallback (pure SVG + motion) so the landing works
 * without an asset.
 *
 * If you want the Rive version:
 * - Put a .riv file at: /public/rive/radarpulse_hero.riv
 * - Keep the state machine name optional or match "State Machine 1"
 */
type RiveApi = {
  RiveComponent: React.ComponentType<{ className?: string }>;
  useRive: any;
  Layout: any;
  Fit: any;
  Alignment: any;
};

function useOptionalRive(): { ready: boolean; rive: RiveApi | null } {
  const [rive, setRive] = useState<RiveApi | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mod: any = await import("@rive-app/react-canvas");
        if (!alive) return;
        setRive({
          RiveComponent: mod.RiveComponent,
          useRive: mod.useRive,
          Layout: mod.Layout,
          Fit: mod.Fit,
          Alignment: mod.Alignment,
        });
      } catch {
        // optional
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { ready: !!rive, rive };
}

function GlassFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/30 bg-white/45 shadow-soft backdrop-blur">
      <div className="absolute inset-0 bg-gradient-to-br from-white/65 via-white/35 to-white/25" />
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent2/18 blur-3xl" />
      <div className="relative">{children}</div>
    </div>
  );
}

function FallbackArt() {
  return (
    <svg viewBox="0 0 900 560" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(168,85,247,0.35)" />
          <stop offset="40%" stopColor="rgba(124,58,237,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
        <linearGradient id="g2" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0%" stopColor="rgba(124,58,237,0.35)" />
          <stop offset="50%" stopColor="rgba(168,85,247,0.20)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
        </linearGradient>
        <filter id="blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      {/* soft ambient */}
      <circle cx="240" cy="220" r="170" fill="rgba(168,85,247,0.35)" filter="url(#blur)" />
      <circle cx="650" cy="310" r="220" fill="rgba(124,58,237,0.22)" filter="url(#blur)" />

      {/* large glass panel */}
      <g>
        <rect x="110" y="86" width="680" height="390" rx="32" fill="url(#g1)" stroke="rgba(123,116,145,0.35)" />
        <rect x="140" y="122" width="620" height="120" rx="24" fill="rgba(255,255,255,0.55)" />
        <rect x="140" y="262" width="620" height="180" rx="24" fill="rgba(255,255,255,0.45)" />
      </g>

      {/* headings */}
      <g fill="rgba(26,24,38,0.88)">
        <rect x="170" y="150" width="270" height="14" rx="7" />
        <rect x="170" y="176" width="400" height="10" rx="5" fill="rgba(95,90,115,0.75)" />
        <rect x="170" y="196" width="330" height="10" rx="5" fill="rgba(95,90,115,0.70)" />
      </g>

      {/* decision pills */}
      <g>
        <rect x="540" y="142" width="86" height="28" rx="14" fill="rgba(22,163,74,0.15)" stroke="rgba(22,163,74,0.35)" />
        <rect x="636" y="142" width="86" height="28" rx="14" fill="rgba(217,119,6,0.15)" stroke="rgba(217,119,6,0.35)" />
        <rect x="732" y="142" width="86" height="28" rx="14" fill="rgba(220,38,38,0.12)" stroke="rgba(220,38,38,0.30)" />
      </g>

      {/* timeline / flow */}
      <g>
        <path
          d="M190 330 C 260 260, 340 260, 410 330 S 560 400, 650 330 S 780 260, 820 320"
          fill="none"
          stroke="rgba(124,58,237,0.55)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M190 330 C 260 260, 340 260, 410 330 S 560 400, 650 330 S 780 260, 820 320"
          fill="none"
          stroke="rgba(168,85,247,0.20)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <circle cx="190" cy="330" r="12" fill="rgba(124,58,237,0.95)" />
        <circle cx="410" cy="330" r="12" fill="rgba(168,85,247,0.90)" />
        <circle cx="650" cy="330" r="12" fill="rgba(124,58,237,0.90)" />
        <circle cx="820" cy="320" r="12" fill="rgba(168,85,247,0.90)" />
      </g>

      {/* subtle overlay */}
      <rect x="110" y="86" width="680" height="390" rx="32" fill="url(#g2)" opacity="0.55" />
    </svg>
  );
}

export function ChapterHeroArt({ className }: { className?: string }) {
  const reduceRef = useRef(false);
  const { ready, rive } = useOptionalRive();

  // rudimentary perf guard (avoid spinning heavy animations on low-end)
  useEffect(() => {
    const mem: any = (navigator as any).deviceMemory;
    if (typeof mem === "number" && mem <= 4) reduceRef.current = true;
  }, []);

  const canUseRive = useMemo(() => {
    if (!ready || !rive) return false;
    if (reduceRef.current) return false;
    return true;
  }, [ready, rive]);

  return (
    <div className={cx("relative", className)}>
      <GlassFrame>
        <div className="aspect-[16/10] w-full">
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {canUseRive && rive ? (
              <RiveHero rive={rive} />
            ) : (
              <div className="h-full w-full">
                <FallbackArt />
              </div>
            )}
          </motion.div>

          {/* glossy highlight */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-10 h-48 w-56 rotate-[-18deg] rounded-[40px] bg-white/40 blur-2xl" />
            <div className="absolute right-10 top-8 h-28 w-44 rotate-[10deg] rounded-[34px] bg-white/35 blur-2xl" />
          </div>

          {/* caption strip */}
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-border/25 bg-white/60 p-4 shadow-soft backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold">Evidence-first decisioning</div>
                <div className="text-xs text-muted">Confidence signals + source excerpts reduce mistakes.</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-good/25 bg-good/10 px-3 py-1 text-xs font-semibold text-good">
                  GO
                </span>
                <span className="rounded-full border border-warn/25 bg-warn/10 px-3 py-1 text-xs font-semibold text-warn">
                  HOLD
                </span>
                <span className="rounded-full border border-bad/25 bg-bad/10 px-3 py-1 text-xs font-semibold text-bad">
                  NO-GO
                </span>
              </div>
            </div>
          </div>
        </div>
      </GlassFrame>
    </div>
  );
}

function RiveHero({ rive }: { rive: RiveApi }) {
  const { useRive, Layout, Fit, Alignment } = rive;

  const { RiveComponent } = useRive({
    src: "/rive/radarpulse_hero.riv",
    autoplay: true,
    stateMachines: "State Machine 1",
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  });

  return <RiveComponent className="h-full w-full" />;
}
