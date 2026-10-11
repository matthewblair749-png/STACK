import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/workspace", () => ({ UnauthorizedError: class extends Error {}, ForbiddenError: class extends Error {} }));
vi.mock("@/server/audit", () => ({ audit: vi.fn() }));
vi.mock("@/server/integrations/disconnect", () => ({ disconnectIntegration: vi.fn() }));

const { canDisconnectFor, listWorkspaceConnections } = await import("./workspace-connections");

describe("who can disconnect a teammate's apps", () => {
  it("mirrors who can remove whom", () => {
    expect(canDisconnectFor("Owner", "Admin", false)).toBe(true);
    expect(canDisconnectFor("Owner", "Member", false)).toBe(true);
    expect(canDisconnectFor("Admin", "Member", false)).toBe(true);
    expect(canDisconnectFor("Admin", "Admin", false)).toBe(false);
    expect(canDisconnectFor("Admin", "Owner", false)).toBe(false);
    expect(canDisconnectFor("Member", "Member", false)).toBe(false);
  });

  it("never applies to your own apps or the owner's", () => {
    expect(canDisconnectFor("Owner", "Owner", true)).toBe(false);
    expect(canDisconnectFor("Admin", "Admin", true)).toBe(false);
  });

  it("members can't list the team's connections", async () => {
    await expect(listWorkspaceConnections("w1", "u1", "Member")).rejects.toMatchObject({ status: 403 });
  });
});
