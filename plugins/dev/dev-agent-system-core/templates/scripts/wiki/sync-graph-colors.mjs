import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const colorsPath = join(ROOT, 'docs/wiki/graph-colors.json');
const obsidianDir = join(ROOT, 'docs/wiki/.obsidian');
const graphPath = join(obsidianDir, 'graph.json');

console.log('Sincronizando colores del grafo de Obsidian...');

if (!existsSync(colorsPath)) {
  console.error('❌ docs/wiki/graph-colors.json no encontrado.');
  process.exit(1);
}

const colorGroups = JSON.parse(readFileSync(colorsPath, 'utf8'));

if (!existsSync(obsidianDir)) {
  mkdirSync(obsidianDir, { recursive: true });
}

let graphConfig = {};
if (existsSync(graphPath)) {
  try {
    graphConfig = JSON.parse(readFileSync(graphPath, 'utf8'));
  } catch (e) {
    console.warn('⚠️ No se pudo leer graph.json, se creará uno nuevo.');
  }
}

// Inyectar o reemplazar solo la parte de los colorGroups
graphConfig.colorGroups = colorGroups;

writeFileSync(graphPath, JSON.stringify(graphConfig, null, 2), 'utf8');

console.log('✅ Colores sincronizados correctamente (graph.json actualizado de forma no destructiva).');
