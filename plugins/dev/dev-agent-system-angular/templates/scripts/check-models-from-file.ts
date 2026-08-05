import * as fs from 'fs';
import * as path from 'path';
import {
  EnumDeclaration,
  InterfaceDeclaration,
  Project,
  SourceFile,
  SyntaxKind,
  Type,
  TypeAliasDeclaration
} from 'ts-morph';

// Interface for OpenAPI schema
interface OpenAPISchema {
  type?: string;
  properties?: Record<string, any>;
  items?: any;
  $ref?: string;
  enum?: string[];
  format?: string;
  allOf?: any[];
  oneOf?: any[];
  anyOf?: any[];
}

interface OpenAPIDocument {
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
}

// Read and parse the OpenAPI JSON file
const openApiPath = path.join(process.cwd(), 'openApi.json');
const openApiContent = fs.readFileSync(openApiPath, 'utf-8');
const openApiDoc: OpenAPIDocument = JSON.parse(openApiContent);

const schemas = openApiDoc.components?.schemas || {};

// Initialize ts-morph project
console.log('⏳ Inicializando proyecto TypeScript (esto puede tardar un poco)...');
const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: false
});

// Add all source files to find models and enums
const sourceFiles = project.addSourceFilesAtPaths([
  'src/**/*.ts',
  '!src/**/*.spec.ts',
  '!src/**/*.stories.ts',
  '!api-dtos/**/*'
]);

console.log(`📂 Archivos cargados: ${sourceFiles.length}`);

const modelFileMap: Map<string, SourceFile> = new Map(
  sourceFiles.map(f => [f.getBaseName(), f])
);

/**
 * Check if a DTO should be ignored
 */
function isIgnoredDto(dtoName: string): boolean {
  const n = dtoName.toLowerCase();
  return (
    n.startsWith('paged') ||
    n.includes('response') ||
    n.includes('header') ||
    n.includes('metadata') ||
    n.includes('page')
  );
}

/**
 * Normalize DTO name to Model name
 * CompanyDto -> Company
 * CompanyDtoLite -> CompanyLite
 */
function normalizeDtoName(dtoName: string): string {
  // Remove 'Dto' from the end if present
  if (dtoName.endsWith('Dto')) {
    return dtoName.slice(0, -3);
  }
  // Handle *DtoSearch -> *Search
  if (dtoName.endsWith('DtoSearch')) {
    return dtoName.replace('DtoSearch', 'Search');
  }
  // Fallback: remove DTO case insensitive
  return dtoName.replace(/Dto/i, '');
}

/**
 * Get corresponding model file for a DTO name
 */
function getCorrespondingModelFile(dtoName: string): SourceFile | null {
  const baseName = normalizeDtoName(dtoName);

  // Convert PascalCase to kebab-case
  const kebabName = baseName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

  const modelFileName = `${kebabName}.model.ts`;

  // Try exact match
  if (modelFileMap.has(modelFileName)) {
    return modelFileMap.get(modelFileName) ?? null;
  }

  // Try finding a file that exports the interface/type
  for (const file of sourceFiles) {
    // Check if file exports a type/interface with the baseName
    const exported = file.getExportedDeclarations();
    for (const [name] of exported) {
      if (name.toLowerCase() === baseName.toLowerCase() ||
          name.toLowerCase() === baseName.toLowerCase() + 'model') {
        return file;
      }
    }
  }

  return null;
}

/**
 * Get main model declaration from model file
 */
function getModelMainDeclaration(
  modelFile: SourceFile,
  dtoName: string
): InterfaceDeclaration | TypeAliasDeclaration | null {
  const baseName = normalizeDtoName(dtoName);

  // Try exact match
  let decl = modelFile.getInterface(baseName) || modelFile.getTypeAlias(baseName);
  if (decl) return decl;

  // Try with Model suffix
  decl = modelFile.getInterface(baseName + 'Model') || modelFile.getTypeAlias(baseName + 'Model');
  if (decl) return decl;

  // Case insensitive search
  const exported = modelFile.getExportedDeclarations();
  for (const [name, declarations] of exported) {
    if (name.toLowerCase() === baseName.toLowerCase() ||
        name.toLowerCase() === (baseName + 'model').toLowerCase()) {
      for (const d of declarations) {
        if (d.getKind() === SyntaxKind.InterfaceDeclaration ||
            d.getKind() === SyntaxKind.TypeAliasDeclaration) {
          return d as InterfaceDeclaration | TypeAliasDeclaration;
        }
      }
    }
  }

  return null;
}

/**
 * Extract properties from OpenAPI schema
 */
function extractPropertiesFromSchema(
  schema: OpenAPISchema,
  schemas: Record<string, OpenAPISchema>,
  visited: Set<string> = new Set()
): Map<string, OpenAPISchema> {
  const properties = new Map<string, OpenAPISchema>();

  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (refName && !visited.has(refName) && schemas[refName]) {
      visited.add(refName);
      const refProps = extractPropertiesFromSchema(schemas[refName], schemas, visited);
      refProps.forEach((v, k) => properties.set(k, v));
    }
    return properties;
  }

  if (schema.allOf) {
    schema.allOf.forEach(subSchema => {
      const subProps = extractPropertiesFromSchema(subSchema, schemas, visited);
      subProps.forEach((v, k) => properties.set(k, v));
    });
  }

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      properties.set(key, value);
    });
  }

  return properties;
}

/**
 * Get apparent properties from model type
 */
function getApparentProps(type: Type): Set<string> {
  const props = new Set(type.getApparentProperties().map(p => p.getName()));

  // Add BaseEntity props if applicable (heuristic)
  if (type.getText().includes('BaseEntity')) {
    props.add('id');
    props.add('creationDate');
    props.add('deletionDate');
  }
  return props;
}

// --- Enum Comparison Logic ---

function resolveSchema(schema: OpenAPISchema): OpenAPISchema {
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (refName && schemas[refName]) {
      return resolveSchema(schemas[refName]);
    }
  }
  return schema;
}

interface EnumDifference {
  enumName: string;
  propName: string;
  missingValues: string[];
  extraValues: string[];
}

function compareEnums(
  backendEnumValues: string[],
  frontendType: Type,
  propName: string
): EnumDifference | null {
  // Try to find if it's an EnumDeclaration
  const symbol = frontendType.getSymbol() || frontendType.getAliasSymbol();

  if (symbol) {
    const declarations = symbol.getDeclarations();
    const enumDecl = declarations.find(d => d.getKind() === SyntaxKind.EnumDeclaration) as EnumDeclaration | undefined;

    if (enumDecl) {
        const frontendValues = enumDecl.getMembers().map(m => {
        const val = m.getValue();
        return typeof val === 'string' ? val : m.getName(); // Fallback to name if no string value
        });

        const missing = backendEnumValues.filter(v => !frontendValues.includes(v));
        const extra = frontendValues.filter(v => !backendEnumValues.includes(v) && typeof v === 'string');

        if (missing.length > 0 || extra.length > 0) {
        return {
            enumName: enumDecl.getName(),
            propName,
            missingValues: missing,
            extraValues: extra
        };
        }
        // If it's an enum declaration, we stop here (don't check union/string literal)
        return null;
    }
  }

  // Handle Union Types (e.g. 'A' | 'B')
  if (frontendType.isUnion()) {
    const unionTypes = frontendType.getUnionTypes();
    const frontendValues = unionTypes
      .map(t => t.isStringLiteral() ? t.getLiteralValue() : null)
      .filter((v): v is string => v !== null);

    if (frontendValues.length > 0) {
       const missing = backendEnumValues.filter(v => !frontendValues.includes(v));
       const extra = frontendValues.filter(v => !backendEnumValues.includes(v));

       if (missing.length > 0 || extra.length > 0) {
        return {
          enumName: 'Union Type',
          propName,
          missingValues: missing,
          extraValues: extra
        };
      }
    }
  }

  // Handle single String Literal (e.g. type Status = 'ACTIVE')
  if (frontendType.isStringLiteral()) {
      const val = frontendType.getLiteralValue();
      if (typeof val === 'string') {
        const frontendValues = [val];

        const missing = backendEnumValues.filter(v => !frontendValues.includes(v));
        const extra = frontendValues.filter(v => !backendEnumValues.includes(v));

        if (missing.length > 0 || extra.length > 0) {
            return {
            enumName: 'String Literal',
            propName,
            missingValues: missing,
            extraValues: extra
            };
        }
      }
  }

  return null;
}

/**
 * Check if frontend type is generic string when backend expects Enum
 */
function isGenericStringVsEnum(
  backendEnumValues: string[],
  frontendType: Type
): boolean {
  // If it's a string literal or union of literals, it's NOT a generic string mismatch (it's covered by compareEnums)
  if (frontendType.isStringLiteral() || frontendType.isUnion()) {
    return false;
  }

  // If it's an enum declaration, it's also covered
  const symbol = frontendType.getSymbol() || frontendType.getAliasSymbol();
  if (symbol) {
     const declarations = symbol.getDeclarations();
     if (declarations.some(d => d.getKind() === SyntaxKind.EnumDeclaration)) {
         return false;
     }
  }

  // Check if it is a string
  return frontendType.getText() === 'string';
}


// --- Main Execution ---

const DEFAULT_IGNORED_MODEL_PROPS = new Set([
  'id', 'creationDate', 'deletionDate', 'tenant', 'lastUpdate',
  'registrationDate', 'deactivationDate', 'rowId'
]);

interface ModelDifference {
  dtoName: string;
  modelFile: string;
  missingInFrontend: string[];
  extraInFrontend: string[];
  enumDifferences: EnumDifference[];
  typeMismatches: TypeMismatch[];
}

interface TypeMismatch {
  propName: string;
  expectedType: string;
  foundType: string;
}



const differences: ModelDifference[] = [];
const missingModels: string[] = [];
const missingDomainValues: string[] = [];

// --- Domain Values Check ---
function checkDomainValues(schemas: Record<string, OpenAPISchema>) {
    console.log('🔍 Verificando DOMAIN_VALUES en domains-values.constants.ts...');
    const domainValuesFile = project.addSourceFileAtPath('src/app/shared/constants/domains-values.constants.ts');
    const domainValuesVar = domainValuesFile.getVariableDeclaration('DOMAIN_VALUES');

    if (!domainValuesVar) {
        console.error('❌ No se encontró DOMAIN_VALUES en domains-values.constants.ts');
        return;
    }

    let initializer = domainValuesVar.getInitializer();
    if (!initializer) {
         console.error('❌ DOMAIN_VALUES no tiene inicializador');
         return;
    }

    // Unwrap expressions like 'as const' or 'satisfies'
    while (initializer && (initializer.getKind() === SyntaxKind.AsExpression || initializer.getKind() === SyntaxKind.SatisfiesExpression || initializer.getKind() === SyntaxKind.ParenthesizedExpression)) {
        initializer = (initializer as any).getExpression();
    }

    if (!initializer || initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
         console.error(`❌ DOMAIN_VALUES inicializador no es ObjectLiteral. Es: ${initializer?.getKindName()}`);
         return;
    }

    const implementedEnums = new Set((initializer as any).getProperties().map((p: any) => {
        if (p.getKind() === SyntaxKind.PropertyAssignment) {
            return p.getName();
        }
        return '';
    }));

    // Convert CamelCase DTO Enum names to CONSTANT_CASE if possible, or just exact match logic
    // Actually, usually Backend Enums like 'MeterStatus' match 'METER_STATUS' or similar in DOMAIN_VALUES.
    // Or sometimes strict match.
    // Heuristic: Convert PascalCase to SNAKE_CASE_UPPER
    const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase().replace(/^_/, '');

    for (const [name, schema] of Object.entries(schemas)) {
        if (schema.enum) {
            // It is an enum DTO
            const snakeName = toSnakeCase(name);
            // Check direct name or snake case
            if (!implementedEnums.has(name) && !implementedEnums.has(snakeName)) {
                // Ignore some specific ones if needed, or just report all
                 missingDomainValues.push(`${name} (Expected as ${snakeName} or ${name})`);
            }
        }
    }
}


let totalDtos = 0;
let dtosWithModel = 0;

console.log('\n🔍 Comparando DTOs y ENUMS...\n');

checkDomainValues(schemas);

for (const [dtoName, schema] of Object.entries(schemas)) {
  // Filter DTOs
  if (!dtoName.includes('Dto')) continue;
  if (isIgnoredDto(dtoName)) continue;

  totalDtos++;

  const backendPropsMap = extractPropertiesFromSchema(schema, schemas);
  if (backendPropsMap.size === 0) continue;

  const modelFile = getCorrespondingModelFile(dtoName);
  if (!modelFile) {
    missingModels.push(dtoName);
    continue;
  }

  const modelDecl = getModelMainDeclaration(modelFile, dtoName);
  if (!modelDecl) {
    missingModels.push(dtoName + " (File found but type not found)");
    continue;
  }

  dtosWithModel++;

  const modelType = modelDecl.getType();
  const frontendProps = getApparentProps(modelType);

  const missingInFrontend: string[] = [];
  const extraInFrontend: string[] = [];
  const enumDiffs: EnumDifference[] = [];
  const typeMismatches: TypeMismatch[] = [];

  // Compare Properties
  const backendProps = Array.from(backendPropsMap.keys());

  // Normalize for comparison
  const normalize = (s: string) => s.replace(/[-_\s]/g, '').toLowerCase();

  const frontendNormMap = new Map<string, string>();
  frontendProps.forEach(p => frontendNormMap.set(normalize(p), p));

  for (const [propName, propSchema] of backendPropsMap) {
    const normProp = normalize(propName);

    if (!frontendNormMap.has(normProp)) {
      missingInFrontend.push(propName);
    } else {
      const frontendPropName = frontendNormMap.get(normProp)!;
      const propSymbol = modelType.getProperty(frontendPropName);

      if (propSymbol) {
        const valDecl = propSymbol.getValueDeclaration();
        if (valDecl) {
          const propType = valDecl.getType();

          // Check Enum
          const resolvedSchema = resolveSchema(propSchema);
          if (resolvedSchema.enum) {
            const diff = compareEnums(resolvedSchema.enum, propType, propName);
            if (diff) {
              enumDiffs.push(diff);
            } else if (isGenericStringVsEnum(resolvedSchema.enum, propType)) {
                // Critical: Expected Enum but found String
                 typeMismatches.push({
                    propName,
                    expectedType: 'Enum (' + resolvedSchema.enum.join('|') + ')',
                    foundType: 'string'
                 });
            }
          }

          // Check Type Mismatch (Lite vs Full)
          let expectedTypeName: string | null = null;
          let schemaToCheck = propSchema;

          // Handle Array types
          if (propSchema.type === 'array' && propSchema.items) {
             schemaToCheck = propSchema.items;
          }

          if (schemaToCheck.$ref) {
            const refName = schemaToCheck.$ref.split('/').pop();
            if (refName) {
               expectedTypeName = normalizeDtoName(refName);
            }
          }

          if (expectedTypeName && (expectedTypeName.endsWith('Search') || expectedTypeName !== normalizeDtoName(propType.getText().split('.').pop() || ''))) {
             // Get simple name from frontend type (remove array [], import path, etc)
             let frontendTypeName = propType.getText();

             // Clean up array notation
             if (frontendTypeName.endsWith('[]')) {
                 frontendTypeName = frontendTypeName.slice(0, -2);
             }
             if (frontendTypeName.includes('Array<')) {
                 frontendTypeName = frontendTypeName.replace(/Array<(.+)>/, '$1');
             }

             // Handle union types (e.g. "import(...).CenterSearch | null") -> take the main type
             const typesInUnion = frontendTypeName.split(' | ');
             const relevantType = typesInUnion.find(t => t !== 'null' && t !== 'undefined') || frontendTypeName;

             // Remove import paths "import(...)."
             const simpleFrontendTypeName = relevantType.split('.').pop() || relevantType;

             // Normalize both for comparison
             const normalizedExpected = expectedTypeName.toLowerCase();
             const normalizedFrontend = simpleFrontendTypeName.toLowerCase();

             // Check specifically for Search vs non-Search mismatch
             const expectedIsSearch = normalizedExpected.endsWith('search');
             const frontendIsSearch = normalizedFrontend.endsWith('search');

             if (expectedIsSearch !== frontendIsSearch) {
                 // Check if the base name matches (e.g. CompanySearch vs Company)
                 const valExpectedBase = normalizedExpected.replace('search', '');
                 const valFrontendBase = normalizedFrontend.replace('search', '');

                 if (valExpectedBase === valFrontendBase) {
                     typeMismatches.push({
                         propName,
                         expectedType: expectedTypeName,
                         foundType: simpleFrontendTypeName
                     });
                 }
             }
          }
        }
      }
    }
  }

  // Check extras
  const backendNormSet = new Set(backendProps.map(normalize));
  for (const p of frontendProps) {
    if (!backendNormSet.has(normalize(p)) && !DEFAULT_IGNORED_MODEL_PROPS.has(p)) {
      extraInFrontend.push(p);
    }
  }

  if (missingInFrontend.length > 0 || extraInFrontend.length > 0 || enumDiffs.length > 0 || typeMismatches.length > 0) {
    differences.push({
      dtoName,
      modelFile: modelFile.getBaseName(),
      missingInFrontend,
      extraInFrontend,
      enumDifferences: enumDiffs,
      typeMismatches
    });
  }
}

// --- Report ---

console.log('='.repeat(80));
console.log('📊 REPORTE DE SINCRONIZACIÓN');
console.log('='.repeat(80));

console.log(`Procesados: ${totalDtos}  |  Encontrados: ${dtosWithModel}`);
console.log(`Faltan modelos: ${missingModels.length}  |  Faltan enums: ${missingDomainValues.length}`);
console.log('='.repeat(80) + '\n');

if (missingModels.length > 0) {
  console.log(`❌ MODELOS FALTANTES (${missingModels.length}): ${missingModels.map(m => normalizeDtoName(m)).join(', ')}`);
  console.log('');
}

if (missingDomainValues.length > 0) {
  console.log(`❌ ENUMS FALTANTES (${missingDomainValues.length}): ${missingDomainValues.join(', ')}`);
  console.log('');
}

if (differences.length > 0) {
  console.log(`⚠️ DIFERENCIAS EN MODELOS (${differences.length}):`);

  differences.forEach(diff => {
    console.log(`\n📌 ${diff.dtoName} (${diff.modelFile})`);

    if (diff.missingInFrontend.length) {
      console.log(`  ❌ Faltan: ${diff.missingInFrontend.join(', ')}`);
    }
    if (diff.extraInFrontend.length) {
      console.log(`  ⚠️ Sobran: ${diff.extraInFrontend.join(', ')}`);
    }
    if (diff.enumDifferences.length) {
      diff.enumDifferences.forEach(ed => {
        console.log(`  🔢 ${ed.propName} (${ed.enumName}):`);
        if (ed.missingValues.length) console.log(`     - faltan ${ed.missingValues.join(', ')}`);
        if (ed.extraValues.length) console.log(`     + sobran ${ed.extraValues.join(', ')}`);
      });
    }
    if (diff.typeMismatches?.length) {
      diff.typeMismatches.forEach(tm => {
        console.log(`  🔄 ${tm.propName}: espera ${tm.expectedType} ← encontró ${tm.foundType}`);
      });
    }
  });
} else if (missingModels.length === 0 && missingDomainValues.length === 0) {
  console.log('✨ Todo sincronizado. Sin diferencias.');
}

// --- Compact Summary ---
console.log('\n');
console.log('='.repeat(40));
console.log('\u001b[1m\u001b[34m📊 RESUMEN DE SINCRONIZACIÓN\u001b[0m');
console.log('='.repeat(40));

console.log('\u001b[32m📦 DTOs procesados: ' + totalDtos + '\u001b[0m   |   \u001b[32m✅ Modelos encontrados: ' + dtosWithModel + '\u001b[0m\n');

let missingModelsStr = '\u001b[31m❌ Modelos faltantes: ' + missingModels.length + '\u001b[0m';
if (missingModels.length > 0) missingModelsStr += '   (ej: ' + missingModels.slice(0,3).map(m => normalizeDtoName(m)).join(', ') + '...)';
console.log(missingModelsStr);

let missingEnumsStr = '\u001b[31m❌ Enums faltantes en DOMAIN_VALUES: ' + missingDomainValues.length + '\u001b[0m';
if (missingDomainValues.length > 0) missingEnumsStr += '   (ej: ' + missingDomainValues.slice(0,3).join(', ') + '...)';
console.log(missingEnumsStr + '\n');

let differencesStr = '\u001b[33m⚠️ Diferencias detectadas: ' + differences.length + '\u001b[0m';
if (differences.length > 0) differencesStr += '   (ej: ' + differences.slice(0,3).map(d => d.dtoName).join(', ') + '...)';
console.log(differencesStr + '\n');

const totalIssues = missingModels.length + missingDomainValues.length + differences.length;
console.log('\u001b[1mTotal incidencias: ' + totalIssues + '\u001b[0m\n');

console.log('\u001b[90m(Comando ejecutado correctamente – resultado informativo)\u001b[0m\n');

if (totalIssues === 0) {
  console.log('\u001b[1m\u001b[32m✨ ¡Todo perfectamente sincronizado!\u001b[0m\n');
} else {
  console.log('\u001b[1m\u001b[31m⚠️  REVISAR DETALLES ARRIBA PARA CORRECCIONES  ⚠️\u001b[0m\n');
}
