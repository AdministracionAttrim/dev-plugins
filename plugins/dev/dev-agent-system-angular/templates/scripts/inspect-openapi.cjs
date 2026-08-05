const fs = require('fs');
const path = require('path');

const openApiPath = path.join(process.cwd(), 'openApi.json');
try {
  const content = fs.readFileSync(openApiPath, 'utf-8');
  const doc = JSON.parse(content);
  const schemas = doc.components && doc.components.schemas ? doc.components.schemas : {};

  // 1. Find all *Lite schemas
  const liteSchemas = Object.keys(schemas).filter(k => k.endsWith('Lite') || k.endsWith('DtoLite'));
  console.log(`Found ${liteSchemas.length} Lite schemas:`, liteSchemas);

  // 2. Find references to these schemas
  const references = {};

  function findRefs(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;

    if (obj.$ref) {
      const refName = obj.$ref.split('/').pop();
      if (liteSchemas.includes(refName)) {
        if (!references[refName]) references[refName] = [];
        references[refName].push(path);
      }
    }

    Object.entries(obj).forEach(([k, v]) => {
        // Skip some keys to avoid infinite loops if any (though schema structure usually tree-like w/ refs)
        findRefs(v, path ? `${path}.${k}` : k);
    });
  }

  findRefs(doc);

  console.log('\nUsage of Lite Schemas:');
  Object.entries(references).forEach(([schema, paths]) => {
      console.log(`\n${schema} is used in:`);
      paths.forEach(p => console.log(`  - ${p}`));
  });

} catch (e) {
  console.error('Error reading openApi.json:', e);
}
