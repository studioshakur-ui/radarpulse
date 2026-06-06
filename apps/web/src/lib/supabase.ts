import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// BUG-21 FIX: persistSession: true so that the session survives page reloads.
// BUG-HMR FIX: persist client on globalThis so Vite HMR re-evaluations don't
// create a second GoTrueClient instance (which loses the in-memory session).
type G = typeof globalThis & { __rpSupabase?: SupabaseClient };
const g = globalThis as G;

function projectRef() {
  try {
    return new URL(ENV.SUPABASE_URL).hostname.split(".")[0] ?? "default";
  } catch {
    return "default";
  }
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;

  const ref = projectRef();
  const keysToRemove = new Set<string>([
    `sb-${ref}-auth-token`,
    "supabase.auth.token",
  ]);

  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (keysToRemove.has(key) || key.includes(ref) && key.includes("auth")) {
        keysToRemove.add(key);
      }
    }
  } catch {
    // ignore
  }

  try {
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      if (keysToRemove.has(key) || key.includes(ref) && key.includes("auth")) {
        keysToRemove.add(key);
      }
    }
  } catch {
    // ignore
  }

  for (const key of keysToRemove) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

if (!g.__rpSupabase) {
  g.__rpSupabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    // detectSessionInUrl: true required for password-reset recovery tokens in URL hash
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = g.__rpSupabase;
