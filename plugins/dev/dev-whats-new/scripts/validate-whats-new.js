#!/usr/bin/env node
"use strict";

/**
 * Valida un whats-new.json contra whats-new.schema.json y aplica las reglas
 * semánticas que JSON Schema no expresa (versiones únicas y ordenadas, ids únicos
 * por versión, imágenes existentes).
 *
 * Sin dependencias externas: implementa el subconjunto de JSON Schema que usa el
 * contrato (type, const, enum, required, dependentRequired, properties, additionalProperties,
 * propertyNames, minProperties, items, minItems, maxItems, minLength, maxLength,
 * pattern, oneOf y $ref a #/$defs).
 *
 * Uso:
 *   node validate-whats-new.js <ruta/whats-new.json> [opciones]
 *
 * Opciones:
 *   --schema=<ruta>        schema a usar. Por defecto: whats-new.schema.json junto a
 *                          este script (copia en el proyecto) o el del plugin.
 *   --assets-root=<dir>    carpeta base de las rutas "image"; si se indica, comprueba
 *                          que cada imagen local exista.
 *   --require=<x.y.z>      falla si no existe una entrada para esa versión.
 *   --quiet                solo imprime errores.
 *
 * Salida: 0 válido, 1 inválido, 2 error de uso o de lectura.
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const opts = { file: null, schema: null, assetsRoot: null, require: null, quiet: false };
  for (const arg of argv) {
    if (arg === "--quiet") opts.quiet = true;
    else if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg.startsWith("--schema=")) opts.schema = arg.slice(9);
    else if (arg.startsWith("--assets-root=")) opts.assetsRoot = arg.slice(14);
    else if (arg.startsWith("--require=")) opts.require = arg.slice(10);
    else if (arg.startsWith("--")) throw new Error(`Opción desconocida: ${arg}`);
    else if (!opts.file) opts.file = arg;
    else throw new Error(`Argumento de más: ${arg}`);
  }
  return opts;
}

function defaultSchemaPath() {
  const candidates = [
    path.join(__dirname, "whats-new.schema.json"),
    path.join(__dirname, "..", "skills", "whats-new", "schema", "whats-new.schema.json"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[candidates.length - 1];
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    throw new Error(`No se puede leer ${label} (${filePath}): ${e.message}`);
  }
  try {
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (e) {
    throw new Error(`${label} no es JSON válido (${filePath}): ${e.message}`);
  }
}

// --- Validador mínimo de JSON Schema ---

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function typeMatches(expected, value) {
  const actual = typeOf(value);
  return expected === actual || (expected === "number" && actual === "integer");
}

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`$ref no soportado: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((node, key) => {
      if (!node || !(key in node)) throw new Error(`$ref sin resolver: ${ref}`);
      return node[key];
    }, root);
}

function validate(schema, value, at, root, errors) {
  if (schema.$ref) return validate(resolveRef(root, schema.$ref), value, at, root, errors);

  if (schema.oneOf) {
    const results = schema.oneOf.map((sub) => {
      const subErrors = [];
      validate(sub, value, at, root, subErrors);
      return subErrors;
    });
    const passing = results.filter((r) => r.length === 0).length;
    if (passing === 1) return;
    if (passing > 1) {
      errors.push(`${at}: encaja en más de una alternativa (oneOf).`);
      return;
    }
    // Ninguna encaja: reporta la alternativa más cercana. Un error de tipo en la propia
    // ruta significa que esa alternativa ni siquiera era la intención.
    const score = (r) => r.length + (r.some((e) => e.startsWith(`${at}: se esperaba`)) ? 1000 : 0);
    errors.push(...results.reduce((best, r) => (score(r) < score(best) ? r : best)));
    return;
  }

  if ("const" in schema && value !== schema.const) {
    errors.push(`${at}: debe ser ${JSON.stringify(schema.const)}.`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: debe ser uno de ${schema.enum.map((v) => JSON.stringify(v)).join(", ")}.`);
    return;
  }
  if (schema.type && !typeMatches(schema.type, value)) {
    errors.push(`${at}: se esperaba ${schema.type} y es ${typeOf(value)}.`);
    return;
  }

  if (typeof value === "string") {
    if (schema.minLength != null && [...value].length < schema.minLength)
      errors.push(`${at}: mínimo ${schema.minLength} caracteres (tiene ${[...value].length}).`);
    if (schema.maxLength != null && [...value].length > schema.maxLength)
      errors.push(`${at}: máximo ${schema.maxLength} caracteres (tiene ${[...value].length}).`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value))
      errors.push(`${at}: ${JSON.stringify(value)} no cumple el patrón ${schema.pattern}.`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems)
      errors.push(`${at}: mínimo ${schema.minItems} elementos (tiene ${value.length}).`);
    if (schema.maxItems != null && value.length > schema.maxItems)
      errors.push(`${at}: máximo ${schema.maxItems} elementos (tiene ${value.length}).`);
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, `${at}[${i}]`, root, errors));
  }

  if (typeOf(value) === "object") {
    const keys = Object.keys(value);
    if (schema.minProperties != null && keys.length < schema.minProperties)
      errors.push(`${at}: mínimo ${schema.minProperties} propiedades.`);
    for (const req of schema.required || []) {
      if (!(req in value)) errors.push(`${at}: falta "${req}".`);
    }
    for (const [key, needs] of Object.entries(schema.dependentRequired || {})) {
      if (!(key in value)) continue;
      for (const req of needs) if (!(req in value)) errors.push(`${at}: con "${key}" hace falta "${req}".`);
    }
    const props = schema.properties || {};
    for (const key of keys) {
      const childAt = `${at}.${key}`;
      if (schema.propertyNames) validate(schema.propertyNames, key, `${at}{${key}}`, root, errors);
      if (key in props) validate(props[key], value[key], childAt, root, errors);
      else if (schema.additionalProperties === false) errors.push(`${at}: propiedad no permitida "${key}".`);
      else if (typeOf(schema.additionalProperties) === "object")
        validate(schema.additionalProperties, value[key], childAt, root, errors);
    }
  }
}

// --- Reglas semánticas ---

const SEMVER = /^\d+\.\d+\.\d+$/;
const MAX_IMAGE_KB = 300;
const MAX_SVG_KB = 60;
const MAX_VIDEO_KB = 1536;

function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

function semanticChecks(data, opts, errors, warnings) {
  const releases = Array.isArray(data.releases) ? data.releases : [];
  const seen = new Set();
  let lastValid = null;
  releases.forEach((rel, i) => {
    const at = `releases[${i}]`;
    if (!rel || typeof rel.version !== "string") return;
    if (seen.has(rel.version)) errors.push(`${at}: versión ${rel.version} duplicada.`);
    seen.add(rel.version);

    // Versiones mal formadas ya las reporta el schema; aquí solo se ordenan las válidas.
    if (SEMVER.test(rel.version)) {
      if (lastValid && compareSemver(lastValid, rel.version) <= 0) {
        errors.push(`${at}: orden descendente roto, ${rel.version} va después de ${lastValid}.`);
      }
      lastValid = rel.version;
    }

    const ids = new Set();
    (Array.isArray(rel.items) ? rel.items : []).forEach((item, j) => {
      if (!item || typeof item.id !== "string") return;
      if (ids.has(item.id)) errors.push(`${at}.items[${j}]: id "${item.id}" repetido en la versión ${rel.version}.`);
      ids.add(item.id);

      for (const field of ["image", "video"]) {
        const ref = item[field];
        if (!opts.assetsRoot || typeof ref !== "string" || /^(https:\/\/|\/)/.test(ref)) continue;
        const file = path.resolve(opts.assetsRoot, ref);
        if (!fs.existsSync(file)) {
          errors.push(`${at}.items[${j}].${field}: no existe ${file}.`);
          continue;
        }
        const kb = fs.statSync(file).size / 1024;
        const max = field === "video" ? MAX_VIDEO_KB : /\.svg$/i.test(file) ? MAX_SVG_KB : MAX_IMAGE_KB;
        if (kb > max) warnings.push(`${at}.items[${j}].${field}: pesa ${kb.toFixed(0)} KB (recomendado <= ${max} KB); se descarga con la app.`);
      }
      if (item.image && !item.imageAlt) warnings.push(`${at}.items[${j}]: tiene "image" pero no "imageAlt" (texto alternativo para lectores de pantalla).`);
      if (!item.icon && !item.image) warnings.push(`${at}.items[${j}]: sin "icon" ni "image"; la cabecera usará el icono por defecto.`);
    });
  });

  if (opts.require && !seen.has(opts.require)) {
    errors.push(`No hay entrada para la versión ${opts.require}.`);
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (opts.help || !opts.file) {
    console.error("Uso: node validate-whats-new.js <whats-new.json> [--schema=<ruta>] [--assets-root=<dir>] [--require=<x.y.z>] [--quiet]");
    process.exit(opts.help ? 0 : 2);
  }

  let schema, data;
  try {
    schema = readJson(opts.schema || defaultSchemaPath(), "El schema");
    data = readJson(opts.file, "El fichero de novedades");
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const errors = [];
  const warnings = [];
  validate(schema, data, "$", schema, errors);
  semanticChecks(data, opts, errors, warnings);

  if (!opts.quiet) warnings.forEach((w) => console.warn(`  aviso: ${w}`));
  if (errors.length > 0) {
    console.error(`${opts.file}: ${errors.length} error(es)\n`);
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  if (!opts.quiet) {
    const count = Array.isArray(data.releases) ? data.releases.length : 0;
    console.log(`${opts.file} es válido (${count} versión/es).`);
  }
}

main();
