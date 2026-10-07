/** The public address of the site, for links in metadata, the sitemap and emails. */
export const SITE_URL = (process.env.APP_URL?.trim().replace(/\/+$/, "") || "https://www.stackunder.website");

export const SITE_NAME = "STACK";
export const SITE_TAGLINE = "All your work, together.";
export const SITE_DESCRIPTION =
  "STACK connects the work apps you already use and shows what needs your attention, with an AI that asks before it acts.";
