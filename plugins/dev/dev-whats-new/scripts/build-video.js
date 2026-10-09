#!/usr/bin/env node
"use strict";

/**
 * Monta el vídeo de una novedad a partir de capturas reales de la app y un guion
 * de cámara: zoom a la zona, cursor que se mueve y hace clic, fundido entre el
 * "antes" y el "después" y resaltado del resultado. Genera una composición
 * HyperFrames (HTML + GSAP), la renderiza a MP4 en bucle y saca un póster (el
 * fotograma del resultado) y una hoja de fotogramas para revisarlo.
 *
 * Uso:
 *   node build-video.js <video.json> --out=<fichero.mp4> [opciones]
 *
 * Opciones:
 *   --poster=<ruta.webp>   póster (por defecto, junto al MP4 con extensión .webp)
 *   --sheet=<ruta.png>     hoja con 6 fotogramas del vídeo final, para revisar
 *   --project=<dir>        conserva la composición HyperFrames generada ahí
 *   --crf=<n>              calidad H.264 (por defecto 28; menos = más calidad y peso)
 *   --check                valida el guion y sale, sin renderizar
 *
 * Formato del guion: skills/whats-new/video.md. Salida: 0 ok, 1 guion inválido, 2 uso o herramientas.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { ensureTools, hyperframes, ffmpeg, ToolError } = require("./lib/video-tools");

const DEFAULTS = { fps: 30, size: [1280, 720], duration: 8, accent: "#3b63f0", outro: 0.8 };
const MAX_MB = 1.5;
// Nombres de capturas y cajas: acaban en ids, selectores y rutas de fichero.
const NAME = /^[a-z0-9][a-z0-9_-]*$/i;
// El acento se concatena con canal alfa (#rrggbbaa) en el CSS: solo #rrggbb.
const HEX6 = /^#[0-9a-f]{6}$/i;
const EASE = /^[a-z0-9.()]+$/i;

class ScriptError extends Error {}

function parseArgs(argv) {
  const opts = { spec: null, out: null, poster: null, sheet: null, project: null, crf: 28, check: false };
  for (const arg of argv) {
    if (arg === "--check") opts.check = true;
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg.startsWith("--out=")) opts.out = path.resolve(arg.slice(6));
    else if (arg.startsWith("--poster=")) opts.poster = path.resolve(arg.slice(9));
    else if (arg.startsWith("--sheet=")) opts.sheet = path.resolve(arg.slice(8));
    else if (arg.startsWith("--project=")) opts.project = path.resolve(arg.slice(10));
    else if (arg.startsWith("--crf=")) opts.crf = Number(arg.slice(6));
    else if (arg.startsWith("--")) throw new ToolError(`Opción desconocida: ${arg}`);
    else if (!opts.spec) opts.spec = path.resolve(arg);
    else throw new ToolError(`Argumento de más: ${arg}`);
  }
  if (!(Number.isInteger(opts.crf) && opts.crf >= 0 && opts.crf <= 51)) throw new ToolError(`--crf: entero entre 0 y 51.`);
  if (opts.out && !/\.mp4$/i.test(opts.out)) throw new ToolError(`--out: el vídeo se genera en MP4; usa una ruta .mp4.`);
  return opts;
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  } catch (e) {
    throw new ToolError(`No se puede leer ${label} (${file}): ${e.message}`);
  }
}

const r2 = (n) => Math.round(n * 100) / 100;

/** Une el guion con el manifiesto de capture-ui.js (capturas, cajas y viewport). */
function loadScript(specPath) {
  const spec = readJson(specPath, "el guion");
  const base = path.dirname(specPath);
  let shots = {};
  let boxes = {};
  let viewport = spec.viewport;

  if (spec.capture) {
    const manifestPath = path.resolve(base, spec.capture);
    const manifest = readJson(manifestPath, "el manifiesto de capturas");
    const mBase = path.dirname(manifestPath);
    for (const [name, file] of Object.entries(manifest.shots || {})) shots[name] = path.resolve(mBase, file);
    boxes = { ...(manifest.boxes || {}) };
    viewport = viewport || manifest.viewport;
  }
  for (const [name, file] of Object.entries(spec.shots || {})) shots[name] = path.resolve(base, file);
  boxes = { ...boxes, ...(spec.boxes || {}) };

  if (!viewport || !(viewport.width > 0) || !(viewport.height > 0)) throw new ScriptError(`viewport: falta {width, height} (o un "capture" con manifiesto).`);
  if (Object.keys(shots).length === 0) throw new ScriptError(`shots: no hay capturas (usa "capture" o "shots").`);
  for (const name of [...Object.keys(shots), ...Object.keys(boxes)]) {
    if (!NAME.test(name)) throw new ScriptError(`"${name}": los nombres de capturas y cajas solo admiten letras, números, "-" y "_".`);
  }
  if (spec.accent != null && !HEX6.test(spec.accent)) throw new ScriptError(`accent: color en formato #rrggbb.`);
  for (const [name, file] of Object.entries(shots)) if (!fs.existsSync(file)) throw new ScriptError(`shots.${name}: no existe ${file}.`);

  const duration = spec.duration ?? DEFAULTS.duration;
  if (!(duration >= 3 && duration <= 15)) throw new ScriptError(`duration: entre 3 y 15 segundos.`);
  const [W, H] = spec.size ?? DEFAULTS.size;
  if (!(W >= 320 && H >= 180 && W <= 1920 && H <= 1080)) throw new ScriptError(`size: [ancho, alto] entre 320x180 y 1920x1080.`);
  const ratio = W / H / (viewport.width / viewport.height);
  const warnings = [];
  if (Math.abs(ratio - 1) > 0.02) warnings.push(`Las capturas (${viewport.width}x${viewport.height}) no tienen la proporción del vídeo (${W}x${H}); se recortarán los bordes en el plano general.`);

  if (spec.posterAt != null && !(typeof spec.posterAt === "number" && spec.posterAt >= 0 && spec.posterAt < duration)) {
    throw new ScriptError(`posterAt: segundo entre 0 y ${duration}.`);
  }
  const steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (steps.length === 0) throw new ScriptError(`steps: al menos un paso.`);
  const limit = duration - DEFAULTS.outro;
  steps.forEach((s, i) => {
    if (typeof s.at !== "number" || s.at < 0 || s.at >= limit) throw new ScriptError(`steps[${i}].at: número entre 0 y ${r2(limit)} (los últimos ${DEFAULTS.outro}s son el cierre del bucle).`);
    if (i > 0 && s.at < steps[i - 1].at) throw new ScriptError(`steps: los "at" deben ir en orden creciente (steps[${i}]).`);
    const kinds = ["show", "zoom", "cursor", "click", "highlight", "hideCursor"].filter((k) => k in s);
    if (kinds.length !== 1) throw new ScriptError(`steps[${i}]: cada paso hace una sola cosa (show, zoom, cursor, click, highlight o hideCursor).`);
    for (const key of ["dur", "scale", "padding"]) {
      if (key in s && !(typeof s[key] === "number" && s[key] > 0)) throw new ScriptError(`steps[${i}].${key}: número mayor que 0.`);
    }
    for (const key of ["dx", "dy"]) {
      if (key in s && !(typeof s[key] === "number" && s[key] >= 0 && s[key] <= 1)) throw new ScriptError(`steps[${i}].${key}: número entre 0 y 1.`);
    }
    if (s.ease != null && !EASE.test(s.ease)) throw new ScriptError(`steps[${i}].ease: nombre de easing de GSAP (p. ej. "power2.inOut").`);
    if (s.show && !shots[s.show]) throw new ScriptError(`steps[${i}].show: no hay captura "${s.show}" (hay: ${Object.keys(shots).join(", ")}).`);
    for (const key of ["zoom", "cursor", "highlight"]) {
      if (key in s && !(key === "zoom" && s[key] === "full")) resolveBox(s[key], boxes, `steps[${i}].${key}`, viewport);
    }
    const end = s.at + (s.dur ?? 0);
    if (end > limit + 0.01) warnings.push(`steps[${i}] termina en ${r2(end)}s, ya dentro del cierre del bucle (${r2(limit)}s).`);
  });
  if (!steps.some((s) => s.show) || steps[0].show == null) warnings.push(`El primer paso no es "show": se usará la primera captura (${Object.keys(shots)[0]}).`);

  return { spec, shots, boxes, viewport, duration, W, H, steps, warnings, accent: spec.accent || DEFAULTS.accent, fps: spec.fps ?? DEFAULTS.fps };
}

function resolveBox(target, boxes, where, viewport) {
  const box = typeof target === "string" ? boxes[target] : target;
  if (!box) throw new ScriptError(`${where}: no hay caja "${target}" (hay: ${Object.keys(boxes).join(", ") || "ninguna"}).`);
  for (const k of ["x", "y", "w", "h"]) if (typeof box[k] !== "number") throw new ScriptError(`${where}: la caja necesita x, y, w, h numéricos.`);
  if (box.x < 0 || box.y < 0 || box.x + box.w > viewport.width + 1 || box.y + box.h > viewport.height + 1) {
    throw new ScriptError(`${where}: la caja (${box.x},${box.y} ${box.w}x${box.h}) se sale de la captura (${viewport.width}x${viewport.height}); captura el elemento visible en pantalla.`);
  }
  return box;
}

/** Genera la composición HyperFrames. */
function compose(sc, gsapCode, assetNames) {
  const { W, H, viewport: vp, duration, steps, boxes, accent } = sc;
  const base = Math.max(W / vp.width, H / vp.height);
  const camera = (target, scale) => {
    if (target === "full") return { x: r2((W - vp.width * base) / 2), y: r2((H - vp.height * base) / 2), scale: r2(base), rel: 1 };
    const b = resolveBox(target, boxes, "zoom", vp);
    // Nunca más zoom del que deja ver la caja entera con un 12 % de margen.
    const fit = Math.min((W * 0.88) / (b.w * base), (H * 0.88) / (b.h * base));
    scale = Math.max(1, Math.min(scale, fit));
    const s = base * scale;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    return {
      x: r2(clamp(W / 2 - cx * s, W - vp.width * s, 0)),
      y: r2(clamp(H / 2 - cy * s, H - vp.height * s, 0)),
      scale: r2(s),
      rel: scale,
    };
  };

  const shotNames = Object.keys(sc.shots);
  const first = steps[0].show || shotNames[0];
  const full = camera("full");
  const lines = [];
  const T = (n) => r2(n);
  const ease = "power2.inOut";

  // Estado inicial
  lines.push(`tl.set("#stage", { x: ${full.x}, y: ${full.y}, scale: ${full.scale} }, 0);`);
  shotNames.forEach((n) => lines.push(`tl.set("#shot-${n}", { opacity: ${n === first ? 1 : 0}, zIndex: ${n === first ? 1 : 0} }, 0);`));
  lines.push(`tl.set("#cursor", { opacity: 0 }, 0);`);
  lines.push(`tl.set("#cursor-size", { scale: 1 }, 0);`);

  // Fundido sin oscurecer: la captura que entra aparece encima y la que sale sigue
  // opaca debajo hasta que la nueva la tapa del todo.
  let current = first;
  let z = 1;
  const crossfade = (to, at, dur) => {
    if (to === current) return [];
    const out = [
      `tl.set("#shot-${to}", { zIndex: ${++z}, opacity: 0 }, ${at});`,
      `tl.to("#shot-${to}", { opacity: 1, duration: ${dur}, ease: "none" }, ${at});`,
      `tl.set("#shot-${current}", { opacity: 0 }, ${T(at + dur)});`,
    ];
    current = to;
    return out;
  };

  let cursor = null; // {x, y} en px de la captura
  let rel = 1;
  let hl = 0;
  steps.forEach((s) => {
    const at = T(s.at);
    if (s.show) {
      const dur = s.dur ?? 0.35;
      lines.push(...crossfade(s.show, at, dur));
    } else if ("zoom" in s) {
      const dur = s.dur ?? 1.0;
      const c = camera(s.zoom, s.zoom === "full" ? 1 : s.scale ?? 2);
      rel = c.rel;
      lines.push(`tl.to("#stage", { x: ${c.x}, y: ${c.y}, scale: ${c.scale}, duration: ${dur}, ease: "${s.ease || ease}" }, ${at});`);
      lines.push(`tl.to("#cursor-size", { scale: ${r2(1 / rel)}, duration: ${dur}, ease: "${s.ease || ease}" }, ${at});`);
    } else if ("cursor" in s) {
      const b = resolveBox(s.cursor, boxes, "cursor", vp);
      const tx = r2(b.x + b.w * (s.dx ?? 0.5));
      const ty = r2(b.y + b.h * (s.dy ?? 0.5));
      const dur = s.dur ?? 0.8;
      if (!cursor) {
        const sx = r2(Math.min(vp.width - 20, tx + vp.width * 0.12));
        const sy = r2(Math.min(vp.height - 20, ty + vp.height * 0.14));
        lines.push(`tl.set("#cursor", { x: ${sx}, y: ${sy} }, ${at});`);
        lines.push(`tl.to("#cursor", { opacity: 1, duration: 0.2, ease: "none" }, ${at});`);
      }
      lines.push(`tl.to("#cursor", { x: ${tx}, y: ${ty}, duration: ${dur}, ease: "power3.inOut" }, ${at});`);
      cursor = { x: tx, y: ty };
    } else if ("click" in s) {
      if (!cursor) throw new ScriptError(`click en ${s.at}s sin un paso "cursor" previo.`);
      lines.push(`tl.set("#ripple", { x: ${cursor.x}, y: ${cursor.y}, scale: 0.2, opacity: 0.55 }, ${at});`);
      lines.push(`tl.to("#ripple", { scale: ${r2(1.6 / rel)}, opacity: 0, duration: 0.5, ease: "power2.out" }, ${at});`);
      lines.push(`tl.to("#cursor-press", { scale: 0.82, duration: 0.09, ease: "power1.in" }, ${at});`);
      lines.push(`tl.to("#cursor-press", { scale: 1, duration: 0.16, ease: "power1.out" }, ${T(s.at + 0.09)});`);
    } else if ("highlight" in s) {
      const b = resolveBox(s.highlight, boxes, "highlight", vp);
      const pad = s.padding ?? 6;
      const id = `hl${hl++}`;
      const dur = s.dur ?? 1.6;
      lines.push(`tl.set("#${id}", { x: ${r2(b.x - pad)}, y: ${r2(b.y - pad)}, width: ${r2(b.w + pad * 2)}, height: ${r2(b.h + pad * 2)}, opacity: 0, scale: 1.06 }, 0);`);
      lines.push(`tl.to("#${id}", { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, ${at});`);
      lines.push(`tl.to("#${id}", { opacity: 0, duration: 0.3, ease: "none" }, ${T(s.at + dur)});`);
    } else if ("hideCursor" in s) {
      lines.push(`tl.to("#cursor", { opacity: 0, duration: 0.25, ease: "none" }, ${at});`);
    }
  });

  // Cierre del bucle: vuelve al plano general y a la primera captura.
  const o = T(duration - DEFAULTS.outro);
  const od = T(DEFAULTS.outro - 0.15);
  lines.push(`tl.to("#stage", { x: ${full.x}, y: ${full.y}, scale: ${full.scale}, duration: ${od}, ease: "${ease}" }, ${o});`);
  lines.push(`tl.to("#cursor", { opacity: 0, duration: 0.25, ease: "none" }, ${o});`);
  lines.push(...crossfade(first, o, od));

  const highlights = Array.from({ length: hl }, (_, i) => `<div id="hl${i}" class="hl"></div>`).join("");
  const imgs = shotNames.map((n) => `<img id="shot-${n}" class="shot" src="assets/${assetNames[n]}" alt="">`).join("");
  const cursorSize = r2(24 / base);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${W}, height=${H}">
<title>${String(sc.spec.title || "whats-new").replace(/</g, "&lt;")}</title>
<script>${gsapCode}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#0d1117}
#root{position:relative;width:${W}px;height:${H}px;overflow:hidden}
#stage{position:absolute;left:0;top:0;width:${vp.width}px;height:${vp.height}px;transform-origin:0 0}
.shot{position:absolute;inset:0;width:${vp.width}px;height:${vp.height}px;display:block}
.hl{position:absolute;left:0;top:0;z-index:50;border-radius:10px;border:3px solid ${accent};box-shadow:0 0 0 6px ${accent}33,0 10px 30px ${accent}55;transform-origin:center}
#ripple{position:absolute;z-index:60;left:-28px;top:-28px;width:56px;height:56px;border-radius:50%;background:${accent};opacity:0;transform-origin:center}
#cursor{position:absolute;z-index:70;left:0;top:0;width:0;height:0}
#cursor-size,#cursor-press{position:absolute;left:0;top:0;transform-origin:0 0}
#cursor svg{display:block;width:${cursorSize}px;height:${r2(cursorSize * 1.33)}px;filter:drop-shadow(0 ${r2(2 / base)}px ${r2(3 / base)}px rgba(0,0,0,.35))}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="${W}" data-height="${H}" data-fps="${sc.fps}">
  <div id="stage" class="clip" data-start="0" data-duration="${duration}">
    ${imgs}
    ${highlights}
    <div id="ripple"></div>
    <div id="cursor"><div id="cursor-size"><div id="cursor-press"><svg viewBox="0 0 18 24" aria-hidden="true"><path d="M1 1v19.5l5.2-5 3.5 7.6 3.4-1.5-3.5-7.5H17z" fill="#111827" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div></div></div>
  </div>
</div>
<script>
const tl = gsap.timeline({ paused: true });
${lines.join("\n")}
tl.set({}, {}, ${duration});
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
`;
}

function posterTime(sc) {
  if (typeof sc.spec.posterAt === "number") return sc.spec.posterAt;
  // El resultado: justo antes del cierre del bucle.
  return Math.max(0, sc.duration - DEFAULTS.outro - 0.3);
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (opts.help || !opts.spec || (!opts.out && !opts.check)) {
    console.error("Uso: node build-video.js <video.json> --out=<fichero.mp4> [--poster=<.webp>] [--sheet=<.png>] [--project=<dir>] [--crf=<n>] [--check]");
    process.exit(opts && opts.help ? 0 : 2);
  }

  let sc;
  try {
    sc = loadScript(opts.spec);
  } catch (e) {
    console.error(`${opts.spec}: ${e.message}`);
    process.exit(e instanceof ScriptError ? 1 : 2);
  }
  sc.warnings.forEach((w) => console.warn(`  aviso: ${w}`));
  if (opts.check) {
    console.log(`${opts.spec}: guion válido (${sc.steps.length} pasos, ${sc.duration}s).`);
    return;
  }

  let project = null;
  try {
    const tools = ensureTools({ log: (m) => console.log(m) });
    project = opts.project || fs.mkdtempSync(path.join(os.tmpdir(), "whats-new-video-"));
    fs.mkdirSync(path.join(project, "assets"), { recursive: true });
    const assetNames = {};
    for (const [name, file] of Object.entries(sc.shots)) {
      assetNames[name] = `${name}${path.extname(file).toLowerCase()}`;
      fs.copyFileSync(file, path.join(project, "assets", assetNames[name]));
    }
    let html;
    try {
      html = compose(sc, fs.readFileSync(tools.gsapFile, "utf8"), assetNames);
    } catch (e) {
      if (e instanceof ScriptError) {
        console.error(`${opts.spec}: ${e.message}`);
        process.exitCode = 1;
        return;
      }
      throw e;
    }
    fs.writeFileSync(path.join(project, "index.html"), html);

    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    console.log(`Renderizando ${sc.duration}s a ${sc.W}x${sc.H}…`);
    hyperframes(tools, ["render", project, "-o", opts.out, "--fps", String(sc.fps), "--crf", String(opts.crf), "--quiet", "--video-frame-format", "png"], { cwd: project });

    const poster = opts.poster || opts.out.replace(/\.[^.]+$/, ".webp");
    ffmpeg(["-ss", String(posterTime(sc)), "-i", opts.out, "-frames:v", "1", "-c:v", "libwebp", "-quality", "85", poster]);
    if (opts.sheet) {
      const every = sc.duration / 6;
      ffmpeg(["-i", opts.out, "-vf", `fps=1/${r2(every)},scale=480:-1,tile=3x2:padding=6:color=white`, "-frames:v", "1", opts.sheet]);
    }

    const mb = fs.statSync(opts.out).size / 1024 / 1024;
    const kb = fs.statSync(poster).size / 1024;
    console.log(`${opts.out}: ${mb.toFixed(2)} MB${mb > MAX_MB ? ` (aviso: más de ${MAX_MB} MB; sube --crf o acorta)` : ""}`);
    console.log(`${poster}: ${kb.toFixed(0)} KB (póster, t=${r2(posterTime(sc))}s)`);
    if (opts.sheet) console.log(`${opts.sheet}: hoja de fotogramas`);
  } catch (e) {
    if (e instanceof ToolError) {
      console.error(e.message);
      process.exitCode = 2;
      return;
    }
    throw e;
  } finally {
    if (project && !opts.project) fs.rmSync(project, { recursive: true, force: true });
  }
}

main();
