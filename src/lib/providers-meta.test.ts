import { describe, expect, it } from "vitest";
import { listProviders } from "@/server/integrations/registry";
import { PROVIDER_LABEL, providerLabel } from "./providers-meta";

describe("provider display names", () => {
  it("has a friendly name for every connector, so no page shows a raw id like 'asana'", () => {
    const missing = listProviders()
      .map((p) => p.id)
      .filter((id) => !PROVIDER_LABEL[id]);
    expect(missing).toEqual([]);
  });

  it("falls back to the id for anything unknown", () => {
    expect(providerLabel("zendesk")).toBe("Zendesk");
    expect(providerLabel("something-new")).toBe("something-new");
  });
});
