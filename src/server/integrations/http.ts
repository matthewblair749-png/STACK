/** An HTTP failure from a provider API, keeping the status so callers can tell "expired cursor" from "try later". */
export class ProviderHttpError extends Error {
  constructor(
    public label: string,
    public status: number,
    body: string,
  ) {
    super(`${label} failed: ${status} ${body.slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Seconds from a Retry-After header (delta-seconds or an HTTP date), capped so one call can't stall a sync. */
export function retryAfterMs(header: string | null, fallbackMs: number, capMs = 20_000): number {
  if (!header) return fallbackMs;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.min(Math.max(secs * 1000, 0), capMs);
  const at = Date.parse(header);
  return Number.isFinite(at) ? Math.min(Math.max(at - Date.now(), 0), capMs) : fallbackMs;
}

/**
 * GET/POST JSON from a provider, retrying rate limits (429) and server errors (5xx) with exponential backoff and
 * Retry-After. Other errors are thrown at once as ProviderHttpError. Never logs request headers (they hold tokens).
 */
export async function fetchJson<T = unknown>(label: string, url: string, init: RequestInit, opts: { retries?: number; baseDelayMs?: number } = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 500;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      // Network failure: retry like a 5xx.
      if (attempt >= retries) throw err;
      await sleep(base * 2 ** attempt);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) throw new ProviderHttpError(label, res.status, await res.text().catch(() => ""));
    await sleep(retryAfterMs(res.headers.get("retry-after"), base * 2 ** attempt));
  }
}
