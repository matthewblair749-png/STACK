import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PROTECTED_PREFIXES } from "@/lib/protected-paths";

/** Public marketing and legal pages are indexable; the signed-in app and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dev/", ...PROTECTED_PREFIXES.map((p) => `${p}`)] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
