/** Pages that require a signed-in session; signed-out visitors are sent to /login and brought back after. */
export const PROTECTED_PREFIXES = [
  "/home",
  "/tasks",
  "/projects",
  "/inbox",
  "/calendar",
  "/files",
  "/open-tabs",
  "/ai",
  "/automations",
  "/team",
  "/integrations",
  "/settings",
  "/help",
  "/billing",
  "/messages",
  "/updates",
  "/onboarding",
  "/calls",
  "/call",
  "/invite",
];

// Static files under /public (e.g. /integrations/<slug>.svg logo assets) can share
// a URL prefix with a protected app route (/integrations) without being part of it.
const STATIC_ASSET_PATTERN = /\.(svg|png|jpe?g|webp|gif|ico)$/i;

export function isProtectedPath(pathname: string): boolean {
  if (STATIC_ASSET_PATTERN.test(pathname)) return false;
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
