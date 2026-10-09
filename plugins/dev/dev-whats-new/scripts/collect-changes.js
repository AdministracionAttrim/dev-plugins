#!/usr/bin/env node
"use strict";

/**
 * Recoge de forma determinista lo que entra en una versión: rango de git, versión
 * nueva, commits sin merges con sus ficheros, estadísticas y áreas tocadas. Es la
 * materia prima de /whats-new-release: las cifras y la lista de commits salen de
 * aquí, no del modelo.
 *
 * Uso:
 *   node collect-changes.js [desde] [hasta] [opciones]
 *   node collect-changes.js desde..hasta [opciones]
 *
 *   desde   ref de inicio (excluida). Por defecto: el tag semver más reciente
 *           alcanzable desde "hasta" cuya versión sea menor que la nueva.
 *   hasta   ref final (incluida). Por defecto: HEAD.
 *
 * Opciones:
 *   --cwd=<dir>          repo a analizar (por defecto, el directorio actual).
 *   --version=<x.y.z>    versión nueva; por defecto, "version" del package.json en "hasta".
 *   --package=<ruta>     package.json relativo a la raíz del repo (por defecto package.json).
 *   --format=json|md     salida JSON (por defecto) o resumen markdown legible.
 *   --max-files=<n>      ficheros listados por commit (por defecto 40; el resto se cuenta).
 *   --max-body=<n>       caracteres del cuerpo de cada commit (por defecto 1200).
 *
 * Salida: 0 ok, 2 error de uso o rango indeterminable (p. ej. repo sin tags).
 */

const { execFileSync } = require("child_process");
const path = require("path");

const SEMVER_TAG = /^v?(\d+)\.(\d+)\.(\d+)$/;
const INTERNAL_TYPES = new Set(["chore", "ci", "build", "test", "tests", "docs", "style", "refactor", "perf", "revert", "wip"]);
const VERSION_BUMP = /^(set\s+"?version"?|bump\b|release\b|v?\d+\.\d+\.\d+(-[\w.]+)?$|(version|versión)\s+v?\d+\.\d+)/i;
const INTERNAL_FILE = /(^|\/)(\.github|\.gitlab-ci|\.husky|\.vscode|\.claude|docs?|e2e|scripts|ci)(\/|$)|(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Dockerfile|buildspec\.ya?ml|[^/]*\.md|\.?eslint[^/]*|tsconfig[^/]*\.json|karma\.conf\.js|\.gitignore|\.editorconfig)$|\.spec\.[jt]sx?$|\.test\.[jt]sx?$/i;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { positional: [], cwd: process.cwd(), version: null, pkg: "package.json", format: "json", maxFiles: 40, maxBody: 1200 };
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg.startsWith("--cwd=")) opts.cwd = path.resolve(arg.slice(6));
    else if (arg.startsWith("--version=")) opts.version = arg.slice(10);
    else if (arg.startsWith("--package=")) opts.pkg = arg.slice(10).replace(/\\/g, "/");
    else if (arg.startsWith("--format=")) opts.format = arg.slice(9);
    else if (arg.startsWith("--max-files=")) opts.maxFiles = parseInt(arg.slice(12), 10);
    else if (arg.startsWith("--max-body=")) opts.maxBody = parseInt(arg.slice(11), 10);
    else if (arg.startsWith("--")) throw new UsageError(`Opción desconocida: ${arg}`);
    else opts.positional.push(arg);
  }
  if (!["json", "md"].includes(opts.format)) throw new UsageError(`--format debe ser json o md.`);
  if (!(opts.maxFiles >= 0) || !(opts.maxBody >= 0)) throw new UsageError(`--max-files y --max-body deben ser enteros >= 0.`);

  let [from, to] = opts.positional;
  if (opts.positional.length > 2) throw new UsageError(`Demasiados argumentos: ${opts.positional.join(" ")}`);
  if (from && from.includes("..") && !to) [from, to] = from.split(/\.{2,3}/);
  opts.from = from || null;
  opts.to = to || "HEAD";
  return opts;
}

function git(cwd, args, { allowFail = false } = {}) {
  try {
    return execFileSync("git", ["-c", "core.quotepath=off", "-c", "i18n.logOutputEncoding=UTF-8", ...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    if (allowFail) return null;
    const msg = (e.stderr || e.message || "").toString().trim();
    throw new UsageError(`git ${args.join(" ")} falló: ${msg}`);
  }
}

function resolveCommit(cwd, ref) {
  const sha = git(cwd, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { allowFail: true });
  if (!sha) throw new UsageError(`La ref "${ref}" no existe en este repo (¿falta un git fetch --tags?).`);
  return sha.trim();
}

function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(v || "");
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function compareSemver(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

function readVersion(cwd, opts, toRef) {
  if (opts.version) return { raw: opts.version, source: "--version" };
  const fromRef = git(cwd, ["show", `${toRef}:${opts.pkg}`], { allowFail: true });
  const fromTree = fromRef == null ? safeReadFile(path.join(cwd, opts.pkg)) : null;
  const text = fromRef != null ? fromRef : fromTree;
  if (text == null) return { raw: null, source: null };
  try {
    const raw = JSON.parse(text).version || null;
    return { raw, source: fromRef != null ? `${opts.pkg}@${toRef}` : `${opts.pkg} (working tree)` };
  } catch {
    return { raw: null, source: null };
  }
}

function safeReadFile(p) {
  try {
    return require("fs").readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function findPreviousTag(cwd, toRef, toSha, current) {
  const out = git(cwd, ["tag", "--merged", toRef, "--sort=-v:refname"]);
  const tags = out.split(/\r?\n/).filter((t) => SEMVER_TAG.test(t));
  for (const tag of tags) {
    const tagSha = resolveCommit(cwd, tag);
    if (tagSha === toSha) continue; // "hasta" ya está etiquetado con la versión nueva
    if (current && compareSemver(parseSemver(tag), current) >= 0) continue;
    return tag;
  }
  return null;
}

function hintsFor(subject, files) {
  const conv = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*/.exec(subject);
  const loose = !conv && /^([\p{L}\d][\p{L}\d _.\-›>/]{1,40}?):\s+/u.exec(subject);
  const type = conv ? conv[1].toLowerCase() : null;
  const scope = conv ? conv[2] || null : loose ? loose[1].trim() : null;
  const versionBump = VERSION_BUMP.test(subject.trim());
  const onlyInternalFiles = files.length > 0 && files.every((f) => INTERNAL_FILE.test(f));
  return {
    conventionalType: type,
    scope,
    breaking: Boolean(conv && conv[3]),
    versionBump,
    onlyInternalFiles,
    likelyInternal: versionBump || onlyInternalFiles || (type != null && INTERNAL_TYPES.has(type)),
  };
}

function collectCommits(cwd, range, opts) {
  const fmt = "%x1e%H%x1f%h%x1f%ad%x1f%an%x1f%s%x1f%b%x1d";
  const out = git(cwd, ["log", "--no-merges", "--date=short", `--format=${fmt}`, "--name-only", range]);
  return out
    .split("\x1e")
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const [head, tail = ""] = chunk.split("\x1d");
      const [sha, short, date, author, subject, body = ""] = head.split("\x1f");
      const files = tail.split(/\r?\n/).map((f) => f.trim()).filter(Boolean);
      const cleanBody = body.trim();
      return {
        sha,
        short,
        date,
        author,
        subject,
        body: cleanBody.length > opts.maxBody ? `${cleanBody.slice(0, opts.maxBody)}…` : cleanBody,
        files: files.slice(0, opts.maxFiles),
        filesTotal: files.length,
        hints: hintsFor(subject, files),
        _allFiles: files,
      };
    });
}

function areaOf(file) {
  const parts = file.split("/");
  const depth = parts[0] === "src" && parts[1] === "app" ? 3 : parts[0] === "src" ? 2 : 1;
  return parts.length > depth ? parts.slice(0, depth).join("/") : parts.length > 1 ? parts.slice(0, -1).join("/") : "(raíz)";
}

function computeAreas(commits) {
  const map = new Map();
  for (const c of commits) {
    const touched = new Set(c._allFiles.map(areaOf));
    for (const f of c._allFiles) {
      const a = areaOf(f);
      if (!map.has(a)) map.set(a, { area: a, commits: 0, files: new Set() });
      map.get(a).files.add(f);
    }
    for (const a of touched) map.get(a).commits++;
  }
  return [...map.values()]
    .map((a) => ({ area: a.area, commits: a.commits, files: a.files.size }))
    .sort((x, y) => y.commits - x.commits || y.files - x.files || x.area.localeCompare(y.area));
}

function parseShortstat(text) {
  const num = (re) => Number((re.exec(text || "") || [0, 0])[1]);
  return {
    filesChanged: num(/(\d+) files? changed/),
    insertions: num(/(\d+) insertions?/),
    deletions: num(/(\d+) deletions?/),
  };
}

function collect(opts) {
  const cwd = git(opts.cwd, ["rev-parse", "--show-toplevel"]).trim();
  const toSha = resolveCommit(cwd, opts.to);
  const version = readVersion(cwd, opts, opts.to);
  const current = parseSemver(version.raw);

  let fromRef = opts.from;
  let fromSource = "argumento";
  if (!fromRef) {
    fromRef = findPreviousTag(cwd, opts.to, toSha, current);
    fromSource = "último tag";
    if (!fromRef) {
      throw new UsageError(
        `No hay ningún tag semver anterior alcanzable desde ${opts.to}${current ? ` (versión nueva ${current.join(".")})` : ""}. ` +
          `Indica el rango a mano: collect-changes.js <desde> [hasta] (p. ej. un sha, una rama o "origin/master").`
      );
    }
  }
  const fromSha = resolveCommit(cwd, fromRef);
  const range = `${fromSha}..${toSha}`;

  const commits = collectCommits(cwd, range, opts);
  const merges = Number(git(cwd, ["rev-list", "--count", "--merges", range]).trim());
  const stat = parseShortstat(git(cwd, ["diff", "--shortstat", fromSha, toSha]));
  const branch = git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"], { allowFail: true });
  const prev = SEMVER_TAG.test(fromRef) ? fromRef.replace(/^v/, "") : null;

  return {
    repo: { root: cwd, branch: branch ? branch.trim() : null },
    range: { from: fromRef, fromSha, fromSource, to: opts.to, toSha },
    version: {
      next: current ? current.join(".") : null,
      raw: version.raw,
      source: version.source,
      previous: prev,
    },
    stats: {
      commits: commits.length,
      mergesExcluded: merges,
      likelyInternal: commits.filter((c) => c.hints.likelyInternal).length,
      ...stat,
    },
    areas: computeAreas(commits),
    commits: commits.map(({ _allFiles, ...c }) => c),
  };
}

function toMarkdown(r) {
  const lines = [];
  lines.push(`# Cambios ${r.range.from}..${r.range.to}`);
  lines.push("");
  lines.push(`- Versión nueva: **${r.version.next || "desconocida"}**${r.version.raw && r.version.raw !== r.version.next ? ` (${r.version.raw})` : ""} — fuente: ${r.version.source || "n/d"}`);
  lines.push(`- Versión anterior: ${r.version.previous || "n/d"} (desde: ${r.range.fromSource})`);
  lines.push(`- Commits sin merges: ${r.stats.commits} (merges excluidos: ${r.stats.mergesExcluded}; probablemente internos: ${r.stats.likelyInternal})`);
  lines.push(`- Ficheros: ${r.stats.filesChanged} (+${r.stats.insertions} / -${r.stats.deletions})`);
  lines.push("");
  lines.push("## Áreas");
  lines.push("");
  for (const a of r.areas.slice(0, 15)) lines.push(`- \`${a.area}\` — ${a.commits} commit(s), ${a.files} fichero(s)`);
  lines.push("");
  lines.push("## Commits");
  lines.push("");
  for (const c of r.commits) {
    const tag = c.hints.likelyInternal ? " _(interno?)_" : "";
    lines.push(`- \`${c.short}\` ${c.date} — ${c.subject}${tag} (${c.filesTotal} fich.)`);
  }
  return lines.join("\n");
}

function main() {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
      console.log("Uso: node collect-changes.js [desde] [hasta] [--cwd=<dir>] [--version=<x.y.z>] [--package=<ruta>] [--format=json|md] [--max-files=<n>] [--max-body=<n>]");
      return;
    }
    const result = collect(opts);
    process.stdout.write(opts.format === "md" ? `${toMarkdown(result)}\n` : `${JSON.stringify(result, null, 2)}\n`);
  } catch (e) {
    if (e instanceof UsageError) {
      console.error(e.message);
      process.exit(2);
    }
    throw e;
  }
}

main();
