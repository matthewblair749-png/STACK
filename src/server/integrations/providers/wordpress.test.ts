import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderHttpError } from "../http";
import { SiteAnswerError, safeGetJson } from "../safe-fetch";
import { mapWordPressItem, restUrl, wordpressProvider } from "./wordpress";

vi.mock("../safe-fetch", async (importOriginal) => ({ ...(await importOriginal<typeof import("../safe-fetch")>()), safeGetJson: vi.fn() }));
const mocked = vi.mocked(safeGetJson);
afterEach(() => mocked.mockReset());

const wp = wordpressProvider.tokenConnect!;

describe("WordPress", () => {
  it("strips the spaces WordPress shows in application passwords", () => {
    expect(wp.normalize!("abcd EFGH 1234 ijkl MNOP 5678")).toBe("abcdEFGH1234ijklMNOP5678");
  });

  it("builds both REST address forms", () => {
    expect(restUrl({ base: "https://a.com/blog", rest: "pretty" }, "/wp/v2/posts", "x=1")).toBe("https://a.com/blog/wp-json/wp/v2/posts?x=1");
    expect(restUrl({ base: "https://a.com", rest: "query" }, "/wp/v2/posts", "x=1")).toBe("https://a.com/?rest_route=%2Fwp%2Fv2%2Fposts&x=1");
  });

  it("refuses private or non-https sites before any request", async () => {
    await expect(wp.validate("pw", { site: "http://example.com", username: "pat" })).rejects.toThrow(/https/);
    await expect(wp.validate("pw", { site: "https://10.0.0.5", username: "pat" })).rejects.toThrow(/IP address/);
    expect(mocked).not.toHaveBeenCalled();
  });

  it("signs in with basic auth and remembers which address form works", async () => {
    mocked.mockRejectedValueOnce(new ProviderHttpError("x", 404, "")).mockResolvedValueOnce({ id: 1, email: "pat@site.com" });
    const v = await wp.validate("pw", { site: "site.com", username: "pat" });
    expect(v).toEqual({ account: "pat@site.com", metadata: { site: "https://site.com", username: "pat", rest: "query" } });
    expect(mocked.mock.calls[1][1]).toBe("https://site.com/?rest_route=%2Fwp%2Fv2%2Fusers%2Fme&context=edit");
    expect(mocked.mock.calls[1][2]).toEqual({ Authorization: `Basic ${Buffer.from("pat:pw").toString("base64")}` });
  });

  it("explains a rejected password and passes a redirect message through", async () => {
    mocked.mockRejectedValue(new ProviderHttpError("x", 401, "incorrect_password"));
    await expect(wp.validate("pw", { site: "site.com", username: "pat" })).rejects.toThrow(/didn't accept/);
    mocked.mockReset();
    mocked.mockRejectedValue(new SiteAnswerError("The site sent STACK to https://www.site.com. Enter that address instead.", "redirect"));
    await expect(wp.validate("pw", { site: "site.com", username: "pat" })).rejects.toThrow(/www\.site\.com/);
  });

  it("lists posts and pages newest first; drafts open in the editor", async () => {
    mocked.mockImplementation(async (_l, url) =>
      url.includes("/pages")
        ? [{ id: 9, type: "page", status: "publish", link: "https://site.com/about", modified_gmt: "2026-09-01T00:00:00", title: { raw: "About" } }]
        : [{ id: 3, type: "post", status: "draft", link: "https://site.com/?p=3", modified_gmt: "2026-10-01T00:00:00", title: { raw: "" } }],
    );
    const files = await wordpressProvider.getFiles!({ accessToken: "pw", scopes: [], metadata: { site: "https://site.com", username: "pat", rest: "pretty" } });
    expect(files).toEqual([
      { id: "post-3", name: "(untitled post)", url: "https://site.com/wp-admin/post.php?post=3&action=edit", modifiedAt: "2026-10-01T00:00:00Z", mimeType: "WordPress post (draft)" },
      { id: "page-9", name: "About", url: "https://site.com/about", modifiedAt: "2026-09-01T00:00:00Z", mimeType: "WordPress page" },
    ]);
  });

  it("falls back to visible items when drafts of others can't be listed", async () => {
    mocked.mockImplementation(async (_l, url) => {
      if (url.includes("status=")) throw new ProviderHttpError("x", 400, "rest_invalid_param");
      return [];
    });
    await expect(wordpressProvider.getFiles!({ accessToken: "pw", scopes: [], metadata: { site: "https://site.com", username: "pat" } })).resolves.toEqual([]);
    expect(mocked).toHaveBeenCalledTimes(4);
  });

  it("decodes rendered titles when the raw one is missing", () => {
    expect(mapWordPressItem("https://s.com", { id: 1, status: "publish", link: "https://s.com/x", title: { rendered: "Tom &amp; Jerry&#8217;s <em>day</em>" } }).name).toBe("Tom & Jerry’s day");
  });
});
