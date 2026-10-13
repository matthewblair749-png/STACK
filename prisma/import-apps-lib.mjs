// Pure validation + planning for prisma/import-apps.mjs. No database access here, so it can be tested alone.

export const DATASET_AUTH = ["ApiKey", "OAuth2Only", "ShortLivedToken", "PartnerOnly", "DesktopApp", "NoApi", "Unverified"];

// The research dataset's classification -> STACK's AppAuthType. Everything that isn't a verified self-serve
// key or a no-cloud/no-API product stays ExternalTool ("Coming soon"); the exact classification is kept in App.apiAccess.
const TO_DB = {
  ApiKey: "ApiKey",
  OAuth2Only: "ExternalTool",
  ShortLivedToken: "ExternalTool",
  PartnerOnly: "ExternalTool",
  Unverified: "ExternalTool",
  DesktopApp: "DesktopApp",
  NoApi: "Unavailable",
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (v, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

function httpUrl(v) {
  const s = text(v, 600);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Returns { row } or { error }; pushes non-fatal problems onto `warnings`. */
export function normalizeApp(raw, warnings) {
  const slug = text(raw?.slug, 100);
  if (!slug || !SLUG.test(slug)) return { error: `app "${raw?.slug ?? "?"}": slug must be kebab-case (a-z, 0-9, dashes)` };
  const name = text(raw.name, 120);
  const description = text(raw.description, 400);
  const category = text(raw.category, 80);
  if (!name || !description || !category) return { error: `app "${slug}": name, description and category are required` };

  const warn = (m) => warnings.push(`app "${slug}": ${m}`);

  let access = text(raw.authType, 40);
  if (!DATASET_AUTH.includes(access)) {
    if (access) warn(`unknown authType "${access}", treated as Unverified`);
    access = "Unverified";
  }

  const docsUrl = httpUrl(raw.docsUrl);
  if (raw.docsUrl && !docsUrl) warn("docsUrl isn't a valid http(s) URL, dropped");
  const tokenName = text(raw.tokenName, 120);
  const tokenWhere = text(raw.whereToCreate ?? raw.tokenWhere, 300);

  // A key claim with no official page and no way to create the key is exactly the kind of guess this guards against.
  if (access === "ApiKey" && (!docsUrl || (!tokenName && !tokenWhere))) {
    warn("marked ApiKey without a docsUrl and a token name/location, downgraded to Unverified");
    access = "Unverified";
  }

  let checkedAt;
  if (raw.checkedOn !== undefined && raw.checkedOn !== "") {
    if (typeof raw.checkedOn === "string" && DATE.test(raw.checkedOn) && !Number.isNaN(Date.parse(raw.checkedOn))) checkedAt = new Date(`${raw.checkedOn}T00:00:00.000Z`);
    else warn(`checkedOn "${raw.checkedOn}" isn't YYYY-MM-DD, dropped`);
  }
  const confidence = ["high", "medium", "low"].includes(raw.confidence) ? raw.confidence : undefined;

  const website = httpUrl(raw.officialWebsite);
  if (raw.officialWebsite && !website) warn("officialWebsite isn't a valid http(s) URL, dropped");

  return {
    row: {
      slug,
      name,
      description,
      category,
      officialWebsite: website,
      authType: TO_DB[access],
      meta: {
        apiAccess: access,
        apiDocsUrl: docsUrl,
        tokenName,
        tokenWhere,
        tokenReadAccess: text(raw.readAccess ?? raw.tokenReadAccess, 200),
        apiCheckedAt: checkedAt,
        apiConfidence: confidence,
      },
    },
  };
}

export function normalizeProfession(raw) {
  const slug = text(raw?.slug, 100);
  if (!slug || !SLUG.test(slug)) return { error: `profession "${raw?.slug ?? "?"}": slug must be kebab-case` };
  const name = text(raw.name, 120);
  const category = text(raw.category, 80);
  if (!name || !category) return { error: `profession "${slug}": name and category are required` };
  const slugs = Array.isArray(raw.recommendedAppSlugs) ? raw.recommendedAppSlugs.filter((s) => typeof s === "string") : [];
  return { row: { slug, name, category, description: text(raw.description, 400), recommendedAppSlugs: [...new Set(slugs.map((s) => s.trim()))] } };
}

const defined = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Turns dataset rows into create/update operations without touching the database.
 * `existingApps`: Map slug -> { authType }. `existingProfessions`: Map slug -> { recommendedAppSlugs }.
 * Curated data is never overwritten: names, descriptions, logos and connector links are left alone on existing apps,
 * and a real OAuth2 connector is never downgraded.
 */
export function planImport({ apps = [], professions = [] }, { existingApps = new Map(), existingProfessions = new Map() } = {}) {
  const warnings = [];
  const errors = [];

  const appRows = new Map();
  for (const raw of apps) {
    const r = normalizeApp(raw, warnings);
    if (r.error) {
      errors.push(r.error);
      continue;
    }
    const prev = appRows.get(r.row.slug);
    if (prev) {
      if (prev.meta.apiAccess !== r.row.meta.apiAccess) warnings.push(`app "${r.row.slug}": listed twice with different authType (${prev.meta.apiAccess} vs ${r.row.meta.apiAccess}), kept the first`);
      continue;
    }
    appRows.set(r.row.slug, r.row);
  }

  const appOps = [...appRows.values()].map((row) => {
    const existing = existingApps.get(row.slug);
    if (!existing) {
      return { op: "create", slug: row.slug, create: { slug: row.slug, name: row.name, description: row.description, category: row.category, officialWebsite: row.officialWebsite, authType: row.authType, ...defined(row.meta) } };
    }
    // OAuth2 means a real connector exists, so it wins. A curated DesktopApp/Unavailable only changes to a verified ApiKey.
    let authType = existing.authType;
    if (existing.authType === "ExternalTool" || existing.authType === "ApiKey") authType = row.authType;
    else if (existing.authType !== "OAuth2" && row.authType === "ApiKey") authType = row.authType;
    if (authType !== row.authType) warnings.push(`app "${row.slug}": kept existing authType ${existing.authType} (dataset says ${row.meta.apiAccess})`);
    return { op: "update", slug: row.slug, update: { authType, ...defined(row.meta) } };
  });

  const known = new Set([...existingApps.keys(), ...appRows.keys()]);
  const profRows = new Map();
  for (const raw of professions) {
    const r = normalizeProfession(raw);
    if (r.error) {
      errors.push(r.error);
      continue;
    }
    const kept = r.row.recommendedAppSlugs.filter((s) => known.has(s));
    const dropped = r.row.recommendedAppSlugs.filter((s) => !known.has(s));
    if (dropped.length) warnings.push(`profession "${r.row.slug}": dropped unknown app slugs ${dropped.join(", ")}`);
    const prev = profRows.get(r.row.slug);
    if (prev) prev.recommendedAppSlugs = [...new Set([...prev.recommendedAppSlugs, ...kept])];
    else profRows.set(r.row.slug, { ...r.row, recommendedAppSlugs: kept });
  }

  const professionOps = [...profRows.values()].map((row) => {
    const existing = existingProfessions.get(row.slug);
    if (!existing) return { op: "create", slug: row.slug, create: defined(row) };
    const merged = [...new Set([...existing.recommendedAppSlugs, ...row.recommendedAppSlugs])];
    return { op: "update", slug: row.slug, update: { recommendedAppSlugs: merged }, added: merged.length - existing.recommendedAppSlugs.length };
  });

  const count = (ops, op) => ops.filter((o) => o.op === op).length;
  return {
    appOps,
    professionOps,
    warnings,
    errors,
    summary: {
      appsCreate: count(appOps, "create"),
      appsUpdate: count(appOps, "update"),
      professionsCreate: count(professionOps, "create"),
      professionsUpdate: count(professionOps, "update"),
      apiKeyApps: appOps.filter((o) => (o.create ?? o.update).authType === "ApiKey").length,
    },
  };
}

/** A file may be { apps, professions } or one mixed array (professions are the entries with recommendedAppSlugs). */
export function splitDataset(parsed) {
  if (Array.isArray(parsed)) return { apps: parsed.filter((x) => !("recommendedAppSlugs" in (x ?? {}))), professions: parsed.filter((x) => "recommendedAppSlugs" in (x ?? {})) };
  return { apps: Array.isArray(parsed?.apps) ? parsed.apps : [], professions: Array.isArray(parsed?.professions) ? parsed.professions : [] };
}
