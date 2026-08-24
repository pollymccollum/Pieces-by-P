// Regenerates supabase/setup-new-project.sql from the individual SQL files.
//
// The combined file exists so a new project needs ONE paste instead of five
// in the right order — the step most likely to go wrong when doing it live
// with someone. Generating it means it can never drift from the real files.
//
// Run: npm run build:setup-sql

import { readFileSync, writeFileSync } from "node:fs";

// Order matters: tables, then security, then storage, then defaults.
const FILES = [
  "schema.sql",
  "rls.sql",
  "storage.sql",
  "layout-settings.sql",
  "add-stock.sql",
  "add-messages.sql",
];

// Deliberately excluded — see the header text below.
const EXCLUDED = ["seed.sql", "seed-orders.sql", "add-contact-fields.sql"];

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
-- DELIBERATELY EXCLUDED - never run these on a real shop:
${EXCLUDED.map((f) => `--   ${f}`).join("\n")}
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
writeFileSync("supabase/setup-new-project.sql", out);

// Fail loudly rather than silently shipping fake customers to a real shop.
if (/Emma Carter|Sweetheart Strand|PBP-[A-Z0-9]{5}/.test(out)) {
  console.error("ERROR: seed data leaked into the combined file. Aborting.");
  process.exit(1);
}

console.log(
  `Wrote supabase/setup-new-project.sql — ${out.split("\n").length} lines from ${FILES.length} files.`
);
