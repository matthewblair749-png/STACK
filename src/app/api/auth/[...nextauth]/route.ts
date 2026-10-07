import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/server/auth";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const { GET } = handlers;

/**
 * Sign-in emails cost money and land in someone's inbox, so they're limited per address and per network
 * before Auth.js sends anything. Every other auth request passes straight through.
 */
export async function POST(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/signin/resend")) {
    const form = await req.clone().formData().catch(() => null);
    const email = String(form?.get("email") ?? "").trim();
    const [perIp, perAddress] = await Promise.all([
      rateLimit("emailSignInPerIp", clientIp(req.headers)),
      email ? rateLimit("emailSignInPerAddress", email) : Promise.resolve({ ok: true, remaining: 0, retryAfterSec: 0 }),
    ]);
    if (!perIp.ok || !perAddress.ok) {
      // Auth.js's client reads `url` and surfaces its ?error= as the sign-in result.
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("error", "RateLimited");
      const retryAfter = Math.max(perIp.retryAfterSec, perAddress.retryAfterSec);
      return NextResponse.json({ url: url.toString() }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
  }
  return handlers.POST(req);
}
