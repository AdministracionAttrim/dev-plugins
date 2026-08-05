#!/usr/bin/env node
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const data = JSON.parse(input);
  const modelId = data.model?.id || "";
  const modelName = data.model?.display_name || "";
  const cwd = data.workspace?.current_dir || data.cwd || process.cwd();
  const ctxPct = Math.floor(data.context_window?.used_percentage || 0);
  const fivePct = Math.floor(data.rate_limits?.five_hour?.used_percentage || 0);
  const sevenPct = Math.floor(
    data.rate_limits?.seven_day?.used_percentage || 0,
  );

  const R = "\x1b[0m";
  const B = "\x1b[1m";
  const fWHITE = "\x1b[97m";
  const fGREEN = "\x1b[92m";
  const fYELLOW = "\x1b[93m";
  const fRED = "\x1b[91m";
  const fCYAN = "\x1b[96m";
  const fGOLD = "\x1b[38;5;220m";
  const fORANGE = "\x1b[38;5;214m";
  const fMAGENTA = "\x1b[38;5;201m";
  const fBCYAN = "\x1b[38;5;51m";
  const bgGOLD = "\x1b[48;5;214m";
  const bgORG = "\x1b[48;5;130m";
  const bgMAG = "\x1b[48;5;90m";
  const bgCYAN = "\x1b[48;5;23m";
  const bgGRAY = "\x1b[48;5;236m";
  const SEP = "\x1b[2m\x1b[97m ❙ \x1b[0m";

  const modelLower = `${modelId} ${modelName}`.toLowerCase();
  let MODEL_LABEL;
  if (
    modelLower.includes("opusplan") ||
    (modelLower.includes("opus") &&
      (modelLower.includes("plan") ||
        modelLower.includes("max") ||
        modelLower.includes("ultra")))
  ) {
    MODEL_LABEL = `${B}\x1b[30m${bgGOLD}◀ 🧠✨ ${modelName} ▶${R}${B}${fGOLD}★${R}`;
  } else if (modelLower.includes("opus")) {
    MODEL_LABEL = `${B}${fGOLD}${bgORG} 🟣 ${modelName} ${R}`;
  } else if (modelLower.includes("sonnet")) {
    MODEL_LABEL = `${B}${fWHITE}${bgMAG} 🤖 ${modelName} ${R}`;
  } else if (modelLower.includes("haiku")) {
    MODEL_LABEL = `${B}\x1b[30m${bgCYAN} ⚡ ${modelName} ${R}`;
  } else {
    MODEL_LABEL = `${B}${fWHITE}${bgGRAY} ${modelName} ${R}`;
  }

  const project = path.basename(cwd);
  const PROJECT_BLOCK = `${fBCYAN}📁${R} ${B}${fWHITE}${project}${R}`;

  let BRANCH_BLOCK = "";
  try {
    const branch = execSync(`git -C "${cwd}" rev-parse --abbrev-ref HEAD`, {
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
    if (branch)
      BRANCH_BLOCK = `${fGREEN}🌿${R} ${B}${fWHITE}${branch}${R} ${B}${fYELLOW}★${R}`;
  } catch {}

  const bar = (pct, width = 8) => {
    const filled = Math.floor((pct * width) / 100);
    const color = pct >= 80 ? fRED : pct >= 60 ? fYELLOW : fGREEN;
    return color + "█".repeat(filled) + "\x1b[2m░".repeat(width - filled) + R;
  };
  const pctColor = (pct) => {
    const p = Math.floor(pct);
    return p >= 80
      ? `${B}${fRED}`
      : p >= 60
        ? `${B}${fYELLOW}`
        : `${B}${fGREEN}`;
  };

  const CTX_BLOCK = `🧠${R} ${bar(ctxPct)} ${pctColor(ctxPct)}${ctxPct}%${R}`;
  const FIVE_BLOCK = `⏳${R} 5h ${bar(fivePct, 6)} ${pctColor(fivePct)}${fivePct}%${R}`;
  const SEVEN_BLOCK = `📅${R} 7d ${bar(sevenPct, 6)} ${pctColor(sevenPct)}${sevenPct}%${R}`;

  let line = MODEL_LABEL + SEP + PROJECT_BLOCK;
  if (BRANCH_BLOCK) line += SEP + BRANCH_BLOCK;
  line += SEP + CTX_BLOCK + SEP + FIVE_BLOCK + SEP + SEVEN_BLOCK;
  console.log(line);
});
