"use strict";

/**
 * Herramientas de vídeo compartidas por capture-ui.js y build-video.js.
 *
 * HyperFrames (render HTML → MP4) cambia casi a diario, así que se fija una versión
 * probada y se instala aparte, en una caché del usuario, nunca en el proyecto:
 *   ~/.cache/dev-whats-new/video-tools-<versión>/
 * Se lanza siempre sin telemetría, sin instalar skills y sin análisis con IA externa.
 */

const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");

const HYPERFRAMES_VERSION = "0.8.74";
const GSAP_VERSION = "3.14.2";

const TOOLS_DIR = path.join(
  process.env.DEV_WHATS_NEW_CACHE || path.join(os.homedir(), ".cache", "dev-whats-new"),
  `video-tools-hf${HYPERFRAMES_VERSION}-gsap${GSAP_VERSION}`,
);

const QUIET_ENV = {
  HYPERFRAMES_NO_TELEMETRY: "1",
  DO_NOT_TRACK: "1",
  HYPERFRAMES_SKIP_SKILLS: "1",
  GEMINI_API_KEY: "",
  GOOGLE_API_KEY: "",
};

class ToolError extends Error {}

function hasFfmpeg() {
  return spawnSync("ffmpeg", ["-version"], { stdio: "ignore", shell: false }).status === 0;
}

function checkNode() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) throw new ToolError(`HyperFrames necesita Node.js >= 22 (tienes ${process.versions.node}).`);
}

/** Instala (una vez) HyperFrames y GSAP fijados en la caché y devuelve sus rutas. */
function ensureTools({ log = () => {} } = {}) {
  checkNode();
  if (!hasFfmpeg()) throw new ToolError("No se encuentra ffmpeg en el PATH. Instálalo (winget install Gyan.FFmpeg, brew install ffmpeg, apt install ffmpeg).");

  const marker = path.join(TOOLS_DIR, ".ready");
  if (!fs.existsSync(marker)) {
    log(`Instalando hyperframes@${HYPERFRAMES_VERSION} y gsap@${GSAP_VERSION} en ${TOOLS_DIR} (solo la primera vez)…`);
    fs.mkdirSync(TOOLS_DIR, { recursive: true });
    fs.writeFileSync(path.join(TOOLS_DIR, "package.json"), JSON.stringify({ name: "dev-whats-new-video-tools", private: true }, null, 2));
    // Una sola cadena con shell: en Windows npm es un .cmd. Las versiones son constantes de este fichero.
    const res = spawnSync(`npm install --no-audit --no-fund --loglevel=error hyperframes@${HYPERFRAMES_VERSION} gsap@${GSAP_VERSION}`, {
      cwd: TOOLS_DIR,
      stdio: ["ignore", "inherit", "inherit"],
      shell: true,
    });
    if (res.status !== 0) throw new ToolError(`npm install falló en ${TOOLS_DIR}.`);
    fs.writeFileSync(marker, new Date().toISOString());
  }

  const req = createRequire(path.join(TOOLS_DIR, "package.json"));
  return {
    dir: TOOLS_DIR,
    hyperframesBin: path.join(TOOLS_DIR, "node_modules", "hyperframes", "bin", "hyperframes.mjs"),
    gsapFile: path.join(TOOLS_DIR, "node_modules", "gsap", "dist", "gsap.min.js"),
    requirePuppeteer: () => req("puppeteer-core"),
  };
}

/** Ejecuta la CLI de HyperFrames fijada, sin telemetría ni skills. */
function hyperframes(tools, args, { cwd, quiet = false } = {}) {
  const res = spawnSync(process.execPath, [tools.hyperframesBin, ...args], {
    cwd,
    env: { ...process.env, ...QUIET_ENV, FORCE_COLOR: "0", NO_COLOR: "1" },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  if (res.status !== 0) throw new ToolError(`hyperframes ${args[0]} falló (código ${res.status}):\n${out.trim().split(/\r?\n/).slice(-25).join("\n")}`);
  if (!quiet) return out;
  return "";
}

/** Ruta del Chrome que usa HyperFrames (el del sistema o uno descargado). */
function chromePath(tools) {
  const out = hyperframes(tools, ["browser", "path"]).trim().split(/\r?\n/).pop().trim();
  if (!out || !fs.existsSync(out)) {
    hyperframes(tools, ["browser", "ensure"]);
    return hyperframes(tools, ["browser", "path"]).trim().split(/\r?\n/).pop().trim();
  }
  return out;
}

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
}

module.exports = { ensureTools, hyperframes, chromePath, ffmpeg, ToolError, HYPERFRAMES_VERSION, GSAP_VERSION, TOOLS_DIR };
