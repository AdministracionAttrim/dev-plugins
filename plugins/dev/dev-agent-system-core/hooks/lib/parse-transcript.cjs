#!/usr/bin/env node
// Parses a Claude Code JSONL transcript and returns structured session summary.
// Usage: node parse-transcript.cjs <transcript_path>
// Output: JSON to stdout
// Also exportable as a module: require('./parse-transcript.cjs').parseTranscript(path)

const fs = require("fs");

const BUG_RE = /\b(fix|bug|error|crash|corregido|resuelto|arreglado|solved|broke|broken|patch)\b/i;
const EVOLVE_RE = /\b(regression|regresi[oó]n|crashed|crash(?:ed)?|broke|broken)\b/i;
const LE_RE = /LE-(?:[A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1]{1,5}-)?\d{3,4}/g; // LE-SS-019, LE-0019, LE-JLG-001...
const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit"]);

function parseTranscript(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { editedFiles: [], hasBugKeywords: false, keywords: [], appliedLEs: [], turnCount: 0 };
  }

  const editedFiles = new Set();
  const editedRelevantFiles = new Set();
  const keywords = new Set();
  const evolveKeywords = new Set();
  const appliedLEs = new Set();
  let turnCount = 0;

  const raw = fs.readFileSync(transcriptPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }

    if (entry.type === "assistant") turnCount++;

    const msg = entry.message || entry;
    const contents = Array.isArray(msg.content) ? msg.content : [];

    for (const block of contents) {
      if (!block || typeof block !== "object") continue;

      if (block.type === "tool_use" && EDIT_TOOLS.has(block.name)) {
        const fp = block.input && (block.input.file_path || block.input.filePath);
        if (fp) {
          editedFiles.add(fp);
          if (/\.(ts|tsx|js|jsx|mjs|cjs|html|css|scss|vue|svelte|py|go|rs|java|cs|rb|php)$/i.test(fp)) editedRelevantFiles.add(fp);
        }
        if (Array.isArray(block.input && block.input.edits)) {
          for (const e of block.input.edits) {
            if (e.file_path) {
              editedFiles.add(e.file_path);
              if (/\.(ts|tsx|js|jsx|mjs|cjs|html|css|scss|vue|svelte|py|go|rs|java|cs|rb|php)$/i.test(e.file_path)) editedRelevantFiles.add(e.file_path);
            }
          }
        }
      }

      if (block.type === "text" && typeof block.text === "string") {
        const m = block.text.match(BUG_RE);
        if (m)
          m.forEach(function (k) {
            keywords.add(k.toLowerCase());
          });
        const evo = block.text.match(EVOLVE_RE);
        if (evo)
          evo.forEach(function (k) {
            evolveKeywords.add(k.toLowerCase());
          });
        const leM = block.text.match(LE_RE);
        if (leM)
          leM.forEach(function (le) {
            appliedLEs.add(le);
          });
      }
    }

    if (typeof entry.content === "string") {
      const m2 = entry.content.match(BUG_RE);
      if (m2)
        m2.forEach(function (k) {
          keywords.add(k.toLowerCase());
        });
      const evo2 = entry.content.match(EVOLVE_RE);
      if (evo2)
        evo2.forEach(function (k) {
          evolveKeywords.add(k.toLowerCase());
        });
    }
  }

  const editedRelevantFilesArr = Array.from(editedRelevantFiles);
  const hasEvolveKeywords = evolveKeywords.size > 0;
  const hasEvolveSignals = hasEvolveKeywords && editedRelevantFilesArr.length >= 2;

  return {
    editedFiles: Array.from(editedFiles),
    hasBugKeywords: keywords.size > 0,
    keywords: Array.from(keywords),
    appliedLEs: Array.from(appliedLEs),
    editedRelevantFiles: editedRelevantFilesArr,
    editedRelevantFilesCount: editedRelevantFilesArr.length,
    hasEvolveKeywords,
    evolveKeywords: Array.from(evolveKeywords),
    hasEvolveSignals,
    turnCount
  };
}

module.exports = { parseTranscript, EDIT_TOOLS, BUG_RE, LE_RE };

// CLI mode
if (require.main === module) {
  const transcriptPath = process.argv[2];
  const result = parseTranscript(transcriptPath);
  process.stdout.write(JSON.stringify(result));
}
