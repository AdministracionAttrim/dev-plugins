export const meta = {
  name: 'feature-scaffolding-dynamic',
  description: 'Post-generación verification: spec validation + generated code compliance + test generation + integration check + completeness checklist',
  phases: [
    { title: 'Spec Validation', detail: 'Verifica spec.json contra schema + Azure HU requirements' },
    { title: 'Context Loading', detail: 'Extrae slices del spec por capa (1 agente, evita repetir spec en L1, L5 y Architecture Compliance)' },
    { title: 'Generated Code Verification', detail: 'L1–L8: tipos, service, store, routes, i18n, constants' },
    { title: 'Architecture Compliance', detail: 'CLAUDE.md + Angular best practices + project patterns' },
    { title: 'Test Generation', detail: 'E2E specs + unit tests + service tests' },
    { title: 'Integration Check', detail: 'Patches (layout-pages, entity-name, routes, menu) correctos' },
    { title: 'Completeness Verification', detail: 'V: checklist final' },
  ]
}

phase('Spec Validation')

// Input: args = { feat, specJson, huId, specFileContent }

const specValidation = await agent(
  `Valida que el spec.json para "${args.feat}" es COMPLETO y correcto.

Spec proporcionado:
\`\`\`json
${args.specFileContent}
\`\`\`

HU requisito (si disponible):
${args.huContext || '(no proporcionado)'}

Reference spec.schema.json: @references/spec.schema.json en feature-scaffolding

**Validación:**
1. ¿Todos los campos requeridos presentes y válidos?
   - formSplit: "simple" | "split" | "split+workflow"
   - backendBaseUrl: debe empezar con /
   - pagesKey, entitiesKey, parentRoutesFile, menuGroup: strings válidos
   - FK fields: cada uno con fkEntity, fkDisplayField
2. ¿formSplit coherente con dataStructure?
   - simple: no FormArrays, ≤3 fields no-interacting
   - split: >3 fields o FormArrays
   - split+workflow: workflow.statuses + transitions definidos
3. ¿Permisos válidos?
   - base 5: VIEW, CREATE, UPDATE, DELETE, BULK_DELETE
   - extras: nombres claros (ej APPROVE, EXPORT, CANCEL)
4. ¿i18n completo?
   - breadcrumbs, labels, placeholders, validationMessages
5. ¿Validadores alineados con backend?
   - @Size/@Digits/@Min/@Max en spec → validadores en form

Retorna JSON: { valid: boolean, issues: [{field, severity, description, suggestion}], suggestions: [...] }`,
  {
    label: 'Spec-Validator',
    phase: 'Spec Validation',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        issues: { type: 'array' },
        suggestions: { type: 'array' }
      }
    }
  }
)

log(`Spec validation: ${specValidation?.valid ? '✅ VÁLIDO' : '⚠️ ISSUES ENCONTRADOS'}`)

if (!specValidation?.valid) {
  log(`⚠️ Spec tiene ${specValidation?.issues?.length || 0} issues. Revisor debe resolver antes de continuar.`)
}

// Phase 1.5: Context Loading
// Lee el spec una sola vez y extrae slices por capa.
// Evita enviar el spec completo a L1, L5 y Architecture Compliance por separado.
phase('Context Loading')

const contextSlices = await agent(
  `Eres un extractor de contexto estructurado para verificación de feature scaffolding Angular. Tu tarea es leer el spec.json del feature "${args.feat}" y extraer ÚNICAMENTE las secciones JSON relevantes para cada capa de verificación. NO analices, NO resumas — extrae el JSON literal relevante.

### spec.json
\`\`\`json
${args.specFileContent}
\`\`\`

Extrae para cada capa SOLO las propiedades JSON necesarias:

**spec_model** (para L1 - verificación de tipos/modelo): dataStructure.fields completo con tipos, required flags, maxLength/min/max; FK relationships con fkEntity y fkDisplayField.
**spec_routes** (para L5 - verificación de rutas): permissions.base y permissions.extras con sus string codes; backendBaseUrl; parentRoutesFile; formSplit (para saber si aplica PendingChangesGuard en workflow); pagesKey; entitiesKey.
**spec_architecture** (para Architecture Compliance): formSplit; workflow.statuses y workflow.transitions (si existen); dataStructure summary (campos count, tiene FormArrays); pagesKey; entitiesKey; menuGroup.`,
  {
    label: 'Context-Loader',
    phase: 'Context Loading',
    schema: {
      type: 'object',
      properties: {
        spec_model:        { type: 'string', description: 'Fields, types, FK relationships for L1 model verification' },
        spec_routes:       { type: 'string', description: 'Permissions codes, backendBaseUrl, formSplit for L5 routes verification' },
        spec_architecture: { type: 'string', description: 'formSplit, workflow, structure summary for Architecture Compliance' }
      },
      required: ['spec_model', 'spec_routes', 'spec_architecture']
    }
  }
)

if (!contextSlices) {
  log('⚠️ Context-Loader fue omitido — abortando workflow')
  return { error: 'context_loader_skipped', feat: args.feat }
}

log(`Context-Loader complete — spec slices listos para L1, L5 y Architecture Compliance`)

// Phase 2: Generated Code Verification
phase('Generated Code Verification')

const codeVerification = await parallel([
  // L1: Model
  () => agent(
    `Verifica L1 (model) generado para "${args.feat}".

Archivos:
\`\`\`
${args.codeFiles.model}
\`\`\`

Spec relevante (campos, tipos, FK relationships):
\`\`\`json
${contextSlices.spec_model}
\`\`\`

**Verificaciones:**
1. Entity type: coincide con spec.dataStructure.fields
2. EntitySearch: campos reducidos vs. full Entity (GET/list diferencia)
3. EntityForm: campos editables, tipos correctos, validators alineados
4. FK imports: SCAFFOLD-TODO resueltos? @ref mcp__angular-cli__search_documentation "import entity types"
5. !!any | all types typed correctamente
6. !!interface; only type definitions

Retorna JSON: { layer: 'L1', valid: boolean, type_issues: [{issue, line}], suggestions: [...] }`,
    {
      label: 'L1-Model',
      phase: 'Generated Code Verification',
      schema: { type: 'object', properties: { layer: { type: 'string' }, valid: { type: 'boolean' }, type_issues: { type: 'array' }, suggestions: { type: 'array' } } }
    }
  ),

  // L2: Service
  () => agent(
    `Verifica L2 (service) generado para "${args.feat}".

Código:
\`\`\`
${args.codeFiles.service}
\`\`\`

**Verificaciones:**
1. Extends EntityService<Entity, EntitySearch>
2. baseUrl alineado con spec.backendBaseUrl
3. filterFieldName correcto para búsqueda
4. constructor + inject() pattern (no constructor injection)
5. !!HttpClient directo en constructor

Retorna JSON: { layer: 'L2', valid: boolean, issues: [...] }`,
    {
      label: 'L2-Service',
      phase: 'Generated Code Verification',
      schema: { type: 'object', properties: { layer: { type: 'string' }, valid: { type: 'boolean' }, issues: { type: 'array' } } }
    }
  ),

  // L3: Store
  () => agent(
    `Verifica L3 (store) generado para "${args.feat}".

Código:
\`\`\`
${args.codeFiles.store}
\`\`\`

**Verificaciones:**
1. signalStore + withCrudOperations
2. withTableCustomConfig: columns, defaultSort, activeToggle (si formSplit=split)
3. !!BehaviorSubject; solo signals
4. @ref mcp__angular-cli__search_documentation "signal store best practices"

Retorna JSON: { layer: 'L3', valid: boolean, issues: [...] }`,
    {
      label: 'L3-Store',
      phase: 'Generated Code Verification',
      schema: { type: 'object', properties: { layer: { type: 'string' }, valid: { type: 'boolean' }, issues: { type: 'array' } } }
    }
  ),

  // L5: Routes
  () => agent(
    `Verifica L5 (routes) generado para "${args.feat}".

Código:
\`\`\`
${args.codeFiles.routes}
\`\`\`

Spec relevante (permisos, guards, formSplit):
\`\`\`json
${contextSlices.spec_routes}
\`\`\`

**Verificaciones:**
1. 4 rutas presentes: list, new, :id (detail), :id/edit
2. hasPermissionGuard en TODAS (LE-SS-0055, G:032)
3. activeEntityResolver en :id + :id/edit
4. PendingChangesGuard en new + :id/edit
5. data: { permission: spec.permissions.base.VIEW, etc. }
6. Permisos correctos en data.permission (sin UUIDs, LE-SS-0012)

Retorna JSON: { layer: 'L5', valid: boolean, routes_ok: [{path, guards_ok}], issues: [...] }`,
    {
      label: 'L5-Routes',
      phase: 'Generated Code Verification',
      schema: { type: 'object', properties: { layer: { type: 'string' }, valid: { type: 'boolean' }, routes_ok: { type: 'array' }, issues: { type: 'array' } } }
    }
  ),

  // L8: i18n
  () => agent(
    `Verifica L8 (i18n) generado para "${args.feat}".

Archivos es.json + en.json:
\`\`\`
${args.codeFiles.es_json}
---
${args.codeFiles.en_json}
\`\`\`

**Verificaciones:**
1. ¿Ambos archivos (es.json + en.json) tienen EXACTAMENTE las mismas keys?
2. ¿No hay SCAFFOLD-TODO markers? (ej. "SCAFFOLD-TODO: breadcrumb copy")
3. ¿Estructura JSON plana? (LE-SS-0027 — no wrapper object como {"feature":{...}})
4. ¿Keys son descriptivas? (no crípticas)
5. Breadcrumbs, labels, placeholders, validationMessages presentes
6. !!hardcoded en componentes (LE-SS-0018); todo vía transloco

Retorna JSON: { layer: 'L8', valid: boolean, key_sync_ok: boolean, scaffold_todos: [...], structure_flat: boolean, issues: [...] }`,
    {
      label: 'L8-i18n',
      phase: 'Generated Code Verification',
      schema: { type: 'object', properties: { layer: { type: 'string' }, valid: { type: 'boolean' }, key_sync_ok: { type: 'boolean' }, scaffold_todos: { type: 'array' }, structure_flat: { type: 'boolean' }, issues: { type: 'array' } } }
    }
  ),

  // L4: Constants
  () => agent(
    `Verifica L4 (constants) generado para "${args.feat}".

Código:
\`\`\`
${args.codeFiles.constants}
\`\`\`

**Verificaciones:**
1. TABLE_ID único (no colisiona con existentes)
2. PERMISSIONS: @ref mcp__angular-cli__search_documentation "FeaturePermissions type"
   - Todos los string codes (no UUIDs)
   - Coincide con spec.permissions
3. DEFAULT_SORT correcto
4. COLUMNS: cada columna con alias, tipo, label i18n key
5. CONTENT_INDEX: indice correcto

Retorna JSON: { layer: 'L4', valid: boolean, issues: [...] }`,
    {
      label: 'L4-Constants',
      phase: 'Generated Code Verification',
      schema: { type: 'object', properties: { layer: { type: 'string' }, valid: { type: 'boolean' }, issues: { type: 'array' } } }
    }
  )
])

log(`Generated code verification: ${codeVerification.filter(c => c?.valid).length}/${codeVerification.length} layers OK`)

// Phase 3: Architecture Compliance
phase('Architecture Compliance')

const archCompliance = await agent(
  `Verifica que el código generado cumple con CLAUDE.md + Angular best practices.

Código generado (L1–L8):
${JSON.stringify(codeVerification, null, 2)}

Spec relevante (formSplit, estructura, workflow):
\`\`\`json
${contextSlices.spec_architecture}
\`\`\`

Reglas a verificar (@ref mcp__angular-cli__get_best_practices):
1. ChangeDetectionStrategy.OnPush en list + form
2. standalone components (implicit)
3. inject() función, nunca constructor injection
4. Signals + computed, no BehaviorSubject
5. Template: @if/@for/@switch (no *ngIf/*ngFor)
6. input() + output(), no @Input/@Output
7. Member ordering: inject → input/output → viewChild → const → signal → computed → getter → constructor → protected → private
8. Readonly en inject (G:001)
9. Type en lugar de interface
10. Componentes ≤200L, services ≤350L, fn complexity ≤20
11. No constructor injection, no !any, no !readonly

CLAUDE.md patterns:
- List: useFeaturePermissions, store injection, setColumns en ngOnInit
- Form: FormWithPendingChanges, useRoutedEntityState, executeAction pattern
- Permisos: L1 guard + L2 useFeaturePermissions + L3 template bindings

Retorna JSON: { compliant: boolean, violations: [{rule, component, severity}], patterns_ok: [{pattern, status}] }`,
  {
    label: 'Architecture-Check',
    phase: 'Architecture Compliance',
    schema: {
      type: 'object',
      properties: {
        compliant: { type: 'boolean' },
        violations: { type: 'array' },
        patterns_ok: { type: 'array' }
      }
    }
  }
)

log(`Architecture compliance: ${archCompliance?.compliant ? '✅ COMPLIANT' : '⚠️ VIOLATIONS DETECTED'}`)

// Phase 4: Test Generation
phase('Test Generation')

const testGeneration = await agent(
  `Genera specs E2E + unit tests para "${args.feat}" con /playwright-best-practices.

Feature:
- List route: ${args.listRoute}
- Create route: ${args.createRoute}
- Entity: ${args.feat}
- Permissions: ${contextSlices.spec_routes}

Tareas:
1. **E2E Spec** (e2e/generated/{feat}-full.spec.ts):
   - @smoke tests: list loads, columns visible, pre-filtro aplicado, validación visible al crear
   - @e2e tests: CRUD flow (CREATE, EDIT, DETAIL, DELETE) con red
   - State-probes si FormArray (Añadir 2× sin duplicar, etc.)
   - Use /playwright-best-practices skill para mejores prácticas
   - Usa mcp__primeng__ para selectores correctos

2. **Service Unit Test** (src/app/.../service.spec.ts):
   - Test baseUrl, filterFieldName
   - Mock HttpClient
   - Test CRUD operations (getAll, getById, create, update, delete)

3. **Store Unit Test** (src/app/.../store.spec.ts):
   - Test initial state
   - Test actions (loadData, addItem, updateItem, deleteItem)
   - Test computed selectors
   - Use TestBed para signalStore

Retorna: { e2e_spec: "// JavaScript code", service_spec: "// JavaScript code", store_spec: "// JavaScript code" }`,
  {
    label: 'Test-Generator',
    phase: 'Test Generation',
    agentType: 'dev'
  }
)

log(`Tests generated for ${args.feat}`)

// Phase 5: Integration Check
phase('Integration Check')

const integrationCheck = await agent(
  `Verifica que los 4 patches se aplican correctamente al código existente.

Patches (salida del script):
\`\`\`
${args.patchInstructions || '(no proporcionados)'}
\`\`\`

Archivos affected:
- layout-pages.ts: PAGES.{pagesKey} entry
- entity-name.model.ts: ENTITIES.{entitiesKey} entry
- {parentRoutesFile}: loadChildren route
- menu.service.ts: items[] addition

**Verificaciones:**
1. ¿Archivos existen?
2. ¿Ubicación de patch correcta? (no conflictos de línea)
3. ¿Sintaxis correcta? (no breaking changes)
4. ¿Imports correctos? (no rutas relativas rotas)
5. Después de patch: ¿tsc y lint pasan?

Retorna JSON: { patches: [{file, insertionPoint, valid, conflicts}], integration_ok: boolean }`,
  {
    label: 'Integration-Check',
    phase: 'Integration Check',
    schema: {
      type: 'object',
      properties: {
        patches: { type: 'array' },
        integration_ok: { type: 'boolean' }
      }
    }
  }
)

log(`Integration check: ${integrationCheck?.integration_ok ? '✅ READY TO PATCH' : '⚠️ ISSUES'}`)

// Phase 6: Completeness Verification
phase('Completeness Verification')

const completenessCheck = await agent(
  `Checklist final V: ¿está completa la feature generada?

Inputs:
- Spec validation: ${JSON.stringify(specValidation)}
- Code verification: ${JSON.stringify(codeVerification)}
- Architecture compliance: ${JSON.stringify(archCompliance)}
- Integration check: ${JSON.stringify(integrationCheck)}

Checklist V (de SKILL.md):
- [ ] data-access/ tiene model+service+store
- [ ] Entity+EntitySearch+EntityForm types separados
- [ ] FK imports resueltos (no SCAFFOLD-TODO)
- [ ] PERMISSIONS = string codes (no UUIDs)
- [ ] 4 rutas con guards + resolvers + PendingChangesGuard
- [ ] list: useFeaturePermissions, setColumns en ngOnInit
- [ ] form: FormWithPendingChanges + useRoutedEntityState + executeAction
- [ ] formService: createForm(formAction) con disabled:isReadOnly
- [ ] i18n: no SCAFFOLD-TODO, JSON plano
- [ ] 4 patches aplicables (layout-pages, entity-name, routes, menu)

Retorna: { complete: boolean, checklist: [{item, status}], next_steps: [...] }`,
  {
    label: 'Completeness-Check',
    phase: 'Completeness Verification',
    schema: {
      type: 'object',
      properties: {
        complete: { type: 'boolean' },
        checklist: { type: 'array' },
        next_steps: { type: 'array' }
      }
    }
  }
)

log(`Completeness verification: ${completenessCheck?.complete ? '✅ FEATURE COMPLETE' : '⚠️ GAPS DETECTED'}`)

// Return final report
return {
  feat: args.feat,
  spec_validation: specValidation,
  code_verification: codeVerification,
  architecture_compliance: archCompliance,
  tests_generated: !!testGeneration,
  integration_check: integrationCheck,
  completeness: completenessCheck,
  ready_to_implement: specValidation?.valid && archCompliance?.compliant && integrationCheck?.integration_ok
}
