// _shared/logger.ts — RadarPulse
// BUG-32 FIX: minimal structured logger for Edge Functions.
//
// Usage:
//   import { createLogger } from "../_shared/logger.ts";
//   const log = createLogger("my-function");
//   log.info("job started", { jobId: 42 });
//   log.error("db write failed", { error: err.message });
//
// All output is newline-delimited JSON so it can be parsed and queried in
// Supabase Log Explorer / any log aggregator without regex heuristics.

type Level = "info" | "warn" | "error";

export type Logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => void;
  warn:  (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
};

export function createLogger(fn: string): Logger {
  function emit(level: Level, msg: string, ctx?: Record<string, unknown>): void {
    const entry: Record<string, unknown> = {
      level,
      fn,
      msg,
      ts: new Date().toISOString(),
      ...ctx,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.info(line);
    }
  }

  return {
    info:  (msg, ctx) => emit("info",  msg, ctx),
    warn:  (msg, ctx) => emit("warn",  msg, ctx),
    error: (msg, ctx) => emit("error", msg, ctx),
  };
}
