import { NextRequest, NextResponse } from "next/server";
import { SETUP_GUIDES } from "@/server/integrations/setup-guides";
import { db } from "@/server/db";
import { requireSessionAndWorkspace, UnauthorizedError, ForbiddenError } from "@/server/workspace";
import { listProviders } from "@/server/integrations/registry";
import { computeConnectionStatus } from "@/server/integrations/status";
import type { Integration } from "@/lib/types";

const CATEGORY: Record<string, Integration["category"]> = {
  google: "Work",
  microsoft: "Work",
  slack: "Work",
  notion: "Productivity",
  github: "Work",
  zoom: "Work",
  dropbox: "Files",
  box: "Files",
  gitlab: "Work",
  jira: "Productivity",
  linear: "Productivity",
  figma: "Work",
  trello: "Productivity",
  asana: "Productivity",
  hubspot: "CRM",
  salesforce: "CRM",
  quickbooks: "Payments / Finance",
  shopify: "CRM",
  stripe: "Payments / Finance",
};

const ACCENT: Record<string, Integration["accent"]> = {
  google: "red",
  microsoft: "blue",
  slack: "yellow",
  notion: "neutral",
  github: "neutral",
  zoom: "blue",
  dropbox: "blue",
  box: "neutral",
  gitlab: "neutral",
  jira: "blue",
  linear: "neutral",
  figma: "red",
  trello: "blue",
  asana: "red",
  hubspot: "red",
  salesforce: "blue",
  quickbooks: "blue",
  shopify: "yellow",
  stripe: "blue",
};

const DESCRIPTION: Record<string, string> = {
  google: "Calendar, Gmail, and Drive.",
  microsoft: "Outlook, Outlook Calendar, and OneDrive.",
  slack: "Bring important channels and DMs into STACK.",
  notion: "Index docs and wikis for AI search.",
  github: "Track PRs, issues, and releases.",
  zoom: "Turn meetings into summaries and tasks.",
  dropbox: "Bring Dropbox files into universal search.",
  box: "Connect Box for enterprise file storage.",
  gitlab: "Source control, CI/CD, and issue tracking.",
  jira: "Issue tracking and agile project management.",
  linear: "Fast, focused issue tracking for software teams.",
  figma: "Design files and prototypes.",
  trello: "Kanban-style task boards.",
  asana: "Two-way sync with Asana projects.",
  hubspot: "Surface deals, leads, and CRM activity.",
  salesforce: "Connect accounts, opportunities, and contacts.",
  quickbooks: "Sync invoices and financial records.",
  shopify: "Track store orders and performance.",
  stripe: "See payments and subscription activity.",
};

function relativeTime(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const rows = await db.integration.findMany({
      where: { workspaceId, userId: session.user.id },
    });
    const rowByProvider = new Map(rows.map((r) => [r.provider, r]));

    const providerIds = listProviders().map((p) => p.id);
    const apps = await db.app.findMany({ where: { oauthProviderId: { in: providerIds } } });
    const appByProvider = new Map(apps.map((a) => [a.oauthProviderId!, a]));

    const integrations: Integration[] = listProviders().map((provider) => {
      const row = rowByProvider.get(provider.id);
      const configured = provider.isConfigured();
      const app = appByProvider.get(provider.id);
      const connected = !!row;
      const status = app
        ? computeConnectionStatus({
            authType: app.authType,
            hasOauthProvider: true,
            configured,
            connected,
            hasError: !!row?.syncError,
          })
        : undefined;
      return {
        id: provider.id,
        name: provider.label,
        category: CATEGORY[provider.id] ?? "Work",
        description: DESCRIPTION[provider.id] ?? "",
        accent: ACCENT[provider.id] ?? "neutral",
        connected,
        lastSynced: row ? relativeTime(row.updatedAt) : undefined,
        configured,
        missingSetup: configured ? [] : provider.missingSetup(),
        connectFields: provider.connectFields,
        setup:
          !configured && SETUP_GUIDES[provider.id]
            ? {
                ...SETUP_GUIDES[provider.id],
                redirectUrl: `${origin}/api/integrations/${provider.id}/callback`,
                canSave: process.env.NODE_ENV !== "production",
              }
            : undefined,
        status,
        officialWebsite: app?.officialWebsite,
        brandColor: app?.brandColor,
        logoPath: app?.logoPath,
      };
    });

    return NextResponse.json({ integrations });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("GET /api/integrations failed", err);
    return NextResponse.json({ error: "Something went wrong loading integrations." }, { status: 500 });
  }
}
