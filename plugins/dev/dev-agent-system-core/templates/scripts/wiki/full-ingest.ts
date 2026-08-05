import { promises as fs } from "fs";
import path from "path";
import { ClassDeclaration, MethodDeclaration, Project, SyntaxKind, VariableDeclaration } from "ts-morph";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../../");
const SRC = path.join(ROOT, "src", "app");
const MODULES = path.join(SRC, "modules");
const PUBLIC_I18N = path.join(ROOT, "public", "i18n", "modules");
const WIKI = path.join(ROOT, "docs", "wiki");
const TODAY = new Date().toISOString().split("T")[0];

// [C1] classToLink: class name → wiki path. selectorToClass: CSS selector → wiki path.
const classToLink: Record<string, string> = {};
const selectorToClass: Record<string, string> = {};
const detailedSourceDocs = new Set<string>();

type FileMapRow = {
  role: string;
  path: string;
  wikiLink?: string;
};

type FeatureDoc = {
  folderRel: string;
  moduleKey: string;
  wikiRel: string;
  title: string;
  routeFileRel: string;
  routePaths: string[];
  fileMap: FileMapRow[];
  translationScope?: string;
  loaderPath?: string;
};

type CuratedArticleConfig = {
  sourceRel: string;
  title: string;
  summary: string;
  relatedRoots?: string[];
  relatedPrefixes?: string[];
  relatedFiles?: string[];
};

const MODULE_SUMMARIES: Record<string, string> = {
  billing: "Invoice generation, payment tracking, and financial reporting.",
  contracting: "Contracts, customers, quotations, invoices, and related workflows.",
  "master-data": "Configuration entities, periodic billing, contract management, and assets.",
  readings: "Reading routes, reading contracts, progress tracking, and work orders."
};

// [C3] Manual metadata overrides. The key is sourceRel; the value enriches auto-discovered articles.
// A file in docs/raw/articles/ that has NO entry here is still ingested with auto-derived title/summary.
const ARTICLE_OVERRIDES: Record<string, Omit<CuratedArticleConfig, "sourceRel">> = {
  "docs/raw/articles/custom-inputs.md": {
    title: "Custom Inputs",
    summary: "Referencia viva de los custom inputs compartidos y sus puntos de integración actuales.",
    relatedPrefixes: ["src/app/shared/ui/custom-"],
    relatedFiles: ["src/app/shared/imports/shared.imports.ts"]
  },
  "docs/raw/articles/entity-resolver.md": {
    title: "Entity Resolver",
    summary: "Referencia viva del patrón de resolvers y estado de entidad ligado a rutas.",
    relatedFiles: [
      "src/app/core/guards/active-entity.resolver.ts",
      "src/app/shared/utils/use-entity-by-input-id.ts",
      "src/app/core/guards/pending-changes/pending-changes.guard.ts"
    ]
  },
  "docs/raw/articles/permissions.md": {
    title: "Permissions",
    summary: "Referencia viva de guardas, directivas y utilidades de permisos del proyecto.",
    relatedFiles: [
      "src/app/core/auth/permission.service.ts",
      "src/app/core/guards/has-permission.guard.ts",
      "src/app/shared/directives/has-permissions.directive.ts",
      "src/app/shared/utils/use-feature-permissions.ts",
      "src/app/shared/models/permission.types.ts"
    ]
  },
  "docs/raw/articles/form-wrapper.md": {
    title: "Form Wrapper",
    summary: "Referencia viva de la composición `app-form-wrapper` y sus piezas auxiliares.",
    relatedRoots: ["src/app/shared/ui/form-wrapper", "src/app/shared/ui/form-header"],
    relatedFiles: ["src/app/shared/services/entity-form-config.service.ts"]
  },
  "docs/raw/articles/form-table-editable.md": {
    title: "Form Table Editable",
    summary: "Referencia viva del registro y helpers para tablas editables dentro de formularios.",
    relatedFiles: [
      "src/app/shared/services/form-table-editable.ts",
      "src/app/shared/services/editable-table-registry.service.ts",
      "src/app/shared/ui/form-footer/form-footer.component.ts"
    ]
  },
  "docs/raw/articles/architecture.md": {
    title: "Architecture",
    summary: "Fuente curada de arquitectura general del proyecto."
  }
};

async function ensureDir(targetPath: string) {
  await fs.mkdir(targetPath, { recursive: true });
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function toAlias(relPath: string): string {
  const normalizedPath = normalizePath(relPath);

  if (normalizedPath.startsWith("core/")) return normalizedPath.replace("core/", "@core/");
  if (normalizedPath.startsWith("shared/")) return normalizedPath.replace("shared/", "@shared/");
  if (normalizedPath.startsWith("modules/")) return normalizedPath.replace("modules/", "@module/");
  if (normalizedPath.startsWith("src/app/core/")) return normalizedPath.replace("src/app/core/", "@core/");
  if (normalizedPath.startsWith("src/app/shared/")) return normalizedPath.replace("src/app/shared/", "@shared/");
  if (normalizedPath.startsWith("src/app/modules/")) return normalizedPath.replace("src/app/modules/", "@module/");

  return normalizedPath;
}

function cleanType(typeStr: string): string {
  return typeStr.replace(/import\(".*?"\)\./g, "").replace(/import\('.*?'\)\./g, "");
}

function humanizeSlug(slug: string): string {
  return slug
    .split(/[-/]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function wikiLink(wikiPath: string, label: string): string {
  return `[[${normalizePath(wikiPath).replace(/\.md$/, "")}|${label}]]`;
}

function sourcePathToWikiLink(sourceRel: string): string | undefined {
  const normalizedPath = normalizePath(sourceRel).replace(/^src\/app\//, "");
  if (!detailedSourceDocs.has(normalizedPath)) return undefined;

  if (!normalizedPath.endsWith(".ts")) return undefined;
  if (normalizedPath.endsWith(".component.ts")) {
    return wikiLink(`components/${normalizedPath.replace(/\.ts$/, ".md")}`, path.basename(normalizedPath, ".ts"));
  }
  if (
    normalizedPath.endsWith(".service.ts") ||
    normalizedPath.endsWith(".store.ts") ||
    normalizedPath.endsWith(".guard.ts")
  ) {
    return wikiLink(`services/${normalizedPath.replace(/\.ts$/, ".md")}`, path.basename(normalizedPath, ".ts"));
  }

  return undefined;
}

async function appendLog(operation: string, title: string) {
  const logPath = path.join(WIKI, "log.md");
  const entry = `\n## [${TODAY}] ${operation} | ${title}\n- Processed knowledge entry for ${title}.\n`;

  try {
    await fs.appendFile(logPath, entry, "utf8");
  } catch {
    await fs.writeFile(logPath, `# Wiki Log\n${entry}`, "utf8");
  }
}

async function getAllFiles(dir: string, extensions?: string[]): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".git", ".angular", "coverage", "dist"].includes(entry.name)) {
          return [];
        }
        return getAllFiles(entryPath, extensions);
      }

      if (!extensions || extensions.includes(path.extname(entry.name))) {
        return entryPath;
      }

      return [];
    })
  );

  return Array.prototype.concat(...files);
}

async function getFilesFromRoots(roots: string[]): Promise<string[]> {
  const files = await Promise.all(
    roots.map(async (root) => {
      const absoluteRoot = path.join(ROOT, root);
      if (!(await fileExists(absoluteRoot))) return [];
      const stats = await fs.stat(absoluteRoot);
      if (stats.isFile()) return [absoluteRoot];
      return getAllFiles(absoluteRoot, [".ts", ".html"]);
    })
  );

  return Array.prototype.concat(...files);
}

// [C1] Builds classToLink AND selectorToClass for cross-file resolution.
async function buildClassMap(project: Project) {
  for (const sourceFile of project.getSourceFiles()) {
    const relPath = path.relative(SRC, sourceFile.getFilePath());
    const normalizedRelPath = normalizePath(relPath);

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (!name) continue;

      const isComponent = cls.getDecorator("Component");
      const folder = isComponent ? "components" : "services";
      classToLink[name] = `${folder}/${normalizedRelPath.replace(".ts", "")}`;

      if (isComponent) {
        const selector = isComponent
          .getArguments()[0]
          ?.asKind(SyntaxKind.ObjectLiteralExpression)
          ?.getProperty("selector")
          ?.asKind(SyntaxKind.PropertyAssignment)
          ?.getInitializer()
          ?.getText()
          ?.replace(/['"]/g, "");
        if (selector) {
          selectorToClass[selector] = `${folder}/${normalizedRelPath.replace(".ts", "")}`;
        }
      }
    }

    for (const statement of sourceFile.getVariableStatements()) {
      for (const declaration of statement.getDeclarations()) {
        const initializer = declaration.getInitializer();
        if (initializer?.getText().includes("signalStore")) {
          classToLink[declaration.getName()] = `services/${normalizedRelPath.replace(".ts", "")}`;
        }
      }
    }
  }
}

// [C1] Lista positiva de sufijos significativos + lista negativa de infraestructura.
// Elimina generación de docs para barrels, modelos y archivos de configuración.
const INFRA_EXCLUDE = ["environments/", "assets/", "styles/", "node_modules/", "app.config", "app.routes", ".d.ts"];
const MEANINGFUL_SUFFIXES = [".component.ts", ".service.ts", ".store.ts", ".guard.ts", ".resolver.ts"];

function shouldGenerateDetailedDoc(relPath: string): boolean {
  const norm = normalizePath(relPath);
  if (INFRA_EXCLUDE.some((ex) => norm.includes(ex))) return false;
  return MEANINGFUL_SUFFIXES.some((suffix) => norm.endsWith(suffix));
}

async function pruneGeneratedArticles() {
  await fs.rm(path.join(WIKI, "articles"), { recursive: true, force: true });
}

// [C2] Borra solo los .md de components/ y services/ cuya fuente ya no existe.
// No toca archivos curados ni páginas manuales fuera de esas carpetas.
async function pruneStaleDetailDocs(expectedPaths: Set<string>): Promise<void> {
  for (const folder of ["components", "services"]) {
    const dir = path.join(WIKI, folder);
    if (!(await fileExists(dir))) continue;

    const existing = await getAllFiles(dir, [".md"]);
    for (const file of existing) {
      const relToWiki = normalizePath(path.relative(WIKI, file));
      if (!expectedPaths.has(relToWiki)) {
        await fs.rm(file, { force: true });
        console.log(`  [prune] ${relToWiki}`);
      }
    }
  }
}

function resolveLink(className: string): string {
  const link = classToLink[className];
  return link ? wikiLink(link, className) : `\`${className}\``;
}

// [C4] Captura solo el primer argumento de inject() — evita incluir opciones { optional: true }.
function extractDependencies(cls: ClassDeclaration): string[] {
  const dependencies = new Set<string>();
  const constructorDeclaration = cls.getConstructors()[0];

  if (constructorDeclaration) {
    for (const parameter of constructorDeclaration.getParameters()) {
      const type = parameter.getType();
      const typeName = type.getSymbol()?.getName() || type.getText();
      if (typeName && !typeName.includes("<") && typeName !== "any") {
        dependencies.add(typeName);
      }
    }
  }

  for (const property of cls.getProperties()) {
    const initializer = property.getInitializer();
    if (initializer?.getText().includes("inject(")) {
      const match = initializer.getText().match(/inject\(([^,)]+)/);
      if (match) {
        const token = match[1].trim().replace(/^["']|["']$/g, "");
        if (token && !token.startsWith("{")) dependencies.add(token);
      }
    }
  }

  return Array.from(dependencies);
}

function extractSignals(cls: ClassDeclaration): string[] {
  const signals: string[] = [];

  for (const property of cls.getProperties()) {
    const text = property.getText();
    if (text.includes("signal(") || text.includes("computed(") || text.includes("linkedSignal(") || text.includes("resource(")) {
      signals.push(`- \`${property.getName()}\`: ${cleanType(property.getType().getText())}`);
    }
  }

  return signals;
}

// [C4] Extrae hijos desde imports[] Y desde selectores <app-*> usados en el template.
async function extractChildren(cls: ClassDeclaration, relPath: string): Promise<string[]> {
  const children: string[] = [];
  const componentDecorator = cls.getDecorator("Component");
  if (!componentDecorator) return children;

  const args = componentDecorator.getArguments();
  const objectLiteral = args[0]?.asKind(SyntaxKind.ObjectLiteralExpression);
  const importsProperty = objectLiteral?.getProperty("imports")?.asKind(SyntaxKind.PropertyAssignment);
  const importsArray = importsProperty?.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

  const seen = new Set<string>();
  for (const element of importsArray?.getElements() ?? []) {
    const name = element.getText();
    if (classToLink[name]?.startsWith("components/")) {
      seen.add(name);
      children.push(`- ${resolveLink(name)}`);
    }
  }

  // Template selector scanning: captura <app-*> aunque no esté explícito en imports[]
  const templateUrlProp = objectLiteral
    ?.getProperty("templateUrl")
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializer()
    ?.getText()
    ?.replace(/['"]/g, "");
  const inlineTemplate = objectLiteral
    ?.getProperty("template")
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializer()
    ?.getText();

  let templateContent = inlineTemplate ?? "";
  if (templateUrlProp) {
    const templatePath = path.resolve(path.dirname(path.join(SRC, relPath)), templateUrlProp);
    try {
      templateContent = await fs.readFile(templatePath, "utf8");
    } catch {
      // template file not found — skip scanning
    }
  }

  for (const match of templateContent.matchAll(/<(app-[\w-]+)/g)) {
    const selector = match[1];
    const wikiPath = selectorToClass[selector];
    if (wikiPath && !seen.has(selector)) {
      seen.add(selector);
      children.push(`- [[${wikiPath}|${selector}]] *(via template)*`);
    }
  }

  return children;
}

function extractJSDoc(node: { getJsDocs: () => { getInnerText: () => string }[] }): string {
  const docs = node.getJsDocs();
  return docs.length > 0 ? docs.map((doc) => doc.getInnerText()).join("\n\n") : "";
}

async function generateComponentDoc(cls: ClassDeclaration, relPath: string): Promise<string> {
  const name = cls.getName();
  if (!name) return "";

  const wikiPath = path.join(WIKI, "components", relPath.replace(".ts", ".md"));
  await ensureDir(path.dirname(wikiPath));

  const componentConfig = cls.getDecorator("Component")?.getArguments()[0]?.asKind(SyntaxKind.ObjectLiteralExpression);
  const selector =
    componentConfig?.getProperty("selector")?.asKind(SyntaxKind.PropertyAssignment)?.getInitializer()?.getText() || "N/A";
  const description = extractJSDoc(cls) || `Component entry point for \`${name}\`.`;
  const inputs = cls
    .getProperties()
    .filter((property) => property.getDecorator("Input"))
    .map((property) => `- \`${property.getName()}\`: ${cleanType(property.getType().getText())}`);
  const outputs = cls
    .getProperties()
    .filter((property) => property.getDecorator("Output"))
    .map((property) => `- \`${property.getName()}\`: ${cleanType(property.getType().getText())}`);
  const dependencies = extractDependencies(cls).map((dependency) => `- ${resolveLink(dependency)}`);
  const signals = extractSignals(cls);
  const children = await extractChildren(cls, relPath); // [C4] async + template scanning
  const publicMethods = cls
    .getMethods()
    .filter((method) => !method.getName().startsWith("#") && method.getScope() !== "private")
    .map((method) => `- \`${method.getName()}(...)\``);

  const content = `---
type: component
tags: [angular, component]
confidence: high
last_updated: ${TODAY}
sources: [${toAlias(`src/app/${relPath}`)}]
---

# ${name}

- **Selector**: \`${selector}\`
- **File**: \`${toAlias(relPath)}\`

## Description
${description}

## Dependencies
${dependencies.length > 0 ? dependencies.join("\n") : "None"}

## UI Children / Hierarchy
${children.length > 0 ? children.join("\n") : "None (Atomic)"}

## Signals / State
${signals.length > 0 ? signals.join("\n") : "None"}

## Public Methods
${publicMethods.length > 0 ? publicMethods.join("\n") : "None"}

## Inputs
${inputs.length > 0 ? inputs.join("\n") : "None"}

## Outputs
${outputs.length > 0 ? outputs.join("\n") : "None"}

Related: [[architecture/angular-overview]]
`;

  await fs.writeFile(wikiPath, content, "utf8");
  return normalizePath(path.relative(WIKI, wikiPath));
}

async function generateServiceDoc(cls: ClassDeclaration, relPath: string): Promise<string> {
  const name = cls.getName();
  if (!name) return "";

  const wikiPath = path.join(WIKI, "services", relPath.replace(".ts", ".md"));
  await ensureDir(path.dirname(wikiPath));

  const description = extractJSDoc(cls) || `Service entry point for \`${name}\`.`;
  const dependencies = extractDependencies(cls).map((dependency) => `- ${resolveLink(dependency)}`);
  const signals = extractSignals(cls);
  const methods = cls
    .getMethods()
    .filter((method) => !method.getName().startsWith("#") && method.getScope() !== "private")
    .map(
      (method: MethodDeclaration) =>
        `- \`${method.getName()}(${method
          .getParameters()
          .map((parameter) => `${parameter.getName()}: ${cleanType(parameter.getType().getText())}`)
          .join(", ")})\`: ${cleanType(method.getReturnType().getText())}`
    );

  const content = `---
type: service
tags: [angular, service]
confidence: high
last_updated: ${TODAY}
sources: [${toAlias(`src/app/${relPath}`)}]
---

# ${name}

- **File**: \`${toAlias(relPath)}\`

## Description
${description}

## Dependencies
${dependencies.length > 0 ? dependencies.join("\n") : "None"}

## Signals / State
${signals.length > 0 ? signals.join("\n") : "None"}

## Methods
${methods.length > 0 ? methods.join("\n") : "None"}

Related: [[architecture/angular-overview]]
`;

  await fs.writeFile(wikiPath, content, "utf8");
  return normalizePath(path.relative(WIKI, wikiPath));
}

async function generateStoreDoc(declaration: VariableDeclaration, relPath: string): Promise<string> {
  const name = declaration.getName();
  const wikiPath = path.join(WIKI, "services", relPath.replace(".ts", ".md"));
  await ensureDir(path.dirname(wikiPath));

  const content = `---
type: store
tags: [angular, ngrx, signals, state-management]
confidence: high
last_updated: ${TODAY}
sources: [src/app/${normalizePath(relPath)}]
---

# ${name} (Signal Store)

- **File**: \`${normalizePath(relPath)}\`

## Description
Signal store entry point for this feature state.

Related: [[patterns/ngrx-signal-store]]
`;

  await fs.writeFile(wikiPath, content, "utf8");
  return normalizePath(path.relative(WIKI, wikiPath));
}

function isLeafFeatureRoute(fileContent: string): boolean {
  return fileContent.includes("loadComponent");
}

function extractRoutePaths(fileContent: string): string[] {
  const routePaths: string[] = [];
  const pathMatches = fileContent.matchAll(/path:\s*"([^"]*)"/g);

  for (const match of pathMatches) {
    const routePath = match[1];
    if (routePath === "**") continue;
    routePaths.push(routePath);
  }

  return [...new Set(routePaths)];
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function pushFileMapRow(rows: FileMapRow[], role: string, fileRel: string) {
  const normalizedFile = normalizePath(fileRel);
  if (rows.some((row) => row.role === role && row.path === normalizedFile)) {
    return;
  }

  rows.push({
    role,
    path: normalizedFile,
    wikiLink: sourcePathToWikiLink(normalizedFile)
  });
}

async function findTranslocoMeta(folderRel: string): Promise<{ scope?: string; loaderPath?: string }> {
  const slug = normalizePath(folderRel).split("/").at(-1);
  if (!slug) return {};

  let currentDir = path.join(MODULES, folderRel);

  while (normalizePath(currentDir).startsWith(normalizePath(MODULES))) {
    currentDir = path.dirname(currentDir);
    if (currentDir === path.dirname(MODULES)) break;

    const routeFiles = (await fs.readdir(currentDir)).filter((name) => name.endsWith(".routes.ts"));
    for (const routeFile of routeFiles) {
      const routePath = path.join(currentDir, routeFile);
      const content = await fs.readFile(routePath, "utf8");
      const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `scope:\\s*"([^"]+)"[\\s\\S]{0,300}?createLoader\\("([^"]*${escapedSlug}[^"]*)"\\)`,
        "m"
      );
      const match = content.match(pattern);

      if (match) {
        return {
          scope: match[1],
          loaderPath: match[2]
        };
      }
    }
  }

  return {};
}

async function buildFeatureFileMap(folderRel: string, routeFileRel: string, routeContent: string): Promise<FileMapRow[]> {
  const rows: FileMapRow[] = [];
  const folderPath = path.join(MODULES, folderRel);
  const folderFiles = (await getAllFiles(folderPath)).map((file) => normalizePath(path.relative(ROOT, file)));
  const loadComponentImports = Array.from(routeContent.matchAll(/import\("([^"]+)"\)/g)).map((match) => match[1]);

  pushFileMapRow(rows, "Routes", routeFileRel);

  for (const importPath of loadComponentImports) {
    const componentTs = normalizePath(path.relative(ROOT, path.resolve(folderPath, `${importPath}.ts`)));
    const componentHtml = componentTs.replace(/\.ts$/, ".html");
    const role =
      componentTs.includes("-list.component.ts") ? "Component (list)" : componentTs.includes("-form.component.ts") ? "Component (form)" : "Component";

    pushFileMapRow(rows, role, componentTs);
    if (folderFiles.includes(componentHtml)) {
      pushFileMapRow(rows, role.replace("Component", "Template"), componentHtml);
    }
  }

  for (const fileRel of folderFiles) {
    if (fileRel.endsWith(".spec.ts") || fileRel.endsWith(".mock.ts")) continue;

    const fileName = path.basename(fileRel);
    if (fileName.endsWith(".constants.ts")) pushFileMapRow(rows, "Constants", fileRel);
    if (fileName.endsWith(".model.ts")) pushFileMapRow(rows, "Model", fileRel);
    if (fileName.endsWith(".store.ts")) pushFileMapRow(rows, "Store", fileRel);
    if (fileName.endsWith(".service.ts") && fileRel.includes("/data-access/")) pushFileMapRow(rows, "API service", fileRel);
    if (fileName.endsWith("form.service.ts")) pushFileMapRow(rows, "Form service", fileRel);
    if (fileName.endsWith("form-populator.service.ts")) pushFileMapRow(rows, "Form populator", fileRel);
    if (fileName.endsWith("form-effects.service.ts")) pushFileMapRow(rows, "Form effects", fileRel);
    if (fileName.endsWith("form-actions.service.ts")) pushFileMapRow(rows, "Form actions", fileRel);
  }

  return rows;
}

async function generateFeatureDocs(): Promise<FeatureDoc[]> {
  const routeFiles = (await getAllFiles(MODULES, [".ts"]))
    .filter((file) => file.endsWith(".routes.ts"))
    .sort((left, right) => left.localeCompare(right));

  const features: FeatureDoc[] = [];

  for (const routeFile of routeFiles) {
    const routeContent = await fs.readFile(routeFile, "utf8");
    if (!isLeafFeatureRoute(routeContent)) continue;

    const routeRel = normalizePath(path.relative(ROOT, routeFile));
    const folderRel = normalizePath(path.relative(MODULES, path.dirname(routeFile)));
    const moduleKey = folderRel.split("/")[0];
    const wikiRel = `features/${folderRel}.md`;
    const routePaths = extractRoutePaths(routeContent);
    const fileMap = await buildFeatureFileMap(folderRel, routeRel, routeContent);
    const translocoMeta = await findTranslocoMeta(folderRel);
    const title = humanizeSlug(folderRel.split("/").at(-1) ?? folderRel);
    const i18nBase = translocoMeta.loaderPath ? `public/i18n/modules/${translocoMeta.loaderPath}` : `public/i18n/modules/${folderRel}`;
    const i18nEs = `${i18nBase}/es.json`;
    const i18nEn = `${i18nBase}/en.json`;

    if (await fileExists(path.join(ROOT, i18nEs))) {
      pushFileMapRow(fileMap, "i18n ES", i18nEs);
    }
    if (await fileExists(path.join(ROOT, i18nEn))) {
      pushFileMapRow(fileMap, "i18n EN", i18nEn);
    }

    const featureDoc: FeatureDoc = {
      folderRel,
      moduleKey,
      wikiRel,
      title,
      routeFileRel: routeRel,
      routePaths,
      fileMap,
      translationScope: translocoMeta.scope,
      loaderPath: translocoMeta.loaderPath
    };

    features.push(featureDoc);

    const featurePagePath = path.join(WIKI, wikiRel);
    await ensureDir(path.dirname(featurePagePath));

    const fileMapRows = fileMap
      .map((row) => `| ${row.role} | ${row.wikiLink ? `${row.wikiLink}<br>\`${row.path}\`` : `\`${row.path}\``} |`)
      .join("\n");
    const routeGuide = routePaths.map((routePath) => `- \`${routePath || "(root)"}\``).join("\n");
    const changeGuide = [
      "- UI changes: start with the component or template rows above.",
      "- Validation/form behavior: check the form service and any form populator/effects rows.",
      "- Persistence/API changes: update the data-access service, model, and store together.",
      "- Navigation or edit/detail behavior: review the routes file first."
    ].join("\n");

    const content = `---
type: feature
tags: [angular, feature, ${moduleKey}]
confidence: high
last_updated: ${TODAY}
sources: [${routeRel}]
---

# ${title}

## What It Is
Feature entry point for \`${folderRel}\`.

## Entry Points
- **Route file**: \`${routeRel}\`
${featureDoc.translationScope ? `- **Transloco scope**: \`${featureDoc.translationScope}\`` : "- **Transloco scope**: not detected"}
${featureDoc.loaderPath ? `- **Loader path**: \`${featureDoc.loaderPath}\`` : "- **Loader path**: not detected"}

## Route Model
${routeGuide}

## File Map
| Role | Path |
|---|---|
${fileMapRows}

## Change Guide
${changeGuide}

Related: [[features/${moduleKey}|${humanizeSlug(moduleKey)}]], [[index]]
`;

    await fs.writeFile(featurePagePath, content, "utf8");
  }

  return features;
}

async function generateModuleFeatureIndexes(features: FeatureDoc[]) {
  const groupedFeatures = new Map<string, FeatureDoc[]>();

  for (const feature of features) {
    const moduleFeatures = groupedFeatures.get(feature.moduleKey) ?? [];
    moduleFeatures.push(feature);
    groupedFeatures.set(feature.moduleKey, moduleFeatures);
  }

  for (const [moduleKey, moduleFeatures] of groupedFeatures) {
    moduleFeatures.sort((left, right) => left.folderRel.localeCompare(right.folderRel));

    const pagePath = path.join(WIKI, "features", `${moduleKey}.md`);
    await ensureDir(path.dirname(pagePath));

    const rows = moduleFeatures
      .map(
        (feature) =>
          `| ${wikiLink(feature.wikiRel, feature.title)} | \`${feature.folderRel}\` | \`${feature.routePaths.join("`, `") || "(root)"}\` |`
      )
      .join("\n");

    const content = `---
type: feature
tags: [angular, ${moduleKey}]
confidence: high
last_updated: ${TODAY}
sources: [src/app/modules/${moduleKey}]
---

# ${humanizeSlug(moduleKey)} Module

${MODULE_SUMMARIES[moduleKey] ?? `Feature index for \`${moduleKey}\`.`}

## Features
| Page | Folder | Routes |
|---|---|---|
${rows}

## Usage
- Read a feature page first.
- Only drill down into component/service pages after the file map points you there.

Related: [[features/index|Features Index]], [[index]]
`;

    await fs.writeFile(pagePath, content, "utf8");
  }
}

async function generateFeaturesIndex(features: FeatureDoc[]) {
  const counts = new Map<string, number>();

  for (const feature of features) {
    counts.set(feature.moduleKey, (counts.get(feature.moduleKey) ?? 0) + 1);
  }

  const rows = Object.keys(MODULE_SUMMARIES)
    .map((moduleKey) => {
      const count = counts.get(moduleKey) ?? 0;
      return `| ${wikiLink(`features/${moduleKey}.md`, `${humanizeSlug(moduleKey)} Module`)} | ${count} | ${MODULE_SUMMARIES[moduleKey]} |`;
    })
    .join("\n");

  const content = `---
type: index
aliases: ["Features Index"]
tags: [meta, features]
confidence: high
last_updated: ${TODAY}
sources: [system]
---

# Features Index

| Page | Feature Pages | Summary |
|------|---------------|---------|
${rows}

Related: [[index]], [[architecture/angular-overview]]
`;

  await fs.writeFile(path.join(WIKI, "features", "index.md"), content, "utf8");
}

// [C3] Escanea docs/raw/articles/ dinámicamente. ARTICLE_OVERRIDES es solo un enriquecedor opcional.
async function discoverArticles(): Promise<CuratedArticleConfig[]> {
  const articlesDir = path.join(ROOT, "docs", "raw", "articles");
  if (!(await fileExists(articlesDir))) return [];

  const files = await getAllFiles(articlesDir, [".md"]);
  return files.map((file) => {
    const sourceRel = normalizePath(path.relative(ROOT, file));
    const override = ARTICLE_OVERRIDES[sourceRel] ?? {};
    const slug = path.basename(file, ".md");
    return {
      sourceRel,
      title: override.title ?? humanizeSlug(slug),
      summary: override.summary ?? `Artículo sobre ${humanizeSlug(slug)}.`,
      ...override
    };
  });
}

async function generateArticleSummaries(): Promise<void> {
  const articles = await discoverArticles(); // [C3] autodiscovery — ya no es whitelist
  const projectSourceFiles = await getAllFiles(path.join(ROOT, "src", "app"), [".ts", ".html"]);

  for (const article of articles) {
    const sourcePath = path.join(ROOT, article.sourceRel);
    if (!(await fileExists(sourcePath))) continue;

    const rawContent = await fs.readFile(sourcePath, "utf8");
    const firstLines = rawContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);
    const sourceSummary = firstLines.slice(0, 4).join(" ");
    const relatedRootFiles = article.relatedRoots ? await getFilesFromRoots(article.relatedRoots) : [];
    const relatedPrefixFiles = article.relatedPrefixes
      ? projectSourceFiles.filter((filePath) => {
          const relPath = normalizePath(path.relative(ROOT, filePath));
          return article.relatedPrefixes?.some((prefix) => relPath.startsWith(prefix));
        })
      : [];
    const relatedExactFiles = article.relatedFiles
      ? (await Promise.all(
          article.relatedFiles.map(async (fileRel) => {
            const absolutePath = path.join(ROOT, fileRel);
            return (await fileExists(absolutePath)) ? absolutePath : null;
          })
        )).filter((filePath): filePath is string => !!filePath)
      : [];
    const relatedFiles = [...new Set([...relatedRootFiles, ...relatedPrefixFiles, ...relatedExactFiles])].sort((left, right) =>
      left.localeCompare(right)
    );
    const relatedFileRows = relatedFiles
      .map((filePath) => {
        const relPath = normalizePath(path.relative(ROOT, filePath));
        return `- \`${relPath}\``;
      })
      .join("\n");
    const apiSnapshot = await buildApiSnapshot(relatedFiles);
    const lastCodeSync = await getLatestModifiedDate(relatedFiles);
    const wikiPath = path.join(WIKI, "articles", `${article.sourceRel.replace(/\.md$/, "").replace(/[\\/]/g, "_")}.md`);

    await ensureDir(path.dirname(wikiPath));

    const content = `---
type: article
tags: [project, documentation, live]
confidence: high
last_updated: ${TODAY}
sources: [${article.sourceRel}]
---

# ${article.title}

## Canonical Rule
- The project source code prevails over this document.
- This page is regenerated from code, so stale guidance must be corrected here through the real source files.

## Source
\`${article.sourceRel}\`

## Intent
${article.summary}

## Source Summary
${sourceSummary || "No summary available."}

## Live Sync
- **Tracked files**: ${relatedFiles.length}
- **Last code sync**: ${lastCodeSync ?? "No tracked code files"}

## Related Project Files
${relatedFileRows || "- No tracked files configured."}

## Current Implementation Snapshot
${apiSnapshot || "No implementation snapshot available."}
`;

    await fs.writeFile(wikiPath, content, "utf8");
  }
}

async function getLatestModifiedDate(files: string[]): Promise<string | null> {
  if (files.length === 0) return null;

  let latestTime = 0;
  for (const filePath of files) {
    const stats = await fs.stat(filePath);
    latestTime = Math.max(latestTime, stats.mtimeMs);
  }

  return new Date(latestTime).toISOString();
}

async function buildApiSnapshot(files: string[]): Promise<string> {
  const snapshotSections: string[] = [];

  for (const filePath of files.slice(0, 20)) {
    const relPath = normalizePath(path.relative(ROOT, filePath));
    const content = await fs.readFile(filePath, "utf8");
    const selectors = Array.from(content.matchAll(/selector:\s*"([^"]+)"/g)).map((match) => `\`${match[1]}\``);
    const exportedClasses = Array.from(content.matchAll(/export\s+class\s+(\w+)/g)).map((match) => `\`${match[1]}\``);
    const exportedFunctions = Array.from(content.matchAll(/export\s+function\s+(\w+)/g)).map((match) => `\`${match[1]}\``);
    const pieces = [...selectors, ...exportedClasses, ...exportedFunctions];

    if (pieces.length === 0) continue;
    snapshotSections.push(`- \`${relPath}\` → ${pieces.join(", ")}`);
  }

  return snapshotSections.join("\n");
}

async function generate() {
  console.log("Starting enhanced project ingestion...");

  const project = new Project({
    tsConfigFilePath: path.join(ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true
  });

  project.addSourceFilesAtPaths(path.join(SRC, "**/*.ts"));
  await buildClassMap(project);
  await pruneGeneratedArticles();

  let generatedItems = 0;
  // [C2] Acumula los paths wiki esperados para borrar huérfanos al final.
  const expectedWikiPaths = new Set<string>();

  for (const sourceFile of project.getSourceFiles()) {
    const relPath = normalizePath(path.relative(SRC, sourceFile.getFilePath()));
    if (relPath.endsWith(".spec.ts")) continue;

    if (shouldGenerateDetailedDoc(relPath)) {
      detailedSourceDocs.add(relPath);
    }

    for (const cls of sourceFile.getClasses()) {
      if (!shouldGenerateDetailedDoc(relPath)) continue;

      if (cls.getDecorator("Component")) {
        const wikiRelPath = await generateComponentDoc(cls, relPath);
        if (wikiRelPath) expectedWikiPaths.add(wikiRelPath);
        generatedItems++;
      } else if (cls.getDecorator("Injectable")) {
        const wikiRelPath = await generateServiceDoc(cls, relPath);
        if (wikiRelPath) expectedWikiPaths.add(wikiRelPath);
        generatedItems++;
      }
    }

    for (const statement of sourceFile.getVariableStatements()) {
      for (const declaration of statement.getDeclarations()) {
        if (!shouldGenerateDetailedDoc(relPath)) continue;
        if (declaration.getInitializer()?.getText().includes("signalStore")) {
          const wikiRelPath = await generateStoreDoc(declaration, relPath);
          if (wikiRelPath) expectedWikiPaths.add(wikiRelPath);
          generatedItems++;
        }
      }
    }
  }

  const features = await generateFeatureDocs();
  await generateModuleFeatureIndexes(features);
  await generateFeaturesIndex(features);
  await generateArticleSummaries();

  // [C2] Borrar solo docs huérfanos (clases renombradas o eliminadas).
  await pruneStaleDetailDocs(expectedWikiPaths);

  generatedItems += features.length;

  if (generatedItems > 0) {
    await appendLog("full-ingest", `Enhanced project ingestion (${generatedItems} items)`);
  }

  console.log(`Massive wiki generation complete. Processed ${generatedItems} updated items.`);
}

generate().catch(console.error);
