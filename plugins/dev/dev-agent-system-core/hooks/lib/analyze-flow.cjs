#!/usr/bin/env node
// analyze-flow.cjs — Parses a Claude Code session (main + subagent transcripts) and
// emits structured metrics JSON for the evolver agent.
// Usage: node analyze-flow.cjs <transcript_path>
// Output: JSON to stdout

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const { parseTranscript, EDIT_TOOLS, BUG_RE, LE_RE } = require("./parse-transcript.cjs");

// ── Constants ────────────────────────────────────────────────────────────────

const KNOWN_ROLES = ["architect", "dev", "debugger", "reviewer", "tester", "evolver"];
const READ_FULL_THRESHOLD_BYTES = 1024; // files > 1KB flagged for ME-0001
const BROAD_RESULT_THRESHOLD = 20; // Glob/Grep results > 20 lines → ME-0002 candidate
const BUG_KW_RE = BUG_RE;
const LE_ID_RE = LE_RE;

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeFileSizeBytes(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function countLines(text) {
  if (!text || typeof text !== "string") return 0;
  return text.split("\n").length;
}

// ── Per-transcript metrics ────────────────────────────────────────────────────

function analyzeTranscript(transcriptPath) {
  const base = parseTranscript(transcriptPath);
  const raw = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, "utf8") : "";

  const toolCounts = {};
  const skillsInvoked = new Set();
  const subagentTypesLaunched = new Set();
  const readFullFiles = []; // ME-0001 candidates: {file, sizeBytes}
  const broadResults = []; // ME-0002 candidates: {tool, lines, turnIdx}
  const hPlusPlusClaims = []; // ME-0005: turns claiming H++ without editing knowledge-log
  let turnIdx = 0;
  let prevAssistantText = "";

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const isAssistant = entry.type === "assistant";
    const isUser = entry.type === "user";
    const msg = entry.message || entry;
    const contents = Array.isArray(msg.content) ? msg.content : [];

    if (isAssistant) turnIdx++;

    for (const block of contents) {
      if (!block || typeof block !== "object") continue;

      // ── Tool use blocks (assistant) ─────────────────────────────────────
      if (block.type === "tool_use") {
        const toolName = block.name || "";
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;

        // ME-0001: Read without offset/limit on large files
        if (toolName === "Read") {
          const inp = block.input || {};
          if (!inp.offset && !inp.limit && inp.file_path) {
            const sz = safeFileSizeBytes(inp.file_path);
            if (sz > READ_FULL_THRESHOLD_BYTES) {
              readFullFiles.push({ file: inp.file_path, sizeBytes: sz, turnIdx });
            }
          }
        }

        // Skill invocations
        if (toolName === "Skill" && block.input && block.input.skill) {
          skillsInvoked.add(block.input.skill);
        }

        // Agent/Task subagent launches (ME-0002 context: were they preceded by a ?)
        if (toolName === "Agent" || toolName === "Task") {
          const subtype = (block.input || {}).subagent_type || "unknown";
          subagentTypesLaunched.add(subtype);
          const preceded = /[?¿]/.test(prevAssistantText);
          if (!preceded) {
            broadResults.push({ tool: toolName, subtype, lines: 0, turnIdx, type: "ME-0002-agent" });
          }
        }
      }

      // ── Tool result blocks (user messages — contain Glob/Grep output) ───
      if (isUser && block.type === "tool_result") {
        const resultContent = Array.isArray(block.content) ? block.content : [block.content];
        for (const rc of resultContent) {
          const text = typeof rc === "string" ? rc : (rc && rc.text) || "";
          const lines = countLines(text);
          if (lines > BROAD_RESULT_THRESHOLD) {
            broadResults.push({ tool: "Glob/Grep", lines, turnIdx, type: "ME-0002-result" });
          }
        }
      }

      // ── Text blocks (assistant) — scan for H++ claims and bug keywords ─
      if (isAssistant && block.type === "text" && typeof block.text === "string") {
        prevAssistantText = block.text;
        const hMatch = /H\+\+|aplicando LE-|incrementando LE-/i.test(block.text);
        if (hMatch && !base.editedFiles.some((f) => f.includes("knowledge-log"))) {
          hPlusPlusClaims.push({ text: block.text.slice(0, 200), turnIdx });
        }
      }
    }
  }

  const totalReads = toolCounts["Read"] || 0;
  const readFullRatio = totalReads > 0 ? readFullFiles.length / totalReads : 0;

  return {
    transcriptPath,
    ...base,
    toolCounts,
    skillsInvoked: Array.from(skillsInvoked),
    subagentTypesLaunched: Array.from(subagentTypesLaunched),
    readFullFiles,
    readFullRatio,
    broadResults,
    hPlusPlusClaims
  };
}

// ── Subagent discovery ────────────────────────────────────────────────────────

function discoverSubagentTranscripts(mainTranscriptPath) {
  const dir = path.dirname(mainTranscriptPath);
  const sessionId = path.basename(mainTranscriptPath, ".jsonl");

  const candidates = [path.join(dir, sessionId, "subagents"), path.join(dir, sessionId), path.join(dir, "subagents")];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      try {
        return fs
          .readdirSync(candidate)
          .filter((f) => f.endsWith(".jsonl"))
          .map((f) => path.join(candidate, f));
      } catch {
        continue;
      }
    }
  }
  return [];
}

// Extract declared role from a subagent JSONL by looking at the first system/user message
function inferRoleFromTranscript(transcriptPath) {
  try {
    const raw = fs.readFileSync(transcriptPath, "utf8");
    for (const line of raw.split("\n").slice(0, 10)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let entry;
      try {
        entry = JSON.parse(trimmed);
      } catch {
        continue;
      }
      const msg = entry.message || entry;
      const text =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
            ? msg.content.map((b) => b.text || "").join(" ")
            : "";
      for (const role of KNOWN_ROLES) {
        if (text.toLowerCase().includes(role)) return role;
      }
    }
  } catch {
    /* ignore */
  }
  return (
    path
      .basename(transcriptPath, ".jsonl")
      .replace(/^agent-/, "")
      .split("-")[0] || "unknown"
  );
}

// Correlate subagent file → role by checking which subagent_type was launched from main
function correlateSubagents(mainMetrics, subagentFiles) {
  const launchedRoles = mainMetrics.subagentTypesLaunched;
  return subagentFiles.map((f, idx) => {
    const role = launchedRoles[idx] || inferRoleFromTranscript(f) || `subagent-${idx}`;
    return { role, file: f };
  });
}

// ── Dead pointer check ────────────────────────────────────────────────────────

function findDeadPointers(projectRoot) {
  const dead = [];
  const AT_RE = /@(file|skill|rule):([^\s|)\]>]+)/g;

  function scanDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith(".git") && e.name !== "node_modules") {
        scanDir(full);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        let content;
        try {
          content = fs.readFileSync(full, "utf8");
        } catch {
          continue;
        }
        let m;
        const lines = content.split("\n");
        lines.forEach((line, lineIdx) => {
          // Strip inline code spans to avoid false-positive hits on documentation examples
          const lineNoCode = line.replace(/`[^`\n]+`/g, "");
          AT_RE.lastIndex = 0;
          while ((m = AT_RE.exec(lineNoCode)) !== null) {
            const kind = m[1];
            let target = m[2].trim();
            let targetPath = null;

            if (kind === "file") {
              targetPath = path.resolve(projectRoot, target);
            } else if (kind === "skill") {
              targetPath = resolveSkillPath(projectRoot, target) || path.join(projectRoot, ".claude", "skills", target);
            } else if (kind === "rule") {
              targetPath = path.join(projectRoot, ".claude", "rules", target + (target.endsWith(".md") ? "" : ".md"));
            }

            if (targetPath && !fs.existsSync(targetPath)) {
              dead.push({ source: path.relative(projectRoot, full), line: lineIdx + 1, pointer: m[0], target });
            }
          }
        });
      }
    }
  }

  scanDir(path.join(projectRoot, ".claude"));
  return dead;
}


// ── Plugin-aware roots (agent-system) ─────────────────────────────────────────
// Agentes y skills del motor viven en el plugin, no en .claude/ del proyecto.
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || require("path").resolve(__dirname, "..", "..");
function skillRoots(projectRoot) {
  const roots = [path.join(projectRoot, ".claude", "skills"), path.join(PLUGIN_ROOT, "skills")];
  // Presets hermanos instalados (p.ej. agent-system-angular) aportan skills propias
  try {
    const parent = path.dirname(PLUGIN_ROOT);
    for (const d of fs.readdirSync(parent)) {
      const cand = path.join(parent, d, "skills");
      if (d !== path.basename(PLUGIN_ROOT) && fs.existsSync(cand)) roots.push(cand);
    }
  } catch (e) { /* parent no legible: ignorar */ }
  return roots;
}
function resolveSkillPath(projectRoot, target) {
  for (const r of skillRoots(projectRoot)) {
    const cand = path.join(r, target);
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

// ── Agent frontmatter parser ──────────────────────────────────────────────────

function parseAgentFrontmatter(agentsDir) {
  const agents = {};
  if (!fs.existsSync(agentsDir)) return agents;
  for (const f of fs.readdirSync(agentsDir).filter((n) => n.endsWith(".md"))) {
    try {
      const content = fs.readFileSync(path.join(agentsDir, f), "utf8");
      const fm = {};
      if (content.startsWith("---")) {
        const end = content.indexOf("---", 3);
        if (end > 0) {
          for (const line of content.slice(3, end).split("\n")) {
            const [k, ...v] = line.split(":");
            if (k && v.length) fm[k.trim()] = v.join(":").trim();
          }
        }
      }
      const name = fm.name || f.replace(".md", "");
      const skills = (fm.skills || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      agents[name] = { file: f, skills };
    } catch {
      /* ignore */
    }
  }
  return agents;
}

// ── Anti-pattern hits assembly ────────────────────────────────────────────────

function buildAntiPatternHits(mainMetrics, flowEntries, deadPointers, agentDefs) {
  const hits = [];

  for (const entry of flowEntries) {
    const { role, metrics } = entry;

    // ME-0001: Read full vs Grep
    for (const rf of metrics.readFullFiles || []) {
      hits.push({
        id: "ME-0001",
        severity: "med",
        agent: role,
        evidence: `Read without offset/limit on ${rf.file} (${Math.round(rf.sizeBytes / 1024)}KB), turn #${rf.turnIdx}`
      });
    }

    // ME-0002: broad results without confirmation
    for (const br of metrics.broadResults || []) {
      if (br.type === "ME-0002-agent") {
        hits.push({
          id: "ME-0002",
          severity: "high",
          agent: role,
          evidence: `Launched ${br.tool}(${br.subtype}) without preceding ? in turn #${br.turnIdx}`
        });
      } else if (br.lines > BROAD_RESULT_THRESHOLD) {
        hits.push({
          id: "ME-0002",
          severity: "high",
          agent: role,
          evidence: `Glob/Grep result with ${br.lines} lines at turn #${br.turnIdx} — no confirm question before`
        });
      }
    }

    // ME-0003: skill declared but not used
    const declaredSkills = (agentDefs[role] || {}).skills || [];
    for (const sk of declaredSkills) {
      if (sk && !metrics.skillsInvoked.includes(sk)) {
        hits.push({
          id: "ME-0003",
          severity: "low",
          agent: role,
          evidence: `Skill "${sk}" declared in ${role}.md frontmatter but never invoked in this subsession`
        });
      }
    }

    // ME-0004: bug keyword without LE mention
    if (metrics.hasBugKeywords && metrics.appliedLEs.length === 0) {
      hits.push({
        id: "ME-0004",
        severity: "high",
        agent: role,
        evidence: `Bug keywords detected (${metrics.keywords.slice(0, 3).join(", ")}) but no LE-XXXX referenced`
      });
    }

    // ME-0005: H++ claimed without editing knowledge-log
    for (const claim of metrics.hPlusPlusClaims || []) {
      hits.push({
        id: "ME-0005",
        severity: "high",
        agent: role,
        evidence: `H++ claimed at turn #${claim.turnIdx} but docs/wiki/knowledge-log.md not in edited files`
      });
    }

    // ME-0007: procedure compliance per role
    const editCount =
      (metrics.toolCounts["Edit"] || 0) + (metrics.toolCounts["Write"] || 0) + (metrics.toolCounts["MultiEdit"] || 0);
    if (role === "architect" && editCount > 0) {
      hits.push({
        id: "ME-0007",
        severity: "high",
        agent: "architect",
        evidence: `architect made ${editCount} edit/write calls — violates "no escribe código" rule`
      });
    }
    if (role === "reviewer" && editCount > 0) {
      const writesNonReport = metrics.editedFiles.filter((f) => !f.includes("evolve-reports") && !f.includes("state/"));
      if (writesNonReport.length > 0) {
        hits.push({
          id: "ME-0007",
          severity: "high",
          agent: "reviewer",
          evidence: `reviewer edited non-report files: ${writesNonReport.slice(0, 3).join(", ")}`
        });
      }
    }
  }

  // ME-0004 on main thread too
  if (mainMetrics.hasBugKeywords && mainMetrics.appliedLEs.length === 0) {
    hits.push({
      id: "ME-0004",
      severity: "high",
      agent: "main",
      evidence: `Main thread: bug keywords (${mainMetrics.keywords.slice(0, 3).join(", ")}) but no LE-XXXX`
    });
  }

  // ME-0006: dead @-pointers
  for (const dp of deadPointers) {
    hits.push({
      id: "ME-0006",
      severity: "med",
      agent: "static",
      evidence: `${dp.source}:${dp.line} — ${dp.pointer} → "${dp.target}" not found on disk`
    });
  }

  return hits;
}

// ── Auto-detect most recent transcript for the current project ────────────────

function autoDetectTranscript(projectRoot) {
  // Claude Code encodes each separator character individually (no collapsing)
  const encoded = projectRoot.replace(/:/g, "-").replace(/[/\\]/g, "-").replace(/\s/g, "-");
  const home = os.homedir();
  const projectDir = path.join(home, ".claude", "projects", encoded);
  if (!fs.existsSync(projectDir)) return null;
  const files = fs
    .readdirSync(projectDir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ f, mtime: fs.statSync(path.join(projectDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? path.join(projectDir, files[0].f) : null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const projectRoot = process.cwd();
let transcriptPath = process.argv[2];

if (!transcriptPath || transcriptPath === "auto") {
  transcriptPath = autoDetectTranscript(projectRoot);
  if (!transcriptPath) {
    process.stderr.write("No transcript found. Pass explicit path or run from project root.\n");
    process.stdout.write(JSON.stringify({ error: "no_transcript_found" }));
    process.exit(0);
  }
}

if (!fs.existsSync(transcriptPath)) {
  process.stdout.write(JSON.stringify({ error: "transcript_not_found", path: transcriptPath }));
  process.exit(0);
}

const sessionId = path.basename(transcriptPath, ".jsonl");

// Parse main transcript
const mainMetrics = analyzeTranscript(transcriptPath);

// Discover and parse subagents
const subagentFiles = discoverSubagentTranscripts(transcriptPath);
const agentDefs = Object.assign(
  parseAgentFrontmatter(path.join(PLUGIN_ROOT, "agents")),
  parseAgentFrontmatter(path.join(projectRoot, ".claude", "agents"))
);
const subagentCorrelated = correlateSubagents(mainMetrics, subagentFiles);

const flowEntries = subagentCorrelated.map(({ role, file }) => ({
  role,
  subagentFile: file,
  metrics: analyzeTranscript(file)
}));

// Dead pointer check (static scan of .claude/)
const deadPointers = findDeadPointers(projectRoot);

// Assemble anti-pattern hits
const allFlowEntries = [{ role: "main", metrics: mainMetrics }, ...flowEntries];
const antiPatternHits = buildAntiPatternHits(mainMetrics, flowEntries, deadPointers, agentDefs);

// Reconstruct flow order (from subagentTypesLaunched in main)
const flowOrder =
  mainMetrics.subagentTypesLaunched.length > 0 ? mainMetrics.subagentTypesLaunched : flowEntries.map((e) => e.role);

// Token estimate (rough: turns × 800 avg tokens/turn)
const tokenEstimate = (mainMetrics.turnCount + flowEntries.reduce((s, e) => s + e.metrics.turnCount, 0)) * 800;

const output = {
  sessionId,
  transcriptPath,
  flow: [
    {
      role: "main",
      turns: mainMetrics.turnCount,
      tools: mainMetrics.toolCounts,
      skillsInvoked: mainMetrics.skillsInvoked,
      editedFiles: mainMetrics.editedFiles,
      subagentTypesLaunched: mainMetrics.subagentTypesLaunched
    },
    ...flowEntries.map(({ role, subagentFile, metrics }) => ({
      role,
      subagentFile,
      turns: metrics.turnCount,
      tools: metrics.toolCounts,
      skillsInvoked: metrics.skillsInvoked,
      editedFiles: metrics.editedFiles
    }))
  ],
  flowOrder,
  subagentsFound: subagentFiles.length,
  deadPointers: deadPointers.length,
  deadPointerDetails: deadPointers.slice(0, 20),
  antiPatternHits,
  tokenEstimate,
  main: {
    turns: mainMetrics.turnCount,
    tools: mainMetrics.toolCounts,
    editedFiles: mainMetrics.editedFiles,
    bugKeywords: mainMetrics.keywords,
    appliedLEs: mainMetrics.appliedLEs
  }
};

process.stdout.write(JSON.stringify(output, null, 2));
