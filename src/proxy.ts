import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { isProtectedPath } from "@/lib/protected-paths";

export default auth((req) => {
  const { pathname } = req.nextUrl;
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
