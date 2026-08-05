#!/usr/bin/env node
// Usage: node scripts/scaffold-feature.mjs path/to/spec.json
// SOURCE: .claude/skills/feature-scaffolding/references/templates.md — keep in sync on pattern changes.
//
// Generates L1-model, L2-service, L3-store, L4-constants, L5-routes, L8-i18n (es+en).
// Prints patch instructions for layout-pages.ts, entity-name.model.ts, parentRoutesFile, menu.service.ts.
// Does NOT generate L6-list or L7-form — those require LLM reasoning.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Utilities ──────────────────────────────────────────────────────────────────

/** PascalCase → kebab-case:  "BillableConcept" → "billable-concept" */
function toKebab(s) {
  return s.replace(/([A-Z])/g, (c, i) => (i > 0 ? "-" : "") + c.toLowerCase());
}

/** camelCase|PascalCase → SCREAMING_SNAKE:  "billableConcepts" → "BILLABLE_CONCEPTS" */
function toScream(s) {
  return s.replace(/([A-Z])/g, (c) => "_" + c).toUpperCase().replace(/^_/, "");
}

/** kebab-case → PascalCase:  "billable-concepts" → "BillableConcepts" */
function toPascal(kebab) {
  return kebab.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join("");
}

function write(relPath, content) {
  const abs = join(ROOT, relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf-8");
  console.log(`  ✓  ${relPath}`);
}

// ── Validation ─────────────────────────────────────────────────────────────────

const REQUIRED_SPEC = [
  "entitySingular", "entityPlural", "featureName", "moduleSrcPath",
  "pagesKey", "entitiesKey", "backendBaseUrl", "softDelete",
  "permissions", "fields", "formSplit", "translocoScope",
  "i18nPath", "parentRoutesFile", "menuGroup"
];
const REQUIRED_PERMS = ["LIST", "DETAIL", "CREATE", "UPDATE", "DELETE"];
const REQUIRED_FIELD = ["name", "type", "required", "inSearch", "labelEs", "labelEn"];

function validateSpec(spec) {
  const missing = REQUIRED_SPEC.filter(k => spec[k] == null);
  if (missing.length) fatal(`missing required spec fields: ${missing.join(", ")}`);

  const missingPerms = REQUIRED_PERMS.filter(k => !spec.permissions[k]);
  if (missingPerms.length) fatal(`missing permissions: ${missingPerms.join(", ")}`);

  if (!Array.isArray(spec.fields) || spec.fields.length === 0) fatal("spec.fields must have at least one entry");

  spec.fields.forEach((f, i) => {
    const mf = REQUIRED_FIELD.filter(k => f[k] == null);
    if (mf.length) fatal(`field[${i}] (${f.name ?? "?"}) missing: ${mf.join(", ")}`);
  });

  if (!["simple", "split", "split+workflow"].includes(spec.formSplit)) {
    fatal(`spec.formSplit must be "simple" | "split" | "split+workflow"`);
  }
}

function fatal(msg) {
  console.error(`\n✗  Scaffold aborted — ${msg}\n`);
  process.exit(1);
}

// ── Derived values ─────────────────────────────────────────────────────────────

function derive(spec) {
  const { entitySingular, entityPlural, featureName, moduleSrcPath, translocoScope, i18nPath } = spec;

  const entityFile   = toKebab(entitySingular);        // "zone", "billable-concept"
  const entityConst  = toScream(entitySingular);       // "ZONE", "BILLABLE_CONCEPT"
  const featureConst = toScream(entityPlural);         // "ZONES", "BILLABLE_CONCEPTS"
  const featurePascal = toPascal(featureName);         // "Zones", "BillableConcepts" — used in component class names
  const moduleAlias  = `@module/${moduleSrcPath}/${featureName}`;
  const featureSrcPath = `src/app/modules/${moduleSrcPath}/${featureName}`;
  const i18nBasePath   = `public/i18n/modules/${i18nPath}/${featureName}`;

  const tabs = spec.tabs ?? [{
    label: "basicData",
    titleEs: "Datos básicos",
    titleEn: "Basic data",
    sections: [{
      key: "generalInfo",
      icon: "fa-duotone fa-regular fa-circle-info text-primary",
      titleEs: "Información general",
      titleEn: "General information",
      descriptionEs: "Datos básicos de la entidad.",
      descriptionEn: "Basic entity data."
    }]
  }];

  const filterFieldName = spec.filterFieldName
    ?? spec.fields.find(f => f.type === "string" && f.required)?.name
    ?? "name";

  return { entityFile, entityConst, featureConst, featurePascal, moduleAlias, featureSrcPath, i18nBasePath, tabs, filterFieldName };
}

// ── Type helpers ───────────────────────────────────────────────────────────────

const PRIMITIVES = new Set(["string", "number", "boolean", "Date", "date"]);

function norm(type) { return type === "date" ? "Date" : type; }
function isPrim(type) { return PRIMITIVES.has(norm(type)); }

/** Entity full type */
function entityType(f) {
  const t = norm(f.type);
  return f.required ? t : `${t} | null`;
}

/** EntitySearch type: FK objects become string (display) */
function searchType(f) {
  if (!isPrim(norm(f.type))) return "string";
  const t = norm(f.type);
  return f.required ? t : `${t} | null`;
}

/** FormControl wrapping */
function fcType(f) {
  const t = norm(f.type);
  if (t === "string")  return f.required ? "FormControl<string>"        : "FormControl<string | null>";
  if (t === "number")  return "FormControl<number | null>";
  if (t === "boolean") return "FormControl<boolean>";
  if (t === "Date")    return "FormControl<Date | null>";
  return `FormControl<${t} | null>`;
}

/** FILTER_TYPE + BODY_TYPE */
function colTypes(f) {
  const t = norm(f.type);
  if (t === "Date")   return { filter: "FILTER_TYPE.DATE",    body: "BODY_TYPE.DATE" };
  if (t === "number") return { filter: "FILTER_TYPE.NUMERIC", body: "BODY_TYPE.TEXT" };
  return                     { filter: "FILTER_TYPE.TEXT",    body: "BODY_TYPE.TEXT" };
}

// ── Generators ─────────────────────────────────────────────────────────────────

function genModel(spec, d) {
  const { entitySingular, fields } = spec;
  const { moduleAlias, entityFile } = d;

  const fkTypes = [...new Set(fields.filter(f => !isPrim(f.type)).map(f => norm(f.type)))];
  const fkComment = fkTypes.length
    ? `\n// SCAFFOLD-TODO: add imports for FK types: ${fkTypes.join(", ")}`
    : "";

  const entityFields = fields.map(f => `  ${f.name}: ${entityType(f)};`).join("\n");
  const searchFields = fields.filter(f => f.inSearch).map(f => `  ${f.name}: ${searchType(f)};`).join("\n");
  const formFields   = [
    "  id: FormControl<string | null>;",
    ...fields.map(f => `  ${f.name}: ${fcType(f)};`)
  ].join("\n");

  return `import { FormControl } from "@angular/forms";${fkComment}
import { BaseEntity } from "@shared/models/common/base-entity.model";

export type ${entitySingular} = BaseEntity & {
${entityFields}
};

export type ${entitySingular}Search = BaseEntity & {
${searchFields}
};

export type ${entitySingular}Form = {
${formFields}
};
`;
}

function genService(spec, d) {
  const { entitySingular, backendBaseUrl } = spec;
  const { entityFile, moduleAlias, filterFieldName } = d;

  return `import { Injectable } from "@angular/core";
import { environment } from "@environments/environments";
import { ${entitySingular}, ${entitySingular}Search } from "${moduleAlias}/data-access/${entityFile}.model";
import { EntityService } from "@shared/services/entity-service";

@Injectable({ providedIn: "root" })
export class ${entitySingular}Service extends EntityService<${entitySingular}, ${entitySingular}Search> {
  protected override filterFieldName = "${filterFieldName}";
  protected override baseUrl = \`${backendBaseUrl}\`;
}
`;
}

function genStore(spec, d) {
  const { entitySingular, softDelete, entityStatus } = spec;
  const { entityFile, featureConst, moduleAlias } = d;
  const es = entityStatus ?? { activeField: "creationDate", inactiveField: "deletionDate" };

  const stToggle = softDelete
    ? `statusToggle: { enabled: true },\n    entityStatus: { activeField: "${es.activeField}", inactiveField: "${es.inactiveField}" }`
    : `statusToggle: { enabled: false }`;

  return `import { signalStore } from "@ngrx/signals";
import { ${entitySingular}, ${entitySingular}Search } from "${moduleAlias}/data-access/${entityFile}.model";
import { ${entitySingular}Service } from "${moduleAlias}/data-access/${entityFile}.service";
import { ${featureConst}_LIST_TABLE_ID } from "${moduleAlias}/${spec.featureName}.constants";
import { withCrudOperations } from "@shared/data-access/store-features/with-crud-operations";
import { withTableCustomConfig } from "@shared/data-access/store-features/with-table-custom-config";

export const ${entitySingular}Store = signalStore(
  { providedIn: "root" },
  withCrudOperations<${entitySingular}, ${entitySingular}Search>(${entitySingular}Service, {
    ${stToggle}
  }),
  withTableCustomConfig(${featureConst}_LIST_TABLE_ID)
);
`;
}

function genConstants(spec, d) {
  const { entitySingular, featureName, fields, permissions, softDelete, translocoScope } = spec;
  const { entityFile, entityConst, featureConst, moduleAlias, tabs } = d;

  // Permissions
  const extrasLines = (permissions.extras ?? []).map(e => `,\n  ${e.key}: "${e.code}"`).join("");
  const extrasUnion = (permissions.extras ?? []).map(e => `"${e.key}"`).join(" | ") || "never";

  const permsBlock = `{
  LIST:   "${permissions.LIST}",
  DETAIL: "${permissions.DETAIL}",
  CREATE: "${permissions.CREATE}",
  UPDATE: "${permissions.UPDATE}",
  DELETE: "${permissions.DELETE}"${extrasLines}
} as const satisfies FeaturePermissions<${extrasUnion}>`;

  // Columns: inSearch fields + always creationDate + deletionDate when softDelete
  const colLines = [
    ...fields.filter(f => f.inSearch).map(f => {
      const { filter, body } = colTypes(f);
      return `  { field: "${f.name}", header: "${translocoScope}.table.${f.name}", filterType: ${filter}, bodyType: ${body} }`;
    }),
    `  { field: "creationDate", header: "common.table.creationDate", filterType: FILTER_TYPE.DATE, bodyType: BODY_TYPE.DATE }`,
    ...(softDelete ? [`  { field: "deletionDate", header: "common.table.deletionDate", filterType: FILTER_TYPE.DATE, bodyType: BODY_TYPE.DATE }`] : [])
  ];

  // ContentIndex
  const contentLines = tabs.map(tab =>
    `  [\n${tab.sections.map(s =>
      `    {\n      icon: "${s.icon}",\n      title: "${translocoScope}.tabs.${tab.label}.sections.${s.key}.title",\n      description: "${translocoScope}.tabs.${tab.label}.sections.${s.key}.description"\n    }`
    ).join(",\n")}\n  ]`
  ).join(",\n");

  // Default sort: first inSearch primitive field
  const sortField = fields.find(f => f.inSearch && isPrim(f.type))?.name ?? "id";

  return `import { ${entitySingular}Search } from "${moduleAlias}/data-access/${entityFile}.model";
import { InitialTableSortConfig } from "@shared/models/common/sort.model";
import { FeaturePermissions } from "@shared/models/permission.types";
import { BODY_TYPE, FILTER_TYPE, TableColumn } from "@shared/ui/custom-table/custom-table.models";
import { ContentIndex } from "@shared/ui/form-wrapper/form-wrapper-content-index/form-wrapper-content-index.component";

export const ${featureConst}_LIST_TABLE_ID = "${featureName}_list";

export const ${entityConst}_PERMISSIONS = ${permsBlock};

export const ${entityConst}_TITLE = {
  LIST:   "${translocoScope}.breadcrumb.list",
  DETAIL: "${translocoScope}.breadcrumb.detail",
  EDIT:   "${translocoScope}.breadcrumb.edit",
  CREATE: "${translocoScope}.breadcrumb.create"
};

export const ${featureConst}_DEFAULT_SORT: InitialTableSortConfig<${entitySingular}Search>[] = [
  { sortField: "${sortField}", sortOrder: 1 }
];

export const ${featureConst}_COLUMNS: TableColumn<${entitySingular}Search>[] = [
${colLines.join(",\n")}
];

export const ${featureConst}_CONTENT_INDEX: ContentIndex[][] = [
${contentLines}
];
`;
}

function genRoutes(spec, d) {
  const { entitySingular, featureName } = spec;
  const { entityFile, entityConst, featureConst, featurePascal, moduleAlias } = d;

  return `import { Route } from "@angular/router";
import { activeEntityResolver } from "@core/guards/active-entity.resolver";
import { hasPermissionGuard } from "@core/guards/has-permission.guard";
import { PendingChangesGuard } from "@core/guards/pending-changes/pending-changes.guard";
import { ${entityConst}_PERMISSIONS, ${entityConst}_TITLE } from "${moduleAlias}/${featureName}.constants";
import { ${entitySingular}Service } from "${moduleAlias}/data-access/${entityFile}.service";
import { ${entitySingular}Store } from "${moduleAlias}/data-access/${entityFile}.store";

export const ${featureConst}_ROUTES: Route[] = [
  {
    path: "",
    canActivate: [hasPermissionGuard],
    data: { breadcrumb: ${entityConst}_TITLE.LIST, permission: ${entityConst}_PERMISSIONS.LIST },
    loadComponent: () =>
      import("./feat-${featureName}-list/feat-${featureName}-list.component").then((c) => c.Feat${featurePascal}ListComponent)
  },
  {
    path: "new",
    canActivate: [hasPermissionGuard],
    canDeactivate: [PendingChangesGuard],
    data: { breadcrumb: ${entityConst}_TITLE.CREATE, permission: ${entityConst}_PERMISSIONS.CREATE },
    loadComponent: () =>
      import("./feat-${featureName}-form/feat-${featureName}-form.component").then((c) => c.Feat${featurePascal}FormComponent)
  },
  {
    path: ":id/edit",
    canActivate: [hasPermissionGuard],
    canDeactivate: [PendingChangesGuard],
    resolve: {
      resolvedEntity: activeEntityResolver(${entitySingular}Service, { redirectIfInactive: true, storeType: ${entitySingular}Store })
    },
    data: { isEdition: true, breadcrumb: ${entityConst}_TITLE.EDIT, permission: ${entityConst}_PERMISSIONS.UPDATE },
    loadComponent: () =>
      import("./feat-${featureName}-form/feat-${featureName}-form.component").then((c) => c.Feat${featurePascal}FormComponent)
  },
  {
    path: ":id",
    canActivate: [hasPermissionGuard],
    resolve: { resolvedEntity: activeEntityResolver(${entitySingular}Service) },
    data: { isDetail: true, breadcrumb: ${entityConst}_TITLE.DETAIL, permission: ${entityConst}_PERMISSIONS.DETAIL },
    loadComponent: () =>
      import("./feat-${featureName}-form/feat-${featureName}-form.component").then((c) => c.Feat${featurePascal}FormComponent)
  }
];
`;
}

function genI18n(spec, d, lang) {
  const { entitySingular, entityPlural, featureName, fields, softDelete, translocoScope } = spec;
  const { tabs } = d;
  const es = lang === "es";

  const tableObj = {};
  fields.filter(f => f.inSearch).forEach(f => {
    tableObj[f.name] = es ? f.labelEs : f.labelEn;
  });

  const labelsObj = {};
  const placeholdersObj = {};
  fields.forEach(f => {
    const key = f.i18nKey ?? f.name;
    labelsObj[key]       = es ? f.labelEs : f.labelEn;
    placeholdersObj[key] = es
      ? `Introduce ${f.labelEs.toLowerCase()}`
      : `Enter ${f.labelEn.toLowerCase()}`;
  });

  const tabsObj = {};
  tabs.forEach(tab => {
    const sectionsObj = {};
    tab.sections.forEach(s => {
      sectionsObj[s.key] = {
        title:       es ? s.titleEs       : s.titleEn,
        description: es ? s.descriptionEs : s.descriptionEn
      };
    });
    tabsObj[tab.label] = {
      title:    es ? tab.titleEs : tab.titleEn,
      sections: sectionsObj
    };
  });

  const entityEs = `SCAFFOLD-TODO: ${entitySingular}`;
  const entityEn = entitySingular.toLowerCase();
  const entityPluralLabel = es ? `SCAFFOLD-TODO: ${entityPlural}` : entityPlural;

  const json = {
    title: es ? `SCAFFOLD-TODO: Listado de ${entityPlural}` : `${entitySingular} list`,
    breadcrumb: {
      list:   es ? `SCAFFOLD-TODO: Listado de ${entityPlural}` : `${entitySingular} list`,
      create: es ? `SCAFFOLD-TODO: Crear ${entitySingular}`    : `New ${entityEn}`,
      edit:   es ? `SCAFFOLD-TODO: Editar ${entitySingular}`   : `Edit ${entityEn}`,
      detail: es ? `SCAFFOLD-TODO: Detalle de ${entitySingular}` : `${entitySingular} detail`
    },
    ...(softDelete ? {
      messages: {
        deletionTitle:   es ? `SCAFFOLD-TODO: Dar de baja` : `Deactivate ${entityEn}`,
        deletionMessage: es
          ? `SCAFFOLD-TODO: mensaje de baja`
          : `You are about to deactivate ${entityEn}. This will mark it as inactive.`
      }
    } : {}),
    tabs: tabsObj,
    table: tableObj,
    form: {
      labels:       labelsObj,
      placeholders: placeholdersObj
    }
  };

  return JSON.stringify(json, null, 2);
}

// ── Patch printer ──────────────────────────────────────────────────────────────

function printPatches(spec, d) {
  const { entitySingular, featureName, pagesKey, entitiesKey, translocoScope, i18nPath, parentRoutesFile, menuGroup } = spec;
  const { featureConst } = d;

  // Derive routerLink: replace src/app/modules/ prefix with /
  const routerLink = `/${spec.moduleSrcPath}/${featureName}`;

  const sep = "─".repeat(60);
  console.log(`\n${sep}`);
  console.log("  MANUAL PATCHES — apply these before running tsc");
  console.log(`${sep}\n`);

  console.log(`── 1. src/app/core/shell/data/layout-pages.ts`);
  console.log(`   Add to PAGES object:\n`);
  console.log(`  ${pagesKey}: {`);
  console.log(`    path: "${featureName}",`);
  console.log(`    routerLink: ["${routerLink}"],`);
  console.log(`    label: "breadcrumb.${featureName}",`);
  console.log(`    automationId: "menu${entitySingular}",`);
  console.log(`    icon: "fa-duotone fa-regular fa-circle text-primary"  // SCAFFOLD-TODO: replace icon`);
  console.log(`  },\n`);

  console.log(`── 2. src/app/shared/models/entity-name.model.ts`);
  console.log(`   Add to ENTITIES object:\n`);
  console.log(`  ${entitiesKey}: "${featureName}",\n`);

  console.log(`── 3. ${parentRoutesFile}`);
  console.log(`   Add Route entry (import PAGES, provideTranslocoScope, LanguageAppService if not present):\n`);
  console.log(`  {`);
  console.log(`    path: PAGES.${pagesKey}.path,`);
  console.log(`    data: { breadcrumb: "breadcrumb.${featureName}" },`);
  console.log(`    providers: [`);
  console.log(`      provideTranslocoScope({`);
  console.log(`        scope: "${translocoScope}",`);
  console.log(`        loader: LanguageAppService.createLoader("${i18nPath}/${featureName}")`);
  console.log(`      })`);
  console.log(`    ],`);
  console.log(`    loadChildren: () => import("./${featureName}/${featureName}.routes").then((mod) => mod.${featureConst}_ROUTES)`);
  console.log(`  },\n`);

  console.log(`── 4. src/app/core/shell/data/menu.service.ts`);
  console.log(`   Add to items[] in group "${menuGroup}":\n`);
  console.log(`  PAGES.${pagesKey}\n`);

  console.log(`${sep}\n`);
  console.log(`Next: run the dev agent to generate L6 (list) and L7 (form) and apply the patches above.`);
  console.log(`Dev agent context: spec.json + generated files + @rule:project-ui-components + @rule:angular-form-responsibility-separation\n`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

const specPath = process.argv[2];
if (!specPath) {
  console.error("\nUsage: node scripts/scaffold-feature.mjs path/to/spec.json\n");
  process.exit(1);
}

let spec;
try {
  spec = JSON.parse(readFileSync(resolve(process.cwd(), specPath), "utf-8"));
} catch (e) {
  fatal(`cannot read spec file "${specPath}": ${e.message}`);
}

validateSpec(spec);
const d = derive(spec);

const { featureSrcPath, i18nBasePath, entityFile } = d;

console.log(`\n⚡ Scaffolding: ${spec.featureName}  (${spec.entitySingular}, formSplit=${spec.formSplit})\n`);

write(`${featureSrcPath}/data-access/${entityFile}.model.ts`,  genModel(spec, d));
write(`${featureSrcPath}/data-access/${entityFile}.service.ts`, genService(spec, d));
write(`${featureSrcPath}/data-access/${entityFile}.store.ts`,   genStore(spec, d));
write(`${featureSrcPath}/${spec.featureName}.constants.ts`,     genConstants(spec, d));
write(`${featureSrcPath}/${spec.featureName}.routes.ts`,        genRoutes(spec, d));
write(`${i18nBasePath}/es.json`,                                genI18n(spec, d, "es"));
write(`${i18nBasePath}/en.json`,                                genI18n(spec, d, "en"));

console.log(`\n✅ 7 files generated\n`);

if (spec.huId) {
  const mappingPath = join(ROOT, "component-feature-mapping.json");
  let mapping = {};
  try { mapping = JSON.parse(readFileSync(mappingPath, "utf-8")); } catch(e) {}
  
  const listKey = `feat-${spec.featureName}-list`;
  const formKey = `feat-${spec.featureName}-form`;
  
  mapping[listKey] = mapping[listKey] || [];
  if (!mapping[listKey].includes(spec.huId)) mapping[listKey].push(spec.huId);
  
  mapping[formKey] = mapping[formKey] || [];
  if (!mapping[formKey].includes(spec.huId)) mapping[formKey].push(spec.huId);
  
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), "utf-8");
  console.log(`  ✓  component-feature-mapping.json updated with ${spec.huId}`);
}

printPatches(spec, d);
