/**
 * check-i18n.mjs
 *
 * Validates consistency between i18n translation files.
 * Checks:
 *  1. All keys in es.json exist in en.json and vice versa
 *  2. No values appear to be in the wrong language (basic heuristic)
 *  3. No empty string values
 *
 * Usage: node scripts/check-i18n.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve project root (parent of scripts/)
const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(__filename), "..");

const I18N_ROOT = join(PROJECT_ROOT, "public/i18n");

const REFERENCE_LANG = "es";
const TARGET_LANGS = ["en"];
const ALL_LANGS = [REFERENCE_LANG, ...TARGET_LANGS];

// ─── Helpers ──────────────────────────────────────────────

function flattenObject(obj, prefix = "") {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

function findJsonPairs(dir) {
  /** Returns array of { folder, files } */

  const pairs = [];
  const entries = readdirSync(dir);

  const hasEs = entries.includes(`${REFERENCE_LANG}.json`);
  const hasEn = entries.includes("en.json");

  if (hasEs && hasEn) {
    pairs.push({
      folder: dir,
      files: Object.fromEntries(
        ALL_LANGS.map((lang) => [lang, join(dir, `${lang}.json`)])
      ),
    });
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    if (statSync(fullPath).isDirectory()) {
      pairs.push(...findJsonPairs(fullPath));
    }
  }

  return pairs;
}

function readJsonFile(filePath) {
  try {
    // Remove UTF-8 BOM if present
    const raw = readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");

    return JSON.parse(raw);
  } catch (err) {
    console.error(
      `\n❌ Invalid JSON in: ${relative(PROJECT_ROOT, filePath)}`
    );

    try {
      const raw = readFileSync(filePath, "utf-8");

      const match = err.message.match(/position (\d+)/);

      if (match) {
        const pos = Number(match[1]);

        const before = raw.slice(0, pos);

        const line = before.split("\n").length;
        const column = before.split("\n").pop().length + 1;

        console.error(`📍 Line ${line}, Column ${column}`);

        const lines = raw.split("\n");
        const errorLine = lines[line - 1];

        console.error("\n" + errorLine);

        console.error(" ".repeat(column - 1) + "^");
      }
    } catch {
      // Ignore secondary parsing diagnostics errors
    }

    console.error(`\n${err.message}`);
    process.exit(1);
  }
}

// ─── Checks ───────────────────────────────────────────────

function checkMissingKeys(esKeys, enKeys, folder) {
  const issues = [];

  const missingInEn = Object.keys(esKeys).filter((k) => !(k in enKeys));

  const missingInEs = Object.keys(enKeys).filter((k) => !(k in esKeys));

  for (const key of missingInEn) {
    issues.push({
      severity: "error",
      file: relative(PROJECT_ROOT, folder),
      key,
      message: "Missing in en.json",
    });
  }

  for (const key of missingInEs) {
    issues.push({
      severity: "error",
      file: relative(PROJECT_ROOT, folder),
      key,
      message: "Missing in es.json",
    });
  }

  return issues;
}

function checkEmptyValues(flatKeys, lang, folder) {
  const issues = [];

  for (const [key, value] of Object.entries(flatKeys)) {
    if (typeof value === "string" && value.trim() === "") {
      issues.push({
        severity: "warn",
        file: relative(PROJECT_ROOT, folder),
        key,
        message: `Empty value in ${lang}.json`,
      });
    }
  }

  return issues;
}

// Basic heuristic: Spanish-only words that shouldn't appear in en.json values
const SPANISH_MARKERS = [
  /\bde\b/i,
  /\blos?\b/i,
  /\blas?\b/i,
  /\bdel\b/i,
  /\bpor\b/i,
  /\bcon\b/i,
  /\buna?\b/i,
  /\bque\b/i,
  /\bestá\b/i,
  /\bción\b/i,
];

// English-only words that shouldn't appear in es.json values
const ENGLISH_MARKERS = [
  /\bthe\b/i,
  /\bwith\b/i,
  /\bfrom\b/i,
  /\bthat\b/i,
  /\bhave\b/i,
  /\bbeen\b/i,
  /\bwould\b/i,
  /\bshould\b/i,
];

function checkWrongLanguage(esKeys, enKeys, folder) {
  const issues = [];

  // Check en.json values that look Spanish
  for (const [key, value] of Object.entries(enKeys)) {
    if (typeof value !== "string" || value.length < 4) {
      continue;
    }

    // Skip keys that are the same in both languages
    if (esKeys[key] === value) {
      continue;
    }

    const spanishScore = SPANISH_MARKERS.filter((r) =>
      r.test(value)
    ).length;

    if (spanishScore >= 3) {
      issues.push({
        severity: "warn",
        file: relative(PROJECT_ROOT, folder),
        key,
        message: `en.json value looks Spanish: "${value}"`,
      });
    }
  }

  // Check es.json values that look English
  for (const [key, value] of Object.entries(esKeys)) {
    if (typeof value !== "string" || value.length < 4) {
      continue;
    }

    if (enKeys[key] === value) {
      continue;
    }

    const englishScore = ENGLISH_MARKERS.filter((r) =>
      r.test(value)
    ).length;

    if (englishScore >= 3) {
      issues.push({
        severity: "warn",
        file: relative(PROJECT_ROOT, folder),
        key,
        message: `es.json value looks English: "${value}"`,
      });
    }
  }

  return issues;
}

// ─── Main ─────────────────────────────────────────────────

function main() {
  const pairs = findJsonPairs(I18N_ROOT);

  if (pairs.length === 0) {
    console.error(`❌ No i18n file pairs found in ${I18N_ROOT}`);
    process.exit(1);
  }

  let allIssues = [];
  let totalKeys = 0;

  for (const pair of pairs) {
    const esContent = readJsonFile(pair.files.es);
    const enContent = readJsonFile(pair.files.en);

    const esKeys = flattenObject(esContent);
    const enKeys = flattenObject(enContent);

    totalKeys +=
      Object.keys(esKeys).length + Object.keys(enKeys).length;

    const issues = [
      ...checkMissingKeys(esKeys, enKeys, pair.folder),

      ...checkEmptyValues(
        esKeys,
        REFERENCE_LANG,
        pair.folder
      ),

      ...checkEmptyValues(enKeys, "en", pair.folder),

      ...checkWrongLanguage(
        esKeys,
        enKeys,
        pair.folder
      ),
    ];

    allIssues.push(...issues);
  }

  // ─── Report ───────────────────────────────────────────

  console.log("\n" + "═".repeat(60));

  const errors = allIssues.filter(
    (i) => i.severity === "error"
  );

  const warnings = allIssues.filter(
    (i) => i.severity === "warn"
  );

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):\n`);

    for (const e of errors) {
      console.log(
        `  ${e.file} → ${e.key}: ${e.message}`
      );
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS (${warnings.length}):\n`);

    for (const w of warnings) {
      console.log(
        `  ${w.file} → ${w.key}: ${w.message}`
      );
    }
  }

  console.log(
    `\n📊 Total: ${pairs.length} file pairs, ${totalKeys} keys checked, ${errors.length} errors, ${warnings.length} warnings`
  );

  if (errors.length > 0) {
    console.log("\n❌ i18n check FAILED");
    process.exit(0);
  }

  console.log("\n✅ i18n check PASSED");
  process.exit(0);
}

main();