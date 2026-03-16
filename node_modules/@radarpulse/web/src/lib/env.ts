// apps/web/src/lib/env.ts

// BUG-22 FIX: validate required env vars at startup — fail fast with a clear error
function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${key}.\n` +
      `Create a .env file with ${key}=<value> (see .env.example).`,
    );
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: requireEnv("VITE_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requireEnv("VITE_SUPABASE_ANON_KEY"),
  APP_NAME: (import.meta.env.VITE_APP_NAME as string) || "RadarPulse",

  // Vite runtime mode ("development" | "production" | "test")
  MODE: import.meta.env.MODE as string,
  DEV: Boolean(import.meta.env.DEV),
  PROD: Boolean(import.meta.env.PROD),
} as const;
