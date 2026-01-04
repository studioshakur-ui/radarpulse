import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopNavCinematic({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b border-line/20 bg-bg/80 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative h-7 w-7 overflow-hidden rounded-xl border border-line/25 bg-surface/70 shadow-soft">
            <div className="absolute -left-3 -top-3 h-10 w-10 rounded-full bg-brand/20 blur-xl" />
            <div className="absolute -bottom-3 -right-3 h-10 w-10 rounded-full bg-brand2/20 blur-xl" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-text">RadarPulse</div>
            <div className="text-[11px] text-subtext">Tenders + Grants</div>
          </div>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-subtext md:flex">
          <a className="hover:text-text" href="#how">
            How it works
          </a>
          <a className="hover:text-text" href="#proof">
            Proof
          </a>
          <a className="hover:text-text" href="#security">
            Security
          </a>
          <a className="hover:text-text" href="#contact">
            Contact
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/explore"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-line/25 bg-surface/55 px-3 py-2 text-sm font-semibold text-text shadow-soft transition",
              "hover:bg-surface/80"
            )}
          >
            Explore
          </Link>
          <Link
            to="/request-access"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-veil shadow-glow transition",
              "hover:opacity-90"
            )}
          >
            Request access <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
