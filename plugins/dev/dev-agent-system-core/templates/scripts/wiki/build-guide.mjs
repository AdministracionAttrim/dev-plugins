// Ensambla docs/wiki/guide/dev-guide.html: shell.html + sections/*.html (hand-authored)
// + render markdown→HTML de docs/wiki/{how-to,patterns} como secciones nuevas,
// construye el índice de búsqueda por secciones (#searchIndex), compila guide.css (Tailwind v4)
// contra el HTML ensamblado e incrusta el CSS y las imágenes como data-URIs base64.
// Uso: node scripts/wiki/build-guide.mjs  (o npm run wiki:guide)
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);

// La etiqueta de cb-head → id de lenguaje hljs. Las no listadas (text, rutas de árbol) no se resaltan.
const LANG_BY_LABEL = {
  typescript: "typescript",
  ts: "typescript",
  html: "xml",
  xml: "xml",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  json: "json",
  markdown: "markdown",
  md: "markdown"
};

const ENTITY = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const decodeEntities = (text) => text.replace(/&(?:amp|lt|gt|quot|#39);/g, (match) => ENTITY[match]);

const GUIDE_DIR = "docs/wiki/guide";
const SECTIONS_DIR = join(GUIDE_DIR, "sections");
const ASSETS_DIR = "docs/wiki/assets";
const WIKI_DIR = "docs/wiki";
const OUTPUT_FILE = join(GUIDE_DIR, "dev-guide.html");

// ─────────────────────────────────────────────────────────────────────────────
// Render de markdown del wiki → secciones de la guía
// ─────────────────────────────────────────────────────────────────────────────

marked.setOptions({ gfm: true, breaks: false });

const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const stripFrontmatter = (markdownText) => markdownText.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", mdash: "—", ndash: "–",
  hellip: "…", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü"
};
const decodeText = (text) =>
  text
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => NAMED_ENTITIES[name] ?? "");
const toPlainText = (html) => decodeText(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const escapeAttr = (text) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

// Recoge páginas .md de un directorio (recursivo, excluye index.md) con su categoría.
const collectPages = (relDir, category) => {
  const absDir = join(WIKI_DIR, relDir);
  if (!existsSync(absDir)) return [];
  const pages = [];
  const walk = (currentRel) => {
    for (const entry of readdirSync(join(WIKI_DIR, currentRel), { withFileTypes: true })) {
      const entryRel = `${currentRel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "azure") walk(entryRel);
      } else if (entry.name.endsWith(".md") && entry.name !== "index.md") {
        const relPathNoExt = entryRel.replace(/\.md$/, "");
        const raw = readFileSync(join(WIKI_DIR, entryRel), "utf8");
        // Páginas marcadas con `guide: false` en el frontmatter no entran en la dev-guide
        // (siguen viviendo en la wiki; son material interno, no de flujo de desarrollo).
        const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[1] ?? "";
        if (/^guide:\s*false\s*$/m.test(frontmatter)) continue;
        const body = stripFrontmatter(raw);
        const titleMatch = body.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : entry.name.replace(/\.md$/, "");
        const prefix = { patterns: "p", features: "f", "how-to": "howto" }[category];
        const pageId =
          category === "features"
            ? `${prefix}-${slugify(relPathNoExt.replace(/^features\//, ""))}`
            : `${prefix}-${slugify(entry.name.replace(/\.md$/, ""))}`;
        pages.push({ relPathNoExt, category, pageId, title, body });
      }
    }
  };
  walk(relDir);
  return pages;
};

// Diagramas ```mermaid recogidos durante el render de páginas; se convierten a SVG
// en build-time (Chromium de Playwright) para que el HTML siga siendo autocontenido.
const mermaidBlocks = [];

// Convierte el cuerpo markdown de una página en una <section> de la guía.
const renderPage = (page, linkMap) => {
  // 1. Wikilinks [[target#anchor|label]] → enlace interno si el destino se renderiza; si no, texto.
  let body = page.body.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_match, target, label) => {
    const text = (label ?? target.split("/").pop()).trim();
    const id = linkMap.get(target.trim());
    return id ? `[${text}](#${id})` : text;
  });

  let html = marked.parse(body);

  // 2. Primer <h1> = título de la sección (se extrae; el resto se degrada un nivel).
  let sectionTitle = page.title;
  let h1Removed = false;
  html = html.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/g, (match, text) => {
    if (h1Removed) return `<h3>${text}</h3>`;
    h1Removed = true;
    sectionTitle = toPlainText(text);
    return "";
  });

  // 3. Degradar encabezados (h2→h3, h3→h4) y asignar ids únicos por página.
  const usedIds = new Set();
  const demote = { 2: 3, 3: 4, 4: 4 };
  html = html.replace(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/g, (_match, level, text) => {
    const outLevel = demote[level];
    let id = `${page.pageId}--${slugify(toPlainText(text)) || "s"}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `${page.pageId}--${slugify(toPlainText(text)) || "s"}-${suffix++}`;
    usedIds.add(id);
    return `<h${outLevel} id="${id}">${text}</h${outLevel}>`;
  });

  // 4. Admoniciones GitHub (> [!NOTE]) y blockquotes → callouts del design system.
  const CALLOUT_BY_KIND = { NOTE: "info", TIP: "tip", IMPORTANT: "info", WARNING: "warning", CAUTION: "error", CONTRADICTION: "error" };
  html = html.replace(
    /<blockquote>\s*<p>\s*\[!(\w+)\]\s*(?:<br\s*\/?>)?([\s\S]*?)<\/blockquote>/g,
    (_match, kind, rest) => `<div class="callout ${CALLOUT_BY_KIND[kind.toUpperCase()] ?? "info"}"><div></div><div><p>${rest.replace(/<\/p>\s*$/, "")}</p></div></div>`
  );
  html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (_match, inner) => `<div class="callout info"><div></div><div>${inner}</div></div>`);

  // 5. Bloques de código → markup .code-block (la etiqueta = lenguaje; el highlight de build-time lo resalta).
  //    Los bloques ```mermaid se apartan a mermaidBlocks y dejan un placeholder que el paso de
  //    render de diagramas (Chromium headless) sustituye por SVGs incrustados.
  html = html.replace(/<pre><code(?: class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g, (_match, lang, code) => {
    const label = (lang || "text").split(/\s+/)[0];
    if (label === "mermaid") {
      mermaidBlocks.push({ code: decodeEntities(code), page: page.relPathNoExt });
      return `<!--MERMAID:${mermaidBlocks.length - 1}-->`;
    }
    return `<div class="code-block"><div class="cb-head"><span>${label}</span><button class="cb-copy" type="button">Copiar</button></div><pre><code>${code}</code></pre></div>`;
  });

  // 6. Tablas → envoltorio .table-wrap.
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, (match) => `<div class="table-wrap">${match}</div>`);

  return `<section id="${page.pageId}">
  <div class="section-head"><h2>${escapeAttr(sectionTitle)}</h2><span class="src">${WIKI_DIR}/${page.relPathNoExt}.md</span></div>
  ${html}
</section>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Recolección + render
// ─────────────────────────────────────────────────────────────────────────────

const patternPages = collectPages("patterns", "patterns").sort((a, b) => a.title.localeCompare(b.title));
const featurePages = collectPages("features", "features").sort((a, b) => a.relPathNoExt.localeCompare(b.relPathNoExt));
const howToPages = collectPages("how-to", "how-to").sort((a, b) => a.title.localeCompare(b.title));
const guidePages = [...howToPages, ...patternPages];

// Mapa wikilink (ruta wiki-relativa sin extensión) → id de sección.
const linkMap = new Map(guidePages.map((page) => [page.relPathNoExt, page.pageId]));

const wikiSectionsHtml = guidePages.map((page) => renderPage(page, linkMap)).join("\n\n");

const tocGroup = (label, pages) =>
  pages.length
    ? `\n          <p class="toc-group">${label}</p>\n` +
      pages.map((page) => `          <a href="#${page.pageId}">${escapeAttr(page.title)}</a>`).join("\n")
    : "";
const wikiTocHtml = tocGroup("How-To", howToPages) + tocGroup("Patrones", patternPages);

// ─────────────────────────────────────────────────────────────────────────────
// Ensamblado
// ─────────────────────────────────────────────────────────────────────────────

const shell = readFileSync(join(GUIDE_DIR, "shell.html"), "utf8");

// 1. Inyectar secciones hand-authored en los placeholders <!-- SECTION:slug -->
const sectionFiles = readdirSync(SECTIONS_DIR).filter((file) => file.endsWith(".html"));
const sectionsBySlug = new Map(
  sectionFiles.map((file) => [file.replace(/^\d+-/, "").replace(/\.html$/, ""), readFileSync(join(SECTIONS_DIR, file), "utf8")])
);

let missingSections = 0;
let html = shell.replace(/<!-- SECTION:([\w-]+) -->/g, (match, slug) => {
  const section = sectionsBySlug.get(slug);
  if (!section) {
    missingSections++;
    console.warn(`⚠ Sección no encontrada: ${slug}`);
    return match;
  }
  return section;
});

// 1.1. Inyectar las secciones renderizadas del wiki + su TOC.
html = html.replace("<!-- WIKI_SECTIONS -->", () => wikiSectionsHtml);
html = html.replace("<!-- WIKI_TOC -->", () => wikiTocHtml);

// 1.5. Resaltado de sintaxis en build-time: cada <pre><code> recibe spans hljs-* estáticos
//      según la etiqueta de su cb-head. Sin JS en runtime — el HTML sigue siendo autocontenido.
let highlightedBlocks = 0;
html = html.replace(
  /<div class="cb-head"><span>([^<]+)<\/span>(.*?)<\/div>(\s*)<pre><code>([\s\S]*?)<\/code><\/pre>/g,
  (match, label, headRest, gap, code) => {
    const language = LANG_BY_LABEL[label.trim().toLowerCase()];
    if (!language) return match;
    const highlighted = hljs.highlight(decodeEntities(code), { language }).value;
    highlightedBlocks++;
    return `<div class="cb-head"><span>${label}</span>${headRest}</div>${gap}<pre><code class="hljs">${highlighted}</code></pre>`;
  }
);

// 1.6. Índice de búsqueda por secciones — se construye sobre el HTML ya ensamblado (una sola
//      fuente de verdad: se LEEN los ids del DOM, no se recalculan). Cada <hN id> es una entrada.
const searchEntries = [];
const sectionRegex = /<section id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g;
let sectionMatch;
while ((sectionMatch = sectionRegex.exec(html)) !== null) {
  const [, pageId, inner] = sectionMatch;
  const headMatch = inner.match(/<div class="section-head">[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/) || inner.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  const pageTitle = headMatch ? toPlainText(headMatch[1]) : pageId;
  const type =
    pageId.startsWith("f-") ? "feature" : pageId.startsWith("p-") ? "pattern" : pageId.startsWith("howto-") ? "howto" : "guide";

  // Encabezados con id dentro de la sección (h2/h3/h4).
  const headings = [];
  const headingRegex = /<h([2-4])[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let headingMatch;
  while ((headingMatch = headingRegex.exec(inner)) !== null) {
    headings.push({ level: Number(headingMatch[1]), id: headingMatch[2], title: toPlainText(headingMatch[3]), index: headingMatch.index, endIndex: headingRegex.lastIndex });
  }

  const excerptAt = (from, to) => toPlainText(inner.slice(from, to)).slice(0, 160);

  // Entrada de la sección completa (ancla = id de la sección).
  searchEntries.push({
    anchor: pageId,
    title: pageTitle,
    page: pageTitle,
    type,
    level: 2,
    excerpt: excerptAt(0, headings.length ? headings[0].index : 600)
  });

  headings.forEach((heading, headingIndex) => {
    if (heading.id === pageId) return;
    const next = headings[headingIndex + 1];
    searchEntries.push({
      anchor: heading.id,
      title: heading.title,
      page: pageTitle,
      type,
      level: heading.level,
      excerpt: excerptAt(heading.endIndex, next ? next.index : heading.endIndex + 600)
    });
  });
}
const searchIndexJson = JSON.stringify(searchEntries);

// 1.7. Diagramas Mermaid → SVG en build-time. Se renderiza cada diagrama dos veces
//      (tema claro y oscuro, paleta alineada con guide.css) en un Chromium headless de
//      Playwright; el HTML final incrusta ambos SVGs y CSS decide cuál se ve. Sin JS en runtime.
let renderedDiagrams = 0;
if (mermaidBlocks.length) {
  const escapeHtml = (text) => text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);
  // Paleta de guide.css aproximada a hex (mermaid no entiende oklch). Cada tema lleva
  // sus themeVariables (colores base) + themeCSS (acabado: esquinas, sombras, rombos
  // de decisión en acento, clusters con borde discontinuo y título en mayúsculas).
  const sharedVariables = { fontFamily: '"Segoe UI", system-ui, sans-serif', fontSize: "15px" };
  const sharedCss = `
    .node rect { rx: 10px; ry: 10px; }
    .node rect, .node polygon, .node circle { stroke-width: 1.3px; }
    .label text, span.nodeLabel { font-weight: 600; }
    .edgeLabel text, .edgeLabel span { font-size: 12.5px; font-weight: 500; }
    .edgePaths path { stroke-width: 1.6px; }
    .cluster rect { rx: 14px; ry: 14px; stroke-dasharray: 6 5; stroke-width: 1.2px; }
    .cluster-label text, .cluster-label span { font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
  `;
  const THEMES = {
    light: {
      variables: {
        ...sharedVariables,
        background: "#ffffff",
        primaryColor: "#faf9f5",
        primaryBorderColor: "#c9c2b2",
        primaryTextColor: "#1d1b18",
        secondaryColor: "#c2d1e3",
        secondaryBorderColor: "#00408b",
        secondaryTextColor: "#002d61",
        tertiaryColor: "#f7f5ef",
        lineColor: "#a39a87",
        textColor: "#2c2a26",
        clusterBkg: "#f7f5ef",
        clusterBorder: "#d8d2c4",
        edgeLabelBackground: "#ffffff",
        titleColor: "#1d1b18",
        nodeTextColor: "#1d1b18"
      },
      css: `${sharedCss}
        .node rect { filter: drop-shadow(0 1.5px 2px rgba(35, 30, 20, 0.12)); }
        .node polygon { fill: #c2d1e3 !important; stroke: #00408b !important; }
        .node polygon + .label text, .node polygon ~ g text { fill: #002d61; }
        .cluster-label text, .cluster-label span { fill: #6e6550; color: #6e6550; }
        .edgeLabel text, .edgeLabel span { fill: #5a523f; color: #5a523f; }
      `
    },
    dark: {
      variables: {
        ...sharedVariables,
        background: "#322e28",
        primaryColor: "#3a352d",
        primaryBorderColor: "#6a6354",
        primaryTextColor: "#f4f2ec",
        secondaryColor: "#00234c",
        secondaryBorderColor: "#6189b7",
        secondaryTextColor: "#c4d4e8",
        tertiaryColor: "#2b2722",
        lineColor: "#8a8170",
        textColor: "#ded9cd",
        clusterBkg: "#2b2722",
        clusterBorder: "#4b4538",
        edgeLabelBackground: "#322e28",
        titleColor: "#f4f2ec",
        nodeTextColor: "#f4f2ec"
      },
      css: `${sharedCss}
        .node rect { filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4)); }
        .node polygon { fill: #00234c !important; stroke: #6189b7 !important; }
        .node polygon + .label text, .node polygon ~ g text { fill: #c4d4e8; }
        .cluster-label text, .cluster-label span { fill: #a89e8a; color: #a89e8a; }
        .edgeLabel text, .edgeLabel span { fill: #b3aa98; color: #b3aa98; }
      `
    }
  };

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const browserPage = await browser.newPage();
    await browserPage.setContent("<!doctype html><html><body></body></html>");
    await browserPage.addScriptTag({ path: resolve("node_modules/mermaid/dist/mermaid.min.js") });

    const renderVariant = (block, index, variant) =>
      browserPage.evaluate(
        async ({ code, themeVariables, themeCSS, renderId }) => {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "loose",
            theme: "base",
            themeVariables,
            themeCSS,
            flowchart: { htmlLabels: false, curve: "basis", nodeSpacing: 55, rankSpacing: 60, padding: 14 }
          });
          const { svg } = await mermaid.render(renderId, code);
          return svg;
        },
        {
          code: block.code,
          themeVariables: THEMES[variant].variables,
          themeCSS: THEMES[variant].css,
          renderId: `mmd-${index}-${variant}`
        }
      );

    const diagramHtmlByIndex = [];
    for (const [index, block] of mermaidBlocks.entries()) {
      try {
        const lightSvg = await renderVariant(block, index, "light");
        const darkSvg = await renderVariant(block, index, "dark");
        diagramHtmlByIndex[index] = `<figure class="diagram"><div class="only-light">${lightSvg}</div><div class="only-dark">${darkSvg}</div></figure>`;
        renderedDiagrams++;
      } catch (error) {
        console.warn(`⚠ Diagrama mermaid no compiló (${block.page}): ${String(error).split("\n")[0]}`);
        diagramHtmlByIndex[index] =
          `<div class="code-block"><div class="cb-head"><span>mermaid</span><button class="cb-copy" type="button">Copiar</button></div><pre><code>${escapeHtml(block.code)}</code></pre></div>`;
      }
    }
    html = html.replace(/<!--MERMAID:(\d+)-->/g, (_match, index) => diagramHtmlByIndex[Number(index)]);
  } finally {
    await browser.close();
  }
}

// 2. Compilar Tailwind v4 contra el HTML ensamblado.
//    El HTML intermedio se escribe en un dir temporal y guide.css lo referencia via @source.
const tempDir = mkdtempSync(join(tmpdir(), "wiki-guide-"));
try {
  const contentFile = join(tempDir, "content.html");
  writeFileSync(contentFile, html);

  const cssInput =
    readFileSync(join(GUIDE_DIR, "guide.css"), "utf8") +
    `\n@source "${contentFile.replaceAll("\\", "/")}";\n`;

  const result = await postcss([tailwindcss({ base: resolve(GUIDE_DIR) })]).process(cssInput, {
    from: resolve(GUIDE_DIR, "guide.css"),
    to: undefined
  });

  html = html.replace("<!-- TAILWIND_CSS -->", () => result.css);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

// 2.5. Inyectar el índice de búsqueda (tras Tailwind: el JSON no debe escanearse como clases).
html = html.replace("<!-- SEARCH_INDEX -->", () => searchIndexJson.replace(/<\/script>/g, "<\\/script>"));

// 3. Incrustar imágenes: data-asset="X.png" → src="data:image/png;base64,…"
let embeddedImages = 0;
html = html.replace(/data-asset="([^"]+)"/g, (match, assetName) => {
  try {
    const base64 = readFileSync(join(ASSETS_DIR, assetName)).toString("base64");
    embeddedImages++;
    return `src="data:image/png;base64,${base64}" loading="lazy"`;
  } catch {
    console.warn(`⚠ Asset no encontrado: ${assetName}`);
    return match;
  }
});

// 4. Sanity checks
const opens = (html.match(/<section\b/g) ?? []).length;
const closes = (html.match(/<\/section>/g) ?? []).length;
if (opens !== closes) {
  console.error(`✗ Desbalance de <section>: ${opens} aperturas vs ${closes} cierres`);
  process.exitCode = 1;
}
if (html.includes("<!-- TAILWIND_CSS -->")) {
  console.error("✗ El CSS de Tailwind no se inyectó");
  process.exitCode = 1;
}
if (html.includes("<!-- WIKI_SECTIONS -->") || html.includes("<!-- SEARCH_INDEX -->")) {
  console.error("✗ Placeholder de wiki/búsqueda sin sustituir");
  process.exitCode = 1;
}
if (html.includes("<!--MERMAID:")) {
  console.error("✗ Placeholder de diagrama mermaid sin sustituir");
  process.exitCode = 1;
}
if (!searchEntries.length) {
  console.error("✗ El índice de búsqueda quedó vacío");
  process.exitCode = 1;
}
// Toda ancla del índice debe existir en el DOM final.
const danglingAnchors = searchEntries.filter((entry) => !html.includes(`id="${entry.anchor}"`)).length;
if (danglingAnchors > 0) {
  console.error(`✗ ${danglingAnchors} anclas del índice no existen en el DOM`);
  process.exitCode = 1;
}

writeFileSync(OUTPUT_FILE, html);
const sizeKb = Math.round(Buffer.byteLength(html) / 1024);
console.log(
  `✓ ${OUTPUT_FILE} generado — ${sectionsBySlug.size} secciones hand-authored (${missingSections} faltantes) + ${guidePages.length} del wiki (${howToPages.length} how-to, ${patternPages.length} patterns; ${featurePages.length} features excluidas), ${searchEntries.length} entradas de búsqueda, ${embeddedImages} imágenes, ${highlightedBlocks} bloques resaltados, ${renderedDiagrams}/${mermaidBlocks.length} diagramas mermaid, ${sizeKb} KB`
);
