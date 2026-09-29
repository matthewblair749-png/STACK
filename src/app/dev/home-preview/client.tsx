"use client";

import { useRef } from "react";
import { HomeView, type ConnectedApp } from "@/components/app/home-view";
import { ThemePicker, ThemeToggle } from "@/components/app/theme-toggle";
import { ToastProvider } from "@/components/app/toast";
import { DemoProvider } from "@/lib/demo-context";
import type { DailyBrief, ProjectCard, WorkState } from "@/lib/work-types";

/**
 * DEVELOPMENT ONLY - sample content so the Home design can be checked without signing in.
 * The route that renders this returns 404 in production; none of this is ever shown to users.
 */
const minutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

const apps: ConnectedApp[] = [
  { id: "google", name: "Google (Gmail, Calendar, Drive)", connected: true },
  { id: "slack", name: "Slack", connected: true },
  { id: "github", name: "GitHub", connected: true },
  { id: "zoom", name: "Zoom", connected: true },
];

const state: WorkState = {
  generatedAt: minutes(0),
  hasSyncedContent: true,
  connectedProviders: ["google", "slack", "github", "linear"],
  lastSyncAt: minutes(-3),
  understand: {
    overview: "27 important conversations, 2 meetings today.",
    counts: { importantMessages: 27, upcomingMeetings: 2, projectsNeedingAttention: 1, openTasks: 4 },
    importantMessages: [
      { id: "m1", from: "Priya Shah", subject: "Q3 contract - need your sign-off before Friday", receivedAt: minutes(-12), href: "#", appId: "google" },
      { id: "m2", from: "GitHub", subject: "Review requested: Add token connect for Notion", receivedAt: minutes(-48), href: "#", appId: "github" },
      { id: "m3", from: "Marcus Lee", subject: "Re: Launch checklist", receivedAt: minutes(-130), href: "#", appId: "google" },
      { id: "m4", from: "Slack - #design", subject: "New mockups are up for review", receivedAt: minutes(-260), href: "#", appId: "slack" },
    ],
    upcomingMeetings: [],
    projectChanges: [],
    digests: [
      { projectId: "p1", name: "Website launch", items: ["Priya asked for the final copy", "3 open issues linked from GitHub"], sources: [{ appId: "google", label: "Gmail" }, { appId: "github", label: "GitHub" }], href: "#" },
    ],
  },
  priorities: [
    { id: "a", kind: "message", title: "Sign off on the Q3 contract", why: ["Priya is waiting since this morning", "Deadline is Friday"], nextStep: "Reply to Priya with your decision.", score: 9, actions: [{ label: "Open email", href: "#" }, { label: "Draft reply", command: "Draft a reply" }], refs: [] },
    { id: "b", kind: "event", title: "Prepare for the design review at 2:00 PM", why: ["Starts in 3 hours", "4 attendees"], nextStep: "Skim the new mockups in #design first.", score: 7, due: minutes(180), actions: [{ label: "Open in Calendar", href: "#" }], refs: [] },
    { id: "c", kind: "task", title: "Finish onboarding copy", why: ["Due tomorrow"], nextStep: "Block 30 minutes this afternoon.", score: 5, actions: [{ label: "Open task", href: "#" }], refs: [] },
  ],
  act: [
    { label: "Create task", hint: "Add it to STACK", intent: "new-task" },
    { label: "Draft response", hint: "Gmail", command: "Draft a response" },
    { label: "Find document", hint: "Searches your synced files", command: "Find a document" },
  ],
  moveForward: {
    deadlines: [],
    projects: [],
    waitingOnMe: [{ id: "w1", title: "Contract sign-off", who: "Priya Shah" }],
    waitingOnOthers: [{ id: "w2", title: "Final logo files", who: "Marcus Lee" }],
    nextSteps: [],
    upNext: [
      { id: "u1", title: "Design review", at: minutes(180), kind: "meeting", appId: "zoom", href: "#" },
      { id: "u2", title: "Onboarding copy due", at: minutes(60 * 24), kind: "deadline" },
      { id: "u3", title: "Weekly sync", at: minutes(60 * 30), kind: "meeting", appId: "google", href: "#" },
    ],
    atRisk: [{ id: "p1", name: "Website launch", reason: "3 open issues and a Friday deadline" }],
    nextBestAction: null,
  },
};

const brief: DailyBrief = {
  greeting: "Good morning, Matt.",
  counts: { priorities: 3, meetingsToPrepare: 2, projectsAtRisk: 1, peopleWaiting: 1, dueThisWeek: 4 },
  plan: { headline: "Sign off on the Q3 contract before your 2 PM design review", reason: "Priya has been waiting since this morning, and the contract deadline is Friday.", action: { label: "Draft reply", command: "Draft a reply" } },
  hasAnything: true,
};

const projects: ProjectCard[] = [
  { id: "p1", name: "Website launch", description: "", status: "AtRisk", health: "at_risk", progress: 62, deadline: minutes(60 * 24 * 4), summary: "Copy is the last blocker. Three GitHub issues remain and the design review is today.", people: [{ id: "1", name: "Priya" }, { id: "2", name: "Marcus" }], counts: { tasks: 12, open: 4, messages: 27, files: 9, meetings: 2 }, blockers: 1, blockerReason: "Waiting on final copy", nextAction: "Send the copy to Priya" },
];

export function HomePreview({ mode }: { mode: "full" | "empty" }) {
  const noop = () => {};
  const apps2 = mode === "empty" ? [] : apps;
  const ref = useRef(null);
  void ref;
  return (
    <ToastProvider>
      <DemoProvider>
        <div className="min-h-screen bg-neutral-25">
          <div className="flex items-center justify-end gap-3 border-b border-neutral-100 bg-white px-6 py-2">
            <ThemeToggle />
            <ThemePicker />
          </div>
          <HomeView
            state={mode === "empty" ? null : state}
            brief={mode === "empty" ? { greeting: "Good morning, Matt.", counts: { priorities: 0, meetingsToPrepare: 0, projectsAtRisk: 0, peopleWaiting: 0, dueThisWeek: 0 }, plan: null, hasAnything: false } : brief}
            loading={false}
            apps={apps2}
            connected={apps2}
            noApps={mode === "empty"}
            syncing={false}
            syncIssues={[]}
            hasConnectionError={false}
            onSync={noop}
            projects={mode === "empty" ? [] : projects}
            pending={[]}
            suggested={[
              { slug: "github", name: "GitHub", oauthProviderId: "github", status: "available", supported: true },
              { slug: "slack", name: "Slack", oauthProviderId: "slack", status: "available", supported: true },
              { slug: "google-calendar", name: "Google Calendar", oauthProviderId: "google", status: "available", supported: true },
              { slug: "jira", name: "Jira", oauthProviderId: "jira", status: "available", supported: true },
            ]}
            professionName="Software Developer"
            suggestions={["Catch me up", "What am I waiting on?", "Prepare my standup"]}
            dismissed={new Set()}
            reduceMotion
            onRun={noop}
            onJump={noop}
            onDismissNextStep={noop}
            onActionResolved={noop}
          />
        </div>
      </DemoProvider>
    </ToastProvider>
  );
}
