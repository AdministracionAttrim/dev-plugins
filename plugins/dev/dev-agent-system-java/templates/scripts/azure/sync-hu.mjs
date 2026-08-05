#!/usr/bin/env node
/**
 * sync-hu.mjs
 * Sincroniza una HU de Azure DevOps (+ sus relacionados) en la wiki local.
 *
 * Uso:
 *   node sync-hu.mjs <ID>
 *   node sync-hu.mjs 1099
 *
 * Requiere: Node 18+ (fetch nativo)
 *
 * Primer uso — variables de entorno obligatorias (sin defaults, nunca hardcodear):
 *   AZURE_ORG      organización de Azure DevOps
 *   AZURE_PROJECT  proyecto de Azure Boards
 *   AZURE_PAT      Personal Access Token con permiso de lectura sobre Boards
 *   WIKI_ROOT      ruta raíz de la wiki (opcional, default: docs/wiki)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createHash } from "crypto";
import path from "path";

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

const WIKI_ROOT = process.env.WIKI_ROOT ?? "docs/wiki";

// Fecha de sincronización (YYYY-MM-DD). Se sella en cada fichero que toque el sync,
// incluso en cascada y aunque el contenido no cambie respecto a Azure.
const SYNC_DATE = new Date().toISOString().slice(0, 10);
const SYNC_FIELD_PREFIX = "- **Sincronizado:**";

const WIKI_FOLDERS = {
  "User Story":     "hu",
  "Bug":            "bugs",
  "Change Request": "change-requests",
  "Feature":        "feat",
};

const FILE_PREFIXES = {
  "User Story":     "HU",
  "Bug":            "BUG",
  "Change Request": "CR",
  "Feature":        "FEAT",
};

const EXCLUDED_TYPES = new Set(["Task"]);

const RELATION_LABELS = {
  "System.LinkTypes.Hierarchy-Forward":    "Hijo",
  "System.LinkTypes.Hierarchy-Reverse":    "Padre",
  "System.LinkTypes.Related":              "Relacionado",
  "System.LinkTypes.Dependency-Forward":   "Dependencia (saliente)",
  "System.LinkTypes.Dependency-Reverse":   "Dependencia (entrante)",
  "Microsoft.VSTS.Common.TestedBy-Forward":"Test Case",
};

// ─── HTTP ─────────────────────────────────────────────────────────────────────

const AUTH = "Basic " + Buffer.from(`:${PAT}`).toString("base64");

async function apiGet(urlPath) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    headers: { Authorization: AUTH, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${urlPath}`);
  return res.json();
}

// ─── AZURE API ────────────────────────────────────────────────────────────────

/**
 * Descarga un work item individual SIEMPRE con $expand=relations.
 * La API batch no soporta expand, así que para tener relaciones siempre
 * hay que usar esta función.
 */
async function fetchWorkItem(id) {
  return apiGet(`/wit/workitems/${id}?api-version=7.0&$expand=relations`);
}

/**
 * Descarga múltiples work items en batch SIN relations.
 * Solo útil para obtener fields básicos (title, state, type) de items
 * que solo necesitamos referenciar, no escribir.
 */
async function fetchWorkItemsBatch(ids) {
  if (!ids.length) return [];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 200)
    chunks.push(ids.slice(i, i + 200));

  const results = [];
  for (const chunk of chunks) {
    const data = await apiGet(`/wit/workitems?ids=${chunk.join(",")}&api-version=7.0`);
    results.push(...data.value);
  }
  return results;
}

/**
 * Descarga múltiples work items CON relations, en paralelo.
 * Usar siempre que necesitemos las relaciones de cada item.
 */
async function fetchWorkItemsWithRelations(ids) {
  if (!ids.length) return [];
  return Promise.all(ids.map(id => fetchWorkItem(id)));
}

/**
 * Descarga los comentarios de un work item.
 */
async function fetchComments(id) {
  try {
    const data = await apiGet(`/wit/workitems/${id}/comments?api-version=7.0-preview.3`);
    return (data.comments ?? []).map(c => ({
      author: c.createdBy?.displayName ?? "Desconocido",
      date:   c.createdDate ?? "",
      text:   cleanHtml(c.text ?? ""),
    }));
  } catch (err) {
    console.warn(`  ⚠️  No se pudieron obtener comentarios de #${id}: ${err.message}`);
    return [];
  }
}

// ─── TRANSFORM ────────────────────────────────────────────────────────────────

function cleanHtml(raw = "") {
  if (!raw) return "";
  return raw
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "- ").replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractId(url = "") {
  const m = url.match(/\/workItems\/(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function filePrefix(type) { return FILE_PREFIXES[type] ?? "WI"; }
function wikiFolder(type) { return WIKI_FOLDERS[type] ?? "hu"; }

function formatDate(isoDate) {
  if (!isoDate) return "";
  try {
    return new Date(isoDate).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

function buildMarkdown({ id, type, state, title, description, reproSteps, acceptanceCriteria, related, comments, featureParent, childrenByType }) {
  const prefix = filePrefix(type);
  const lines = [
    `# ${prefix}-${id} - ${title}`,
    "",
    "## Metadata",
    `- **ID:** ${id}`,
    `- **Tipo:** ${type}`,
    `- **Estado:** ${state}`,
    `${SYNC_FIELD_PREFIX} ${SYNC_DATE}`,
  ];

  if (featureParent) {
    lines.push(`- **Feature:** FEAT-${featureParent.id} - ${featureParent.title}`);
  }

  lines.push("");

  if (description) {
    lines.push("## Descripción", description, "");
  }

  if (reproSteps) {
    lines.push("## Repro Steps", reproSteps, "");
  }

  if (acceptanceCriteria) {
    lines.push("## Criterios de aceptación", acceptanceCriteria, "");
  }

  if (type === "Feature" && childrenByType) {
    lines.push("## Work Items asociados", "");
    const typeOrder = ["User Story", "Bug", "Change Request"];
    for (const typeKey of typeOrder) {
      const children = childrenByType[typeKey] ?? [];
      if (!children.length) continue;
      const heading = typeKey === "User Story" ? "User Stories"
                    : typeKey === "Change Request" ? "Change Requests"
                    : "Bugs";
      lines.push(`### ${heading} (${children.length})`, "");
      for (const item of children) {
        lines.push(`- **#${item.id}** \`${item.state}\` — ${item.title}`);
      }
      lines.push("");
    }
  } else if (related?.length) {
    lines.push("## Work Items relacionados", "");
    const groups = {};
    for (const item of related) {
      (groups[item.label] ??= []).push(item);
    }
    for (const [label, items] of Object.entries(groups)) {
      const heading = label.endsWith("s") ? label : `${label}s`;
      lines.push(`### ${heading}`, "");
      for (const item of items) {
        lines.push(`- **#${item.id}** \`${item.type}\` · \`${item.state}\` — ${item.title}`);
      }
      lines.push("");
    }
  }

  if (comments?.length) {
    lines.push("## Comentarios", "");
    for (const c of comments) {
      const dateStr = formatDate(c.date);
      lines.push(`### 💬 ${c.author}${dateStr ? ` · ${dateStr}` : ""}`, "");
      lines.push(c.text, "");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

function wiToStruct(wi, related = null, comments = null, featureParent = null, childrenByType = null) {
  const f = wi.fields;
  return {
    id:                 wi.id,
    type:               f["System.WorkItemType"] ?? "",
    state:              f["System.State"] ?? "",
    title:              f["System.Title"] ?? "",
    description:        cleanHtml(f["System.Description"]),
    reproSteps:         cleanHtml(f["Microsoft.VSTS.TCM.ReproSteps"]),
    acceptanceCriteria: cleanHtml(f["Microsoft.VSTS.Common.AcceptanceCriteria"]),
    related,
    comments,
    featureParent,
    childrenByType,
  };
}

// ─── WIKI IO ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`  📁 Carpeta creada: ${dir}`);
  }
}

function wikiPath(type, id) {
  const folder = path.join(WIKI_ROOT, wikiFolder(type));
  const file   = `${filePrefix(type)}-${id}.md`;
  return path.join(folder, file);
}

function md5(str) {
  return createHash("md5").update(str).digest("hex");
}

// Elimina la línea de fecha de sincronización para comparar solo el contenido real.
// Así el estado created/updated/unchanged refleja cambios de Azure, no el sello de fecha.
function stripSyncDate(content) {
  return content
    .split("\n")
    .filter((line) => !line.startsWith(SYNC_FIELD_PREFIX))
    .join("\n");
}

function syncWikiFile(type, id, content) {
  const filePath = wikiPath(type, id);
  ensureDir(path.dirname(filePath));

  if (!existsSync(filePath)) {
    writeFileSync(filePath, content, "utf8");
    return "created";
  }

  const existing = readFileSync(filePath, "utf8");
  const unchanged = md5(stripSyncDate(existing)) === md5(stripSyncDate(content));

  // Siempre se reescribe para sellar la fecha de sincronización de hoy,
  // pero el estado reportado ignora ese sello.
  writeFileSync(filePath, content, "utf8");
  return unchanged ? "unchanged" : "updated";
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Extrae relRefs de un WI que tenga $expand=relations.
 * Si el WI fue descargado en batch (sin expand), wi.relations es undefined → [].
 */
function extractRelRefs(wi) {
  return (wi.relations ?? [])
    .filter(r => RELATION_LABELS[r.rel])
    .map(r => ({ label: RELATION_LABELS[r.rel], id: extractId(r.url) }))
    .filter(r => r.id !== null);
}

function buildRelatedList(relRefs, allWiMap) {
  return relRefs
    .map(({ label, id }) => {
      const rel = allWiMap[id];
      if (!rel) return null;
      const type = rel.fields["System.WorkItemType"] ?? "";
      if (EXCLUDED_TYPES.has(type)) return null;
      return { id, label, type, state: rel.fields["System.State"] ?? "", title: rel.fields["System.Title"] ?? "" };
    })
    .filter(Boolean);
}

function findFeatureParent(relRefs, allWiMap) {
  for (const { label, id } of relRefs) {
    if (label !== "Padre") continue;
    const parent = allWiMap[id];
    if (parent?.fields["System.WorkItemType"] === "Feature") {
      return { id: parent.id, title: parent.fields["System.Title"] ?? "" };
    }
  }
  return null;
}

function groupChildrenByType(relRefs, allWiMap) {
  const groups = {};
  for (const { label, id } of relRefs) {
    if (label !== "Hijo") continue;
    const child = allWiMap[id];
    if (!child) continue;
    const type = child.fields["System.WorkItemType"] ?? "";
    if (EXCLUDED_TYPES.has(type)) continue;
    (groups[type] ??= []).push({
      id:    child.id,
      state: child.fields["System.State"] ?? "",
      title: child.fields["System.Title"] ?? "",
    });
  }
  return groups;
}

async function resolveComments(id, dryRun, noComments) {
  if (dryRun || noComments) return [];
  return fetchComments(id);
}

async function writeItem(wi, relRefs, allWiMap, dryRun, noComments, featureParent = null, childrenByType = null) {
  const type     = wi.fields["System.WorkItemType"] ?? "";
  const id       = wi.id;
  const comments = await resolveComments(id, dryRun, noComments);
  const related  = buildRelatedList(relRefs, allWiMap);
  const struct   = wiToStruct(wi, related, comments, featureParent, childrenByType);
  const md       = buildMarkdown(struct);
  const status   = dryRun ? dryRunStatus(type, id) : syncWikiFile(type, id, md);
  const commentInfo = (!dryRun && !noComments && comments.length)
    ? ` [${comments.length} comentario(s)]`
    : "";
  console.log(`  ${icon(status)} ${filePrefix(type)}-${id} → ${wikiPath(type, id)} [${status}]${commentInfo}`);
  return status;
}

// ─── DEEP EXPANSION (RECURSIVE CASCADE) ────────────────────────────────────────

async function expandDeepCascade(initialIds, allWiMap) {
  const queue = [...initialIds];
  const processed = new Set(); // Controla qué items ya hemos procesado (expandido)
  let discoveredCount = 0;

  while (queue.length > 0) {
    const id = queue.shift();
    if (processed.has(id)) continue; // Ya fue expandido, salta
    processed.add(id);

    let wi = allWiMap[id];

    // Si no está en allWiMap, intentar descargarlo
    if (!wi) {
      try {
        wi = await fetchWorkItem(id);
        allWiMap[id] = wi;
        discoveredCount++;
      } catch (e) {
        // Ignorar si no se puede descargar
        console.warn(`  ⚠️  No se pudo descargar #${id}: ${e.message}`);
        continue;
      }
    }

    // Expandir si es HU o Feature (extraer solo sus relaciones "Hijo" —
    // seguir "Relacionado"/"Padre"/Dependencia arrastraría HUs ajenas y,
    // transitivamente, todo el grafo de work items del proyecto)
    const type = wi.fields["System.WorkItemType"] ?? "";
    if (type === "User Story" || type === "Feature") {
      const childRefs = extractRelRefs(wi).filter(r => r.label === "Hijo");
      for (const { id: childId } of childRefs) {
        if (!processed.has(childId)) {
          queue.push(childId);
        }
      }
    }
  }

  return discoveredCount;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function runFeature(rootId, rootWi, { dryRun, noComments, deep = false }) {
  const rootRelRefs  = extractRelRefs(rootWi);
  const rootChildIds = rootRelRefs.filter(r => r.label === "Hijo").map(r => r.id);

  if (!rootChildIds.length) {
    console.log(`  ℹ️  Feature sin hijos directos\n`);
    const allWiMap = { [rootId]: rootWi };
    const status = await writeItem(rootWi, rootRelRefs, allWiMap, dryRun, noComments, null, {});
    const written = status !== "unchanged" ? 1 : 0;
    console.log(`\n✅ Listo. 1 item(s) procesado(s), ${written} cambio(s)${dryRun ? " — ningún fichero escrito (dry-run)" : ""}.\n`);
    return;
  }

  // Descargar hijos CON relations
  console.log(`  ⬇️  Descargando ${rootChildIds.length} hijo(s) con relaciones...`);
  const childWis = await fetchWorkItemsWithRelations(rootChildIds);

  const allWiMap = { [rootId]: rootWi };
  for (const wi of childWis) allWiMap[wi.id] = wi;

  // Si --deep, expandir cascada desde HUs
  if (deep) {
    const huIds = childWis
      .filter(wi => wi.fields["System.WorkItemType"] === "User Story")
      .map(wi => wi.id);
    if (huIds.length) {
      console.log(`  🔍 Deep: expansión en cascada desde ${huIds.length} HU(s)...`);
      const discovered = await expandDeepCascade(huIds, allWiMap);
      if (discovered > 0) {
        console.log(`  🔍 Deep: ${discovered} item(s) adicional(es) descubierto(s).`);
      }
    }
  } else {
    // Sin --deep, solo descargar referencias directas en batch
    const referencedIds = new Set();
    for (const wi of childWis) {
      for (const { id } of extractRelRefs(wi)) {
        if (!allWiMap[id]) referencedIds.add(id);
      }
    }
    if (referencedIds.size) {
      const refBatch = await fetchWorkItemsBatch([...referencedIds]);
      for (const wi of refBatch) allWiMap[wi.id] = wi;
    }
  }

  const childrenByType = groupChildrenByType(rootRelRefs, allWiMap);

  console.log("");
  let written = 0;

  const featureStatus = await writeItem(rootWi, rootRelRefs, allWiMap, dryRun, noComments, null, childrenByType);
  if (featureStatus !== "unchanged") written++;

  // Escribir todos los HUs
  for (const wi of childWis) {
    const type = wi.fields["System.WorkItemType"] ?? "";
    if (EXCLUDED_TYPES.has(type)) continue;
    const relRefs       = extractRelRefs(wi);
    const featureParent = findFeatureParent(relRefs, allWiMap);
    const status        = await writeItem(wi, relRefs, allWiMap, dryRun, noComments, featureParent);
    if (status !== "unchanged") written++;
  }

  // Si --deep, escribir también Bugs/CRs descubiertos
  if (deep) {
    const writtenIds = new Set([rootId, ...childWis.map(wi => wi.id)]);
    for (const [idStr, wi] of Object.entries(allWiMap)) {
      if (writtenIds.has(Number(idStr))) continue;
      const type = wi.fields["System.WorkItemType"] ?? "";
      if (type !== "Bug" && type !== "Change Request") continue;
      const relRefs       = extractRelRefs(wi);
      const featureParent = findFeatureParent(relRefs, allWiMap);
      const status        = await writeItem(wi, relRefs, allWiMap, dryRun, noComments, featureParent);
      if (status !== "unchanged") written++;
    }
  }

  const total = Object.values(allWiMap).filter(wi => {
    const t = wi.fields["System.WorkItemType"] ?? "";
    return !EXCLUDED_TYPES.has(t);
  }).length;
  console.log(`\n✅ Listo. ${total} item(s) procesado(s), ${written} cambio(s)${dryRun ? " — ningún fichero escrito (dry-run)" : ""}.\n`);
}

async function run(rootId, { onlyRoot = false, deep = false, dryRun = false, debugRels = false, noComments = false } = {}) {
  const flags = [dryRun && "DRY RUN", deep && "DEEP", noComments && "SIN COMENTARIOS"].filter(Boolean);
  console.log(`\n🔄 Sincronizando #${rootId}${flags.length ? ` [${flags.join(" + ")}]` : ""}...\n`);

  // ── Paso 1: root con relations ──────────────────────────────────────────────
  const rootWi   = await fetchWorkItem(rootId);
  const rootType = rootWi.fields["System.WorkItemType"] ?? "";

  if (debugRels) {
    const rels = rootWi.relations ?? [];
    console.log(`[debug] ${rels.length} relación(es) en la API:`);
    for (const r of rels) {
      console.log(`  rel='${r.rel}'  id=${extractId(r.url ?? "") ?? "?"}  url=${r.url}`);
    }
    return;
  }

  if (rootType === "Feature") {
    return runFeature(rootId, rootWi, { dryRun, noComments, deep });
  }

  const rootRelRefs = extractRelRefs(rootWi);

  // ── Paso 2: --only-root ─────────────────────────────────────────────────────
  if (onlyRoot) {
    const allWiMap   = { [rootId]: rootWi };
    const parentIds  = rootRelRefs.filter(r => r.label === "Padre").map(r => r.id);
    if (parentIds.length) {
      const parentBatch = await fetchWorkItemsBatch(parentIds);
      for (const wi of parentBatch) allWiMap[wi.id] = wi;
    }
    const featureParent = findFeatureParent(rootRelRefs, allWiMap);
    await writeItem(rootWi, rootRelRefs, allWiMap, dryRun, noComments, featureParent);
    console.log(`\n✅ Listo. (solo raíz)${dryRun ? " — ningún fichero escrito." : ""}\n`);
    return;
  }

  // ── Paso 3: nivel 1 CON relations ──────────────────────────────────────────
  //
  // CORRECCIÓN CLAVE: fetchWorkItemsBatch NO devuelve relations aunque se pida
  // $expand. Cada item de nivel 1 necesita su propia llamada con expand para
  // que extractRelRefs funcione correctamente.

  const level1Ids = [...new Set(rootRelRefs.map(r => r.id).filter(id => id !== rootId))];

  if (level1Ids.length) {
    console.log(`  ⬇️  Descargando ${level1Ids.length} item(s) de nivel 1 con relaciones...`);
  }
  const level1Wis = await fetchWorkItemsWithRelations(level1Ids);

  const allWiMap = { [rootId]: rootWi };
  for (const wi of level1Wis) allWiMap[wi.id] = wi;

  // ── Paso 4: --deep → expansión en cascada ──────────────────────────────────
  if (deep) {
    const huIds = level1Wis
      .filter(wi => wi.fields["System.WorkItemType"] === "User Story")
      .map(wi => wi.id);
    if (huIds.length) {
      console.log(`  🔍 Deep: expansión en cascada desde ${huIds.length} HU(s)...`);
      const discovered = await expandDeepCascade(huIds, allWiMap);
      if (discovered > 0) {
        console.log(`  🔍 Deep: ${discovered} item(s) adicional(es) descubierto(s).`);
      }
    }
  }

  // ── Paso 5: rellenar allWiMap con fields básicos de cualquier referenciado ──
  const referencedIds = new Set();
  for (const wi of Object.values(allWiMap)) {
    for (const { id } of extractRelRefs(wi)) {
      if (!allWiMap[id]) referencedIds.add(id);
    }
  }
  if (referencedIds.size) {
    const refBatch = await fetchWorkItemsBatch([...referencedIds]);
    for (const wi of refBatch) allWiMap[wi.id] = wi;
  }

  // ── Paso 6: escribir ────────────────────────────────────────────────────────
  console.log("");
  let written = 0;

  // Root
  const rootFeatureParent = findFeatureParent(rootRelRefs, allWiMap);
  const rootStatus = await writeItem(rootWi, rootRelRefs, allWiMap, dryRun, noComments, rootFeatureParent);
  if (rootStatus !== "unchanged") written++;

  // Nivel 1
  for (const wi of level1Wis) {
    const type = wi.fields["System.WorkItemType"] ?? "";
    if (EXCLUDED_TYPES.has(type)) continue;
    const relRefs       = extractRelRefs(wi);
    const featureParent = findFeatureParent(relRefs, allWiMap);
    const status        = await writeItem(wi, relRefs, allWiMap, dryRun, noComments, featureParent);
    if (status !== "unchanged") written++;
  }

  // Nivel 2 (solo --deep, solo Bug/CR)
  if (deep) {
    const writtenIds = new Set([rootId, ...level1Ids]);
    for (const [idStr, wi] of Object.entries(allWiMap)) {
      if (writtenIds.has(Number(idStr))) continue;
      const type = wi.fields["System.WorkItemType"] ?? "";
      if (type !== "Bug" && type !== "Change Request") continue;
      const relRefs       = extractRelRefs(wi);
      const featureParent = findFeatureParent(relRefs, allWiMap);
      const status        = await writeItem(wi, relRefs, allWiMap, dryRun, noComments, featureParent);
      if (status !== "unchanged") written++;
    }
  }

  const total = Object.values(allWiMap).filter(wi => {
    const t = wi.fields["System.WorkItemType"] ?? "";
    return !EXCLUDED_TYPES.has(t);
  }).length;

  console.log(`\n✅ Listo. ${total} item(s) procesado(s), ${written} cambio(s)${dryRun ? " — ningún fichero escrito (dry-run)" : ""}.\n`);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function dryRunStatus(type, id) {
  return existsSync(wikiPath(type, id)) ? "would-update" : "would-create";
}

function icon(status) {
  if (status === "created" || status === "would-create") return "✨";
  if (status === "updated"  || status === "would-update")  return "♻️ ";
  return "✓ ";
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const HELP = `
Uso: node sync-hu.mjs <ID> [flags]

Flags:
  --only-root          Solo la HU raíz; no descarga ni escribe relacionados
  --deep               Cascada recursiva sin límite de profundidad: expande
                       todos los HUs relacionados (directa e indirectamente)
                       y sus Bugs/CRs. Evita bucles infinitos automáticamente.
  --dry-run            Muestra qué se crearía/actualizaría sin tocar disco
                       (omite la descarga de comentarios)
  --no-comments        Omite la descarga de comentarios (más rápido)
  --debug-relations    Vuelca todos los tipos de relación crudos de la API

Variables de entorno (obligatorias):
  AZURE_ORG, AZURE_PROJECT, AZURE_PAT

Variables de entorno (opcionales):
  WIKI_ROOT            Ruta raíz de la wiki (default: docs/wiki)

Ejemplos:
  node sync-hu.mjs 1099
  node sync-hu.mjs 1099 --only-root
  node sync-hu.mjs 1099 --deep
  node sync-hu.mjs 1099 --deep --dry-run
  node sync-hu.mjs 1099 --no-comments
`.trim();

const argv       = process.argv.slice(2);
const rawArg     = argv.find(a => !a.startsWith("--"));
const onlyRoot   = argv.includes("--only-root");
const deep       = argv.includes("--deep");
const dryRun     = argv.includes("--dry-run");
const debugRels  = argv.includes("--debug-relations");
const noComments = argv.includes("--no-comments");

if (!rawArg || argv.includes("--help") || argv.includes("-h")) {
  console.log(HELP);
  process.exit(rawArg ? 0 : 1);
}

const id = parseInt(rawArg.replace(/\D/g, ""), 10);
if (isNaN(id)) {
  console.error(`❌ ID inválido: ${rawArg}`);
  process.exit(1);
}

run(id, { onlyRoot, deep, dryRun, debugRels, noComments }).catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
