import * as fs from 'node:fs';

interface SwaggerData {
  components?: { schemas?: Record<string, any> };
  schemas?: Record<string, any>;
}

const input = fs.readFileSync(0, 'utf-8');
const data: SwaggerData = JSON.parse(input);
const schemas = data.components?.schemas || data.schemas || {};

const isIgnored = (n: string): boolean => {
  n = n.toLowerCase();
  return n.startsWith('paged') || /response|header|metadata|page/.test(n);
};

const result: Record<string, Record<string, number>> = {};

for (const [dto, schema] of Object.entries(schemas)) {
  if (isIgnored(dto) || !schema?.properties) continue;
  const fields: Record<string, number> = {};
  for (const [field, prop] of Object.entries(schema.properties)) {
    const p = prop as any;
    if (p?.type === 'string' && typeof p.maxLength === 'number') {
      fields[field] = p.maxLength;
    }
  }
  if (Object.keys(fields).length > 0) {
    result[dto] = fields;
  }
}

console.log(JSON.stringify(result));