import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// BUG-21 FIX: persistSession: true so that the session survives page reloads.
// BUG-HMR FIX: persist client on globalThis so Vite HMR re-evaluations don't
// create a second GoTrueClient instance (which loses the in-memory session).
type G = typeof globalThis & { __rpSupabase?: SupabaseClient };
const g = globalThis as G;

if (!g.__rpSupabase) {
  g.__rpSupabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    // detectSessionInUrl: true required for password-reset recovery tokens in URL hash
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

export const supabase = g.__rpSupabase;
