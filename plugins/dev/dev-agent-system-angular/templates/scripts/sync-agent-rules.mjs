/**
 * sync-agent-rules.mjs
 *
 * Synchronizes rules AND skills between `.claude/` (canonical) and `.agents/`.
 * Direction: .claude → .agents
 *
 * For rules:  .claude/rules/*.md  → .agents/rules/*.md
 * For skills: .claude/skills/**   → .agents/skills/**
 *
 * Usage:
 *   node scripts/sync-agent-rules.mjs [--dry-run]
 *   npm run sync:rules
 *   npm run sync:rules -- --dry-run
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve project root (parent of scripts/)
const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(__filename), "..");

const DRY_RUN = process.argv.includes("--dry-run");

const SYNC_PAIRS = [
  { source: ".claude/rules", target: ".agents/rules", label: "Rules" },
  { source: ".claude/skills", target: ".agents/skills", label: "Skills" },
  { source: ".claude/agents", target: ".agents/agents", label: "Agents" },
  { source: ".claude/hooks", target: ".agents/hooks", label: "Hooks" },
  { source: ".claude/memory", target: ".agents/memory", label: "Memory" },
  { source: ".claude/templates", target: ".agents/templates", label: "Templates" },
];

// ─── Helpers ──────────────────────────────────────────────

/**
 * Recursively collects all files in a directory, returning paths relative to the base.
 */
function collectFiles(dir, base = dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relativePath = relative(base, fullPath);

    if (statSync(fullPath).isDirectory()) {
      results.push(...collectFiles(fullPath, base));
    } else {
      results.push(relativePath);
    }
  }
  return results;
}

/**
 * Ensures the parent directory of a file path exists.
 */
function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ─── Sync Logic ───────────────────────────────────────────

function syncPair(sourceDir, targetDir, label) {
  const absSource = join(PROJECT_ROOT, sourceDir);
  const absTarget = join(PROJECT_ROOT, targetDir);

  console.log(`\n📂 ${label}: ${sourceDir} → ${targetDir}`);

  if (!existsSync(absSource)) {
    console.log(`   ⏭️  Source not found, skipping`);
    return { copied: 0, skipped: 0, orphans: 0 };
  }

  if (!existsSync(absTarget)) {
    if (!DRY_RUN) {
      mkdirSync(absTarget, { recursive: true });
    }
    console.log(`   📁 Created target directory`);
  }

  const sourceFiles = collectFiles(absSource);
  const targetFiles = collectFiles(absTarget);

  let copied = 0;
  let skipped = 0;
  let orphans = 0;

  // Copy from source → target
  for (const file of sourceFiles) {
    const sourcePath = join(absSource, file);
    const targetPath = join(absTarget, file);

    const sourceContent = readFileSync(sourcePath);

    if (existsSync(targetPath)) {
      const targetContent = readFileSync(targetPath);
      if (Buffer.compare(sourceContent, targetContent) === 0) {
        skipped++;
        continue;
      }
    }

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would sync: ${file}`);
    } else {
      ensureDir(targetPath);
      copyFileSync(sourcePath, targetPath);
      console.log(`   ✅ Synced: ${file}`);
    }
    copied++;
  }

  // Detect orphans in target (files that don't exist in source)
  for (const file of targetFiles) {
    if (!sourceFiles.includes(file)) {
      console.log(`   ⚠️  Orphan in ${targetDir}: ${file}`);
      orphans++;
    }
  }

  return { copied, skipped, orphans };
}

// ─── Main ─────────────────────────────────────────────────

function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN MODE\n" : "");
  console.log("Canonical source: .claude/");
  console.log("Sync target:      .agents/");

  let totalCopied = 0;
  let totalSkipped = 0;
  let totalOrphans = 0;

  for (const pair of SYNC_PAIRS) {
    const result = syncPair(pair.source, pair.target, pair.label);
    totalCopied += result.copied;
    totalSkipped += result.skipped;
    totalOrphans += result.orphans;
  }

  console.log("\n" + "═".repeat(60));
  console.log(
    `📊 Total: ${totalCopied} synced, ${totalSkipped} already up-to-date, ${totalOrphans} orphans`
  );

  if (totalOrphans > 0) {
    console.log(
      `\n💡 Orphan files exist in .agents/ but not in .claude/. Review and delete manually if not needed.`
    );
  }

  if (totalCopied === 0 && totalOrphans === 0) {
    console.log("\n✅ All rules and skills are in sync");
  }
}

main();
