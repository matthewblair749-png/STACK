/**
 * Where to send someone after sign-in. Only same-site paths are allowed, so a crafted link can never bounce
 * a person to another domain ("//evil.com" and "/\evil.com" are both treated as external by browsers).
 */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/home"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
