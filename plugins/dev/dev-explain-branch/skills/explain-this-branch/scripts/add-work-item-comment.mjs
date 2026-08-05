#!/usr/bin/env node
/**
 * add-work-item-comment.mjs
 * Publica un comentario en un work item de Azure DevOps a partir de un
 * fichero de texto en markdown simple.
 *
 * Uso:
 *   node add-work-item-comment.mjs <ID> <ruta-fichero-markdown> [--dry-run]
 *   node add-work-item-comment.mjs 1099 /tmp/azure-comment-1099.md
 *   node add-work-item-comment.mjs 1099 /tmp/azure-comment-1099.md --dry-run
 *
 * Requiere: Node 18+ (fetch nativo).
 *
 * Primer uso — variables de entorno obligatorias (sin defaults, nunca hardcodear):
 *   AZURE_ORG      organización de Azure DevOps
 *   AZURE_PROJECT  proyecto de Azure Boards
 *   AZURE_PAT      Personal Access Token con permiso de escritura en comentarios de work items
 */

import { readFileSync, existsSync } from "fs";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const ORG = process.env.AZURE_ORG;
const PROJECT = process.env.AZURE_PROJECT;
const PAT = process.env.AZURE_PAT;

const missing = [
  ["AZURE_ORG", ORG],
  ["AZURE_PROJECT", PROJECT],
  ["AZURE_PAT", PAT],
].filter(([, value]) => !value).map(([name]) => name);

if (missing.length) {
  console.error(`❌ Faltan variables de entorno: ${missing.join(", ")}`);
  console.error("Primer uso: exporta AZURE_ORG, AZURE_PROJECT y AZURE_PAT (o añádelas a tu .env.local).");
  process.exit(1);
}

const BASE_URL = `https://dev.azure.com/${ORG}/${PROJECT}/_apis`;

// ─── HTTP ─────────────────────────────────────────────────────────────────────

const AUTH = "Basic " + Buffer.from(`:${PAT}`).toString("base64");

// ─── MARKDOWN → HTML SIMPLE ────────────────────────────────────────────────────
// La API de comentarios de work items espera HTML, no markdown de GitLab.
// Conversión deliberadamente mínima: solo lo que usa la skill
// explain-this-branch en su plantilla de comentario (negrita, código inline,
// listas con "-", saltos de línea, párrafos).

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const htmlLines = [];
  let inList = false;

  const inlineFormat = (line) =>
    line
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("- ")) {
      if (!inList) {
        htmlLines.push("<ul>");
        inList = true;
      }
      htmlLines.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      htmlLines.push("</ul>");
      inList = false;
    }

    if (line === "") {
      htmlLines.push("<br>");
      continue;
    }

    htmlLines.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) htmlLines.push("</ul>");

  return htmlLines.join("\n");
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function postComment(workItemId, htmlText) {
  const res = await fetch(
    `${BASE_URL}/wit/workitems/${workItemId}/comments?api-version=7.0-preview.3`,
    {
      method: "POST",
      headers: {
        Authorization: AUTH,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: htmlText }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${body}`);
  }

  return res.json();
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const HELP = `
Uso: node add-work-item-comment.mjs <ID> <ruta-fichero-markdown> [--dry-run]

Argumentos:
  <ID>                      ID numérico del work item de Azure DevOps
  <ruta-fichero-markdown>   Fichero con el texto del comentario, en markdown
                            simple (negrita **así**, código \`así\`, listas "- ")

Flags:
  --dry-run   Muestra el HTML resultante sin publicar el comentario

Variables de entorno (obligatorias):
  AZURE_ORG, AZURE_PROJECT, AZURE_PAT

Ejemplos:
  node add-work-item-comment.mjs 1099 /tmp/azure-comment-1099.md
  node add-work-item-comment.mjs 1099 /tmp/azure-comment-1099.md --dry-run
`.trim();

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const positional = argv.filter((a) => !a.startsWith("--"));
const [rawId, filePath] = positional;

if (!rawId || !filePath || argv.includes("--help") || argv.includes("-h")) {
  console.log(HELP);
  process.exit(rawId && filePath ? 0 : 1);
}

const workItemId = parseInt(rawId, 10);
if (isNaN(workItemId)) {
  console.error(`❌ ID inválido: ${rawId}`);
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`❌ No existe el fichero: ${filePath}`);
  process.exit(1);
}

const markdown = readFileSync(filePath, "utf8");
const html = markdownToHtml(markdown);

if (dryRun) {
  console.log(`\n🔎 DRY RUN — HTML que se enviaría para #${workItemId}:\n`);
  console.log(html);
  console.log(`\n(ningún comentario publicado)\n`);
  process.exit(0);
}

try {
  const result = await postComment(workItemId, html);
  const link = `https://dev.azure.com/${ORG}/${PROJECT}/_workitems/edit/${workItemId}`;
  console.log(`\n✅ Comentario publicado en #${workItemId}.`);
  console.log(`   ${link}`);
  if (result?.id) console.log(`   (comment id: ${result.id})`);
  console.log("");
} catch (err) {
  console.error(`❌ Error al publicar el comentario: ${err.message}`);
  process.exit(1);
}
