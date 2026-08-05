#!/usr/bin/env node
// scripts/wiki/lint-frontmatter.mjs
// Validates and patches YAML frontmatter on wiki markdown pages.
// Usage:
//   node scripts/wiki/lint-frontmatter.mjs [--fix] [file1.md file2.md ...]
//   node scripts/wiki/lint-frontmatter.mjs [--fix] --all   (scans docs/wiki/)
//
// Exit code 0 = all OK (or all fixed). Non-zero = violations remain.

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, extname, join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const WIKI_DIR = join(PROJECT_ROOT, "docs/wiki");

const ARGS = process.argv.slice(2);
const FIX = ARGS.includes("--fix");
const ALL = ARGS.includes("--all");
const FILES_ARG = ARGS.filter(a => !a.startsWith("--"));

// ── Required frontmatter fields with defaults ─────────────────────────────────
const REQUIRED_FIELDS = {
  type: "concept",
  confidence: "0.8",
  explored: "true",
  last_updated: new Date().toISOString().slice(0, 10),
};

// Optional but expected — warn if missing
const OPTIONAL_FIELDS = ["tags", "sources"];

// ── Collect files to lint ─────────────────────────────────────────────────────
function collectWikiFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip meta dir (dashboard uses Dataview queries, not standard frontmatter)
      if (entry.name === "meta") continue;
      results.push(...collectWikiFiles(full));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      results.push(full);
    }
  }
  return results;
}

const targetFiles = ALL
  ? collectWikiFiles(WIKI_DIR)
  : FILES_ARG.map(f => resolve(process.cwd(), f)).filter(f => f.endsWith(".md"));

if (targetFiles.length === 0) {
  console.log("lint-frontmatter: no .md files to check.");
  process.exit(0);
}

// ── Parse frontmatter ─────────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(FM_RE);
  if (!match) return { hasFM: false, fields: {}, body: content, raw: "" };

  const raw = match[1];
  const fields = {};
  for (const line of raw.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key) fields[key] = val;
  }
  const body = content.slice(match[0].length);
  return { hasFM: true, fields, body, raw };
}

function buildFrontmatter(fields) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---`;
}

// ── Lint each file ────────────────────────────────────────────────────────────
let totalViolations = 0;
let totalFixed = 0;

for (const filePath of targetFiles) {
  const relative = filePath.replace(PROJECT_ROOT + "\\", "").replace(PROJECT_ROOT + "/", "");
  const content = readFileSync(filePath, "utf8");
  const { hasFM, fields, body } = parseFrontmatter(content);

  const missing = [];
  const patches = {};

  if (!hasFM) {
    missing.push("(no frontmatter)");
    Object.assign(patches, REQUIRED_FIELDS);
  } else {
    for (const [field, def] of Object.entries(REQUIRED_FIELDS)) {
      if (!fields[field]) {
        missing.push(field);
        patches[field] = def;
      }
    }
  }

  if (missing.length === 0) {
    console.log(`✅ ${relative}`);
    continue;
  }

  totalViolations += missing.length;

  if (FIX) {
    const merged = { ...fields, ...patches };
    // Ensure consistent field order
    const ordered = {};
    for (const k of ["type", "confidence", "explored", "last_updated", "tags", "sources"]) {
      if (merged[k] !== undefined) ordered[k] = merged[k];
    }
    // Add any extra fields not in the canonical order
    for (const [k, v] of Object.entries(merged)) {
      if (!ordered[k]) ordered[k] = v;
    }

    const newFM = buildFrontmatter(ordered);
    const newContent = hasFM
      ? content.replace(/^---[\s\S]*?---/, newFM)
      : newFM + "\n\n" + content;

    writeFileSync(filePath, newContent, "utf8");
    console.log(`🔧 ${relative} — patched: ${missing.join(", ")}`);
    totalFixed++;
  } else {
    console.log(`⚠️  ${relative} — missing: ${missing.join(", ")}`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
if (totalViolations === 0) {
  console.log("\n✅ All wiki pages have valid frontmatter.");
} else if (FIX) {
  console.log(`\n🔧 Fixed ${totalFixed} pages (${totalViolations} fields patched).`);
} else {
  console.log(`\n⚠️  ${totalViolations} violations found. Run with --fix to patch automatically.`);
  process.exit(1);
}
