import { beforeEach, describe, expect, it, vi } from "vitest";

// Who is signed in, which workspace cookie they send, and which memberships exist - all controlled per test.
const state = vi.hoisted(() => ({
  userId: "user-a" as string | null,
  cookie: undefined as string | undefined,
  memberships: [] as { userId: string; workspaceId: string; role: string; createdAt: Date }[],
}));

vi.mock("./auth", () => ({ auth: async () => (state.userId ? { user: { id: state.userId } } : null) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }) }));
vi.mock("./db", () => {
  const find = (userId: string, workspaceId: string) => state.memberships.find((m) => m.userId === userId && m.workspaceId === workspaceId) ?? null;
  return {
    db: {
      workspaceMember: {
        findUnique: async ({ where }: { where: { workspaceId_userId: { userId: string; workspaceId: string } } }) =>
          find(where.workspaceId_userId.userId, where.workspaceId_userId.workspaceId),
        findFirst: async ({ where }: { where: { userId: string } }) =>
          state.memberships.filter((m) => m.userId === where.userId).sort((a, b) => +a.createdAt - +b.createdAt)[0] ?? null,
      },
    },
  };
});

const { requireSessionAndWorkspace, ForbiddenError, UnauthorizedError } = await import("./workspace");

beforeEach(() => {
  state.userId = "user-a";
  state.cookie = undefined;
  state.memberships = [
    { userId: "user-a", workspaceId: "ws-a", role: "Owner", createdAt: new Date("2026-01-01") },
    { userId: "user-a", workspaceId: "ws-shared", role: "Member", createdAt: new Date("2026-02-01") },
    { userId: "user-b", workspaceId: "ws-b", role: "Owner", createdAt: new Date("2026-01-01") },
  ];
});

describe("workspace isolation", () => {
  it("rejects signed-out requests", async () => {
    state.userId = null;
    await expect(requireSessionAndWorkspace()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("uses the person's own first workspace by default", async () => {
    await expect(requireSessionAndWorkspace()).resolves.toMatchObject({ workspaceId: "ws-a", role: "Owner" });
  });

  it("honours the active-workspace cookie only for workspaces they belong to", async () => {
    state.cookie = "ws-shared";
    await expect(requireSessionAndWorkspace()).resolves.toMatchObject({ workspaceId: "ws-shared", role: "Member" });
  });

  it("ignores a forged cookie pointing at someone else's workspace", async () => {
    state.cookie = "ws-b";
    const ctx = await requireSessionAndWorkspace();
    expect(ctx.workspaceId).toBe("ws-a");
  });

  it("refuses an explicit workspace the person isn't a member of", async () => {
    await expect(requireSessionAndWorkspace("ws-b")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a removed member", async () => {
    state.memberships = state.memberships.filter((m) => m.workspaceId !== "ws-shared");
    await expect(requireSessionAndWorkspace("ws-shared")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
