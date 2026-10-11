import { describe, expect, it } from "vitest";
import { syncedTaskToTask, type SyncedTaskItem } from "./external-tasks";
import { parseDue } from "@/server/sync/orchestrator";

const item = (over: Partial<SyncedTaskItem> = {}): SyncedTaskItem => ({
  id: "t1",
  provider: "jira",
  title: "OPS-7: Fix login",
  status: "In Progress",
  priority: null,
  container: "Ops",
  dueAt: null,
  dueIsDate: false,
  permalink: "https://acme.atlassian.net/browse/OPS-7",
  updatedAt: "2026-10-05T10:00:00Z",
  ...over,
});

describe("My Work rows from synced tasks", () => {
  const now = new Date(2026, 9, 11, 9, 0); // 11 Oct 2026, 09:00 local

  it("marks a whole-day task overdue only once that day has passed", () => {
    expect(syncedTaskToTask(item({ dueAt: "2026-10-10T00:00:00.000Z", dueIsDate: true }), now).priority).toBe("urgent");
    expect(syncedTaskToTask(item({ dueAt: "2026-10-11T00:00:00.000Z", dueIsDate: true }), now).priority).toBe("normal");
  });

  it("uses the app's own priority, not guesses", () => {
    expect(syncedTaskToTask(item({ priority: "Highest" }), now).priority).toBe("urgent");
    expect(syncedTaskToTask(item({ priority: "High" }), now).priority).toBe("important");
    expect(syncedTaskToTask(item({ priority: "Medium" }), now).priority).toBe("normal");
  });

  it("is a read-only external row linking back to the app", () => {
    const t = syncedTaskToTask(item(), now);
    expect(t.id).toBe("ext:t1");
    expect(t.external).toEqual({ provider: "jira", url: "https://acme.atlassian.net/browse/OPS-7", container: "Ops" });
    expect(t.labels).toEqual(["In Progress"]);
  });

  it("never links to a non-web URL", () => {
    expect(syncedTaskToTask(item({ permalink: "javascript:alert(1)" }), now).external?.url).toBeUndefined();
  });
});

describe("parseDue", () => {
  it("keeps whole-day dates as dates and exact times as times", () => {
    expect(parseDue("2026-10-12")).toEqual({ dueAt: new Date("2026-10-12T00:00:00.000Z"), dueIsDate: true });
    expect(parseDue("2026-10-12T15:00:00Z")).toEqual({ dueAt: new Date("2026-10-12T15:00:00Z"), dueIsDate: false });
    expect(parseDue(undefined)).toEqual({ dueAt: null, dueIsDate: false });
    expect(parseDue("not a date")).toEqual({ dueAt: null, dueIsDate: false });
  });
});
