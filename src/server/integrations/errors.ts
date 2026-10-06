/**
 * Turns a provider failure (HTTP error text, a thrown fetch error, an OAuth error body) into one sentence a
 * person can act on. Raw API text never reaches the UI: callers log the original server-side, and people
 * see what happened and what to do next. Every message ends with the retry path that actually exists.
 */
export function friendlyProviderError(appLabel: string, err: unknown, phase: "sync" | "connect" = "sync"): string {
  const raw = err instanceof Error ? `${err.name} ${err.message}` : String(err);

  // A Google API switched off in STACK's own Google Cloud project: nothing the person can fix.
  if (/SERVICE_DISABLED|accessNotConfigured|has not been used in project/i.test(raw)) {
    return `${appLabel} is temporarily unavailable in STACK because of a problem on our side, not with your account. Try again later.`;
  }
  // Revoked, expired or rejected sign-in.
  if (/\b401\b|invalid_grant|invalid_token|invalid_auth|token_revoked|token_expired|unauthori[sz]ed|not_authed|account_inactive|revoked/i.test(raw)) {
    return phase === "connect"
      ? `${appLabel} didn't accept the sign-in. Try connecting again.`
      : `${appLabel} no longer accepts STACK's access. Reconnect ${appLabel} in Connected Apps.`;
  }
  // Signed in, but without permission to read this.
  if (/\b403\b|insufficient|missing_scope|forbidden|access_denied|permission/i.test(raw)) {
    return phase === "connect"
      ? `${appLabel} didn't grant the access STACK asked for. Try again and approve access, or ask your ${appLabel} admin.`
      : `${appLabel} didn't give STACK permission to read this. Reconnect ${appLabel} and approve access, or ask your ${appLabel} admin.`;
  }
  if (/\b429\b|rate.?limit|too many requests|ratelimited/i.test(raw)) {
    return `${appLabel} is limiting requests right now. Try again in a few minutes.`;
  }
  if (/\b5\d\d\b|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up|network|timed? ?out|AbortError/i.test(raw)) {
    return `${appLabel} isn't responding right now. Try again in a few minutes.`;
  }
  if (/redirect_uri|redirect uri/i.test(raw)) {
    return `${appLabel} sign-in isn't set up correctly on STACK's side. Try again later.`;
  }
  return phase === "connect"
    ? `Connecting ${appLabel} didn't work. Try again.`
    : `STACK couldn't sync ${appLabel}. Press Sync now to try again; if it keeps failing, reconnect ${appLabel}.`;
}
