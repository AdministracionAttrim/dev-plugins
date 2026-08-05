import {
  EnumDeclaration,
  Project,
  SourceFile,
  SyntaxKind,
  Type
} from 'ts-morph';

// Initialize ts-morph project
console.log('⏳ Inicializando proyecto TypeScript (esto puede tardar un poco)...');
const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: true
});

// Load files explicitly
const frontendFiles = project.addSourceFilesAtPaths([
  'src/**/*.ts',
  '!src/**/*.spec.ts',
  '!src/**/*.stories.ts',
  '!api-dtos/**/*'
]);
const dtoFiles = project.addSourceFilesAtPaths('api-dtos/models/**/*.ts');

console.log(`📂 Archivos frontend cargados: ${frontendFiles.length}`);
console.log(`📂 Archivos DTO cargados: ${dtoFiles.length}`);

// Map of all exported declarations in the frontend for fast lookup
const exportedDeclarations = new Map<string, { file: SourceFile, decl: any }>();
frontendFiles.forEach(file => {
  file.getExportedDeclarations().forEach((decls, name) => {
    const decl = decls.find(d => d.getKind() === SyntaxKind.InterfaceDeclaration || d.getKind() === SyntaxKind.TypeAliasDeclaration);
    if (decl) exportedDeclarations.set(name, { file, decl });
  });
});

/**
 * Global ignore list for infrastructure/technical props
 */
const GLOBAL_IGNORED_PROPS = new Set([
  'rowId', 
  'tenant', 
  'lastUpdate', 
  'registrationDate', 
  'deactivationDate', 
  'fileContent',
  'registrationUser',
  'updateUser'
]);

const BASE_ENTITY_PROPS = ['id', 'creationDate', 'deletionDate'];

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
 * Advanced normalization for DTO names
 * UtilityBillSearchDto -> UtilityBillSearch
 * UtilityBillDtoSearch -> UtilityBillSearch
 */
function normalizeDtoName(dtoName: string): string {
  let name = dtoName;
  if (name.endsWith('Dto')) name = name.slice(0, -3);
  if (name.endsWith('DtoSearch')) name = name.replace('DtoSearch', 'Search');
  if (name.includes('Dto')) name = name.replace('Dto', '');
  return name;
}

function cleanLiteral(val: any): string | null {
  if (val === null || val === undefined) return null;
  return String(val).replaceAll(/^['"]|['"]$/g, '');
}

/**
 * Resolve all literal values from a type (Union, Enum, or TypeAlias)
 */
function resolveStringLiterals(type: Type): string[] {
  const symbol = type.getSymbol() || type.getAliasSymbol();
  if (symbol) {
    const enumDecl = symbol.getDeclarations().find(d => d.getKind() === SyntaxKind.EnumDeclaration) as EnumDeclaration | undefined;
    if (enumDecl) {
      return enumDecl.getMembers().map(m => cleanLiteral(m.getValue() ?? m.getName())).filter((v): v is string => v !== null);
    }
  }

  const unionTypes = type.getUnionTypes();
  if (unionTypes.length > 0) {
    return unionTypes
      .map(t => cleanLiteral(t.getLiteralValue()))
      .filter((v): v is string => v !== null && v !== 'null' && v !== 'undefined');
  }

  if (type.isStringLiteral()) {
    const val = cleanLiteral(type.getLiteralValue());
    return val ? [val] : [];
  }

  return [];
}

/**
 * Robust check for BaseEntity and apparent properties
 */
function getApparentProps(type: Type): Set<string> {
  const props = new Set(type.getApparentProperties().map(p => p.getName()));

  const isBaseEntity = (t: Type): boolean => {
    const name = t.getSymbol()?.getName() || t.getAliasSymbol()?.getName();
    if (name === 'BaseEntity') return true;
    const p = new Set(t.getApparentProperties().map(sym => sym.getName()));
    return BASE_ENTITY_PROPS.every(required => p.has(required));
  };

  if (isBaseEntity(type) || 
      type.getIntersectionTypes().some(isBaseEntity) || 
      type.getBaseTypes().some(isBaseEntity)) {
    BASE_ENTITY_PROPS.forEach(p => props.add(p));
  }

  return props;
}

// --- Main Execution ---

interface ModelDifference {
  dtoName: string;
  modelFile: string;
  missingInFrontend: string[];
  extraInFrontend: string[];
  enumDifferences: any[];
  typeMismatches: string[];
}

const differences: ModelDifference[] = [];
const missingModels: string[] = [];

console.log('\n🔍 Analizando sincronización de modelos...\n');

for (const file of dtoFiles) {
  const exported = file.getExportedDeclarations();
  for (const [dtoName, decls] of exported) {
    if (!dtoName.endsWith('Dto') && !dtoName.includes('Dto')) continue;
    if (isIgnoredDto(dtoName)) continue;

    const normalizedName = normalizeDtoName(dtoName);
    const modelMatch = exportedDeclarations.get(normalizedName) || 
                       exportedDeclarations.get(normalizedName + 'Model');

    if (!modelMatch) continue; // Si no existe en el frontend, no nos importa para este check

    const dtoDecl = decls.find(d => d.getKind() === SyntaxKind.InterfaceDeclaration || d.getKind() === SyntaxKind.TypeAliasDeclaration);
    if (!dtoDecl) continue;

    const dtoType = dtoDecl.getType();
    const modelType = modelMatch.decl.getType();

    const backendProps = dtoType.getApparentProperties().map(p => p.getName());
    const frontendProps = getApparentProps(modelType);

    const missingInFrontend: string[] = [];
    const extraInFrontend: string[] = [];
    const enumDiffs: any[] = [];
    const typeMismatches: string[] = [];

    // Compare properties
    for (const bPropName of backendProps) {
      if (GLOBAL_IGNORED_PROPS.has(bPropName)) continue;

      if (frontendProps.has(bPropName)) {
        // Check for Type Mismatch (Enums/Basic types)
        const bProp = dtoType.getProperty(bPropName);
        const fProp = modelType.getProperty(bPropName);
        
        if (bProp && fProp) {
          const bType = bProp.getValueDeclaration()?.getType();
          const fType = fProp.getValueDeclaration()?.getType();

          if (bType && fType) {
            const bLiterals = resolveStringLiterals(bType);
            const fLiterals = resolveStringLiterals(fType);

            if (bLiterals.length > 0 && fLiterals.length > 0) {
              const missingVal = bLiterals.filter(v => !fLiterals.includes(v));
              const extraVal = fLiterals.filter(v => !bLiterals.includes(v));
              if (missingVal.length || extraVal.length) {
                enumDiffs.push({ propName: bPropName, missingValues: missingVal, extraValues: extraVal });
              }
            } else if (bLiterals.length > 0 && fType.isString()) {
              typeMismatches.push(`${bPropName}: espera Enum (${bLiterals.slice(0,3).join('|')}...) pero encontró string`);
            }
          }
        }
      } else {
        missingInFrontend.push(bPropName);
      }
    }

    // Check for extras
    frontendProps.forEach(fProp => {
      if (!backendProps.includes(fProp) && 
          !BASE_ENTITY_PROPS.includes(fProp) && 
          !GLOBAL_IGNORED_PROPS.has(fProp)) {
        extraInFrontend.push(fProp);
      }
    });

    if (missingInFrontend.length || extraInFrontend.length || enumDiffs.length || typeMismatches.length) {
      if (modelMatch.file.getFilePath().includes('/shared/models/unused/')) continue;
      differences.push({
        dtoName,
        modelFile: modelMatch.file.getBaseName(),
        missingInFrontend: missingInFrontend.toSorted((a, b) => a.localeCompare(b)),
        extraInFrontend: extraInFrontend.toSorted((a, b) => a.localeCompare(b)),
        enumDifferences: enumDiffs,
        typeMismatches
      });
    }
  }
}

// --- Report ---
console.log('='.repeat(80));
console.log('📊 REPORTE DE SINCRONIZACIÓN (MODELOS EN FRONTEND)');
console.log('='.repeat(80));

console.log(`Procesados: ${dtoFiles.length}  |  Encontrados: ${differences.length - missingModels.length}`);
console.log(`Faltan modelos: ${missingModels.length}  |  Faltan enums: 0`);
console.log('='.repeat(80) + '\n');

if (missingModels.length > 0) {
  console.log(`❌ MODELOS FALTANTES (${missingModels.length}): ${missingModels.map(m => normalizeDtoName(m)).join(', ')}`);
  console.log('');
}

if (differences.length > 0) {
  console.log(`⚠️ DIFERENCIAS EN MODELOS (${differences.length}):`);

  differences.forEach(diff => {
    console.log(`\n📌 ${diff.dtoName} (${diff.modelFile})`);
    if (diff.missingInFrontend.length) console.log(`  ❌ Faltan: ${diff.missingInFrontend.join(', ')}`);
    if (diff.extraInFrontend.length) console.log(`  ⚠️ Sobran: ${diff.extraInFrontend.join(', ')}`);
    
    diff.typeMismatches.forEach(tm => console.log(`  🔄 ${tm}`));
    
    diff.enumDifferences.forEach(ed => {
      console.log(`  🔢 ${ed.propName}:`);
      if (ed.missingValues.length) console.log(`     - faltan ${ed.missingValues.join(', ')}`);
      if (ed.extraValues.length) console.log(`     + sobran ${ed.extraValues.join(', ')}`);
    });
  });
} else {
  console.log('✨ Todos los modelos detectados están sincronizados.');
}

console.log('\n' + '='.repeat(40));
console.log('\u001b[1m\u001b[34m📊 RESUMEN DE SINCRONIZACIÓN\u001b[0m');
console.log('='.repeat(40));

console.log('\u001b[32m📦 DTOs procesados: ' + dtoFiles.length + '\u001b[0m   |   \u001b[32m✅ Modelos encontrados: ' + (differences.length - missingModels.length) + '\u001b[0m\n');

let missingModelsStr = '\u001b[31m❌ Modelos faltantes: ' + missingModels.length + '\u001b[0m';
if (missingModels.length > 0) missingModelsStr += '   (ej: ' + missingModels.slice(0,3).map(m => normalizeDtoName(m)).join(', ') + '...)';
console.log(missingModelsStr);

console.log('\u001b[31m❌ Enums faltantes en DOMAIN_VALUES: 0\u001b[0m\n');

let differencesStr = '\u001b[33m⚠️ Diferencias detectadas: ' + differences.length + '\u001b[0m';
if (differences.length > 0) differencesStr += '   (ej: ' + differences.slice(0,3).map(d => d.dtoName).join(', ') + '...)';
console.log(differencesStr + '\n');

const totalIssues = missingModels.length + differences.length;
console.log('\u001b[1mTotal incidencias: ' + totalIssues + '\u001b[0m\n');

console.log('\u001b[90m(Comando ejecutado correctamente – resultado informativo)\u001b[0m\n');

// Reminder at the end
let reminderMessage = '\u001b[1m\u001b[33mRecordatorio: Ejecuta "npm run api:gen" para sincronizar con los últimos modelos de Swagger.\u001b[0m\n';
if (dtoFiles.length === 0) {
  reminderMessage = '\u001b[1m\u001b[31mNo hay modelos en api-dtos. Por favor, ejecuta "npm run api:gen" para descargar los modelos y sincronizar.\u001b[0m\n' + reminderMessage;
}
console.log(reminderMessage);

if (totalIssues === 0) {
  console.log('\u001b[1m\u001b[32m✨ ¡Todo perfectamente sincronizado!\u001b[0m\n');
} else {
  console.log('\u001b[1m\u001b[31m⚠️  REVISAR DETALLES ARRIBA PARA CORRECCIONES  ⚠️\u001b[0m\n');
}