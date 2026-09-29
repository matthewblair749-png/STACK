import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

const PROTECTED_PREFIXES = [
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
];

// Static files under /public (e.g. /integrations/<slug>.svg logo assets) can share
// a URL prefix with a protected app route (/integrations) without being part of it.
const STATIC_ASSET_PATTERN = /\.(svg|png|jpe?g|webp|gif|ico)$/i;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (STATIC_ASSET_PATTERN.test(pathname)) return;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
