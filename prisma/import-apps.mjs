// Imports the researched jobs-and-apps dataset into the App and Profession tables.
//
//   node prisma/import-apps.mjs <file.json> [more.json ...]          dry run: prints what WOULD change
//   node prisma/import-apps.mjs <file.json> [more.json ...] --apply  writes it
//
// Each file is { "apps": [...], "professions": [...] } (or one array mixing both). Fields are described in
// prisma/import-apps-lib.mjs. Safe to re-run: writes are upserts by slug, existing names, descriptions, logos and
// connector links are never overwritten, a real OAuth2 connector is never downgraded, and profession app lists are
// merged, never replaced.
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { planImport, splitDataset } from "./import-apps-lib.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0 || args.includes("--help")) {
  console.log("Usage: node prisma/import-apps.mjs <file.json> [more.json ...] [--apply]\nWithout --apply nothing is written.");
  process.exit(files.length === 0 && !args.includes("--help") ? 1 : 0);
}

if (!process.env.DATABASE_URL && fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL isn't set. Put it in .env.local or the environment.");
  process.exit(1);
}

const dataset = { apps: [], professions: [] };
for (const file of files) {
  try {
    const part = splitDataset(JSON.parse(fs.readFileSync(file, "utf8")));
    dataset.apps.push(...part.apps);
    dataset.professions.push(...part.professions);
    console.log(`Read ${file}: ${part.apps.length} apps, ${part.professions.length} professions`);
  } catch (err) {
    console.error(`Couldn't read ${file}: ${err.message}`);
    process.exit(1);
  }
}

const db = new PrismaClient();

async function main() {
  const [apps, professions] = await Promise.all([
    db.app.findMany({ select: { slug: true, authType: true } }),
    db.profession.findMany({ select: { slug: true, recommendedAppSlugs: true } }),
  ]);
  const plan = planImport(dataset, {
    existingApps: new Map(apps.map((a) => [a.slug, a])),
    existingProfessions: new Map(professions.map((p) => [p.slug, p])),
  });

  for (const e of plan.errors) console.error(`SKIPPED  ${e}`);
  for (const w of plan.warnings) console.warn(`warning  ${w}`);
  const s = plan.summary;
  console.log(
    `\n${apply ? "Applying" : "Dry run"}: apps ${s.appsCreate} new / ${s.appsUpdate} updated (${s.apiKeyApps} with ApiKey access), ` +
      `professions ${s.professionsCreate} new / ${s.professionsUpdate} updated. ${plan.errors.length} rows skipped, ${plan.warnings.length} warnings.`,
  );

  if (s.appsCreate + s.appsUpdate + s.professionsCreate + s.professionsUpdate === 0) {
    console.error("Nothing valid to import.");
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log("Nothing was written. Re-run with --apply to write these changes.");
    return;
  }

  // Apps first so profession lists point at rows that exist.
  for (const op of plan.appOps) {
    await db.app.upsert({ where: { slug: op.slug }, create: op.create ?? { slug: op.slug, name: op.slug, description: "", category: "", ...op.update }, update: op.update ?? {} });
  }
  for (const op of plan.professionOps) {
    await db.profession.upsert({ where: { slug: op.slug }, create: op.create ?? { slug: op.slug, name: op.slug, category: "", ...op.update }, update: op.update ?? {} });
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
