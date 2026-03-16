import React from "react";
import { cn } from "@/lib/utils";

// ─── LogoMark ─────────────────────────────────────────────────────────────────
//
//  Design: rounded square with violet gradient background.
//  - "RP" monogram in bold white (centered)
//  - 2 subtle radar arcs + origin dot in bottom-left corner (white, low opacity)
//    — keeps the "radar pulse" identity without competing with the letters.
//
//  Uses React.useId() for unique gradient IDs (safe for multiple instances).

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const uid = React.useId().replace(/:/g, "");
  const gradId = uid + "g";
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
        <linearGradient
          id={gradId}
          x1="0" y1="0" x2="32" y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#9F67F5" />
        </linearGradient>
      </defs>

      {/* Background rounded square */}
      <rect width="32" height="32" rx="9" fill={"url(#" + gradId + ")"} />

      {/* Radar arcs — white on brand bg, bottom-left corner */}
      <path
        d="M5 27 A16 16 0 0 1 21 11"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.18"
      />
      <path
        d="M5 27 A10 10 0 0 1 15 17"
        stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.36"
      />
      {/* Origin dot */}
      <circle cx="5" cy="27" r="1.8" fill="white" opacity="0.55" />

      {/* RP monogram */}
      <text
        x="18"
        y="17"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="white"
        style={{ letterSpacing: "-0.4px" }}
      >
        RP
      </text>
    </svg>
  );
}

// ─── Logo — mark + wordmark ────────────────────────────────────────────────────

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export function Logo({
  size = 32,
  showWordmark = true,
  className,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span
          className={cn("font-bold tracking-tight text-text", wordmarkClassName)}
          style={{ fontSize: Math.round(size * 0.47) + "px" }}
        >
          RadarPulse
        </span>
      )}
    </span>
  );
}
