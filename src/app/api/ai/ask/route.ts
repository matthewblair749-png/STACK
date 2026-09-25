import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { AiNotConfiguredError, runAsk, validateAttachments, type AskEvent, type AskResult } from "@/server/ai/run";

const NOT_CONFIGURED = "STACK AI isn't configured yet - set ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL) in your environment to enable it.";

/** Turns Anthropic API failures into something the user can act on, instead of a generic "try again". */
function friendlyAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/credit balance is too low/i.test(raw)) return "Your Anthropic account is out of credits. Add credits at console.anthropic.com > Plans & Billing, then ask again.";
  if (/\b401\b|authentication_error|invalid x-api-key/i.test(raw)) return "Anthropic rejected the API key. Check ANTHROPIC_API_KEY in .env.local, then restart the server.";
  if (/\b(429|rate_limit)/i.test(raw)) return "Anthropic is rate-limiting this key. Wait a moment and try again.";
  if (/\b(529|overloaded)/i.test(raw)) return "Anthropic is overloaded right now. Try again in a minute.";
  if (/model|not_found/i.test(raw) && /\b404\b/.test(raw)) return "That AI model isn't available to your account. Remove ANTHROPIC_MODEL from .env.local or set a model you have access to.";
  return "Something went wrong asking STACK AI. Try again.";
}

async function persist(opts: { workspaceId: string; userId: string; conversationId?: string; question: string; result: AskResult }) {
  const { workspaceId, userId, question, result } = opts;
  let conversationId = opts.conversationId;
  if (conversationId) {
    const owned = await db.conversation.findFirst({ where: { id: conversationId, workspaceId, userId }, select: { id: true } });
    if (!owned) conversationId = undefined;
  }
  if (!conversationId) {
    conversationId = (await db.conversation.create({ data: { workspaceId, userId, title: question.replace(/\s+/g, " ").slice(0, 60) }, select: { id: true } })).id;
  }
  await db.conversationMessage.createMany({
    data: [
      { conversationId, role: "user", text: question },
      {
        conversationId,
        role: "ai",
        text: result.answer,
        data: { structured: result.structured ?? null, used: result.used, pendingActions: result.pendingActions } as unknown as Prisma.InputJsonValue,
      },
    ],
  });
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  return conversationId;
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireSessionAndWorkspace();
  } catch (err) {
    return handleApiError(err, "POST /api/ai/ask failed");
  }
  const { session, workspaceId } = ctx;
  const userId = session.user.id;

  try {
    const body = (await req.json()) as {
      question?: string;
      history?: { role: "user" | "ai"; text: string }[];
      projectId?: string;
      conversationId?: string;
      attachments?: unknown;
      stream?: boolean;
    };
    const question = body.question?.trim();
    if (!question) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
    const att = validateAttachments(body.attachments);
    if (!att.ok) return NextResponse.json({ error: att.error }, { status: 400 });

    const run = (emit?: (e: AskEvent) => void) =>
      runAsk({ workspaceId, userId, question, history: body.history, projectId: body.projectId, attachments: att.attachments, emit });

    if (!body.stream) {
      try {
        const result = await run();
        const conversationId = await persist({ workspaceId, userId, conversationId: body.conversationId, question, result });
        return NextResponse.json({ ...result, conversationId, sources: result.used.items.map((i) => i.label) });
      } catch (err) {
        if (err instanceof AiNotConfiguredError) return NextResponse.json({ answer: NOT_CONFIGURED, sources: [], pendingActions: [] });
        throw err;
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
        try {
          const result = await run((e) => send(e));
          const conversationId = await persist({ workspaceId, userId, conversationId: body.conversationId, question, result });
          send({ type: "answer", ...result, conversationId });
        } catch (err) {
          if (err instanceof AiNotConfiguredError) send({ type: "answer", answer: NOT_CONFIGURED, pendingActions: [], used: { apps: [], items: [] } });
          else {
            console.error("POST /api/ai/ask (stream) failed", err);
            send({ type: "error", message: friendlyAiError(err) });
          }
        } finally {
          send({ type: "done" });
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    return handleApiError(err, "POST /api/ai/ask failed");
  }
}
