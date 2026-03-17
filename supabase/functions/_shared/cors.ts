// BUG-18 FIX: restrict CORS to a known origin in production.
// Set ALLOWED_ORIGIN env var (e.g. "https://radarpulse.io") to lock down the API.
// Falls back to "*" when unset so local development continues to work without config.
const allowedOrigin = (typeof Deno !== "undefined" ? Deno.env.get("ALLOWED_ORIGIN") : undefined) ?? "*";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
