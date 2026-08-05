#!/usr/bin/env node
"use strict";

/**
 * Genera index.html en la raíz del repo: una wiki autocontenida (sin dependencias
 * externas, apta para GitHub Pages) que agrega el marketplace.json y el README.md
 * de cada plugin.
 *
 * Uso: node scripts/build-wiki.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Inline markdown: bold, inline code, links ---
function renderInline(text) {
  let out = escapeHtml(text);
  // inline code `...`
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  // links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt, url) => {
    const safeUrl = escapeHtml(url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${txt}</a>`;
  });
  // bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, txt) => `<strong>${txt}</strong>`);
  return out;
}

// --- Block markdown: headers, tables, lists, code fences, paragraphs ---
function renderMarkdown(md, opts) {
  opts = opts || {};
  const headingOffset = opts.headingOffset || 0;
  const anchorPrefix = opts.anchorPrefix || "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const toc = [];
  let i = 0;

  function isTableSep(line) {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
  }

  function splitRow(line) {
    let l = line.trim();
    if (l.startsWith("|")) l = l.slice(1);
    if (l.endsWith("|")) l = l.slice(0, -1);
    return l.split("|").map((c) => c.trim());
  }

  while (i < lines.length) {
    let line = lines[i];

    // fenced code block (allow leading indentation, e.g. inside a list item)
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/^\s*```/, "").trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      html.push(`<pre><code${langClass}>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // headings
    const hMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hMatch) {
      const level = Math.min(6, hMatch[1].length + headingOffset);
      const text = hMatch[2].trim();
      const id = anchorPrefix + slugify(text);
      html.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      if (hMatch[1].length <= 3) {
        toc.push({ level: hMatch[1].length, text, id });
      }
      i++;
      continue;
    }

    // table
    if (/^\s*\|/.test(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headerCells = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      let t = '<div class="table-wrap"><table><thead><tr>';
      headerCells.forEach((c) => (t += `<th>${renderInline(c)}</th>`));
      t += "</tr></thead><tbody>";
      rows.forEach((r) => {
        t += "<tr>";
        r.forEach((c) => (t += `<td>${renderInline(c)}</td>`));
        t += "</tr>";
      });
      t += "</tbody></table></div>";
      html.push(t);
      continue;
    }

    // unordered list
    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        let itemText = lines[i].replace(/^\s*-\s+/, "");
        i++;
        // continuation lines (indented, not a new list item / heading / fence / blank)
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          !/^\s*-\s+/.test(lines[i]) &&
          !/^#{1,6}\s+/.test(lines[i]) &&
          !/^\s*```/.test(lines[i]) &&
          /^\s{2,}\S/.test(lines[i])
        ) {
          itemText += " " + lines[i].trim();
          i++;
        }
        items.push(itemText);
      }
      html.push("<ul>" + items.map((it) => `<li>${renderInline(it)}</li>`).join("") + "</ul>");
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        let itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
        i++;
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          !/^\s*\d+\.\s+/.test(lines[i]) &&
          !/^#{1,6}\s+/.test(lines[i]) &&
          !/^\s*```/.test(lines[i]) &&
          /^\s{2,}\S/.test(lines[i])
        ) {
          itemText += " " + lines[i].trim();
          i++;
        }
        items.push(itemText);
      }
      html.push("<ol>" + items.map((it) => `<li>${renderInline(it)}</li>`).join("") + "</ol>");
      continue;
    }

    // blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // paragraph (collect contiguous non-blank, non-special lines)
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*\|/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    html.push(`<p>${renderInline(buf.join(" "))}</p>`);
  }

  return { html: html.join("\n"), toc };
}

function main() {
  const marketplace = readJson(path.join(ROOT, ".claude-plugin", "marketplace.json"));
  const categoryNames = { dev: "Desarrollo", admin: "Administración", sost: "Sostenibilidad" };

  const plugins = marketplace.plugins.map((p) => {
    const readmePath = path.join(ROOT, p.source.replace(/^\.\//, ""), "README.md");
    const pluginJsonPath = path.join(ROOT, p.source.replace(/^\.\//, ""), ".claude-plugin", "plugin.json");
    let version = "?";
    try {
      version = readJson(pluginJsonPath).version || "?";
    } catch (e) {
      // ignore
    }
    let readmeHtml = '<p><em>Este plugin todavía no tiene README.md.</em></p>';
    let toc = [];
    if (fs.existsSync(readmePath)) {
      const raw = fs.readFileSync(readmePath, "utf8");
      // Strip the first H1 (ya lo mostramos como título de la sección) y desplaza el resto un nivel.
      const withoutH1 = raw.replace(/^#\s+.*\n/, "");
      const rendered = renderMarkdown(withoutH1, { headingOffset: 1, anchorPrefix: p.name + "-" });
      readmeHtml = rendered.html;
      toc = rendered.toc;
    }
    return { ...p, version, readmeHtml, toc, id: p.name };
  });

  const byCategory = {};
  plugins.forEach((p) => {
    (byCategory[p.category] = byCategory[p.category] || []).push(p);
  });

  const categoriesOrder = Object.keys(categoryNames).filter((c) => byCategory[c]);

  const navHtml = categoriesOrder
    .map((cat) => {
      const items = byCategory[cat]
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (p) =>
            `<li><a href="#${p.id}" data-nav="${p.id}">${escapeHtml(p.name)}</a></li>`
        )
        .join("");
      return `<div class="nav-group"><h3>${categoryNames[cat]}</h3><ul>${items}</ul></div>`;
    })
    .join("\n");

  const sectionsHtml = categoriesOrder
    .map((cat) => {
      const cards = byCategory[cat]
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(
          (p) => `
      <article class="plugin" id="${p.id}" data-category="${cat}">
        <header class="plugin-header">
          <h2>${escapeHtml(p.name)} <span class="badge">v${escapeHtml(p.version)}</span></h2>
          <p class="plugin-desc">${renderInline(p.description)}</p>
          <div class="keywords">${(p.keywords || [])
            .map((k) => `<span class="kw">${escapeHtml(k)}</span>`)
            .join("")}</div>
        </header>
        <div class="plugin-body">
          ${p.readmeHtml}
        </div>
      </article>`
        )
        .join("\n");
      return `<section class="category" id="cat-${cat}"><h1 class="category-title">${categoryNames[cat]}</h1>${cards}</section>`;
    })
    .join("\n");

  const searchIndex = plugins.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    text: (p.description + " " + (p.keywords || []).join(" ")).toLowerCase(),
  }));

  const generatedAt = readFallbackDate();

  function replaceAllLiteral(str, token, value) {
    return str.split(token).join(value);
  }

  const template = fs.readFileSync(path.join(__dirname, "wiki-template.html"), "utf8");
  let out = template;
  out = replaceAllLiteral(out, "__MARKETPLACE_NAME__", escapeHtml(marketplace.name));
  out = replaceAllLiteral(out, "__MARKETPLACE_DESC__", escapeHtml(marketplace.metadata?.description || ""));
  out = replaceAllLiteral(out, "__NAV__", navHtml);
  out = replaceAllLiteral(out, "__SECTIONS__", sectionsHtml);
  out = replaceAllLiteral(out, "__SEARCH_INDEX__", JSON.stringify(searchIndex));
  out = replaceAllLiteral(out, "__PLUGIN_COUNT__", String(plugins.length));
  out = replaceAllLiteral(out, "__GENERATED_AT__", generatedAt);

  fs.writeFileSync(path.join(ROOT, "index.html"), out, "utf8");
  console.log(`index.html generado con ${plugins.length} plugins.`);
}

function readFallbackDate() {
  // Evita depender de Date.now() en contextos donde no está disponible; permite override por env var.
  return process.env.WIKI_BUILD_DATE || "2026-08-05";
}

main();
