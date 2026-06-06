import { supabase } from "@/lib/supabase";

const SESSION_ERROR = "Session expired. Please sign in again.";

export class AuthTokenError extends Error {
  readonly code: "AUTH_SESSION_INVALID";

  constructor(message = SESSION_ERROR) {
    super(message);
    this.name = "AuthTokenError";
    this.code = "AUTH_SESSION_INVALID";
  }
}

export async function recoverInvalidSession(redirectTo = "/login"): Promise<void> {
  void redirectTo;
}

export async function getValidAccessToken(options?: { forceRefresh?: boolean }): Promise<string> {
  const forceRefresh = options?.forceRefresh === true;
  let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  let session = sessionData.session;
  const nowEpoch = Math.floor(Date.now() / 1000);
  const isExpiring = typeof session?.expires_at === "number" && session.expires_at <= nowEpoch + 10;

  if (forceRefresh || sessionError || !session?.access_token || isExpiring) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new AuthTokenError();
    }
    session = refreshData.session;
  }

  const token = session.access_token;
  if (!token) {
    throw new AuthTokenError();
  }
  return token;
}
