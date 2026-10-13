import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  messages: [] as Record<string, unknown>[],
  links: [] as { fromId: string; toId: string; relation: string }[],
  projects: [] as { id: string; name: string }[],
  lastWhere: null as unknown,
}));

vi.mock("@/server/db", () => ({
  db: {
    syncedMessage: {
      findMany: async ({ where }: { where: unknown }) => {
        data.lastWhere = where;
        return data.messages;
      },
    },
    entityLink: { findMany: async () => data.links },
    project: { findMany: async () => data.projects },
  },
}));

import { importantMessages, scoreMessage } from "./attention";
import { destinationsFor, inboxHref, isInboxGroupId } from "@/lib/data-groups";

const none = { fromTeammate: false, projects: [] };
const msg = (subject: string, snippet = "", fromAddress = "pat@client.com") => ({ subject, snippet, fromAddress });

describe("how important a message is", () => {
  it("flags urgent wording, teammates, projects and questions, and says why", () => {
    expect(scoreMessage(msg("URGENT: contract due"), none)).toEqual({ score: 3, reasons: ["Urgent wording"] });
    expect(scoreMessage(msg("Lunch"), { fromTeammate: true, projects: [] })).toEqual({ score: 2, reasons: ["From your team"] });
    expect(scoreMessage(msg("Status"), { fromTeammate: false, projects: ["Website relaunch"] })).toEqual({ score: 2, reasons: ["About Website relaunch"] });
    expect(scoreMessage(msg("Can you review this?"), none)).toEqual({ score: 1, reasons: ["Asks a question"] });
    expect(scoreMessage(msg("Hello", "nothing special"), none).score).toBe(0);
  });

  it("marks down automated senders, so a no-reply alert with urgent wording isn't important", () => {
    expect(scoreMessage(msg("Action required: verify your account", "", "no-reply@service.com"), none).score).toBe(1);
    expect(scoreMessage(msg("Weekly digest?", "", "newsletter@news.example"), none).score).toBe(-1);
  });
});

describe("important messages in an Inbox tab", () => {
  const at = (h: number) => new Date(Date.now() - h * 3_600_000);
  beforeEach(() => {
    data.messages = [
      { id: "m1", provider: "google", subject: "Hi", snippet: "catching up", fromName: "Sam", fromAddress: "sam@team.com", receivedAt: at(1), isUnread: true, permalink: null },
      { id: "m2", provider: "google", subject: "ASAP: invoice", snippet: "", fromName: "Client", fromAddress: "c@client.com", receivedAt: at(5), isUnread: true, permalink: "https://mail" },
      { id: "m3", provider: "google", subject: "Newsletter", snippet: "", fromName: "News", fromAddress: "news@x.com", receivedAt: at(2), isUnread: true, permalink: null },
      { id: "m4", provider: "google", subject: "Re: launch plan", snippet: "", fromName: "Me", fromAddress: "me@team.com", receivedAt: at(3), isUnread: true, permalink: null },
    ];
    data.links = [
      { fromId: "m1", toId: "u-sam", relation: "from_person" },
      { fromId: "m4", toId: "u-me", relation: "from_person" },
      { fromId: "m4", toId: "p1", relation: "mentions_project" },
    ];
    data.projects = [{ id: "p1", name: "Launch" }];
  });

  it("returns only important ones, most important first, with reasons", async () => {
    const items = await importantMessages("w1", "u-me", ["email"], 5);
    expect(items.map((m) => [m.id, m.reasons])).toEqual([
      ["m2", ["Urgent wording"]],
      ["m1", ["From your team"]],
      ["m4", ["About Launch"]],
    ]);
    expect(items[0]).toMatchObject({ provider: "google", permalink: "https://mail", isUnread: true });
  });

  it("doesn't count the person's own messages as from their team", async () => {
    const items = await importantMessages("w1", "u-me", ["email"], 5);
    expect(items.find((m) => m.id === "m4")?.reasons).not.toContain("From your team");
  });

  it("asks only for that tab's apps, recent ones, and unread email", async () => {
    await importantMessages("w1", "u-me", ["email"], 5);
    expect(data.lastWhere).toMatchObject({ workspaceId: "w1", userId: "u-me", provider: { in: ["google", "microsoft"] }, OR: [{ isUnread: true }, { provider: { notIn: ["google", "microsoft"] } }] });
  });

  it("respects the limit", async () => {
    expect(await importantMessages("w1", "u-me", ["email"], 1)).toHaveLength(1);
  });
});

describe("Inbox tabs", () => {
  it("links each app's data to its Inbox tab", () => {
    expect(inboxHref("email")).toBe("/inbox");
    expect(inboxHref("support")).toBe("/inbox?group=support");
    expect(destinationsFor("slack")).toContainEqual({ label: "Inbox - Chat", href: "/inbox?group=chat" });
    expect(destinationsFor("zendesk")).toContainEqual({ label: "Inbox - Support", href: "/inbox?group=support" });
    expect(destinationsFor("github").map((d) => d.href)).toEqual(expect.arrayContaining(["/tasks", "/inbox?group=dev"]));
  });
  it("keeps tasks out of the Inbox", () => {
    expect(isInboxGroupId("work")).toBe(false);
    expect(isInboxGroupId("chat")).toBe(true);
    expect(isInboxGroupId("nope")).toBe(false);
  });
});
