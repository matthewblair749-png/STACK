/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ConnectedTokens, ProviderFile } from "../provider";
import { ProviderHttpError } from "../http";
import { SiteAnswerError, normalizePublicSiteUrl, safeGetJson } from "../safe-fetch";
import { tokenOnlyProvider } from "./token-only";

/*
 * WordPress runs on the user's own domain, so every request goes through safeGetJson (public https addresses only,
 * no redirects). Sites with pretty permalinks answer at /wp-json/...; others only at /?rest_route=/... - which one
 * works is found when connecting and stored with the connection.
 */
type RestStyle = "pretty" | "query";
type Site = { base: string; username: string; rest: RestStyle };

const basic = (username: string, password: string) => `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

export function restUrl(site: Pick<Site, "base" | "rest">, route: string, query: string): string {
  return site.rest === "pretty" ? `${site.base}/wp-json${route}?${query}` : `${site.base}/?rest_route=${encodeURIComponent(route)}&${query}`;
}

const get = (site: Site, password: string, label: string, route: string, query: string) =>
  safeGetJson<any>(label, restUrl(site, route, query), { Authorization: basic(site.username, password) });

/** Answers that mean "this address form isn't the REST API here", so the other form is worth trying. */
const wrongForm = (err: unknown) => err instanceof SiteAnswerError || (err instanceof ProviderHttpError && err.status === 404);

function cleanUsername(input: string): string {
  const u = input.trim();
  if (!u || u.length > 60 || u.includes(":") || /[\x00-\x1f]/.test(u)) throw new Error("Enter the username you sign in to WordPress with.");
  return u;
}

function siteFrom(tokens: ConnectedTokens): Site {
  const m = tokens.metadata ?? {};
  if (typeof m.site !== "string" || typeof m.username !== "string") throw new Error("WordPress connection is missing its site or username. Reconnect WordPress.");
  return { base: normalizePublicSiteUrl(m.site), username: cleanUsername(m.username), rest: m.rest === "query" ? "query" : "pretty" };
}

const STATUSES = "publish,future,draft,pending,private";
const FIELDS = "_fields=id,link,modified_gmt,title,status,type";

async function listType(site: Site, password: string, type: "posts" | "pages"): Promise<any[]> {
  const q = `context=edit&per_page=50&orderby=modified&order=desc&${FIELDS}`;
  try {
    return await get(site, password, `WordPress ${type}`, `/wp/v2/${type}`, `${q}&status=${STATUSES}`);
  } catch (err) {
    // Authors can't ask for other people's drafts or private posts: read what they're allowed to see instead.
    if (!(err instanceof ProviderHttpError && [400, 401, 403].includes(err.status))) throw err;
    return get(site, password, `WordPress ${type}`, `/wp/v2/${type}`, q);
  }
}

const decode = (s: string) =>
  s.replace(/<[^>]*>/g, "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function mapWordPressItem(base: string, p: Record<string, any>): ProviderFile {
  const kind = p.type === "page" ? "page" : "post";
  const title = (typeof p.title?.raw === "string" ? p.title.raw : decode(String(p.title?.rendered ?? ""))).trim();
  const published = p.status === "publish";
  return {
    id: `${kind}-${p.id}`,
    name: title || `(untitled ${kind})`,
    // Published items open on the site; drafts and scheduled ones open in the editor, where they can be seen.
    url: published && typeof p.link === "string" ? p.link : `${base}/wp-admin/post.php?post=${Number(p.id)}&action=edit`,
    modifiedAt: typeof p.modified_gmt === "string" ? `${p.modified_gmt}Z` : new Date(0).toISOString(),
    mimeType: published ? `WordPress ${kind}` : `WordPress ${kind} (${p.status})`,
  };
}

/** Recently changed posts and pages on your WordPress site, drafts included. */
export const wordpressProvider = tokenOnlyProvider({
  id: "wordpress",
  label: "WordPress",
  capabilities: ["files"],
  tokenConnect: {
    label: "WordPress application password",
    placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx",
    helpUrl: "https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/",
    steps: [
      "Sign in to your site's dashboard and go to Users > Profile (WordPress 5.6 or later, site on https).",
      "Under Application Passwords, type STACK as the name and click Add New Application Password.",
      "Copy the password it shows (spaces are fine) and paste it here with your site address and WordPress username. STACK only reads; you can revoke it from the same screen any time.",
    ],
    fields: [
      { name: "site", label: "Site address", placeholder: "https://yoursite.com" },
      { name: "username", label: "WordPress username", placeholder: "Your login name" },
    ],
    normalize: (token) => token.replace(/\s+/g, ""),
    async validate(password, fields) {
      const base = normalizePublicSiteUrl(fields.site ?? "");
      const username = cleanUsername(fields.username ?? "");
      let lastErr: unknown;
      for (const rest of ["pretty", "query"] as const) {
        const site = { base, username, rest };
        try {
          const me = await get(site, password, "WordPress sign-in check", "/wp/v2/users/me", "context=edit");
          return { account: me.email ?? me.name ?? username, metadata: { site: base, username, rest } };
        } catch (err) {
          lastErr = err;
          if (!wrongForm(err)) break;
        }
      }
      if (lastErr instanceof ProviderHttpError && (lastErr.status === 401 || lastErr.status === 403)) {
        throw new Error("WordPress didn't accept that username and application password. Check both - if they're right, your host may be blocking sign-in headers.");
      }
      if (lastErr instanceof ProviderHttpError && lastErr.status === 404) throw new Error("STACK couldn't find WordPress's REST API at that address. Check the site address.");
      throw lastErr;
    },
  },
  async getFiles(tokens): Promise<ProviderFile[]> {
    const site = siteFrom(tokens);
    const [posts, pages] = await Promise.all([listType(site, tokens.accessToken, "posts"), listType(site, tokens.accessToken, "pages")]);
    return [...(Array.isArray(posts) ? posts : []), ...(Array.isArray(pages) ? pages : [])]
      .map((p) => mapWordPressItem(site.base, p))
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))
      .slice(0, 100);
  },
});
