import dns from "node:dns";
import https from "node:https";
import net from "node:net";
import { ProviderHttpError } from "./http";

/*
 * Fetching a URL a user typed in (their own WordPress site) from STACK's server. Without care, that lets someone point
 * STACK at internal addresses (cloud metadata, localhost, private networks). So:
 * - only https, only real domain names (no IP literals, no localhost, no custom ports, no credentials in the URL);
 * - the domain is resolved by our own lookup at connect time and refused if ANY address is private or reserved - the
 *   check happens on the connection itself, so a domain can't pass the check and then switch to an internal address;
 * - no redirects are followed, responses are size- and time-limited.
 */

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
];

const v4ToInt = (ip: string) => ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
const inV4 = (ip: string, base: string, bits: number) => (bits === 0 ? true : (v4ToInt(ip) >>> (32 - bits)) === (v4ToInt(base) >>> (32 - bits)));

/** True for loopback, private, link-local, carrier-grade NAT, documentation, multicast and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return V4_BLOCKED.some(([base, bits]) => inV4(ip, base, bits));
  if (kind !== 6) return true;
  const a = ip.toLowerCase();
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (a === "::" || a === "::1") return true;
  const first = parseInt(a.split(":")[0] || "0", 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // multicast
  if (a.startsWith("64:ff9b:") || a.startsWith("2001:db8:") || a.startsWith("2001:0db8:")) return true; // NAT64, documentation
  return false;
}

/** A user-typed site address -> a safe https base URL (origin plus optional sub-path), or a readable error. */
export function normalizePublicSiteUrl(input: string): string {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter your site address, like https://example.com.");
  }
  if (url.protocol !== "https:") throw new Error("Your site must use https:// (WordPress only allows application passwords over HTTPS).");
  if (url.username || url.password) throw new Error("Enter the site address without a username or password in it.");
  if (url.port && url.port !== "443") throw new Error("Enter the site address without a port number.");
  const host = url.hostname.toLowerCase();
  if (net.isIP(host.replace(/^\[|\]$/g, ""))) throw new Error("Enter your site's domain name, not an IP address.");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host) || host.length > 253) throw new Error("Enter your site address, like https://example.com.");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test")) {
    throw new Error("That address isn't a public website STACK can reach.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  return `https://${host}${path}`;
}

type LookupResult = { address: string; family: number };
type Resolver = (hostname: string) => Promise<LookupResult[]>;
const systemResolver: Resolver = (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true });

/** The lookup https uses when connecting: resolves, then refuses the whole host if any address isn't public. */
export function makeSafeLookup(resolve: Resolver = systemResolver) {
  return (hostname: string, options: dns.LookupOptions | number, callback: (err: NodeJS.ErrnoException | null, address?: string | LookupResult[], family?: number) => void) => {
    const opts = typeof options === "number" ? { family: options } : options ?? {};
    resolve(hostname)
      .then((addresses) => {
        if (!addresses.length) throw Object.assign(new Error(`${hostname} has no address`), { code: "ENOTFOUND" });
        const bad = addresses.find((a) => isPrivateAddress(a.address));
        if (bad) throw Object.assign(new Error("blocked: not a public address"), { code: "EPRIVATEADDR" });
        const usable = opts.family ? addresses.filter((a) => a.family === opts.family) : addresses;
        if (!usable.length) throw Object.assign(new Error(`${hostname} has no usable address`), { code: "ENOTFOUND" });
        if (opts.all) callback(null, usable);
        else callback(null, usable[0].address, usable[0].family);
      })
      .catch((err) => callback(err));
  };
}

/** The site answered, but not with usable JSON (a redirect or an HTML page) - callers may try another address form. */
export class SiteAnswerError extends Error {
  constructor(
    message: string,
    public kind: "redirect" | "not_json",
  ) {
    super(message);
  }
}

/** Redirects are never followed; when the site moved to another public https address, say which one to enter instead. */
export function redirectMessage(from: URL, location: string | undefined): string {
  try {
    const to = new URL(location ?? "", from);
    if (to.origin !== from.origin) return `The site sent STACK to ${normalizePublicSiteUrl(to.origin)}. Enter that address instead.`;
  } catch {
    // An unusable or private target: fall through to the general message.
  }
  return "The site redirected the request. Enter the exact address your site uses (for example with or without www).";
}

/**
 * GET JSON from a user-supplied public site with the protections above. Errors carry the HTTP status (as
 * ProviderHttpError) so callers can tell "not found" from "rejected"; a blocked address gets a plain message.
 */
export function safeGetJson<T = unknown>(
  label: string,
  url: string,
  headers: Record<string, string>,
  opts: { timeoutMs?: number; maxBytes?: number; resolve?: Resolver } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const maxBytes = opts.maxBytes ?? 5_000_000;
  return new Promise<T>((resolvePromise, reject) => {
    let target: URL;
    try {
      target = new URL(url);
      normalizePublicSiteUrl(target.origin); // re-checks scheme, host and port on every request
    } catch (err) {
      reject(err);
      return;
    }
    const req = https.get(target, { headers: { Accept: "application/json", "User-Agent": "STACK/1.0", ...headers }, lookup: makeSafeLookup(opts.resolve) as never, timeout: timeoutMs }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        res.resume();
        reject(new SiteAnswerError(redirectMessage(target, res.headers.location), "redirect"));
        return;
      }
      let size = 0;
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => {
        size += c.length;
        if (size > maxBytes) {
          req.destroy(new Error(`${label}: response too large`));
          return;
        }
        chunks.push(c);
      });
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (status < 200 || status >= 300) {
          reject(new ProviderHttpError(label, status, body));
          return;
        }
        try {
          resolvePromise(JSON.parse(body) as T);
        } catch {
          reject(new SiteAnswerError("The site didn't answer like a WordPress site. Check the address.", "not_json"));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error(`${label}: the site took too long to answer`)));
    req.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EPRIVATEADDR") reject(new Error("That address points to a private network, which STACK can't connect to."));
      else if (err.code === "ENOTFOUND") reject(new Error("STACK couldn't find that site. Check the address."));
      else reject(err);
    });
  });
}
