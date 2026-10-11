import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const deleted: { model: string; where: unknown }[] = [];
const del = (model: string) => (args: { where: unknown }) => {
  deleted.push({ model, where: args.where });
  return Promise.resolve({ count: 2 });
};
const audit = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    syncedMessage: { deleteMany: del("message") },
    syncedEvent: { deleteMany: del("event") },
    syncedFile: { deleteMany: del("file") },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));
vi.mock("@/server/workspace", () => ({
  UnauthorizedError: class extends Error {},
  ForbiddenError: class extends Error {},
  requireSessionAndWorkspace: async () => ({ session: { user: { id: "u1" } }, workspaceId: "w1", role: "Member" }),
}));
vi.mock("@/server/sync/context-graph", () => ({ buildContextGraph: vi.fn().mockResolvedValue({}) }));
vi.mock("@/server/work/state", () => ({ invalidateWorkState: vi.fn() }));
vi.mock("@/server/audit", () => ({ audit: (...a: unknown[]) => audit(...a) }));

const { DELETE } = await import("./route");

beforeEach(() => {
  deleted.length = 0;
  audit.mockClear();
});

describe("delete synced data", () => {
  it("deletes only the caller's own copies from that one app, and records it", async () => {
    const res = await DELETE(new NextRequest("http://localhost/api/integrations/google/data", { method: "DELETE" }), { params: Promise.resolve({ provider: "google" }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, removed: { messages: 2, events: 2, files: 2 } });
    expect(deleted.map((d) => d.model).sort()).toEqual(["event", "file", "message"]);
    // Every delete is scoped to this workspace, this person, this app - never anyone else's data.
    for (const d of deleted) expect(d.where).toEqual({ workspaceId: "w1", userId: "u1", provider: "google" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "integration.data_deleted", target: "google", userId: "u1" }));
  });
});
