import { db } from "./db";
import { ForbiddenError } from "./workspace";

/** A participant with no heartbeat for this long is treated as gone, even if their tab never told us. */
const STALE_MS = 25_000;

export class CallNotFoundError extends Error {
  constructor() {
    super("This call doesn't exist or has ended.");
    this.name = "CallNotFoundError";
  }
}

/** Marks anyone who's stopped heartbeating as left, and closes the call once nobody real is left in it. */
async function reap(callId: string) {
  const cutoff = new Date(Date.now() - STALE_MS);
  await db.callParticipant.updateMany({
    where: { callId, leftAt: null, lastSeenAt: { lt: cutoff } },
    data: { leftAt: new Date() },
  });
  const stillIn = await db.callParticipant.count({ where: { callId, leftAt: null } });
  if (stillIn === 0) {
    await db.call.updateMany({ where: { id: callId, status: "Active" }, data: { status: "Ended", endedAt: new Date() } });
  }
}

async function requireCall(callId: string, workspaceId: string) {
  const call = await db.call.findUnique({ where: { id: callId } });
  if (!call || call.workspaceId !== workspaceId) throw new CallNotFoundError();
  return call;
}

export async function createCall(workspaceId: string, hostId: string, title?: string) {
  return db.call.create({
    data: { workspaceId, hostId, title: title?.trim() || null },
    select: { id: true, title: true, startedAt: true },
  });
}

export async function listRecentCalls(workspaceId: string) {
  // Someone whose tab closed without a leave signal landing (sendBeacon is best-effort) would otherwise
  // stay "Active" forever if nobody ever re-opens that specific call - reap every Active call in the
  // workspace each time the list is viewed, so a phantom "Join" doesn't linger.
  const activeIds = await db.call.findMany({ where: { workspaceId, status: "Active" }, select: { id: true } });
  await Promise.all(activeIds.map((c) => reap(c.id)));

  const calls = await db.call.findMany({
    where: { workspaceId },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: {
      host: { select: { name: true, email: true } },
      participants: { where: { leftAt: null }, select: { id: true } },
    },
  });
  return calls.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    startedAt: c.startedAt.toISOString(),
    endedAt: c.endedAt?.toISOString() ?? null,
    hostName: c.host.name ?? c.host.email ?? "Someone",
    activeCount: c.participants.length,
  }));
}

export async function getCallState(callId: string, workspaceId: string) {
  await reap(callId);
  const call = await db.call.findUnique({
    where: { id: callId },
    include: {
      host: { select: { name: true, email: true } },
      participants: { where: { leftAt: null }, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!call || call.workspaceId !== workspaceId) throw new CallNotFoundError();
  return {
    id: call.id,
    title: call.title,
    status: call.status,
    hostName: call.host.name ?? call.host.email ?? "Someone",
    participants: call.participants.map((p) => ({
      peerId: p.peerId,
      displayName: p.displayName,
      micOn: p.micOn,
      cameraOn: p.cameraOn,
      isYou: false, // filled in by the route, which knows the caller's peerId
    })),
  };
}

export async function joinCall(callId: string, workspaceId: string, userId: string, peerId: string, displayName: string) {
  const call = await requireCall(callId, workspaceId);
  if (call.status === "Ended") throw new CallNotFoundError();
  await db.callParticipant.upsert({
    where: { callId_peerId: { callId, peerId } },
    create: { callId, userId, peerId, displayName: displayName.slice(0, 60) || "Someone" },
    update: { leftAt: null, lastSeenAt: new Date(), displayName: displayName.slice(0, 60) || "Someone" },
  });
}

export async function heartbeat(callId: string, workspaceId: string, userId: string, peerId: string, media?: { micOn?: boolean; cameraOn?: boolean }) {
  await requireCall(callId, workspaceId);
  const participant = await db.callParticipant.findUnique({ where: { callId_peerId: { callId, peerId } } });
  if (!participant || participant.userId !== userId) throw new ForbiddenError("That isn't your seat in this call.");
  await db.callParticipant.update({
    where: { callId_peerId: { callId, peerId } },
    data: {
      lastSeenAt: new Date(),
      leftAt: null,
      ...(media?.micOn !== undefined ? { micOn: media.micOn } : {}),
      ...(media?.cameraOn !== undefined ? { cameraOn: media.cameraOn } : {}),
    },
  });
}

export async function leaveCall(callId: string, workspaceId: string, userId: string, peerId: string) {
  await requireCall(callId, workspaceId);
  const participant = await db.callParticipant.findUnique({ where: { callId_peerId: { callId, peerId } } });
  if (participant && participant.userId === userId) {
    await db.callParticipant.update({ where: { callId_peerId: { callId, peerId } }, data: { leftAt: new Date() } });
  }
  await reap(callId);
}

export async function postSignal(callId: string, workspaceId: string, userId: string, fromPeerId: string, toPeerId: string, type: string, payload: unknown) {
  await requireCall(callId, workspaceId);
  const sender = await db.callParticipant.findUnique({ where: { callId_peerId: { callId, peerId: fromPeerId } } });
  if (!sender || sender.userId !== userId) throw new ForbiddenError("You're not in this call.");
  await db.callSignal.create({ data: { callId, fromPeerId, toPeerId, type, payload: payload as object } });
}

/** Reads and deletes (consumes) every signal addressed to this peer, oldest first. Each signal is delivered exactly once. */
export async function pollSignals(callId: string, workspaceId: string, userId: string, toPeerId: string) {
  await requireCall(callId, workspaceId);
  const recipient = await db.callParticipant.findUnique({ where: { callId_peerId: { callId, peerId: toPeerId } } });
  if (!recipient || recipient.userId !== userId) throw new ForbiddenError("You're not in this call.");
  const signals = await db.callSignal.findMany({ where: { callId, toPeerId }, orderBy: { createdAt: "asc" } });
  if (signals.length) await db.callSignal.deleteMany({ where: { id: { in: signals.map((s) => s.id) } } });
  return signals.map((s) => ({ fromPeerId: s.fromPeerId, type: s.type, payload: s.payload }));
}

/**
 * Google's public STUN servers, free and keyless - they only help two peers discover each other's
 * address, never touch call media. Without a TURN server (optional, set TURN_URL/TURN_USERNAME/
 * TURN_CREDENTIAL to add one), a call between two people on strict/symmetric NATs - common on some
 * corporate networks - may fail to connect directly. That's a real, honest limit of STUN-only WebRTC.
 */
export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export function iceServers(): IceServer[] {
  const servers: IceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const turnUrl = process.env.TURN_URL;
  if (turnUrl) {
    servers.push({ urls: [turnUrl], username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return servers;
}
