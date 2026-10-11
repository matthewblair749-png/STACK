import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/** How long a sign-in round trip may take before it has to be started again. */
export const OAUTH_STATE_MAX_AGE_SEC = 600;

export const oauthCookieName = (providerId: string) => `stack_oauth_state_${providerId}`;

/** What the connect step remembers for the callback. Lives only in an httpOnly, signed cookie. */
export interface OAuthStatePayload {
  /** Random value also sent to the provider; the callback must get the same one back (CSRF protection). */
  state: string;
  provider: string;
  workspaceId: string;
  /** The person who started the sign-in. A callback finished in someone else's session is rejected. */
  userId: string;
  fields: Record<string, string>;
  returnTo: string;
  /** PKCE secret, kept server-side; only its hash (the challenge) goes to the provider. */
  codeVerifier?: string;
  issuedAt: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function signingKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set, so sign-in state can't be protected.");
  // A separate key derived for this purpose, so this cookie's signature can't be reused anywhere else.
  return createHmac("sha256", secret).update("stack-oauth-state-v1").digest();
}

const sign = (data: string) => b64url(createHmac("sha256", signingKey()).update(data).digest());

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** RFC 7636: a high-entropy verifier and its S256 challenge. */
export function createPkcePair() {
  const codeVerifier = b64url(randomBytes(32));
  const codeChallenge = b64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function createOAuthState(input: Omit<OAuthStatePayload, "state" | "issuedAt" | "codeVerifier"> & { pkce: boolean }) {
  const { pkce, ...rest } = input;
  const pair = pkce ? createPkcePair() : undefined;
  const payload: OAuthStatePayload = { ...rest, state: b64url(randomBytes(24)), codeVerifier: pair?.codeVerifier, issuedAt: Date.now() };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return { state: payload.state, codeChallenge: pair?.codeChallenge, cookieValue: `${body}.${sign(body)}` };
}

export type StateCheck = { ok: true; payload: OAuthStatePayload } | { ok: false; reason: "missing" | "tampered" | "expired" | "mismatch" | "wrong_provider" };

/**
 * Checks the callback against the cookie set at connect time: the signature is ours, it hasn't expired, it was
 * for this provider, and the `state` the provider echoed back is the one we sent. The caller must still check
 * `payload.userId` against the current session.
 */
export function verifyOAuthState(cookieValue: string | undefined, returnedState: string | null, providerId: string, now = Date.now()): StateCheck {
  if (!cookieValue || !returnedState) return { ok: false, reason: "missing" };
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return { ok: false, reason: "tampered" };
  const body = cookieValue.slice(0, dot);
  if (!safeEqual(cookieValue.slice(dot + 1), sign(body))) return { ok: false, reason: "tampered" };
  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return { ok: false, reason: "tampered" };
  }
  if (payload.provider !== providerId) return { ok: false, reason: "wrong_provider" };
  if (now - payload.issuedAt > OAUTH_STATE_MAX_AGE_SEC * 1000) return { ok: false, reason: "expired" };
  if (!safeEqual(payload.state, returnedState)) return { ok: false, reason: "mismatch" };
  return { ok: true, payload };
}

/** Same-site paths only, so a landing page can never send someone to another site. */
export const safeReturnPath = (wanted: string | null | undefined) => (wanted && /^\/[a-z0-9\-_/]*$/i.test(wanted) && !wanted.startsWith("//") ? wanted : "");
