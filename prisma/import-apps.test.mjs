// Run with: node --test prisma/
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeApp, planImport, splitDataset } from "./import-apps-lib.mjs";

const good = {
  slug: "acme-tasks",
  name: "Acme Tasks",
  description: "Task tracking.",
  category: "Project management",
  officialWebsite: "https://acme.test",
  authType: "ApiKey",
  tokenName: "Personal access token",
  whereToCreate: "Settings > Developer",
  readAccess: "Read tasks",
  docsUrl: "https://acme.test/docs/auth",
  checkedOn: "2026-10-01",
  confidence: "high",
};

test("a fully evidenced ApiKey app is kept as ApiKey with its provenance", () => {
  const w = [];
  const { row } = normalizeApp(good, w);
  assert.equal(row.authType, "ApiKey");
  assert.equal(row.meta.apiAccess, "ApiKey");
  assert.equal(row.meta.apiDocsUrl, "https://acme.test/docs/auth");
  assert.equal(row.meta.apiCheckedAt.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.deepEqual(w, []);
});

test("ApiKey without an official docs URL is downgraded, never trusted", () => {
  const w = [];
  const { row } = normalizeApp({ ...good, docsUrl: "" }, w);
  assert.equal(row.authType, "ExternalTool");
  assert.equal(row.meta.apiAccess, "Unverified");
  assert.match(w.join(), /downgraded/);
});

test("ApiKey with no token name or location is downgraded", () => {
  const { row } = normalizeApp({ ...good, tokenName: "", whereToCreate: "" }, []);
  assert.equal(row.meta.apiAccess, "Unverified");
});

test("non-http docs links are dropped (no javascript: or file: URLs stored)", () => {
  const w = [];
  const { row } = normalizeApp({ ...good, docsUrl: "javascript:alert(1)", officialWebsite: "file:///etc/passwd" }, w);
  assert.equal(row.meta.apiDocsUrl, undefined);
  assert.equal(row.officialWebsite, undefined);
  assert.equal(row.meta.apiAccess, "Unverified");
});

test("classifications map to the right AppAuthType and are kept verbatim in apiAccess", () => {
  const map = { OAuth2Only: "ExternalTool", ShortLivedToken: "ExternalTool", PartnerOnly: "ExternalTool", DesktopApp: "DesktopApp", NoApi: "Unavailable" };
  for (const [access, authType] of Object.entries(map)) {
    const { row } = normalizeApp({ ...good, authType: access }, []);
    assert.equal(row.authType, authType, access);
    assert.equal(row.meta.apiAccess, access);
  }
});

test("unknown authType values become Unverified with a warning", () => {
  const w = [];
  const { row } = normalizeApp({ ...good, authType: "Probably" }, w);
  assert.equal(row.meta.apiAccess, "Unverified");
  assert.equal(w.length > 0, true);
});

test("bad slugs and missing required fields are rejected", () => {
  assert.ok(normalizeApp({ ...good, slug: "Not Kebab" }, []).error);
  assert.ok(normalizeApp({ ...good, name: "" }, []).error);
  assert.ok(normalizeApp({ ...good, category: undefined }, []).error);
});

test("existing OAuth2 connectors and curated apps are never overwritten", () => {
  const plan = planImport(
    { apps: [{ ...good, slug: "slack", name: "Hijacked", authType: "NoApi" }, { ...good, slug: "photoshop", authType: "OAuth2Only" }] },
    { existingApps: new Map([["slack", { authType: "OAuth2" }], ["photoshop", { authType: "DesktopApp" }]]) },
  );
  const slack = plan.appOps.find((o) => o.slug === "slack");
  assert.equal(slack.op, "update");
  assert.equal(slack.update.authType, "OAuth2");
  assert.equal("name" in slack.update, false);
  assert.equal(plan.appOps.find((o) => o.slug === "photoshop").update.authType, "DesktopApp");
});

test("a verified ApiKey can upgrade an existing ExternalTool or Unavailable app", () => {
  const plan = planImport(
    { apps: [{ ...good, slug: "a" }, { ...good, slug: "b" }] },
    { existingApps: new Map([["a", { authType: "ExternalTool" }], ["b", { authType: "Unavailable" }]]) },
  );
  assert.deepEqual(plan.appOps.map((o) => o.update.authType), ["ApiKey", "ApiKey"]);
});

test("professions drop unknown app slugs and merge with existing lists instead of replacing", () => {
  const plan = planImport(
    { apps: [good], professions: [{ slug: "designer", name: "Designer", category: "Creative", recommendedAppSlugs: ["acme-tasks", "figma", "ghost-app"] }] },
    { existingApps: new Map([["figma", { authType: "OAuth2" }]]), existingProfessions: new Map([["designer", { recommendedAppSlugs: ["figma", "notion"] }]]) },
  );
  const op = plan.professionOps[0];
  assert.equal(op.op, "update");
  assert.deepEqual(op.update.recommendedAppSlugs, ["figma", "notion", "acme-tasks"]);
  assert.match(plan.warnings.join(), /ghost-app/);
});

test("duplicate apps across files keep the first and warn on conflicts", () => {
  const plan = planImport({ apps: [good, { ...good, authType: "NoApi" }] });
  assert.equal(plan.appOps.length, 1);
  assert.equal(plan.appOps[0].create.authType, "ApiKey");
  assert.match(plan.warnings.join(), /listed twice/);
});

test("splitDataset accepts both the object form and one mixed array", () => {
  const prof = { slug: "p", name: "P", category: "C", recommendedAppSlugs: [] };
  assert.equal(splitDataset({ apps: [good], professions: [prof] }).professions.length, 1);
  const mixed = splitDataset([good, prof]);
  assert.equal(mixed.apps.length, 1);
  assert.equal(mixed.professions.length, 1);
});
