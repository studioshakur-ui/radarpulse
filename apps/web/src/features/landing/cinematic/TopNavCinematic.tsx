import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopNavCinematic({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b border-border/30 bg-bg/80 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-xl bg-elevated shadow-soft" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">RadarPulse</div>
            <div className="text-[11px] text-muted">Tenders + Grants</div>
          </div>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-muted md:flex">
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
              "inline-flex items-center gap-2 rounded-xl border border-border/35 bg-white/40 px-3 py-2 text-sm text-text shadow-soft transition",
              "hover:bg-white/60"
            )}
          >
            Explore
          </Link>
          <Link
            to="/request-access"
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white shadow-glow transition",
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
