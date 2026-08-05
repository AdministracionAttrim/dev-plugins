/**
 * fix-i18n-labels.mjs
 *
 * Detects and auto-fills missing i18n labels for notifyInvalidForm calls.
 *
 * How it works:
 *   1. Scans *.routes.ts for provideTranslocoScope → builds scope→filePath map
 *   2. Scans *.ts for notifyInvalidForm(form, "scope.form.labels") → gets (file, scope) pairs
 *   3. For each pair, finds nearby form builder services and extracts FormControl keys
 *   4. Checks which keys are missing from the scope JSON and from common.labels
 *   5. Adds missing keys with camelCase→label generation (both EN and ES)
 *
 * Usage:
 *   node scripts/fix-i18n-labels.mjs          → patch files
 *   node scripts/fix-i18n-labels.mjs --dry-run → show what would be added
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(__filename), "..");
const I18N_MODULES = join(PROJECT_ROOT, "public/i18n/modules");
const I18N_GLOBAL_ES = join(PROJECT_ROOT, "public/i18n/global/es.json");
const SRC = join(PROJECT_ROOT, "src");

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Helpers ───────────────────────────────────────────────────────────────

function findFiles(dir, predicate) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, predicate));
    } else if (predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/** "bankDebit" → "Bank debit" */
function camelToLabel(key) {
  return key
    .replace(/([A-Z])/g, (m) => " " + m.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

/** Returns true if the key was new and added. */
function setNestedIfMissing(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (const part of parts.slice(0, -1)) {
    cur[part] ??= {};
    cur = cur[part];
  }
  const last = parts.at(-1);
  if (last in cur) return false;
  cur[last] = value;
  return true;
}

// ─── Step 1: build scope → i18n filePath map ───────────────────────────────

function buildScopeMap() {
  const map = new Map(); // scope alias → relative module path e.g. "master-data/configuration/supply"
  const routeFiles = findFiles(SRC, (n) => n.endsWith(".routes.ts"));

  const re = /provideTranslocoScope\(\s*\{[^}]*scope\s*:\s*["']([^"']+)["'][^}]*createLoader\(["']([^"']+)["']/gs;

  for (const file of routeFiles) {
    const content = readFileSync(file, "utf-8");
    let m;
    while ((m = re.exec(content)) !== null) {
      map.set(m[1], m[2]); // e.g. "supply" → "master-data/configuration/supply"
    }
    re.lastIndex = 0;
  }

  return map;
}

// ─── Step 2: find all notifyInvalidForm calls with string scopes ────────────

function findInvalidFormCalls() {
  const calls = [];
  const tsFiles = findFiles(SRC, (n) => n.endsWith(".ts") && !n.endsWith(".spec.ts"));
  const re = /notifyInvalidForm\s*\([^,)]+,\s*["']([^"']+)["']/g;

  for (const file of tsFiles) {
    const content = readFileSync(file, "utf-8");
    let m;
    while ((m = re.exec(content)) !== null) {
      calls.push({ file, scope: m[1] });
    }
    re.lastIndex = 0;
  }

  return calls;
}

// ─── Step 3: extract FormControl keys from builder services ────────────────

// Keys that are always disabled, auxiliary, or system — never appear in toasts
const SKIP_KEYS = new Set([
  "id", "rowId", "creationDate", "deletionDate", "lastUpdate", "displayName",
  "managementEndDate", "priceStartDate", "supplyAddressAddPUC",
]);

function shouldSkip(key) {
  return SKIP_KEYS.has(key) || key.endsWith("Aux");
}

function extractControlKeys(tsContent) {
  const keys = new Set();
  // Matches: keyName: this.#fb.control / nonNullable.control / array / group
  const re = /\b(\w+)\s*:\s*this\.#fb\.\b/g;
  let m;
  while ((m = re.exec(tsContent)) !== null) {
    if (!shouldSkip(m[1])) keys.add(m[1]);
  }
  return keys;
}

function findFormBuilderFiles(componentFile) {
  const dir = dirname(componentFile);
  return findFiles(dir, (n) => n.endsWith(".service.ts") && !n.endsWith(".spec.ts"));
}

// ─── Step 4: check common.labels fallback ──────────────────────────────────

function loadCommonLabels() {
  const global = JSON.parse(readFileSync(I18N_GLOBAL_ES, "utf-8"));
  return new Set(Object.keys(global?.common?.labels ?? {}));
}

// ─── Step 5: patch i18n JSON files ─────────────────────────────────────────

function patchFile(filePath, jsonPath, key, label) {
  const json = JSON.parse(readFileSync(filePath, "utf-8"));
  const fullPath = `${jsonPath}.${key}`;
  const added = setNestedIfMissing(json, fullPath, label);
  if (added && !DRY_RUN) {
    writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
  }
  return added;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no files will be changed\n" : "");
  console.log("Building scope map from routes...");
  const scopeMap = buildScopeMap();
  console.log(`  Found ${scopeMap.size} scopes: ${[...scopeMap.keys()].join(", ")}\n`);

  const commonLabels = loadCommonLabels();
  const calls = findInvalidFormCalls();
  console.log(`Found ${calls.length} notifyInvalidForm calls\n`);

  let totalAdded = 0;
  const seen = new Set(); // deduplicate same scope processed from multiple files

  for (const { file, scope } of calls) {
    if (seen.has(scope)) continue;
    seen.add(scope);

    const scopeName = scope.split(".")[0];
    const jsonPath = scope.split(".").slice(1).join(".");
    const modulePath = scopeMap.get(scopeName);

    if (!modulePath) {
      console.warn(`⚠️  No scope mapping found for "${scopeName}" (used in ${relative(PROJECT_ROOT, file)})`);
      continue;
    }

    const esFile = join(I18N_MODULES, modulePath, "es.json");
    const enFile = join(I18N_MODULES, modulePath, "en.json");

    // Gather control keys from the component file + its nearby form services
    const allKeys = new Set();
    const filesToScan = [file, ...findFormBuilderFiles(file)];
    for (const f of filesToScan) {
      try {
        extractControlKeys(readFileSync(f, "utf-8")).forEach((k) => allKeys.add(k));
      } catch { /* file may not exist */ }
    }

    if (allKeys.size === 0) {
      console.warn(`⚠️  No control keys found for scope "${scope}"`);
      continue;
    }

    // Check which keys are actually missing (not in scope JSON and not in common.labels)
    let esJson, enJson;
    try {
      esJson = JSON.parse(readFileSync(esFile, "utf-8"));
      enJson = JSON.parse(readFileSync(enFile, "utf-8"));
    } catch {
      console.warn(`⚠️  Cannot read i18n files for scope "${scope}" (${modulePath})`);
      continue;
    }

    const missing = [];
    for (const key of allKeys) {
      const fullPath = `${jsonPath}.${key}`;
      if (getNestedValue(esJson, fullPath) !== undefined) continue; // already exists
      if (commonLabels.has(key)) continue; // covered by common.labels fallback
      missing.push(key);
    }

    if (missing.length === 0) continue;

    console.log(`📋 scope "${scope}" — ${missing.length} missing:`);
    for (const key of missing) {
      const label = camelToLabel(key);
      const addedEs = patchFile(esFile, jsonPath, key, label);
      const addedEn = patchFile(enFile, jsonPath, key, label);
      if (addedEs || addedEn) {
        console.log(`  ${DRY_RUN ? "→" : "✅"} ${jsonPath}.${key} = "${label}"`);
        totalAdded++;
      }
    }
  }

  console.log(`\n${DRY_RUN ? "Would add" : "Added"} ${totalAdded} labels.`);

  if (totalAdded > 0 && !DRY_RUN) {
    console.log("⚠️  Spanish labels use English words as placeholders — review and translate as needed.");
    console.log("   Run 'npm run check:i18n' to verify consistency.");
  }
}

main();
