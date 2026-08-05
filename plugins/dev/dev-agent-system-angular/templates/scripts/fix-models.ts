import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  InterfaceDeclaration,
  Project,
  PropertySignature,
  SourceFile,
  SyntaxKind,
  TypeAliasDeclaration,
  TypeLiteralNode,
  TypeNode
} from 'ts-morph';

// --- Interfaces ---
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
  required?: string[];
}
interface OpenAPIDocument {
  components?: {
    schemas?: Record<string, OpenAPISchema>;
  };
}

// --- Config / Flags (ajustables) ---
const RESPECT_OPENAPI_OPTIONALITY = false; // si true, las propiedades se marcarán opcionales según "required" en OpenAPI

// --- Setup ---
console.log('⏳ Inicializando proyecto TypeScript...');
const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
  skipAddingFilesFromTsConfig: false
});
const sourceFiles = project.addSourceFilesAtPaths([
  'src/**/*.ts',
  '!src/**/*.spec.ts',
  '!src/**/*.stories.ts',
  '!api-dtos/**/*'
]);
const dtoFiles = project.addSourceFilesAtPaths('api-dtos/models/*.ts');
console.log(`📂 Archivos cargados: ${sourceFiles.length + dtoFiles.length}`);

// Map para búsquedas rápidas por nombre de archivo (kebab-case.model.ts)
const modelFileMap: Map<string, SourceFile> = new Map(
  sourceFiles.map(f => [f.getBaseName(), f])
);

// Build interfaceMap
const interfaceMap: Record<string, InterfaceDeclaration> = {};
for (const file of dtoFiles) {
  file.getInterfaces().filter(i => i.isExported()).forEach(i => {
    interfaceMap[i.getName()] = i;
  });
}

// Build schemas from interfaces
const schemas: Record<string, OpenAPISchema> = {};
for (const name in interfaceMap) {
  schemas[name] = interfaceToSchema(interfaceMap[name], interfaceMap);
}

function interfaceToSchema(intf: InterfaceDeclaration, interfaceMap: Record<string, InterfaceDeclaration>): OpenAPISchema {
  const schema: OpenAPISchema = { type: 'object', properties: {}, required: [] };

  // Handle extends
  const extendsClauses = intf.getExtends();
  if (extendsClauses.length > 0) {
    schema.allOf = extendsClauses.map(ex => {
      const exText = ex.getExpression().getText();
      if (interfaceMap[exText]) {
        return interfaceToSchema(interfaceMap[exText], interfaceMap);
      } else {
        return { $ref: `#/components/schemas/${exText}` };
      }
    });
  }

  // Properties
  const props = intf.getProperties();
  for (const prop of props) {
    const name = prop.getName();
    const typeNode = prop.getTypeNode();
    if (!typeNode) continue;
    const isOptional = prop.hasQuestionToken();
    if (!isOptional) {
      schema.required!.push(name);
    }
    schema.properties![name] = typeToSchema(typeNode, interfaceMap);
  }

  return schema;
}

function typeToSchema(typeNode: TypeNode, interfaceMap: Record<string, InterfaceDeclaration>): OpenAPISchema {
  const text = typeNode.getText().trim();
  if (text === 'string') return { type: 'string' };
  if (text === 'number') return { type: 'number' };
  if (text === 'boolean') return { type: 'boolean' };

  const kind = typeNode.getKind();

  if (kind === SyntaxKind.LiteralType) {
    const value = (typeNode as any).getLiteral().getText().replaceAll('"', '');
    return { type: 'string', enum: [value] };
  }

  if (kind === SyntaxKind.UnionType) {
    const types = (typeNode as any).getTypeNodes();
    const enums: string[] = [];
    let isEnum = true;
    for (const t of types) {
      if (t.getKind() === SyntaxKind.LiteralType) {
        enums.push(t.getLiteral().getText().replaceAll('"', ''));
      } else {
        isEnum = false;
        break;
      }
    }
    if (isEnum) return { type: 'string', enum: enums };
    return { type: 'any' };
  }

  if (kind === SyntaxKind.ArrayType) {
    const elem = (typeNode as any).getElementTypeNode();
    return { type: 'array', items: typeToSchema(elem, interfaceMap) };
  }

  if (kind === SyntaxKind.TypeReference) {
    const typeName = (typeNode as any).getTypeName().getText();
    if (typeName === 'Array') {
      const arg = (typeNode as any).getTypeArguments()[0];
      return { type: 'array', items: typeToSchema(arg, interfaceMap) };
    } else {
      return { $ref: `#/components/schemas/${typeName}` };
    }
  }

  return { type: 'any' };
}

// --- Helpers ---
function isIgnoredDto(dtoName: string): boolean {
  const n = dtoName.toLowerCase();
  return (
    n.startsWith('paged') ||
    n.includes('response') ||
    n.includes('header') ||
    n.includes('metadata') ||
    n.includes('page') ||
    n === 'map' || n === 'mapdto' // Ignorar Map explícitamente
  );
}
function normalizeDtoName(dtoName: string): string {
  if (dtoName.endsWith('Dto')) return dtoName.slice(0, -3);
  if (dtoName.endsWith('DtoSearch')) return dtoName.replace('DtoSearch', 'Search');
  return dtoName.replace(/Dto/i, '');
}
function camelToKebab(str: string): string {
  return str.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
function getCorrespondingModelFile(dtoName: string): SourceFile | null {
  const baseName = normalizeDtoName(dtoName);
  const kebabName = camelToKebab(baseName);
  const modelFileName = `${kebabName}.model.ts`;
  if (modelFileMap.has(modelFileName)) return modelFileMap.get(modelFileName)!;
  for (const file of sourceFiles) {
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
function getModelMainDeclaration(modelFile: SourceFile, dtoName: string) {
  const baseName = normalizeDtoName(dtoName);
  let decl = modelFile.getInterface(baseName) || modelFile.getTypeAlias(baseName);
  if (decl) return decl;
  decl = modelFile.getInterface(baseName + 'Model') || modelFile.getTypeAlias(baseName + 'Model');
  if (decl) return decl;
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

function extractPropertiesFromSchema(
  schema: OpenAPISchema,
  schemas: Record<string, OpenAPISchema>,
  visited: Set<string> = new Set()
): Map<string, OpenAPISchema> {
  const properties = new Map<string, OpenAPISchema>();
  if (!schema) return properties;
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
function resolveSchema(schema: OpenAPISchema): OpenAPISchema {
  if (!schema) return {} as OpenAPISchema;
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    if (refName && schemas[refName]) return resolveSchema(schemas[refName]);
  }
  return schema;
}

// --- Type Mapping Logic ---
function mapOpenApiTypeToTsType(schema: OpenAPISchema, propertyName: string): string {
  const resolved = resolveSchema(schema);

  // ENUM inline -> literal union
  if (resolved.enum && resolved.enum.length > 0) {
    return resolved.enum.map(v => `"${v}"`).join(' | ');
  }

  if (resolved.type === 'integer' || resolved.type === 'number') return 'number';
  if (resolved.type === 'boolean') return 'boolean';
  if (resolved.type === 'string') {
      if (resolved.format === 'date-time' || resolved.format === 'date') return 'string';
      return 'string';
  }
  if (resolved.type === 'array') {
      const itemType = mapOpenApiTypeToTsType(resolved.items || {}, propertyName);
      return `${itemType}[]`;
  }

  // $ref a schema no-enum -> modelo
  if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      if (refName) {
          const norm = normalizeDtoName(refName);
          // ⚠️ FIX: Si es "Map", devolver Record<string, any>
          if (norm === 'Map') return 'Record<string, any>';
          return norm;
      }
  }
  return 'any';
}

// --- Fix Logic ---
const DEFAULT_IGNORED_PROPS = new Set([
  'id',
  'creationDate',
  'deletionDate',
  'tenant',
  'lastUpdate',
  'registrationDate',
  'deactivationDate',
  'rowId'
]);

// --- Import Helper functions ---
function hasImport(file: SourceFile, importName: string): boolean {
    const imports = file.getImportDeclarations();
    for (const imp of imports) {
        for (const named of imp.getNamedImports()) {
            if (named.getName() === importName) return true;
        }
        const def = imp.getDefaultImport();
        if (def && def.getText() === importName) return true;
        const ns = imp.getNamespaceImport();
        if (ns && ns.getText() === importName) return true;
    }
    return false;
}

/**
 * Añade un import hacia el modelo `modelName` intentando resolver la ruta relativa real
 * si existe un archivo del modelo en el proyecto. Si no existe, cae en una carpeta
 * `@shared/models/unused/...` como fallback.
 * IMPORTANTE: la función guarda el archivo tras añadir el import para que herramientas
 * externas (p. ej. TS language server o procesos de autoimport) puedan actuar.
 */
function addModelImport(file: SourceFile, modelName: string) {
    // ⚠️ FIX: Nunca importar 'Map'
    if (modelName === 'Map') return;

    if (hasImport(file, modelName)) return;
    if (file.getInterface(modelName) || file.getTypeAlias(modelName)) return;

    const kebabName = camelToKebab(modelName);
    const candidateFileName = `${kebabName}.model.ts`;

    // Intentar localizar el archivo de modelo dentro del proyecto
    let importPath: string | null = null;
    const modelSource = modelFileMap.get(candidateFileName) || project.getSourceFiles().find(sf => sf.getBaseName() === candidateFileName);
    if (modelSource) {
        const fromDir = path.dirname(file.getFilePath());
        const toPath = modelSource.getFilePath();
        let rel = path.relative(fromDir, toPath).replaceAll('\\', '/');
        rel = rel.replace(/\.ts$/, '');
        if (!rel.startsWith('.')) rel = './' + rel;
        importPath = rel;
    } else {
        // Fallback (mantener compatibilidad con la estructura previa)
        importPath = `@shared/models/unused/${kebabName}.model`;
    }

    // Añadir import y guardar el fichero para disparar autoimports externos
    file.addImportDeclaration({
        moduleSpecifier: importPath,
        namedImports: [modelName]
    });
    file.formatText();
    try {
      file.saveSync();
    } catch (err) {
      console.warn(`No se pudo guardar ${file.getFilePath()}: ${String(err)}`);
    }
}

function createNewModel(dtoName: string) {
    // ⚠️ FIX: Si es Map/MapDto, no crear archivo
    const baseName = normalizeDtoName(dtoName);
    if (baseName === 'Map') return;

    const kebabName = camelToKebab(baseName);
    const fileName = `${kebabName}.model.ts`;
    const targetDir = path.join(process.cwd(), 'src', 'app', 'shared', 'models', 'unused');
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    const fullPath = path.join(targetDir, fileName);
    console.log(`✨ Creando: ${fileName}`);
    const sourceFile = project.createSourceFile(fullPath, '', { overwrite: true });
    const schema = schemas[dtoName] || ({} as OpenAPISchema);
    const propsMap = extractPropertiesFromSchema(schema, schemas);
    const requiredList = schema.required || [];
    const interfaceDecl = sourceFile.addInterface({ name: baseName, isExported: true });

    for (const [propName, propSchema] of propsMap) {
        if (DEFAULT_IGNORED_PROPS.has(propName)) continue;
        const typeLink = mapOpenApiTypeToTsType(propSchema, propName);
        const isPrimitive = isPrimitiveType(typeLink);
        if (!isPrimitive) {
             const resolved = resolveSchema(propSchema);
             if (!resolved.enum) {
                 const modelName = typeLink.replace('[]', '');
                 addModelImport(sourceFile, modelName);
             }
        }
        interfaceDecl.addProperty({
            name: propName,
            type: typeLink,
            hasQuestionToken: RESPECT_OPENAPI_OPTIONALITY ? !requiredList.includes(propName) : false
        });
    }
    sourceFile.formatText({ indentSize: 2 });
    sourceFile.saveSync();
}

function isPrimitiveType(typeLink: string): boolean {
    let typeToCheck = typeLink;
    let isArray = false;
    if (typeLink.endsWith('[]')) {
        isArray = true;
        typeToCheck = typeLink.slice(0, -2).trim();
    }
    const primitiveTypes = new Set(['string', 'number', 'boolean', 'any', 'void', 'Record<string, any>']);
    const isEnumLiteral = /^"[^"]+"(\s*\|\s*"[^"]+")*$/.test(typeToCheck);
    const isPrimitiveBase = primitiveTypes.has(typeToCheck) || isEnumLiteral;
    return isPrimitiveBase || (isArray && (primitiveTypes.has(typeToCheck) || isEnumLiteral));
}

function updateExistingModel(modelFile: SourceFile, dtoName: string) {
    const schema = schemas[dtoName] || ({} as OpenAPISchema);
    const propsMap = extractPropertiesFromSchema(schema, schemas);
    const modelDecl = getModelMainDeclaration(modelFile, dtoName);
    const requiredList = schema.required || [];
    if (!modelDecl) return;
    const isUnused = modelFile.getFilePath().includes('/shared/models/unused/');
    if (modelDecl.getKind() === SyntaxKind.InterfaceDeclaration) {
        const interfaceDecl = modelDecl as InterfaceDeclaration;
        updateTypeProperties(interfaceDecl, propsMap, requiredList, modelFile, schemas, isUnused);
    } else if (modelDecl.getKind() === SyntaxKind.TypeAliasDeclaration) {
        const typeAlias = modelDecl as TypeAliasDeclaration;
        const typeNode = typeAlias.getTypeNode();
        let typeLiteral: TypeLiteralNode | undefined = undefined;
        if (typeNode?.getKind() === SyntaxKind.TypeLiteral) {
            typeLiteral = typeNode as TypeLiteralNode;
        } else if (typeNode?.getKind() === SyntaxKind.IntersectionType) {
            typeLiteral = (typeNode as any).getTypeNodes().find((n: any) => n.getKind() === SyntaxKind.TypeLiteral);
        }
        if (typeLiteral) {
             updateTypeProperties(typeLiteral, propsMap, requiredList, modelFile, schemas, isUnused);
        }
    }
}

function updateTypeProperties(node: InterfaceDeclaration | TypeLiteralNode, propsMap: Map<string, OpenAPISchema>, requiredList: string[], modelFile: SourceFile, schemas: Record<string, OpenAPISchema>, isUnused: boolean) {
    let modified = false;

    // 1. DELETE EXTRA PROPERTIES (solo para unused)
    if (isUnused) {
        const currentProps = node.getProperties();
        for (const prop of currentProps) {
            const propName = prop.getName();
            if (DEFAULT_IGNORED_PROPS.has(propName)) continue;
            if (!propsMap.has(propName)) {
                 prop.remove();
                 modified = true;
            }
        }
    }

    // 2. ADD / ENSURE ENUMS & IMPORTS AND ADD MISSING PROPERTIES
    // Collect existing types to keep types when re-ordering
    const propTypes = new Map<string, string>();
    const schemaPropNames = Array.from(propsMap.keys()).filter(k => !DEFAULT_IGNORED_PROPS.has(k));

    for (const [propName, propSchema] of propsMap) {
        if (DEFAULT_IGNORED_PROPS.has(propName)) continue;
        const existingProp = node.getProperty(propName);
        const typeLink = mapOpenApiTypeToTsType(propSchema, propName);

        // Enums / imports (always ensure present even if prop exists)
        const isPrimitive = isPrimitiveType(typeLink);
        if (!isPrimitive) {
             const resolved = resolveSchema(propSchema);
             if (!resolved.enum) {
                 const modelName = typeLink.replace('[]', '');
                 addModelImport(modelFile, modelName);
             }
        }

        if (existingProp) {
            const typeText = existingProp.getTypeNode()?.getText() || typeLink;
            propTypes.set(propName, typeText);
            // No set modified for optionality mismatch to avoid touching existing
        } else {
            node.addProperty({
            name: propName,
            type: typeLink,
            hasQuestionToken: RESPECT_OPENAPI_OPTIONALITY ? !requiredList.includes(propName) : false
        });
            modified = true;
        }
    }

    // 3. REORDER / NORMALIZE OPTIONALITY - remove and re-add according to schema order (solo para unused)
    if (isUnused) {
        const currentPropsAfter = node.getProperties().filter((p: PropertySignature) => schemaPropNames.includes(p.getName()));
        const currentOrder = currentPropsAfter.map((p: PropertySignature) => p.getName());
        const desiredOrder = schemaPropNames;
        if (currentOrder.join(',') !== desiredOrder.join(',')) {
            modified = true;
        }

        // Remove and re-add in desired order (preserving detected types when possible)
        for (const p of currentPropsAfter) p.remove();
        for (const propName of desiredOrder) {
            const typeText = propTypes.get(propName) || mapOpenApiTypeToTsType(propsMap.get(propName)!, propName);
            node.addProperty({
            name: propName,
            type: typeText,
            hasQuestionToken: RESPECT_OPENAPI_OPTIONALITY ? !requiredList.includes(propName) : false
        });
        }
    }

    if (modified) {
        modelFile.formatText({ indentSize: 2 });
        modelFile.saveSync();
    }
}

// --- Cleanup Logic ---
function cleanDuplicateUnusedModels() {
  console.log('🧹 Buscando modelos duplicados en "unused"...');
  const unusedDir = path.join(process.cwd(), 'src', 'app', 'shared', 'models', 'unused');

  if (!fs.existsSync(unusedDir)) return;

  const unusedFiles = project.getSourceFiles().filter(f => f.getFilePath().includes('/shared/models/unused/'));
  const usedFiles = project.getSourceFiles().filter(f => 
    f.getFilePath().includes('/src/app/') && 
    !f.getFilePath().includes('/shared/models/unused/') &&
    !f.getFilePath().includes('.spec.ts')
  );

  let deletedCount = 0;

  for (const unusedFile of unusedFiles) {
    const baseName = unusedFile.getBaseName(); // e.g., "company.model.ts"

    // Check if this file exists elsewhere in the project
    const duplicate = usedFiles.find(f => f.getBaseName() === baseName);

    if (duplicate) {
      console.log(`🗑️  Eliminando duplicado: ${baseName} (ya existe en ${duplicate.getDirectoryPath()})`);
      unusedFile.delete(); // Delete from project and filesystem
      deletedCount++;
    }
  }

  // ⚠️ FIX: Eliminar también map.model.ts explícitamente si existe en unused
  const mapModel = unusedFiles.find(f => f.getBaseName() === 'map.model.ts');
  if (mapModel) {
    console.log('🗑️  Eliminando map.model.ts (nombre reservado)');
    mapModel.delete();
    deletedCount++;
  }

  if (deletedCount > 0) {
    console.log(`✨ Se han eliminado ${deletedCount} modelos duplicados de "unused".\n`);
    project.saveSync(); // Commit deletions
  } else {
    console.log('✨ No se encontraron duplicados en "unused".\n');
  }
}

// --- Main Loop ---
console.log('\n🔧 Iniciando reparación de modelos (Strict Mode)...\n');

// 1. Clean duplicates first
cleanDuplicateUnusedModels();

let createdCount = 0;
let updatedCount = 0;

for (const [dtoName] of Object.entries(schemas)) {
  if (!dtoName.includes('Dto') && !dtoName.endsWith('Search')) continue;
  if (isIgnoredDto(dtoName)) continue;

  // Re-fetch model file after cleanup
  const modelFile = getCorrespondingModelFile(dtoName);

  if (modelFile) {
      if (modelFile.wasForgotten()) continue; // Skip if file was deleted
      updateExistingModel(modelFile, dtoName);
      updatedCount++;
  } else {
      createNewModel(dtoName);
      createdCount++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`✅ Proceso finalizado.`);
console.log(`✨ Modelos creados: ${createdCount}`);
console.log(`✏️  Modelos verificados/actualizados: ${updatedCount}`);

// --- Run Oxc Format ---
console.log('\n🎨 Ejecutando formateador (oxlint --fix)...');
try {
  // Ejecutamos oxlint sobre unused para asegurar limpieza
  execSync('npx oxlint --fix src/app/shared/models/unused', { stdio: 'inherit' });
  // Opcionalmente sobre todo shared/models si se desea
  // execSync('npx oxlint --fix src/app/shared/models', { stdio: 'inherit' });
  console.log('✨ Formato completado.');
} catch (error) {
  console.warn('⚠️ No se pudo completar el formato automático (¿está instalado oxlint?)');
}