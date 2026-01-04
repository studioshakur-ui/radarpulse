// apps/web/src/lib/env.ts
export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  APP_NAME: (import.meta.env.VITE_APP_NAME as string) || "RadarPulse",

  // Vite runtime mode ("development" | "production" | "test")
  MODE: import.meta.env.MODE as string,
  DEV: Boolean(import.meta.env.DEV),
  PROD: Boolean(import.meta.env.PROD),
} as const;
