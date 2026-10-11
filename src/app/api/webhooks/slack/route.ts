import { after, NextRequest, NextResponse } from "next/server";
import { handleSlackPayload, SLACK_EVENT_DEBOUNCE_MS, verifySlackSignature } from "@/server/integrations/slack-events";
import { processSyncJobs } from "@/server/sync/jobs";

export const maxDuration = 60;

const noRetry = { "x-slack-no-retry": "1" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Slack Events API endpoint. Verifies the signature on the raw body, answers fast, and syncs in the background. */
export async function POST(req: NextRequest) {
  const secret = process.env.SLACK_SIGNING_SECRET;
  // Not set up: tell Slack to stop retrying rather than hammering an endpoint that can never accept events.
  if (!secret) return NextResponse.json({ error: "Slack events aren't enabled." }, { status: 503, headers: noRetry });

  const raw = await req.text();
  if (!verifySlackSignature(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: Parameters<typeof handleSlackPayload>[0];
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: noRetry });
  }

  const outcome = await handleSlackPayload(body);
  if (outcome.kind === "challenge") return NextResponse.json({ challenge: outcome.challenge });

  // The first event in a quiet period schedules the run; events during the wait join the same queued job.
  if (outcome.kind === "queued" && outcome.created.length) {
    after(async () => {
      await sleep(SLACK_EVENT_DEBOUNCE_MS + 1_000);
      // One shared budget so the whole run fits in the function's time limit; anything left waits for the next run.
      const deadline = Date.now() + 25_000;
      for (const filter of outcome.created) {
        const budgetMs = deadline - Date.now();
        if (budgetMs <= 0) break;
        await processSyncJobs({ budgetMs, filter }).catch((e) => console.error("slack webhook sync failed", e));
      }
    });
  }
  return NextResponse.json({ ok: true });
}
