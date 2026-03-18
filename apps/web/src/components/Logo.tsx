import React from "react";
import { cn } from "@/lib/utils";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const uid = React.useId().replace(/:/g, "");
  const baseId = `${uid}base`;
  const beamId = `${uid}beam`;
  const pulseId = `${uid}pulse`;

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
        <linearGradient id={baseId} x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#18181B" />
          <stop offset="0.42" stopColor="#312E81" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id={beamId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(10 8.5) rotate(46) scale(24 24)">
          <stop offset="0" stopColor="#C4B5FD" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#8B5CF6" stopOpacity="0.68" />
          <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={pulseId} x1="7.5" y1="19.5" x2="24" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F5F3FF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>

      <rect x="1.5" y="1.5" width="29" height="29" rx="9.5" fill={`url(#${baseId})`} />
      <rect x="1.5" y="1.5" width="29" height="29" rx="9.5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />

      <circle cx="16" cy="16" r="11" fill={`url(#${beamId})`} />
      <circle cx="16" cy="16" r="9.15" stroke="rgba(255,255,255,0.2)" strokeWidth="1.15" />
      <circle cx="16" cy="16" r="6.05" stroke="rgba(255,255,255,0.3)" strokeWidth="1.15" />
      <circle cx="16" cy="16" r="2.15" fill="#F8F7FF" fillOpacity="0.95" />

      <path d="M16 16L24.2 8.1" stroke="rgba(255,255,255,0.34)" strokeWidth="1.15" strokeLinecap="round" />
      <circle cx="24.5" cy="7.8" r="1.55" fill="#DDD6FE" />

      <path
        d="M7.75 20.1H11.35L13.6 15.55L15.35 21.65L17.25 11.7L19.2 17.7H24.2"
        stroke={`url(#${pulseId})`}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.2 24.35C10.25 22.25 12.95 21.15 16 21.15C19.05 21.15 21.75 22.25 23.8 24.35" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" strokeLinecap="round" />
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
  const wordmarkSize = Math.round(size * 0.5);

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span
          className={cn("inline-flex items-baseline gap-0.5 tracking-[-0.04em] text-text", wordmarkClassName)}
          style={{ fontSize: `${wordmarkSize}px` }}
        >
          <span className="font-medium uppercase tracking-[-0.03em] text-text/80">Radar</span>
          <span className="bg-[linear-gradient(135deg,#4C1D95,#6D28D9_52%,#8B5CF6)] bg-clip-text font-bold uppercase tracking-[-0.05em] text-transparent">
            Pulse
          </span>
        </span>
      ) : null}
    </span>
  );
}
