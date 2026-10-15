import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { isProtectedPath } from "@/lib/protected-paths";
import { COMING_SOON } from "@/lib/launch";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // Until launch nobody gets into the app, even with a session: they see the "coming soon" card instead.
  if (COMING_SOON && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  if (isProtectedPath(pathname) && !req.auth) {
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
