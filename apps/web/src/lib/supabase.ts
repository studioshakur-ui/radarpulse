import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// BUG-21 FIX: persistSession: true so that the session survives page reloads
// (magic link flow sets a session then redirects — without persistence the user
// would be logged out immediately on the new page).
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
