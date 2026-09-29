"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, Copy, Loader2, Mic, MicOff, PhoneOff, Users, Video, VideoOff } from "lucide-react";
import { useToast } from "@/components/app/toast";
import { cn } from "@/lib/utils";

interface Participant {
  peerId: string;
  displayName: string;
  micOn: boolean;
  cameraOn: boolean;
  isYou: boolean;
}
interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

type Phase = "starting" | "in-call" | "ended" | "not-found" | "error";

const HEARTBEAT_MS = 8000;
const PARTICIPANTS_POLL_MS = 3000;
const SIGNAL_POLL_MS = 1200;

/** Tries progressively less demanding media so a call is still usable if the camera (or mic) isn't available. */
async function getBestEffortMedia(): Promise<{ stream: MediaStream | null; hadVideo: boolean; hadAudio: boolean; note?: string }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { stream: null, hadVideo: false, hadAudio: false, note: "This browser doesn't support camera/mic access. You can still watch others once you join." };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return { stream, hadVideo: true, hadAudio: true };
  } catch {
    // Fall through to a smaller ask.
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return { stream, hadVideo: false, hadAudio: true, note: "STACK couldn't access your camera, so you're joining audio-only." };
  } catch {
    // Fall through further.
  }
  return { stream: null, hadVideo: false, hadAudio: false, note: "STACK couldn't access your camera or microphone. Check your browser's site permissions to turn them on - you can still watch and listen." };
}

function Tile({ name, stream, muted, micOn, cameraOn, isLocal }: { name: string; stream: MediaStream | null; muted: boolean; micOn: boolean; cameraOn: boolean; isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  const hasVideo = cameraOn && stream && stream.getVideoTracks().length > 0;
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-neutral-900">
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} className={cn("h-full w-full object-cover", isLocal && "-scale-x-100")} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-700 text-lg font-semibold text-white">{name.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
        {!micOn && <MicOff size={12} />}
        <span className="truncate">{isLocal ? `${name} (you)` : name}</span>
      </div>
    </div>
  );
}

export default function CallRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaNote, setMediaNote] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [hasMic, setHasMic] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  const peerIdRef = useRef<string>("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<IceServer[]>([{ urls: ["stun:stun.l.google.com:19302"] }]);
  const stoppedRef = useRef(false);

  const sendSignal = useCallback(
    async (toPeerId: string, type: string, payload: unknown) => {
      await fetch(`/api/calls/${params.id}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPeerId: peerIdRef.current, toPeerId, type, payload }),
      }).catch(() => {});
    },
    [params.id],
  );

  const ensurePeer = useCallback(
    (remotePeerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(remotePeerId);
      if (existing) return existing;
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(remotePeerId, "candidate", e.candidate.toJSON());
      };
      pc.ontrack = (e) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(remotePeerId, e.streams[0]);
          return next;
        });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") pc.restartIce();
      };
      peersRef.current.set(remotePeerId, pc);
      return pc;
    },
    [sendSignal],
  );

  const closePeer = useCallback((remotePeerId: string) => {
    peersRef.current.get(remotePeerId)?.close();
    peersRef.current.delete(remotePeerId);
    pendingCandidatesRef.current.delete(remotePeerId);
    setRemoteStreams((prev) => {
      if (!prev.has(remotePeerId)) return prev;
      const next = new Map(prev);
      next.delete(remotePeerId);
      return next;
    });
  }, []);

  const makeOffer = useCallback(
    async (remotePeerId: string) => {
      const pc = ensurePeer(remotePeerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(remotePeerId, "offer", offer);
    },
    [ensurePeer, sendSignal],
  );

  // Reconcile the polled participant list against the peer connections we're actually holding.
  const syncPeers = useCallback(
    (list: Participant[]) => {
      const myId = peerIdRef.current;
      const remoteIds = new Set(list.filter((p) => p.peerId !== myId).map((p) => p.peerId));
      for (const existingId of Array.from(peersRef.current.keys())) {
        if (!remoteIds.has(existingId)) closePeer(existingId);
      }
      for (const id of remoteIds) {
        if (peersRef.current.has(id)) continue;
        // Only the lexicographically smaller peerId offers, so exactly one side initiates per pair.
        if (myId < id) makeOffer(id).catch(() => {});
        else ensurePeer(id);
      }
    },
    [closePeer, ensurePeer, makeOffer],
  );

  const handleSignal = useCallback(
    async (fromPeerId: string, type: string, payload: unknown) => {
      const pc = ensurePeer(fromPeerId);
      if (type === "offer") {
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        const queued = pendingCandidatesRef.current.get(fromPeerId) ?? [];
        for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
        pendingCandidatesRef.current.delete(fromPeerId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal(fromPeerId, "answer", answer);
      } else if (type === "answer") {
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        const queued = pendingCandidatesRef.current.get(fromPeerId) ?? [];
        for (const c of queued) await pc.addIceCandidate(c).catch(() => {});
        pendingCandidatesRef.current.delete(fromPeerId);
      } else if (type === "candidate") {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(payload as RTCIceCandidateInit).catch(() => {});
        } else {
          const list = pendingCandidatesRef.current.get(fromPeerId) ?? [];
          list.push(payload as RTCIceCandidateInit);
          pendingCandidatesRef.current.set(fromPeerId, list);
        }
      }
    },
    [ensurePeer, sendSignal],
  );

  // Stops our own media/peer connections. Idempotent (guarded) since both leave paths below call it.
  const stopLocal = useCallback(() => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    for (const pc of peersRef.current.values()) pc.close();
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  /** Real page unload (tab close, browser back): the page may not survive long enough for a normal
   * fetch to finish, so this uses sendBeacon, the one API meant to survive that. Fire-and-forget -
   * if it doesn't land, the server also reaps a peer whose heartbeat just stops arriving. */
  const leaveOnUnload = useCallback(() => {
    stopLocal();
    try {
      navigator.sendBeacon(
        `/api/calls/${params.id}/heartbeat`,
        new Blob([JSON.stringify({ peerId: peerIdRef.current, leaving: true })], { type: "application/json" }),
      );
    } catch {
      // Best effort.
    }
  }, [params.id, stopLocal]);

  /** Clicking "leave call": the page stays open, so a normal awaited request is more reliable than a
   * beacon - this is what actually clears the seat before we navigate away. */
  const leaveAndWait = useCallback(async () => {
    stopLocal();
    await fetch(`/api/calls/${params.id}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerId: peerIdRef.current, leaving: true }),
    }).catch(() => {});
  }, [params.id, stopLocal]);

  useEffect(() => {
    let cancelled = false;
    peerIdRef.current = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `p${Date.now()}${Math.random()}`;

    async function start() {
      const media = await getBestEffortMedia();
      if (cancelled) return;
      localStreamRef.current = media.stream;
      setLocalStream(media.stream);
      setHasMic(media.hadAudio);
      setHasCamera(media.hadVideo);
      setMicOn(media.hadAudio);
      setCameraOn(media.hadVideo);
      if (media.note) setMediaNote(media.note);

      const displayName = session?.user?.name ?? session?.user?.email ?? "Someone";
      const res = await fetch(`/api/calls/${params.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: peerIdRef.current, displayName }),
      });
      if (cancelled) return;
      if (res.status === 404) return setPhase("not-found");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(body.error ?? "Couldn't join this call.");
        return setPhase("error");
      }
      if (Array.isArray(body.iceServers) && body.iceServers.length) iceServersRef.current = body.iceServers;
      setPhase("in-call");
    }

    start().catch((err) => {
      if (cancelled) return;
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong joining this call.");
      setPhase("error");
    });

    return () => {
      cancelled = true;
      leaveOnUnload();
    };
    // Deliberately runs once per room id - re-running would tear down and re-request media/join mid-call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (phase !== "in-call") return;
    const onHide = () => leaveOnUnload();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [phase, leaveOnUnload]);

  // Poll who's in the room.
  useEffect(() => {
    if (phase !== "in-call") return;
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/calls/${params.id}?as=${peerIdRef.current}`);
      if (cancelled) return;
      if (res.status === 404) return setPhase("ended");
      if (!res.ok) return;
      const body = await res.json();
      if (cancelled) return;
      setParticipants(body.participants);
      syncPeers(body.participants);
    }
    poll();
    const t = setInterval(poll, PARTICIPANTS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [phase, params.id, syncPeers]);

  // Poll incoming signaling.
  useEffect(() => {
    if (phase !== "in-call") return;
    let cancelled = false;
    async function poll() {
      const res = await fetch(`/api/calls/${params.id}/signal?to=${peerIdRef.current}`);
      if (cancelled || !res.ok) return;
      const body = await res.json();
      for (const s of body.signals ?? []) {
        await handleSignal(s.fromPeerId, s.type, s.payload).catch(() => {});
      }
    }
    const t = setInterval(poll, SIGNAL_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [phase, params.id, handleSignal]);

  // Heartbeat.
  useEffect(() => {
    if (phase !== "in-call") return;
    const t = setInterval(() => {
      fetch(`/api/calls/${params.id}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: peerIdRef.current, micOn, cameraOn }),
      }).catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [phase, params.id, micOn, cameraOn]);

  function toggleMic() {
    if (!hasMic || !localStreamRef.current) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }
  function toggleCamera() {
    if (!hasCamera || !localStreamRef.current) return;
    const next = !cameraOn;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraOn(next);
  }
  async function hangUp() {
    await leaveAndWait();
    router.push("/calls");
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied", description: "Share it with anyone in your workspace.", tone: "success" });
    } catch {
      toast({ title: "Couldn't copy the link", description: window.location.href, tone: "error" });
    }
  }

  if (phase === "starting") {
    return (
      <div className="flex h-[calc(100vh-68px)] flex-col items-center justify-center gap-3 text-neutral-400">
        <Loader2 size={22} className="animate-spin" />
        <p className="text-sm">Joining the call...</p>
      </div>
    );
  }
  if (phase === "not-found" || phase === "ended") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <AlertTriangle size={28} className="mx-auto text-neutral-300" />
        <p className="mt-3 text-lg font-semibold text-ink">{phase === "ended" ? "This call has ended" : "Call not found"}</p>
        <p className="mt-1 text-sm text-neutral-500">{phase === "ended" ? "Everyone has left. Start a new one from the Calls page." : "This link doesn't point to a call that exists in your workspace."}</p>
        <button onClick={() => router.push("/calls")} className="mt-5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Back to Calls</button>
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <AlertTriangle size={28} className="mx-auto text-red" />
        <p className="mt-3 text-lg font-semibold text-ink">Couldn&apos;t join this call</p>
        <p className="mt-1 text-sm text-neutral-500">{errorMessage}</p>
        <button onClick={() => router.push("/calls")} className="mt-5 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Back to Calls</button>
      </div>
    );
  }

  const me = session?.user?.name ?? session?.user?.email ?? "You";
  const others = participants.filter((p) => !p.isYou);

  return (
    <div className="flex h-[calc(100vh-68px)] flex-col bg-neutral-950">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="flex items-center gap-1.5 text-sm text-neutral-300"><Users size={14} /> {participants.length} in this call</p>
        {mediaNote && <p className="hidden truncate text-xs text-yellow sm:block">{mediaNote}</p>}
        <button onClick={copyLink} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20">
          <Copy size={13} /> Copy invite link
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3">
        <div className={cn("grid gap-3", others.length === 0 ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3")}>
          <Tile name={me} stream={localStream} muted isLocal micOn={micOn} cameraOn={cameraOn} />
          {others.map((p) => (
            <Tile key={p.peerId} name={p.displayName} stream={remoteStreams.get(p.peerId) ?? null} muted={false} micOn={p.micOn} cameraOn={p.cameraOn} />
          ))}
        </div>
        {others.length === 0 && (
          <p className="mt-4 text-center text-sm text-neutral-400">Waiting for others to join - share the invite link above.</p>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-white/10 py-4">
        <button
          onClick={toggleMic}
          disabled={!hasMic}
          title={hasMic ? (micOn ? "Mute" : "Unmute") : "No microphone available"}
          className={cn("flex h-11 w-11 items-center justify-center rounded-full text-white disabled:opacity-30", micOn ? "bg-white/15 hover:bg-white/25" : "bg-red")}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          onClick={toggleCamera}
          disabled={!hasCamera}
          title={hasCamera ? (cameraOn ? "Turn off camera" : "Turn on camera") : "No camera available"}
          className={cn("flex h-11 w-11 items-center justify-center rounded-full text-white disabled:opacity-30", cameraOn ? "bg-white/15 hover:bg-white/25" : "bg-red")}
        >
          {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
        <button onClick={hangUp} title="Leave call" className="flex h-11 w-11 items-center justify-center rounded-full bg-red text-white hover:opacity-90">
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
}
