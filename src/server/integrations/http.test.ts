import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, ProviderHttpError, retryAfterMs } from "./http";

afterEach(() => vi.unstubAllGlobals());

const res = (status: number, body: unknown = {}, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });

describe("fetchJson", () => {
  it("retries rate limits and server errors, then succeeds", async () => {
    const f = vi.fn().mockResolvedValueOnce(res(429, {}, { "retry-after": "0" })).mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(200, { ok: 1 }));
    vi.stubGlobal("fetch", f);
    await expect(fetchJson("T", "https://x.test", {}, { baseDelayMs: 1 })).resolves.toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry a client error, and keeps its status", async () => {
    const f = vi.fn().mockResolvedValue(res(404));
    vi.stubGlobal("fetch", f);
    const err = (await fetchJson("T", "https://x.test", {}, { baseDelayMs: 1 }).catch((e: unknown) => e)) as ProviderHttpError;
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err.status).toBe(404);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget", async () => {
    const f = vi.fn().mockResolvedValue(res(500));
    vi.stubGlobal("fetch", f);
    await expect(fetchJson("T", "https://x.test", {}, { retries: 2, baseDelayMs: 1 })).rejects.toMatchObject({ status: 500 });
    expect(f).toHaveBeenCalledTimes(3);
  });
});

describe("retryAfterMs", () => {
  it("reads seconds, caps long waits, and falls back when absent", () => {
    expect(retryAfterMs("2", 100)).toBe(2000);
    expect(retryAfterMs("3600", 100)).toBe(20_000);
    expect(retryAfterMs(null, 100)).toBe(100);
  });
});
