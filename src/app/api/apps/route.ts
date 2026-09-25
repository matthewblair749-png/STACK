import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { getProvider } from "@/server/integrations/registry";
import { computeConnectionStatus } from "@/server/integrations/status";
import { appMeta, CATEGORY_SYNONYMS } from "@/server/integrations/app-meta";
import { SETUP_GUIDES } from "@/server/integrations/setup-guides";

/** Real connection health, from what the last sync actually did - never assumed. */
export type Health = "connected" | "pending" | "needs_attention" | "expired";

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9/+.]+/).filter((w) => w.length > 1);

/**
 * The full app catalog joined with the caller's real connection state. Search understands what apps are for
 * ("accounting" finds QuickBooks, "email" finds Gmail and Outlook), not just their names.
 */
export async function GET(req: NextRequest) {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const userId = session.user.id;
    const origin = req.nextUrl.origin;

    const query = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const user = await db.user.findUnique({ where: { id: userId }, select: { profession: true } });
    const professionSlug = req.nextUrl.searchParams.get("profession") ?? user?.profession ?? null;
    const profession = professionSlug ? await db.profession.findUnique({ where: { slug: professionSlug } }) : null;
    const recommendedSlugs = new Set(profession?.recommendedAppSlugs ?? []);

    const apps = await db.app.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }] });

    const providerIds = [...new Set(apps.map((a) => a.oauthProviderId).filter((id): id is string => !!id))];
    const where = { workspaceId, userId, provider: { in: providerIds } };
    const [connections, msgCounts, eventCounts, fileCounts] = await Promise.all([
      db.integration.findMany({ where }),
      db.syncedMessage.groupBy({ by: ["provider"], where, _count: { _all: true } }),
      db.syncedEvent.groupBy({ by: ["provider"], where, _count: { _all: true } }),
      db.syncedFile.groupBy({ by: ["provider"], where, _count: { _all: true } }),
    ]);
    const connByProvider = new Map(connections.map((c) => [c.provider, c]));
    const countOf = (rows: { provider: string; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.provider, r._count._all]));
    const messages = countOf(msgCounts);
    const events = countOf(eventCounts);
    const files = countOf(fileCounts);

    // Expand what the person typed into related terms ("accounting" -> quickbooks, xero, invoices...).
    const terms = words(query);
    const expanded = new Set<string>(terms);
    for (const t of terms) for (const extra of CATEGORY_SYNONYMS[t] ?? []) expanded.add(extra);

    const result = apps.map((app) => {
      const provider = app.oauthProviderId ? getProvider(app.oauthProviderId) : undefined;
      const configured = provider ? provider.isConfigured() : false;
      const row = app.oauthProviderId ? connByProvider.get(app.oauthProviderId) : undefined;
      const connected = !!row;
      const meta = appMeta(app.oauthProviderId);
      const status = computeConnectionStatus({ authType: app.authType, hasOauthProvider: !!provider, configured, connected, hasError: !!row?.syncError });

      let health: Health | null = null;
      if (row) health = row.syncError ? "expired" : row.lastSyncError ? "needs_attention" : row.lastSyncAt ? "connected" : "pending";

      const setup = provider && !configured && SETUP_GUIDES[provider.id]
        ? { ...SETUP_GUIDES[provider.id], redirectUrl: `${origin}/api/integrations/${provider.id}/callback`, canSave: process.env.NODE_ENV !== "production" }
        : undefined;

      const account = row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? ((row.metadata as Record<string, unknown>).account as string | undefined) : undefined;

      return {
        id: app.id,
        slug: app.slug,
        name: app.name,
        description: app.description,
        category: app.category,
        officialWebsite: app.officialWebsite,
        brandColor: app.brandColor,
        authType: app.authType,
        hasRealLogo: app.hasRealLogo,
        logoPath: app.logoPath,
        isUniversal: app.isUniversal,
        oauthProviderId: app.oauthProviderId,
        status,
        supported: !!provider,
        configured,
        connected,
        missingSetup: provider && !configured ? provider.missingSetup() : [],
        connectFields: provider?.connectFields,
        setup,
        health,
        lastSyncAt: row?.lastSyncAt?.toISOString() ?? null,
        lastSyncError: row?.syncError ?? row?.lastSyncError ?? null,
        account,
        counts: app.oauthProviderId ? { messages: messages.get(app.oauthProviderId) ?? 0, events: events.get(app.oauthProviderId) ?? 0, files: files.get(app.oauthProviderId) ?? 0 } : null,
        meta: provider ? { understands: meta.understands, read: meta.read, act: meta.act, actNote: meta.actNote, wont: meta.wont, unlocks: meta.unlocks } : null,
        recommended: recommendedSlugs.has(app.slug),
        _synonyms: meta.synonyms,
      };
    });

    let filtered = result;
    if (expanded.size) {
      const scored = result
        .map((a) => {
          const name = a.name.toLowerCase();
          const hay = `${name} ${a.slug} ${a.category} ${a.description} ${a._synonyms.join(" ")}`.toLowerCase();
          let score = 0;
          for (const t of expanded) {
            if (name === t) score += 10;
            else if (name.includes(t)) score += 6;
            else if (a._synonyms.includes(t)) score += 4;
            else if (hay.includes(t)) score += 2;
          }
          return { a, score };
        })
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score || Number(y.a.connected) - Number(x.a.connected));
      filtered = scored.map((x) => x.a);
    }

    const apiApps = filtered.map((a) => {
      const rest = { ...a } as Partial<typeof a>;
      delete rest._synonyms;
      return rest;
    });

    const connectedApps = result.filter((a) => a.connected);
    return NextResponse.json({
      apps: apiApps,
      recommended: [...recommendedSlugs],
      profession: profession ? { slug: profession.slug, name: profession.name } : null,
      summary: {
        connected: connectedApps.length,
        needsAttention: connectedApps.filter((a) => a.health === "expired" || a.health === "needs_attention").length,
        /** Apps that can really be connected right now (has a working connector). */
        available: result.filter((a) => !a.connected && a.supported).length,
        /** Real apps STACK has no connector for yet - shown honestly, never with a fake Connect button. */
        comingSoon: result.filter((a) => !a.supported).length,
        total: result.length,
      },
    });
  } catch (err) {
    return handleApiError(err, "GET /api/apps failed");
  }
}
