import { EventEmitter } from "node:events";
import https from "node:https";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isPrivateAddress, makeSafeLookup, normalizePublicSiteUrl, redirectMessage, safeGetJson, SiteAnswerError } from "./safe-fetch";

afterEach(() => vi.restoreAllMocks());

describe("isPrivateAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "not-an-ip"])("blocks %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });
  it.each(["8.8.8.8", "172.32.0.1", "192.0.78.9", "2606:4700::6810:85e5", "::ffff:8.8.8.8"])("allows %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("normalizePublicSiteUrl", () => {
  it("keeps https domains and sub-paths, adds https when missing", () => {
    expect(normalizePublicSiteUrl("Example.com")).toBe("https://example.com");
    expect(normalizePublicSiteUrl("https://example.com/blog/")).toBe("https://example.com/blog");
  });
  it.each([
    ["http://example.com", /https/],
    ["https://127.0.0.1", /IP address/],
    ["https://[::1]", /IP address/],
    ["https://example.com:8080", /port/],
    ["https://user:pw@example.com", /without a username/],
    ["https://localhost", /site address/],
    ["https://wp.local", /public website/],
    ["https://metadata.internal", /public website/],
    ["file:///etc/passwd", /https/],
  ])("refuses %s", (input, msg) => {
    expect(() => normalizePublicSiteUrl(input)).toThrow(msg);
  });
});

describe("makeSafeLookup", () => {
  const run = (addresses: { address: string; family: number }[], options: object = {}) =>
    new Promise<{ err: NodeJS.ErrnoException | null; address: unknown }>((resolve) =>
      makeSafeLookup(async () => addresses)("site.example", options, (err, address) => resolve({ err, address })),
    );

  it("passes public addresses through", async () => {
    expect(await run([{ address: "93.184.216.34", family: 4 }])).toEqual({ err: null, address: "93.184.216.34" });
    expect((await run([{ address: "93.184.216.34", family: 4 }], { all: true })).address).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  it("refuses the host if any address is private (DNS rebinding / mixed records)", async () => {
    const { err } = await run([{ address: "93.184.216.34", family: 4 }, { address: "169.254.169.254", family: 4 }]);
    expect(err?.code).toBe("EPRIVATEADDR");
  });
});

describe("redirectMessage", () => {
  it("names a public new address, never a private one", () => {
    expect(redirectMessage(new URL("https://example.com/wp-json/x"), "https://www.example.com/wp-json/x")).toMatch(/https:\/\/www\.example\.com\. Enter/);
    expect(redirectMessage(new URL("https://example.com/x"), "https://127.0.0.1/x")).not.toMatch(/127/);
  });
});

describe("safeGetJson", () => {
  function fakeGet(status: number, body: string, headers: Record<string, string> = {}) {
    return vi.spyOn(https, "get").mockImplementation(((_url: unknown, opts: unknown, cb: (res: unknown) => void) => {
      const req = Object.assign(new EventEmitter(), { destroy: vi.fn() });
      const res = Object.assign(new EventEmitter(), { statusCode: status, headers, resume: vi.fn() });
      setTimeout(() => {
        cb(res);
        res.emit("data", Buffer.from(body));
        res.emit("end");
      });
      return req;
    }) as never);
  }

  it("uses the safe lookup and parses JSON", async () => {
    const spy = fakeGet(200, '{"ok":true}');
    await expect(safeGetJson("t", "https://example.com/wp-json/", {})).resolves.toEqual({ ok: true });
    expect(typeof (spy.mock.calls[0][1] as { lookup?: unknown }).lookup).toBe("function");
  });

  it("does not follow redirects", async () => {
    fakeGet(301, "", { location: "https://www.example.com/" });
    await expect(safeGetJson("t", "https://example.com/", {})).rejects.toBeInstanceOf(SiteAnswerError);
  });

  it("refuses unsafe URLs before connecting", async () => {
    const spy = fakeGet(200, "{}");
    await expect(safeGetJson("t", "https://169.254.169.254/latest/meta-data", {})).rejects.toThrow(/IP address/);
    await expect(safeGetJson("t", "http://example.com/", {})).rejects.toThrow(/https/);
    expect(spy).not.toHaveBeenCalled();
  });
});
