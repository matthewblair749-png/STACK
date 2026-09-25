import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace, UnauthorizedError, ForbiddenError } from "@/server/workspace";
import { getProvider } from "@/server/integrations/registry";
import { SETUP_GUIDES } from "@/server/integrations/setup-guides";

/** Sets or replaces `NAME=value` lines, keeping every other line (and the file's line endings) untouched. */
function applyEnv(existing: string, values: Record<string, string>) {
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const lines = existing.length ? existing.split(/\r?\n/) : [];
  const pending = new Map(Object.entries(values));
  const next = lines.map((line) => {
    const name = line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    if (name && pending.has(name)) {
      const v = pending.get(name)!;
      pending.delete(name);
      return `${name}=${v}`;
    }
    return line;
  });
  while (next.length && next[next.length - 1] === "") next.pop();
  for (const [name, v] of pending) next.push(`${name}=${v}`);
  return next.join(eol) + eol;
}

/**
 * Saves a provider's developer credentials for this local install (writes .env.local and applies them
 * immediately). Local development only: on a hosted deploy, set environment variables in the host instead.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Set these as environment variables in your hosting dashboard instead." }, { status: 400 });
  }
  const { provider: id } = await params;
  const provider = getProvider(id);
  const guide = SETUP_GUIDES[id];
  if (!provider || !guide) return NextResponse.json({ error: "Unknown integration." }, { status: 404 });

  try {
    await requireSessionAndWorkspace();
    const body = (await req.json().catch(() => ({}))) as { values?: Record<string, unknown> };
    const values: Record<string, string> = {};
    for (const v of guide.vars) {
      const raw = body.values?.[v.name];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value) return NextResponse.json({ error: `${v.label} is required.` }, { status: 400 });
      if (/[\r\n"'`\s]/.test(value)) return NextResponse.json({ error: `${v.label} looks wrong - it shouldn't contain spaces, quotes or line breaks.` }, { status: 400 });
      values[v.name] = value;
    }

    const file = path.join(process.cwd(), ".env.local");
    const existing = await fs.readFile(file, "utf8").catch(() => "");
    await fs.writeFile(file, applyEnv(existing, values), "utf8");
    for (const [name, value] of Object.entries(values)) process.env[name] = value;

    return NextResponse.json({ ok: true, configured: provider.isConfigured() });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/[provider]/setup failed", err);
    return NextResponse.json({ error: "Couldn't save the credentials." }, { status: 500 });
  }
}
