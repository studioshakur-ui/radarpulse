import React from "react";
import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const uid = React.useId().replace(/:/g, "");
  const bgId = `${uid}bg`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Background: deep dark, purple bloom top-right */}
        <radialGradient id={bgId} cx="72%" cy="20%" r="78%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#2E1A6E" />
          <stop offset="50%" stopColor="#120A2C" />
          <stop offset="100%" stopColor="#06040D" />
        </radialGradient>

      </defs>

      {/* Background */}
      <rect width="32" height="32" rx="8.5" fill={`url(#${bgId})`} />
      {/* Subtle border */}
      <rect width="32" height="32" rx="8.5" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* RP lettermark — stroke-based paths with bezier bowl curves */}

      {/* R: stem up, top bar + bowl curve, mid bar back, leg diagonal */}
      <path
        d="M 5 24 L 5 8 L 9.5 8 Q 14 8 14 12 Q 14 16 9.5 16 L 5 16 M 10 16 L 14.5 24"
        stroke="rgba(255,255,255,0.90)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* P: stem up, top bar + bowl curve, mid bar back */}
      <path
        d="M 18.5 24 L 18.5 8 L 23 8 Q 27.5 8 27.5 12 Q 27.5 16 23 16 L 18.5 16"
        stroke="rgba(255,255,255,0.90)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export function Logo({
  size = 34,
  showWordmark = true,
  className,
  wordmarkClassName,
}: LogoProps) {
  const wordmarkSize = Math.round(size * 0.47);

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span
          className={cn("inline-flex items-baseline tracking-[-0.04em]", wordmarkClassName)}
          style={{ fontSize: `${wordmarkSize}px`, letterSpacing: "-0.02em" }}
        >
          <span className="font-light tracking-[-0.01em] text-text/65">RADAR</span>
          <span
            className="font-black tracking-[-0.04em]"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 55%, #C084FC 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            PULSE
          </span>
        </span>
      ) : null}
    </span>
  );
}
