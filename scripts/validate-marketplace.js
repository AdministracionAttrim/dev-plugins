#!/usr/bin/env node
// Valida .claude-plugin/marketplace.json y los plugins que referencia.
// Sin dependencias externas: solo Node.js built-ins.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const errors = [];

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function extractFrontmatterField(frontmatter, field) {
  const re = new RegExp(`^${field}\\s*:\\s*(.+)$`, "m");
  const match = frontmatter.match(re);
  return match ? match[1].trim() : null;
}

function validateSkillFile(skillPath) {
  const content = fs.readFileSync(skillPath, "utf8");
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    errors.push(`${skillPath}: falta el frontmatter YAML (--- ... ---).`);
    return;
  }
  const frontmatter = fmMatch[1];
  const name = extractFrontmatterField(frontmatter, "name");
  const description = extractFrontmatterField(frontmatter, "description");
  if (!name) errors.push(`${skillPath}: el frontmatter no tiene campo "name".`);
  if (!description) errors.push(`${skillPath}: el frontmatter no tiene campo "description".`);
}

function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(full));
    } else if (entry.name === "SKILL.md") {
      results.push(full);
    }
  }
  return results;
}

const marketplacePath = path.join(ROOT, ".claude-plugin", "marketplace.json");
if (!fs.existsSync(marketplacePath)) {
  console.error(`No se encuentra ${marketplacePath}`);
  process.exit(1);
}

let marketplace;
try {
  marketplace = readJson(marketplacePath);
} catch (e) {
  console.error(`marketplace.json no es JSON válido: ${e.message}`);
  process.exit(1);
}

if (!marketplace.name) errors.push("marketplace.json: falta el campo raíz \"name\".");
if (!marketplace.owner) errors.push("marketplace.json: falta el campo raíz \"owner\".");
if (!Array.isArray(marketplace.plugins)) {
  errors.push("marketplace.json: el campo \"plugins\" debe ser un array.");
} else {
  marketplace.plugins.forEach((plugin, i) => {
    const label = `marketplace.json plugins[${i}]`;
    if (!plugin.name) errors.push(`${label}: falta "name".`);
    if (!plugin.source) errors.push(`${label}: falta "source".`);

    if (plugin.source && plugin.source.startsWith("./")) {
      const pluginDir = path.join(ROOT, plugin.source);
      const pluginJsonPath = path.join(pluginDir, ".claude-plugin", "plugin.json");

      if (!fs.existsSync(pluginJsonPath)) {
        errors.push(`${label}: no existe ${path.relative(ROOT, pluginJsonPath)}`);
      } else {
        try {
          const pluginJson = readJson(pluginJsonPath);
          for (const field of ["name", "version", "description", "author"]) {
            if (!pluginJson[field]) {
              errors.push(`${path.relative(ROOT, pluginJsonPath)}: falta el campo "${field}".`);
            }
          }
        } catch (e) {
          errors.push(`${path.relative(ROOT, pluginJsonPath)} no es JSON válido: ${e.message}`);
        }
      }

      for (const skillFile of findSkillFiles(path.join(pluginDir, "skills"))) {
        validateSkillFile(skillFile);
      }
    }
  });
}

if (errors.length > 0) {
  console.error("Errores de validación encontrados:\n");
  errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
}

console.log("marketplace.json y todos los plugins referenciados son válidos.");
