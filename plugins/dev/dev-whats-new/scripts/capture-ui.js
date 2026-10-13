#!/usr/bin/env node
"use strict";

/**
 * Captura pantallas reales de la app (en local, con datos de prueba) para el vídeo
 * de una novedad. Ejecuta los pasos de un guion de captura en un Chrome headless:
 * navegar, iniciar sesión, rellenar, pulsar, esperar, ocultar o desenfocar zonas,
 * guardar capturas ("antes", "después"…) y medir cajas de elementos para que el
 * vídeo pueda hacer zoom, mover el cursor o resaltar exactamente ahí.
 *
 * Uso:
 *   node capture-ui.js <capture.json> --out=<dir> [--env-file=<ruta>] [--headful]
 *
 * Los valores con ${VARIABLE} se sustituyen desde el entorno o desde --env-file
 * (por defecto .env.whats-new en el directorio actual). Los pasos con "secret": true
 * nunca se imprimen. Formato del guion: skills/whats-new/video.md.
 *
 * Salida en <dir>: <nombre>.png por captura y manifest.json con viewport, escala,
 * capturas y cajas. Si un paso falla, deja error.png con la pantalla en ese momento.
 * Código de salida: 0 ok, 1 paso fallido, 2 uso o herramientas.
 */

const fs = require("fs");
const path = require("path");
const { ensureTools, chromePath, ToolError } = require("./lib/video-tools");

// Nombres de capturas y cajas: acaban en nombres de fichero y en el manifiesto.
const NAME = /^[a-z0-9][a-z0-9_-]*$/i;

const FREEZE_CSS = `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}`;

function parseArgs(argv) {
  const opts = { spec: null, out: null, envFile: ".env.whats-new", headful: false };
  for (const arg of argv) {
    if (arg === "--headful") opts.headful = true;
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg.startsWith("--out=")) opts.out = path.resolve(arg.slice(6));
    else if (arg.startsWith("--env-file=")) opts.envFile = arg.slice(11);
    else if (arg.startsWith("--")) throw new ToolError(`Opción desconocida: ${arg}`);
    else if (!opts.spec) opts.spec = path.resolve(arg);
    else throw new ToolError(`Argumento de más: ${arg}`);
  }
  return opts;
}

function loadEnvFile(file) {
  const env = {};
  if (!file || !fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith("#")) continue;
    env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}

function substitute(value, env, where) {
  return String(value).replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => {
    const v = process.env[name] ?? env[name];
    if (v == null || v === "") throw new ToolError(`${where}: falta la variable ${name} (en el entorno o en el fichero .env indicado).`);
    return v;
  });
}

function describe(step) {
  const kind = Object.keys(step).find((k) => !["secret", "selector", "value", "timeout", "name"].includes(k)) || "?";
  if (step.secret) return `${kind} ${step[kind] === true ? "" : step[kind]} = ***`;
  return `${kind} ${typeof step[kind] === "string" ? step[kind] : JSON.stringify(step[kind])}`;
}

async function run(opts) {
  const spec = JSON.parse(fs.readFileSync(opts.spec, "utf8").replace(/^\uFEFF/, ""));
  const env = loadEnvFile(opts.envFile);
  const viewport = { width: spec.viewport?.width ?? 1600, height: spec.viewport?.height ?? 900 };
  const scale = spec.scale ?? 2;
  if (!spec.baseUrl) throw new ToolError(`baseUrl: falta la URL de la app (p. ej. http://localhost:4200).`);
  if (!Array.isArray(spec.steps) || spec.steps.length === 0) throw new ToolError(`steps: al menos un paso.`);
  spec.steps.forEach((s, i) => {
    for (const key of ["shot", "box"]) {
      if (key in s && !NAME.test(String(s[key]))) throw new ToolError(`steps[${i}].${key}: "${s[key]}" solo admite letras, números, "-" y "_".`);
    }
  });

  const tools = ensureTools({ log: (m) => console.log(m) });
  const puppeteer = tools.requirePuppeteer();
  const browser = await puppeteer.launch({
    executablePath: chromePath(tools),
    headless: !opts.headful,
    args: ["--hide-scrollbars", "--disable-features=Translate", "--lang=es-ES", "--force-color-profile=srgb"],
    defaultViewport: { ...viewport, deviceScaleFactor: scale },
  });

  fs.mkdirSync(opts.out, { recursive: true });
  const manifest = { viewport, scale, baseUrl: spec.baseUrl, shots: {}, boxes: {} };
  const page = await browser.newPage();
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: spec.colorScheme || "light" },
    { name: "prefers-reduced-motion", value: spec.reducedMotion === false ? "no-preference" : "reduce" },
  ]);
  if (spec.freeze !== false) {
    await page.evaluateOnNewDocument((css) => {
      const add = () => {
        const s = document.createElement("style");
        s.setAttribute("data-whats-new-freeze", "");
        s.textContent = css;
        document.documentElement.appendChild(s);
      };
      if (document.documentElement) add();
      else document.addEventListener("DOMContentLoaded", add);
    }, FREEZE_CSS);
  }
  page.setDefaultTimeout(spec.timeout ?? 20000);

  const url = (p) => new URL(p, spec.baseUrl).toString();

  try {
    for (const [i, raw] of spec.steps.entries()) {
      const where = `steps[${i}]`;
      const step = { ...raw };
      const label = `${String(i + 1).padStart(2, " ")}. ${describe(step)}`;
      console.log(label);
      const timeout = step.timeout;

      if ("goto" in step) {
        // "load" y no "networkidle": un dev server (HMR) o una escena animada no dejan nunca la red en reposo.
        // Lo concreto se espera con waitFor.
        await page.goto(url(substitute(step.goto, env, where)), { waitUntil: step.until || "load", timeout });
      } else if ("waitFor" in step) {
        await page.waitForSelector(step.waitFor, { visible: true, timeout });
      } else if ("waitForUrl" in step) {
        const fragment = step.waitForUrl;
        await page.waitForFunction((f) => location.href.includes(f), { timeout }, fragment);
      } else if ("waitForHidden" in step) {
        await page.waitForSelector(step.waitForHidden, { hidden: true, timeout });
      } else if ("wait" in step) {
        await new Promise((r) => setTimeout(r, Number(step.wait)));
      } else if ("fill" in step) {
        const value = substitute(step.value ?? "", env, where);
        await page.waitForSelector(step.fill, { visible: true, timeout });
        await page.click(step.fill, { count: 3 });
        await page.keyboard.press("Backspace");
        await page.type(step.fill, value, { delay: 10 });
      } else if ("click" in step) {
        await page.waitForSelector(step.click, { visible: true, timeout });
        await page.click(step.click);
      } else if ("hover" in step) {
        await page.waitForSelector(step.hover, { visible: true, timeout });
        await page.hover(step.hover);
      } else if ("press" in step) {
        await page.keyboard.press(step.press);
      } else if ("select" in step) {
        await page.select(step.select, substitute(step.value, env, where));
      } else if ("scrollTo" in step) {
        await page.waitForSelector(step.scrollTo, { timeout });
        await page.$eval(step.scrollTo, (el) => el.scrollIntoView({ block: "center", inline: "center" }));
      } else if ("localStorage" in step) {
        // Tras un goto a la app: p. ej. marcar las novedades como vistas para que no tapen la captura.
        const entries = Object.entries(step.localStorage).map(([k, v]) => [k, substitute(v, env, where)]);
        await page.evaluate((list) => list.forEach(([k, v]) => localStorage.setItem(k, v)), entries);
      } else if ("hide" in step || "blur" in step) {
        const css = "hide" in step ? `${step.hide}{visibility:hidden!important}` : `${step.blur}{filter:blur(6px)!important}`;
        await page.addStyleTag({ content: css });
      } else if ("box" in step) {
        const sel = step.selector;
        if (!sel) throw new ToolError(`${where}: "box" necesita "selector".`);
        const handle = await page.waitForSelector(sel, { visible: true, timeout });
        const b = await handle.boundingBox();
        if (!b) throw new ToolError(`${where}: "${sel}" no tiene caja visible.`);
        const x = Math.max(0, b.x);
        const y = Math.max(0, b.y);
        const box = {
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(Math.min(viewport.width, b.x + b.width) - x),
          h: Math.round(Math.min(viewport.height, b.y + b.height) - y),
        };
        if (box.w <= 0 || box.h <= 0) throw new ToolError(`${where}: "${sel}" está fuera de la pantalla; añade antes un paso "scrollTo".`);
        manifest.boxes[step.box] = box;
        console.log(`    caja ${step.box}: ${box.x},${box.y} ${box.w}x${box.h}`);
      } else if ("shot" in step) {
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await new Promise((r) => setTimeout(r, step.settle ?? 300));
        const file = `${step.shot}.png`;
        await page.screenshot({ path: path.join(opts.out, file), captureBeyondViewport: false });
        manifest.shots[step.shot] = file;
        console.log(`    captura ${file}`);
      } else {
        throw new ToolError(`${where}: paso desconocido (${Object.keys(step).join(", ")}).`);
      }
    }
  } catch (e) {
    try {
      await page.screenshot({ path: path.join(opts.out, "error.png") });
      console.error(`Pantalla en el momento del fallo: ${path.join(opts.out, "error.png")}`);
    } catch {
      // sin pantalla que guardar
    }
    await browser.close();
    throw Object.assign(e, { stepFailed: true });
  }

  await browser.close();
  fs.writeFileSync(path.join(opts.out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${path.join(opts.out, "manifest.json")}: ${Object.keys(manifest.shots).length} captura(s), ${Object.keys(manifest.boxes).length} caja(s).`);
}

(async () => {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (opts.help || !opts.spec || !opts.out) {
    console.error("Uso: node capture-ui.js <capture.json> --out=<dir> [--env-file=<ruta>] [--headful]");
    process.exit(opts.help ? 0 : 2);
  }
  try {
    await run(opts);
  } catch (e) {
    console.error(e.message);
    process.exit(e.stepFailed ? 1 : 2);
  }
})();
