// Regenerates supabase/setup-new-project.sql from the individual SQL files.
//
// The combined file exists so a new project needs ONE paste instead of nine
// in the right order — the step most likely to go wrong when doing it live
// with someone. Generating it means it can never drift from the real files.
//
// Run: npm run build:setup-sql

import { readdirSync, readFileSync, writeFileSync } from "node:fs";

// Order matters: tables, then security, then storage, then defaults, then
// the migrations that add columns and policies to what came before.
const FILES = [
  "schema.sql",
  "rls.sql",
  "storage.sql",
  "layout-settings.sql",
  "add-stock.sql",
  "add-messages.sql",
  "add-order-delete.sql",
  "add-order-archive.sql",
  "add-photo-focus.sql",
  "add-charm-text.sql",
  "add-email-status.sql",
  "add-status-constraints.sql",
];

// Deliberately left out of the combined file, each for its own reason.
const EXCLUDED = {
  "seed.sql": "12 fake pieces — dev only",
  "seed-orders.sql": "8 fake customers and orders — dev only",
  "add-contact-fields.sql": "patches projects made before those columns existed",
  "harden-stock-grants.sql": "patches projects made before add-stock.sql revoked anon",
  "cleanup-test-data.sql": "run by hand at launch, not at setup",
  "verify-rls.sql": "a read-only check, run after this file",
  "setup-new-project.sql": "this file",
};

// Every .sql file has to be accounted for, one way or the other.
//
// This exists because it already failed once: four migrations were written
// and shipped while this list quietly stayed the same length, so the
// combined script would have set up a new shop missing the order-delete
// policy, the archive column, photo positioning and lettered charms — none
// of it visible until the owner tried to use one of those features. A
// forgotten line in a build script should break the build, not the shop.
const known = new Set([...FILES, ...Object.keys(EXCLUDED)]);
const onDisk = readdirSync("supabase").filter((f) => f.endsWith(".sql"));

const unaccounted = onDisk.filter((f) => !known.has(f));
if (unaccounted.length > 0) {
  console.error(
    `ERROR: these SQL files are in neither FILES nor EXCLUDED:\n` +
      unaccounted.map((f) => `  supabase/${f}`).join("\n") +
      `\n\nAdd each one to FILES (if a new project needs it) or to EXCLUDED\n` +
      `(with the reason it doesn't), then run this again.`
  );
  process.exit(1);
}

const missing = FILES.filter((f) => !onDisk.includes(f));
if (missing.length > 0) {
  console.error(`ERROR: listed in FILES but not on disk:\n${missing.join("\n")}`);
  process.exit(1);
}

const header = `-- ============================================================
-- PIECES BY P  |  COMPLETE SETUP FOR A NEW SUPABASE PROJECT
--
-- GENERATED FILE - do not edit by hand.
-- Regenerate with:  npm run build:setup-sql
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- It contains, in the required order:
${FILES.map((f, i) => `--   ${i + 1}. ${f}`).join("\n")}
--
-- Supabase will warn about "destructive operations". That is the
-- \`drop policy if exists\` and \`create or replace function\` lines, which
-- are there to make this file safely re-runnable. There is no
-- \`drop table\` or \`delete from\` anywhere in it.
--
-- DELIBERATELY EXCLUDED - do not run these as part of setup:
${Object.entries(EXCLUDED)
  .map(([f, why]) => `--   ${f} — ${why}`)
  .join("\n")}
--
-- After running this, run verify-rls.sql, then \`npm run check:supabase\`.
-- ============================================================
`;

const parts = [header];
for (const [i, f] of FILES.entries()) {
  const body = readFileSync(`supabase/${f}`, "utf8").trim();
  const rule = "=".repeat(58);
  parts.push(`\n-- ${rule}\n-- [${i + 1}/${FILES.length}]  ${f}\n-- ${rule}\n\n${body}\n`);
}

const out = parts.join("\n");

// Check before writing, so a bad file is never left on disk to be pasted.
if (/Emma Carter|Sweetheart Strand|PBP-[A-Z0-9]{5}/.test(out)) {
  console.error("ERROR: seed data leaked into the combined file. Aborting.");
  process.exit(1);
}

writeFileSync("supabase/setup-new-project.sql", out);

console.log(
  `Wrote supabase/setup-new-project.sql — ${out.split("\n").length} lines from ${FILES.length} files.`
);
console.log(`All ${onDisk.length} SQL files accounted for.`);
