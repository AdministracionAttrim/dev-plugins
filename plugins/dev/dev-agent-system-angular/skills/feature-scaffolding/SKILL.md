---
name: feature-scaffolding
description: >
  Scaffold a complete Angular feature from an Azure user story. Parses the HU to extract
  entity, fields, validators, permissions, workflow; generates all layers (data-access +
  routes + constants + list + form + i18n) aligned with project canonical structure.
  Use: /feature-scaffolding <HU-ID> [--verify] — without flag: standard 3-phase pipeline.
  With --verify: PHASE:2 invokes dynamic workflow for parallel validation (spec + code + tests + architecture).
  Use when asked to create/scaffold/generate a new entity feature from an Azure DevOps user story or spec.
---

i: Hybrid pipeline — PHASE:1 (architect: spec) | PHASE:2 (script: L1-L5+L8) | PHASE:3a (optional: verify workflow) | PHASE:3b (dev: L6+L7+patches)
!!assume → ask | !!generate without complete spec | PHASE:3a increases quality but adds tokens

## PHASE:1 — Architect (this session)

T:invoked → A:
  1. **Locate HU:** User provides HU ID/name (e.g., "HU-3055") OR auto-scan docs/wiki/features/**/*.md for most recent
     - If not found → ask "¿Qué HU quieres generar? (ID o nombre)" | optionally use /hu-refinement first
  2. **Parse HU:** Read(@references/azure-hu-contract.md) → extract entity, fields, validations, workflow from HU
  3. **Check module context:** Read(.claude/modules/{submodule}.md) if exists → inform design decisions (formSplit, FK patterns)
  4. **Build spec draft:** Populate spec schema with extracted + contextual defaults
  5. **Detect gaps:** Identify required fields missing in draft → emit blocking Qs (plain language; examples; stop; wait)
  6. **Confirm huId:** Extract HU ID from title/filename (e.g., HU-17) or user input → include in spec
  7. **All required fields confirmed?** → Write spec to `scripts/{featureName}-spec.json`
  8. **Validate:** Re-read written file → confirm all required fields present + valid → else ?ask again

### Blocking questions (required before proceeding)

!!jargon in questions | use plain language + concrete examples | dev Junior must understand

Plain-language examples per field:
  formSplit → "¿El formulario tiene una sola página (todos los campos juntos) o está dividido en dos pestañas o secciones separadas?"
  formArrays → "¿Dentro del formulario hay alguna tabla donde el usuario pueda añadir o eliminar filas? (por ejemplo, líneas de una factura)"
  workflow → "¿La entidad tiene estados (ej. Borrador → Activo → Cerrado) que cambian qué campos son editables?"
  permissions → "¿Además de los permisos básicos (ver, crear, editar, borrar), ¿hay alguna acción especial como 'aprobar', 'exportar' o 'anular'?"
  pagesKey / entitiesKey → "¿Qué nombre corto identifica esta entidad en el sistema? (ej. 'TARIFFS', 'CONTRACTS')"

**Tip:** If scaffolding an entity in master-data, check .claude/modules/{submodule}.md for pre-set defaults (formSplit, FK patterns, i18n scope). You may skip Qs already answered in the module doc.

Ask explicitly if any of these cannot be inferred from the HU:

| # | Field | Block if missing |
|---|-------|-----------------|
| 1 | `formSplit` (simple/split/split+workflow) | always |
| 2 | `backendBaseUrl` | always |
| 3 | `pagesKey` — check layout-pages.ts for existing key | if entity not yet in PAGES |
| 4 | `entitiesKey` — check entity-name.model.ts | if entity not yet in ENTITIES |
| 5 | FK field types (fkEntity name) | per FK field |
| 6 | `parentRoutesFile` (which module routes file?) | always |
| 7 | `menuGroup` (which menu section?) | always |
| 8 | `permissions.extras` (any beyond 5 base?) | if HU mentions extra actions |
| 9 | `formArrays` (staging tables in form?) | if HU mentions editable sub-tables |
| 10 | `workflow.statuses` + transitions | if formSplit=split+workflow |

!! proceed to script if any blocking field is absent
!! ask fields one by one; batch related questions (FK types together, workflow together)

### Spec schema

@: [@references/spec.schema.json] — authoritative contract
@: [@references/spec.example.json] — zones canonical example

## PHASE:2 — Script execution

T:spec_written → A:
  1. Run: `node scripts/scaffold-feature.mjs scripts/{featureName}-spec.json`
  2. Verify: read stdout — confirm 7 files written + patches section printed
  3. If script exits with error → fix spec → re-run | !!regenerate files manually

### Script output

Generates without LLM:
  `data-access/{entity}.model.ts`   — L1: Entity + EntitySearch + EntityForm types
  `data-access/{entity}.service.ts` — L2: extends EntityService, baseUrl, filterFieldName
  `data-access/{entity}.store.ts`   — L3: signalStore + withCrudOperations + withTableCustomConfig
  `{feature}.constants.ts`          — L4: TABLE_ID + PERMISSIONS + TITLE + DEFAULT_SORT + COLUMNS + CONTENT_INDEX
  `{feature}.routes.ts`             — L5: 4 routes + hasPermissionGuard + activeEntityResolver + PendingChangesGuard
  `public/i18n/…/es.json`           — L8a: Spanish i18n structure (SCAFFOLD-TODO markers for breadcrumbs)
  `public/i18n/…/en.json`           — L8b: English i18n structure

Prints patch instructions for (dev agent applies in PHASE:3):
  `layout-pages.ts`        — PAGES.{pagesKey} entry
  `entity-name.model.ts`   — ENTITIES.{entitiesKey} entry
  `{parentRoutesFile}`     — loadChildren route entry
  `menu.service.ts`        — items[] addition

## PHASE:3 — Dev (this session)

### PHASE:3a — Verification Workflow (Optional: `--verify` flag)

T: user adds `--verify` flag OR script prints "Ready to verify?" → A:

1. **Invoke Workflow tool** (`feature-scaffolding-dynamic.js`):
   ```javascript
   const verifyResult = await workflow('feature-scaffolding-dynamic', {
     feat: featureName,
     specJson: spec,
     specFileContent: JSON.stringify(spec, null, 2),
     huContext,
     huId,
     codeFiles: {
       model: readFile(modelPath),
       service: readFile(servicePath),
       store: readFile(storePath),
       constants: readFile(constantsPath),
       routes: readFile(routesPath),
       es_json: readFile(es_json_path),
       en_json: readFile(en_json_path)
     },
     patchInstructions: scriptOutput.patches,
     listRoute, createRoute
   })
   ```

2. **Workflow execution** (parallel agents, ~8 agents):
   - **Spec Validation**: Verifica spec.json vs schema + HU
   - **Generated Code Verification**: L1–L8 code review (types, service, store, routes, i18n)
   - **Architecture Compliance**: CLAUDE.md + Angular best practices
   - **Test Generation**: E2E + unit specs
   - **Integration Check**: 4 patches correctos
   - **Completeness Verification**: V checklist final

3. **Result**: `verifyResult` contains:
   - Code issues detected + fixes suggested
   - Tests generated (e2e + unit)
   - Ready-to-implement status
   - Patches validation

4. **Back in skill**: If `verifyResult.ready_to_implement === true` → proceed to PHASE:3b. Else → report issues + fixes.

### PHASE:3b — Implementation (Manual fixes + L6/L7 generation)

T:verify_passed OR verify_skipped → A:
  1. Read spec.json + scan generated files (do NOT re-read templates.md — already materialized)
  2. Read .claude/modules/{submodule}.md if exists → absorb canonical patterns + i18n scope + known LEs
  3. Scan @rule:self-learning-error-prevention index → read matched LE entries specific to entity type
  4. If verify workflow found issues:
     - Fix reported issues (SCAFFOLD-TODO markers, code violations, etc.)
     - Otherwise: proceed as-is
  5. Generate L6 (list) → @rule:project-ui-components | @rule:permissions | @rule:code-generation
  6. Generate L7 (form) → @rule:angular-form-responsibility-separation | formSplit decision below
  7. Apply 4 patches from script output
  8. V: checklist below

### L7 form decision

formSplit == "simple"        → zones/ canonical | @rule:angular-form-responsibility-separation G:004
formSplit == "split"         → companies/ canonical | generate: builder + populator + actions + effects services
formSplit == "split+workflow"→ pucs/quotations canonical | + workflow.service.ts

### V: (verify before declaring done)

V: [
  data-access/ has model+service+store
  | Entity+EntitySearch+EntityForm separate types
  | FK imports resolved (no SCAFFOLD-TODO in model)
  | PERMISSIONS = string codes satisfies FeaturePermissions
  | 4 routes: hasPermissionGuard ALL | activeEntityResolver on :id+:id/edit | PendingChangesGuard on new+:id/edit
  | list: useFeaturePermissions + ngOnInit setColumns+getConfig
  | form: FormWithPendingChanges + useRoutedEntityState + staticState + dynamicState + executeAction
  | formService: createForm(formAction) disabled:isReadOnly + populateFormWithData
  | i18n: es.json+en.json no SCAFFOLD-TODO markers | flat JSON (LE-SS-0027)
  | layout-pages.ts + entity-name.model.ts + parentRoutesFile + menu.service.ts patched (LE-SS-0029)
]

## Fallback (script fails or spec incomplete)

T:script_fail | spec_incomplete → A:
  skip PHASE:2
  → generate all L1..L9 from @references/templates.md (legacy full-LLM mode)
  → note: ~3x more tokens, no spec.json artifact

## G:[IDs]

G:001 !!model/service/store at feature root; always data-access/ subfolder
G:002 PERMISSIONS values = string codes; !!UUIDs (LE-SS-0012)
G:003 routes: hasPermissionGuard + data.permission ALL 4 routes
G:004 formSplit: simple if ≤3 non-interacting fields + no FormArray + no workflow | if unclear → ask (never assume)
G:005 i18n: es.json+en.json same commit | !!hardcode user-visible strings (LE-SS-0018) | !!touch primeng.* | flat JSON (LE-SS-0027)
G:006 !!proceed to PHASE:2 with incomplete spec (script will abort but files may be partially written)
G:007 !!re-read templates.md in PHASE:3 — script already materialized L1-L5+L8
G:008 Module context: Always check .claude/modules/{submodule}.md first for pre-set defaults + canonical patterns
G:009 When .claude/modules/{submodule}.md exists, it is the source of truth for that module's architecture

@: [@rule:angular-core-architecture | @skill:typescript-best-practices | @rule:code-generation
    | @rule:ngrx-entity-store | @rule:permissions | @rule:angular-form-responsibility-separation
    | @rule:project-ui-components | @rule:i18n-structure | @rule:code-quality-guardrails
    | @rule:self-learning-error-prevention
    | @references/azure-hu-contract.md | @references/spec.schema.json | @references/spec.example.json]
