import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionError } from "./errors";

type Row = { id: string; workspaceId: string; userId: string; kind: string; payload: unknown; status: string; errorMessage?: string | null; resultMetadata?: unknown; updatedAt: Date };
let rows: Row[] = [];
const audits: { action: string; detail?: Record<string, unknown> }[] = [];
const execute = vi.fn();

const matches = (r: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([k, v]) => {
    const val = (r as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !(v instanceof Date)) {
      const o = v as { in?: unknown[]; not?: unknown; gte?: Date };
      if (o.in) return o.in.includes(val);
      if ("not" in o) return val !== o.not;
      if (o.gte) return (val as Date) >= o.gte;
    }
    return val === v;
  });

vi.mock("@/server/db", () => ({
  db: {
    pendingAction: {
      findUnique: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id)!,
      findMany: async ({ where }: { where: Record<string, unknown> }) => rows.filter((r) => matches(r, where)),
      // The conditional claim: only rows matching the full where (incl. status) are changed.
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        const hit = rows.filter((r) => matches(r, where));
        hit.forEach((r) => Object.assign(r, data, { updatedAt: new Date() }));
        return { count: hit.length };
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => Object.assign(rows.find((r) => r.id === where.id)!, data),
    },
  },
}));
vi.mock("@/server/audit", () => ({ audit: async (e: { action: string; detail?: Record<string, unknown> }) => audits.push(e) }));
vi.mock("./execute", () => ({ executePendingAction: (...a: unknown[]) => execute(...a) }));

const { approvePendingAction, canonicalJson } = await import("./approve");

const email = { to: "pat@example.com", subject: "Hi", body: "Hello" };
const add = (over: Partial<Row> = {}) => {
  const r: Row = { id: `a${rows.length + 1}`, workspaceId: "w1", userId: "u1", kind: "SendEmail", payload: email, status: "Pending", updatedAt: new Date(), ...over };
  rows.push(r);
  return r;
};
const approve = (id: string, extra: Record<string, unknown> = {}) => approvePendingAction({ actionId: id, workspaceId: "w1", userId: "u1", ...extra });

beforeEach(() => {
  rows = [];
  audits.length = 0;
  execute.mockReset();
});

describe("approving an action", () => {
  it("is marked done only after the app confirms, and audited", async () => {
    const a = add();
    execute.mockImplementation(async () => {
      // While the provider call is in flight the action is claimed, not done.
      expect(rows[0].status).toBe("Approved");
      return { gmailMessageId: "m1" };
    });
    const r = await approve(a.id);
    expect(r.status).toBe(200);
    expect(rows[0].status).toBe("Executed");
    expect(audits.map((x) => x.action)).toEqual(["action.approved", "action.executed"]);
  });

  it("runs only once, even if approved twice at the same time", async () => {
    const a = add();
    execute.mockResolvedValue({});
    const [r1, r2] = await Promise.all([approve(a.id), approve(a.id)]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("refuses someone else's action without revealing it", async () => {
    const a = add({ userId: "someone-else" });
    expect((await approve(a.id)).status).toBe(404);
    expect(execute).not.toHaveBeenCalled();
  });

  it("validates an edit before storing or running anything", async () => {
    const a = add();
    const r = await approve(a.id, { payload: { to: "pat@example.com", subject: "" } });
    expect(r.status).toBe(400);
    expect(rows[0]).toMatchObject({ status: "Pending", payload: email });
    expect(execute).not.toHaveBeenCalled();
  });

  it("can't rewrite an action that already ran", async () => {
    const a = add({ status: "Executed" });
    const r = await approve(a.id, { payload: { ...email, body: "changed" } });
    expect(r.status).toBe(409);
    expect(rows[0].payload).toEqual(email);
  });

  it("asks before doing an identical action again, and does it when confirmed", async () => {
    add({ status: "Executed", payload: { body: "Hello", subject: "Hi", to: "pat@example.com" } }); // same content, different key order
    const b = add();
    execute.mockResolvedValue({});
    const first = await approve(b.id);
    expect(first.status).toBe(409);
    expect(first.body).toMatchObject({ needsConfirmation: true, duplicateOf: "a1" });
    expect(execute).not.toHaveBeenCalled();
    expect(rows[1].status).toBe("Pending");

    const confirmed = await approve(b.id, { confirmDuplicate: true });
    expect(confirmed.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("doesn't treat an old or different action as a duplicate", async () => {
    add({ status: "Executed", updatedAt: new Date(Date.now() - 11 * 60_000) });
    add({ status: "Executed", payload: { ...email, body: "Different" } });
    const c = add();
    execute.mockResolvedValue({});
    expect((await approve(c.id)).status).toBe(200);
  });

  it("returns a definite failure to Pending so it can be fixed and approved again", async () => {
    const a = add();
    execute.mockRejectedValueOnce(new ActionError("Couldn't send the email: Gmail refused permission. Nothing was changed.", "not_done"));
    const r = await approve(a.id);
    expect(r.status).toBe(502);
    expect(r.body).toMatchObject({ uncertain: false });
    expect(rows[0]).toMatchObject({ status: "Pending", errorMessage: expect.stringContaining("Nothing was changed") });

    execute.mockResolvedValueOnce({});
    expect((await approve(a.id)).status).toBe(200);
  });

  it("makes a possibly-sent failure final, so it can't be retried into a double send", async () => {
    const a = add();
    execute.mockRejectedValueOnce(new ActionError("The connection dropped before Gmail answered, so STACK can't confirm whether it managed to send the email. Check Gmail before trying again.", "unknown"));
    const r = await approve(a.id);
    expect(r.body).toMatchObject({ uncertain: true });
    expect(rows[0].status).toBe("Failed");
    expect(rows[0].errorMessage).not.toMatch(/nothing was changed/i);
    expect((await approve(a.id)).status).toBe(409);
    expect(audits.at(-1)).toMatchObject({ action: "action.failed", detail: { uncertain: true } });
  });
});

describe("canonicalJson", () => {
  it("ignores key order and undefined fields", () => {
    expect(canonicalJson({ a: 1, b: { d: 2, c: 3 }, z: undefined })).toBe(canonicalJson({ b: { c: 3, d: 2 }, a: 1 }));
  });
});
