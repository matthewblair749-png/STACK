/* eslint-disable @typescript-eslint/no-explicit-any -- third-party API responses are untyped JSON */
import type { ProviderFile } from "../provider";
import { getJson } from "../oauth-util";
import { tokenOnlyProvider } from "./token-only";

const API = "https://api.zotero.org";
const headers = (key: string) => ({ headers: { "Zotero-API-Key": key, "Zotero-API-Version": "3" } });

/** Your most recently changed references (top-level library items). */
export const zoteroProvider = tokenOnlyProvider({
  id: "zotero",
  label: "Zotero",
  capabilities: ["files"],
  tokenConnect: {
    label: "Zotero API key",
    placeholder: "Your Zotero API key",
    helpUrl: "https://www.zotero.org/settings/keys/new",
    steps: [
      "Open the link below (zotero.org > Settings > Security > Applications). Name the key STACK.",
      "Under Personal Library, tick Allow library access. Leave write access off - STACK only reads.",
      "Click Save Key, copy the key and paste it here.",
    ],
    async validate(token) {
      // The key's own record says whose library it opens.
      const key = await getJson("Zotero key check", `${API}/keys/${encodeURIComponent(token)}`, headers(token));
      if (!key.userID) throw new Error("That key isn't linked to a Zotero user.");
      if (key.access?.user?.library !== true) throw new Error("That key can't read your library. Edit it on zotero.org and tick Allow library access.");
      return { account: key.username, metadata: { userId: String(key.userID) } };
    },
  },
  async getFiles(tokens): Promise<ProviderFile[]> {
    const userId = tokens.metadata?.userId;
    if (typeof userId !== "string" || !/^\d+$/.test(userId)) throw new Error("Zotero connection is missing its user id. Reconnect Zotero.");
    const items = (await getJson(
      "Zotero items",
      `${API}/users/${userId}/items/top?sort=dateModified&direction=desc&limit=50&format=json`,
      headers(tokens.accessToken),
    )) as Record<string, any>[];
    return items.map((i) => ({
      id: i.key,
      name: i.data?.title || "(untitled item)",
      url: i.links?.alternate?.href ?? `https://www.zotero.org/users/${userId}/items/${i.key}`,
      modifiedAt: i.data?.dateModified,
      mimeType: i.data?.itemType ? `Zotero ${i.data.itemType}` : "Zotero item",
      ownerName: i.meta?.creatorSummary,
    }));
  },
});
