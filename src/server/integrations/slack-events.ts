import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/server/db";
import { enqueueSync } from "@/server/sync/jobs";

/*
 * Slack Events API (docs.slack.dev/apis/events-api, docs.slack.dev/authentication/verifying-requests-from-slack):
 * every request is signed with the app's signing secret as HMAC-SHA256 over "v0:<timestamp>:<raw body>", and
 * requests more than five minutes old are rejected to stop replays. Slack wants a 2xx within three seconds and
 * retries up to three times otherwise, so the handler only records the event and queues work.
 */

export const SLACK_MAX_SKEW_SEC = 5 * 60;
/** Bursts of messages collapse into one sync per person per window (keeps STACK well under Slack's rate limits). */
export const SLACK_EVENT_DEBOUNCE_MS = 30_000;

export function verifySlackSignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowSec - Number(timestamp)) > SLACK_MAX_SKEW_SEC) return false;
  const expected = Buffer.from(`v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex")}`);
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type SlackEnvelope = {
  type?: string;
  challenge?: string;
  team_id?: string;
  event_id?: string;
  event?: { type?: string; subtype?: string; tokens?: { oauth?: string[] } };
};

/** True the first time an event id is seen; false for Slack's retries of something already handled. */
async function firstDelivery(eventId: string): Promise<boolean> {
  // ON CONFLICT DO NOTHING: a retry inserts nothing, without raising an error.
  const { count } = await db.webhookDelivery.createMany({ data: [{ provider: "slack", deliveryId: eventId }], skipDuplicates: true });
  return count === 1;
}

const teamConnections = (teamId: string) =>
  db.integration.findMany({
    where: { provider: "slack", syncError: null, metadata: { path: ["teamId"], equals: teamId } },
    select: { id: true, workspaceId: true, userId: true, metadata: true },
  });

export type SlackEventOutcome =
  | { kind: "challenge"; challenge: string }
  | { kind: "duplicate" }
  | { kind: "queued"; created: { workspaceId: string; userId: string }[] }
  | { kind: "revoked"; connections: number }
  | { kind: "ignored" };

const REVOKED = "Slack access was removed (the app was uninstalled or the token revoked). Reconnect Slack to keep syncing.";

/**
 * Turns one verified Slack payload into work:
 * - message events: queue a sync for the STACK connections in that Slack workspace. Slack sends one event even when
 *   several connected people can see it (naming only one of them), so every connection in the team is queued; each
 *   sync reads only what that person's own token can see.
 * - tokens_revoked / app_uninstalled: mark the affected connections as needing reconnection and stop their jobs.
 */
export async function handleSlackPayload(body: SlackEnvelope): Promise<SlackEventOutcome> {
  if (body.type === "url_verification" && typeof body.challenge === "string") return { kind: "challenge", challenge: body.challenge };
  if (body.type !== "event_callback" || !body.event_id || !body.team_id || !body.event?.type) return { kind: "ignored" };
  if (!(await firstDelivery(body.event_id))) return { kind: "duplicate" };

  const teamId = body.team_id;
  const event = body.event;

  if (event.type === "tokens_revoked" || event.type === "app_uninstalled") {
    const users = new Set(event.tokens?.oauth ?? []);
    const affected = (await teamConnections(teamId)).filter((c) => {
      if (event.type === "app_uninstalled") return true;
      const slackUserId = (c.metadata as { slackUserId?: string } | null)?.slackUserId;
      return !!slackUserId && users.has(slackUserId);
    });
    if (affected.length) {
      await db.integration.updateMany({ where: { id: { in: affected.map((a) => a.id) } }, data: { syncError: REVOKED } });
      await db.syncJob.deleteMany({ where: { provider: "slack", status: "Queued", OR: affected.map((a) => ({ workspaceId: a.workspaceId, userId: a.userId })) } });
    }
    return { kind: "revoked", connections: affected.length };
  }

  if (event.type === "message") {
    const created: { workspaceId: string; userId: string }[] = [];
    for (const c of await teamConnections(teamId)) {
      const job = await enqueueSync(c.workspaceId, c.userId, "slack", "webhook", SLACK_EVENT_DEBOUNCE_MS);
      if (job.created) created.push({ workspaceId: c.workspaceId, userId: c.userId });
    }
    return { kind: "queued", created };
  }

  return { kind: "ignored" };
}
