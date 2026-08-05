---
name: audit-module
description: >
  Auditoría y revisión integral: módulos Angular (HU compliance, pattern compliance, E2E testing),
  código en cambios git (diff analysis, structured findings, category fixes), o features específicas.
  Uso: /audit-module <feat-name|HU-ID|FEAT-ID> | /audit-module <rama> | /audit-module "revisa cambios"
---

i: **Two workflows:** (1) Module audit: HU compliance + **behavioral probes** (razonamiento conductual, !chequeo-de-presencia) + **Figma cross-check** + fix mapping + severity+**verification-depth** scoring + pattern compliance + dead code + smoke-browser + E2E runtime (dirigido por HU + regresión). (2) Code review: git diff → structured findings → confirm → apply fixes by category → verify.

i: **Por qué existe esta skill:** evitar que QA encuentre bugs. El pattern-compliance verifica QUE existe; las **behavioral-probes** verifican QUÉ HACE. Los bugs que escapan (BUG-3624/3766/3829, B1–B5) NO se cazan listando campos — se cazan razonando "¿qué se rompe si el usuario…?" y EJECUTANDO la verificación dinámica. Pase estático limpio ≠ módulo sólido.

FP: `/audit-module <feat-name|HU-ID|FEAT-ID>` (module audit) | `/audit-module` sin args o "revisa cambios" (code review) | "audita módulo" | "comprueba HUs de" | "está completo el módulo"

T: `/audit-module <feat> --workflow` | usuario escribe "workflow" / "fan-out" / "exhaustivo" → A: Invoke Workflow tool (`audit-module-dynamic.js`) con args `{feat, ...}` | Workflow: behavioral-probes P1–P6 fan-out paralelos (6 agentes especializados + panel adversariales) → smoke-browser fan-out (5 pantallas paralelas) → e2e spec generation con bug-regression → rule-adherence verify → síntesis final | agents usan mcp**angular-cli** + mcp**primeng** + mcp**playwright** + /playwright-best-practices skill | !!fan-out sin opt-in (coste 3-5x)
T: `/audit-module <feat>` sin flags → A: modo SECUENCIAL profundo (default) — todas las fases inline, single-agent

---

## WORKFLOW B-DYNAMIC: Workflow Mode (`--workflow` flag)

T: `/audit-module <feat> --workflow` | user types "workflow" / "fan-out" / "paralelo" →

**Skill execution flow:**

1. **Detect flag**: Extract `--workflow` from user message
2. **Parse + Static phases** (1–12, INLINE): mapping + HU-load + figma-crosscheck + code-load + analysis + pattern-compliance + dead-code + smoke-browser setup + selector-map
   - Read all necessary files (routes, components, templates, builder, store, i18n)
   - Build `staticFindings` object (pattern violations, dead code)
   - Build `selectorMap` (verified keys, wrappers, API endpoints, required fields)
   - Extract `huContext` (HU text for agent context)
   - Detect dev server: ping local.grupogimeno.com:4200
3. **Invoke Workflow tool** (`audit-module-dynamic.js`) with:
   ```javascript
   const dynamicFindings = await workflow("audit-module-dynamic", {
     feat: featName,
     hus: huIds,
     staticFindings,
     selectorMap,
     codeFiles: {
       listComponent,
       listTemplate,
       formComponent,
       formTemplate,
       builderService,
       store,
       es_json,
       en_json
     },
     huContext,
     listRoute,
     createRoute,
     serverAvailable: devServerStatus === 200
   });
   ```
4. **Workflow execution** (parallel agents, ~30 agents total):
   - **Behavioral-Probes Phase**: 6 agents (P1–P6) + 18 adversarial verifiers (3 per probe)
     - P1: Columns (sort/filter/label/field) — @mcp**angular-cli** + @mcp**primeng**
     - P2: Validators bidirectional — @mcp**angular-cli** + @mcp**primeng**
     - P3: State/reactivity (B1–B5) — @mcp**angular-cli**
     - P4: Modes (NEW/EDIT/DETAIL) — @mcp**angular-cli**
     - P5: Deactivation/soft-delete — @mcp**angular-cli**
     - P6: i18n + error labels — @mcp**angular-cli**
     - Verifiers: 3 independent agents per probe (adversarial verification)
   - **Smoke-Browser Phase** (if dev server 200): 5 agents in parallel
     - List-smoke: table loads + pre-filtro por defecto
     - Detail-smoke: campos poblados
     - Edit-smoke: p-select muestran valor (LE-SS-0068)
     - TableEdit-smoke: celdas inline pobladas (LE-SS-0067)
     - Create-smoke: validación visible
     - Each uses @mcp**playwright**browser\_\* tools directly
   - **E2E Spec Generation**: 1 agent (@agentType:dev + /playwright-best-practices)
     - Consume behavioral + smoke + selectorMap
     - Generate: list tests (orden/filtro/pre-filtro) + state-probes (B1–B5) + regression (1 per bug) + CRUD flow
     - Output: e2e/generated/{feat}.spec.ts (ready to Write)
   - **Rule Adherence Phase**: 1 verifier agent
     - Cross-check behavioral findings vs LE-SS coverage
     - Detect new patterns → candidate LE-SS entries
   - **Synthesis Phase**: 1 agent
     - Merge static + dynamic findings
     - Recalculate audit_score with dynamic bugs
     - Emit structured markdown report
5. **Back in skill context** (after workflow completes):
   - Receive `dynamicFindings` result
   - Merge: `finalFindings = staticFindings + dynamicFindings`
   - Recalculate `audit_score` (100 - severity penalties)
   - Update `verification_depth` (static → smoke → runtime)
   - Write E2E spec: `Write(e2e/generated/{feat}.spec.ts, dynamicFindings.e2e_spec)`
   - Write wiki report: `Write(docs/wiki/audits/{module-path}/{feat}/{feat}-audit-{YYYY-MM-DD}.md, report with frontmatter)`
   - Update wiki index: add entry to docs/wiki/index.md
6. **Emit final report** with:
   - Behavioral-probes findings (P1–P6 + verifier consensus)
   - Smoke-browser results (5 pantallas)
   - Bugs encontrados (# | Severidad | LE-SS | Componente)
   - Audit score (X/100 · depth: smoke)
   - E2E spec path (e2e/generated/{feat}.spec.ts — ready to run with `E2E_USERNAME/PASSWORD`)

**Cost**: ~300–500k tokens, ~10–15 min wall-clock (parallelization)  
**Without flag** (`/audit-module <feat>`): Single-agent sequential, ~80–120k tokens, same ~15 min (no parallel gain)

**Recommendation**: Use `--workflow` for critical modules or modules with historical bugs. For quick audits without dev server, regular mode is sufficient (depth=static).

---

## WORKFLOW A: Code Review (git diff → findings → fixes)

T→A (orden estricto — !!saltarse pasos):

T: scope undefined → A: Bash(git diff develop..HEAD --name-only) | !subagent | !Explore
T: scope known → A: Read only changed files | Grep -n key symbols in consumers | !Read full unchanged files
T: analysis → A: group findings by category (see **Check categories** below) | !!apply any fix during this phase
T: report delivered → A: ask "¿Aplico correcciones? ¿Todas o qué categorías?" | wait confirmation
T: category confirmed → A: apply fixes | Bash(`npm run build 2>&1 | tail -30`) | report what changed
T: all done → A: Bash(`npm run build 2>&1 | tail -30`) | Bash(npm run lint 2>&1 | tail -20) | report ✅/❌

**Check categories (report only — !!fix during analysis):**

- **bug-risks:** unguarded optional (.field on undefined) | signal sync gap (computed not reacting) | missing guard/early-return | duplicate API call / race condition
- **call-sites:** changed API without updating all consumers | renamed input/output used with old name | stale test mock shape
- **i18n:** new/renamed key missing in en.json / es.json | key in template but not defined
- **form-modes:** CREATE/EDIT/DETAIL behavior differences | disabled state set in wrong layer (component vs service)
- **es2022:** toSorted() / Array.findLast() / Object.groupBy() forbidden (ES2023+)
- **arch:** business logic in template | component >200L / service >350L | constructor injection | !readonly on inject() | interface instead of type
- **permissions:** route without hasPermissionGuard | missing canCreate / tableActions signals

**Code Review G:[IDs]:**

- G:CR1 !!fix during analysis — report first, wait confirm, then fix
- G:CR2 !!flag issue without reading relevant file first
- G:CR3 !!skip i18n or ES2022 checks
- G:CR4 !!review changed files only — always Grep consumers for call-site completeness

---

## WORKFLOW B: Module Audit (HU compliance + pattern + E2E)

## T→A (Module Audit)

T: invoked with feat-name/HU-ID/FEAT-ID →

1. **parse**: extract feat-name/ID from user message
2. **mapping**: Read(`component-feature-mapping.json`) → get HU/FEAT/BUG IDs for feat-name
   - if feat-name not found: warn + list available keys | stop
3. **hu-load**: for each ID:
   - Read(`docs/wiki/articles/azure/{ID}.md`) | if not found: Read(`docs/raw/articles/azure/{ID}.md`)
   - if neither: warn "ID {X} no encontrado en wiki ni en raw" | skip
     3.5. **figma-crosscheck** (señal SUBORDINADA a la HU — ver @refs figma-crosscheck.md): la HU es la autoridad SIEMPRE. Figma solo donde la HU NO fija el detalle visual.
   - Grep HU+BUG wikis por `node-id=` → si existe → `mcp__plugin_figma_figma__get_screenshot` / `get_metadata` (nombres+ORDEN columnas, copy de mensajes, UX de controles)
   - HU especifica el detalle → HU gana, ignorar Figma | HU silenciosa + Figma especifica → `🟡 candidato — confirmar con producto` | conflicto directo HU↔Figma → `🟡 escalar a producto/diseño`, !!adjudicar, !!bug de código
   - mismatch Figma NUNCA es bug auto-confirmado (Figma suele estar desactualizado) → máx 🟡 (LE-SS-0038/G:FG3)
4. **mapping-check**: verify each HU's "Implemented by" section matches the feat-name
   - mismatch detected → queue fix (step 9)
5. **wiki-feature**: Read feature wiki page from `docs/wiki/features/master-data/**/{module}.md` or equivalent path → get file map
6. **code-load** (parallel reads):
   - routes file | list component .ts + .html | form component .ts + .html | form builder/actions/effects/populator services | constants | store | i18n/es.json | i18n/en.json
7. **analysis**: for each HU → cross-check requirements vs implementation:
   - fields present/validators/disabled rules per HU spec → severity per finding (see @refs)
   - permissions (L1 route guard, L2 useFeaturePermissions, L3 template bindings)
   - statusToggle default filter matches HU spec
   - i18n keys exist in both es.json + en.json
   - menu registration in menu.service.ts / layout-pages.ts
   - staging delete vs deactivate (check id presence in FormArray rows)
   - interpolación transloco: keys en translate() coinciden con {{param}} del JSON
   - confirmaciones post-acción: campos booleanos de side-effects con UI binding en template
     7.5. **backend-crosscheck** (fuente de verdad: repo Java commons, SOLO LECTURA — análogo a @skill:sync-models):
   - precheck: `Bash(ls <BACKEND_REPO_PATH>)` (ruta configurada por el proyecto — ver "Configuración de proyecto" en @skill:sync-models) → presente → continuar | ausente → nota "commons no clonado; cross-check omitido", NO abortar (!!abortar como sync-models) | !!pull / !!checkout (solo leer el checkout ACTUAL; anotar el branch leído como caveat — puede no ser develop)
   - rutas (reuso de sync-models): DTO `dto/<Entity>Dto.java` | Search `dto/export/<Entity>SearchDto.java` | Filter `dto/filter/<Entity>Filter.java` | Enums `enums/<Name>Enum.java`
   - comparar (dirigido a las clases de bug del skill):
     - validadores FE vs `@Size/@Min/@Max/@NotNull` → required/maxLength deben ESPEJAR el DTO (LE-SS-0084); !!quitar/añadir validator sin cruzar la anotación
     - shape del payload de submit vs `<Entity>Dto` → un hallazgo "campo X no persistido"/"falta empresa" es FALSO POSITIVO si el DTO no tiene el campo (incidente FEAT-789 #7: `ItemCostPriceDto` sin company → multiselector empresa es solo-filtro correcto)
     - campos de filtro/sort vs `<Entity>Filter` + `@OrderByPath` (LE-SS-0071/0074): nombre/path divergente del entity
     - enums backend (`enums/*Enum.java`) vs `domains-values.constants.ts`
     - mapeo Java→TS: `UUID`→string | `LocalDate(Time)`→Date | `BigDecimal/Integer/Long`→number | `List<X>`→X[] | `<X>Dto`→X
   - !!FIX POR ANALOGÍA ESTÁTICA: el fingerprint backend (`@OrderByPath` divergente / `alias` ausente / shape) es HIPÓTESIS, !!bug confirmado → confirmar con probe `[runtime]` (P1/smoke) ANTES de aplicar fix. Incidente FEAT-789 (alias items 2026-06-08): mismo fingerprint que cost-prices (runtime-confirmado 500→200) PERO en el directorio el `alias` rompía el filtro — el comportamiento difiere entre `store.loadData` y el servicio de table-management por nodo. Fix aplicado por analogía sin runtime = regresión.
8. **pattern-compliance**: compare vs canonical patterns (see @refs):
   - list-module: store | columns | defaultSort | tableActions() | canCreate | active toggle | no duplicated binding
   - form-module: builder/populator/actions/effects services | PendingChangesGuard | activeEntityResolver | useFeaturePermissions | L3 template bindings | onRequestSuccess | form-wrapper-item | app-input-\* wrappers
   - mismatch → flag with severity Low (missing) or High (present but broken)
     8.5. **behavioral-probes** (CORE — caza los bugs que escapan a QA): aplicar la matriz de @refs behavioral-probes.md. !!chequeo-de-presencia; razonamiento adversarial por superficie:
   - P1 listado por-columna: cada columna ¿ordena? ¿filtra? label/campo == HU (Figma solo si HU calla)? pre-filtro por defecto == HU? (BUG-3624/3766/3829) — sort/filter `[runtime]`
   - P2 validadores BIDIRECCIONAL: required donde HU=required Y **ausente donde HU=opcional** (3766#3) + rango/precisión cruzado con `@Size/@Digits/@Min/@Max` del DTO backend (LE-SS-0084) + minDate/futureDateValidator (0022/0026/0070) + excludeCodes system-only (0072)
   - P3 estado/reactividad: matriz "Añadir N× / cambiar padre a mitad / id plantilla→instancia / computed lee signal? / markAsPristine re-evalúa?" (B1–B5, LE-SS-0025/0044/0047/0085/0086/0087)
   - P4 modos NEW/EDIT/DETAIL/draft + dirty entre diálogos + breadcrumb (LE-JLG-001/002/003/005)
   - P5 baja/activación: aviso de dependientes + fecha correcta + visibilidad en inactivo (3766#8, 3829#7/#9; LE-SS-0052/0057/0062/0073)
   - P6 labels de error + i18n entre modos (3829#5/#6; LE-SS-0021)
   - cada hallazgo → bug con severidad + queue de regresión E2E (G:BP4) | probe `[runtime]` no ejecutada → marcar "NO VERIFICADO", !!✅
9. **dead-code**: scan list .ts + form .ts:
   - methods declared but never referenced in .html template (grep method name in template)
   - specifically: `loadChange` method with no `(loadChange)` event in template
   - imported services/tokens not used in class body
   - flag each as severity Low
10. **report-static**: emit structured output (see format below) — static findings only
11. **fix-mapping**: if any mapping error detected:
    - Edit `component-feature-mapping.json` → correct IDs
    - Edit each mislinked HU wiki article → fix/add/remove "Implemented by" section
    - report what was fixed
12. **smoke-browser**: revisión manual en browser con Playwright MCP (sin generar spec): - detect dev server: Bash(`node -e "const https=require('https');https.get({hostname:'local.grupogimeno.com',port:4200,path:'/',rejectUnauthorized:false,timeout:3000},(r)=>{process.stdout.write(String(r.statusCode));r.resume();}).on('error',()=>process.stdout.write('0')).on('timeout',function(){this.destroy();process.stdout.write('0');});"`) | node ya en allow (!!curl: en deny, bloquea siempre) - if not 200: emit "⚠️ Dev server no detectado — `verification_depth: static`; filtros/orden/cascadas NO confirmados en runtime (G:SC1)" | skip to step 13 | !!declarar "% completo" en static - if 200: `verification_depth: smoke` (≥); execute smoke checklist using `mcp__playwright__` tools:
    a. **list-smoke**: `browser_navigate`(list-route) → `browser_snapshot` → verify table renders + columns visible + **pre-filtro por defecto de la HU aplicado** (3624#3: HU dice "solo Disponibles" → la tabla NO muestra todos los estados al cargar)
    a2. **list-behavior-smoke** (clase 3624/3766/3829): para cada columna ordenable → click cabecera orden → `browser_network_requests` → response 2xx !500 (LE-SS-0074) | para cada columna filtrable → escribir/seleccionar filtro → response 2xx !400 (LE-SS-0059/0071) + label de columna == HU (Figma solo si HU calla) | anomalía → 🟠/🔴
    b. **detail-smoke**: if rows exist → click first row → `browser_snapshot` → verify form fields populated (not empty/placeholder)
    c. **edit-smoke**: click "Editar" → `browser_snapshot` → verify: - text inputs show existing values (not empty) - `p-select` / `app-select` show selected option (not placeholder) — detecta LE-SS-0068 - `app-autocomplete` shows item description - fields disabled per HU remain disabled
    d. **table-edit-smoke**: if form .html contains `bodyTemplate` + `useEditableTable`: - click edit icon on first table row → `browser_snapshot` → verify each editable cell shows value (not empty control) — detecta LE-SS-0067/0068
    e. **create-smoke**: `browser_navigate`(create-route) → submit empty form → `browser_snapshot` → verify validation errors visible - collect smoke findings: each anomaly → severity 🟠 (dato ausente/incorrecto) | 🔴 (navegación rota/crash) - append smoke findings to static findings pool (included in bugs table + score)
    12.5 **selector-map** (PRE-REQUISITO para emitir spec): construir mapa de selectores REALES leyendo HTML del módulo. !!emitir spec sin este paso. - Grep form `.html`: `\[key\]="'([^']+)'"` → `verifiedKeys[]` (keys que SÍ se materializan como `data-automationid="input{Cap(key)}"`) - Grep form `.html`: `\[attr\.data-automationid\]="'([^']+)'"` → `fixedIds[]` (tabs, botones custom) - Grep form `.html`: `<app-([a-z-]+)-selector` → para cada wrapper:
    _ Read del `.html` del wrapper → ¿propaga `[key]` al app-input-_/app-select interno? \* !propaga → `wrapperSelectors[].push("app-<name>-selector")` | propaga → tratar como verifiedKey - Read store: ¿`statusToggle` configurado? → `hasActiveToggle: true` | no presente → `hasActiveToggle: false` - Read list `.html`: ¿`<p-splitbutton>` presente? → `hasSplitButton: true` | no → `hasSplitButton: false` - Read `{entity}-api.service.ts` o `{entity}.service.ts`: extraer `API_ENDPOINT` (CRUD) desde `baseUrl` o primer `this.http.post(...)` / `http.put(...)` - extraer `SEARCH_ENDPOINT` = endpoint de BÚSQUEDA del listado (el `POST .../search` o GET paginado que dispara `store.loadData`). PUEDE diferir de `API_ENDPOINT` — verificar en store/EntityService, !!asumir que es el mismo (los helpers de orden/filtro lo necesitan exacto) - Read builder service: `requiredCount` = nº de `Validators.required` | `disabledOnEdit[]` = campos con `disabled` ligado a modo edición (`disabled: !isCreation` o similar) - Read builder service: ¿están los campos required repartidos en >1 pestaña? → marcar `requiredAcrossTabs: true` (afecta nº esperado de errores visibles tras submit vacío) - **PrimeNG DOM**: para selectores de PrimeNG (p-select, p-multiselect, p-menu, p-datepicker, etc.) consultar **`docs/wiki/patterns/e2e-automationid-coverage.md`** sección "Convenciones PrimeNG". !!inventar selectores como `data-automationid="rowAction-update"` o asumir aria-disabled en el host de p-select - emitir resumen en el chat antes de generar: `selector-map: verifiedKeys=[a,b,c] | wrapperSelectors=[app-supply-selector] | fixedIds=[tabDetail] | hasActiveToggle=false | hasSplitButton=false | API=/quotation | required=4 | disabledOnEdit=[supply,company,quotationType,customer] | requiredAcrossTabs=true`

13. **e2e-generate**: build Playwright spec usando el selector-map del paso 12.5 (see @refs):
    - **dirigido por HU, !forma CRUD**: codificar CRITERIOS DE ACEPTACIÓN de la HU (no solo "crea/edita"). Un test "Añadir 2× no duplica" caza B1; "filtrar columna X → 200" caza 3766#2
    - **listado por-columna** (clase dominante): para cada columna ordenable → `assertColumnSorts(page, LIST_ROUTE, field, API_ENDPOINT)` | cada columna filtrable → `assertColumnFilters(...)` | pre-filtro HU → `assertDefaultPreFilter(...)`
    - **state-probes** (si el form puebla FormArray desde catálogo/relación): test "Añadir 2× no duplica" (B1) + "cambiar padre limpia tabla hija" (B2/3829#10)
    - **bloque Regresión**: un test por cada bug confirmado en la auditoría (G:BP4 — cierra el bucle, no reaparece en QA)
    - adapt template: rutas del routes file (relativas, sin BASE_URL) | API_ENDPOINT del paso 12.5 | required count del paso 12.5 | disabled-on-edit del paso 12.5
    - import `runCommonListTests`, `getFirstRowEditId`, `fillRequiredFields`, `waitForApiResponse`, `assertColumnSorts`, `assertColumnFilters`, `assertDefaultPreFilter` desde `../shared/list-suite`
    - tag describe blocks: `{ tag: "@smoke" }` listado/validación | `{ tag: "@e2e" }` formularios | `{ tag: "@e2e @critical" }` flujo CRUD completo con red
    - usa `data-automationid` SOLO si la key está en `verifiedKeys` o el id en `fixedIds` — si no, emitir `// TODO: campo "{x}" no localizable — añadir [key] al template o ajustar wrapper`
    - wrappers de `wrapperSelectors` → localizar por nombre de componente, NUNCA inventar `input{Cap(key)}`
    - tests de edit/detail usan `getFirstRowEditId` — !!`process.env["E2E_TEST_*_ID"]`
    - tests de Crear/Editar incluyen `fillRequiredFields` + `waitForApiResponse(POST 201 | PUT 200)` + `waitForURL` — !!solo `toBeVisible`
    - `timeout: 30000` en el primer `toBeVisible` por ruta (Angular bootstrap + Keycloak)
    - replace `waitForTimeout(N)` con web-first assertions | replace `isVisible().catch()` con `count() > 0`
    - Write to `e2e/generated/{feat-name}.spec.ts`
    - always generate even if dev server is not running (artifact value)
14. **runtime-check**: detect dev server (reuse result from step 12 if already run):
    - if not 200: emit "⚠️ Dev server no detectado — spec E2E generado en e2e/generated/. Ejecutar con: E2E_USERNAME=x E2E_PASSWORD=y npx playwright test e2e/generated/{feat-name}.spec.ts" | skip step 15
15. **runtime-run** (only if step 14 returned 200): `verification_depth: runtime`
    - Bash(`E2E_USERNAME="$E2E_USERNAME" E2E_PASSWORD="$E2E_PASSWORD" npx playwright test e2e/generated/{feat-name}.spec.ts --reporter=json,line 2>&1`)
    - parse JSON output from `e2e/results/last-run.json`
    - extract: passed/failed/skipped + error messages + failed test names
    - **cada test fallido de orden/filtro/state-probe → bug en la tabla con su severidad** (no solo "test rojo") | append runtime findings to report (update severity score if new bugs found)
16. **wiki-save**: Write audit report mirroring `src/app/modules` structure → `docs/wiki/audits/{module-path}/{feature}/{feature}-audit-{YYYY-MM-DD}.md`
    - `{module-path}` = ruta del feature relativa a `src/app/modules` (ej. companies → `master-data/configuration/companies`); derivar con Glob `src/app/modules/**/{feature}` | mkdir -p la carpeta antes de escribir
    - auditorías cross-cutting (no atadas a un feature, ej. e2e-suite) → `docs/wiki/audits/_general/`
    - iteraciones del mismo feature = múltiples ficheros con fecha en la misma carpeta (visibiliza cuántas veces se auditó)
    - same-day collision: if file already exists → append `-2`, `-3`, etc. (check with Glob before writing)
    - frontmatter: `type: audit | feat: {feat-name} | date: {date} | hus: [{IDs}] | bugs_found: {count} | audit_score: {N} | verification_depth: {static|smoke|runtime} | runtime_tested: {true|false} | smoke_tested: {true|false} | figma_checked: {true|false}`
    - body: full structured report (HUs table + analysis + pattern compliance + dead code + smoke results + runtime results + bugs table + audit score + conclusión)
    - Update `docs/wiki/index.md` adding entry under `## Auditorías` section (create section if missing)

T: ID is BUG-_ or FEAT-_ (not HU-\*) → A: skip requirement check for that ID | note "BUG/FEAT no genera requisitos auditables"
T: >2 feats in one call → A: warn "Esto auditará {n} módulos. ¿Continúo?" | wait confirm

T: campo de HU NO está en `verifiedKeys` NI en `wrapperSelectors` del selector-map
→ A: emitir `// TODO: campo "{x}" no localizable — añadir [key] al template o ajustar wrapper` en lugar de aserción inventada
| !!emitir `[data-automationid="input{Cap(x)}"]` sin verificación previa
T: wrapper `app-*-selector` aparece en form `.html` y NO propaga `[key]`
→ A: añadir al `wrapperSelectors[]` | spec usa `page.locator("app-{name}-selector")` | !inventar `input{Cap(name)}`
T: API endpoint no detectable en `*.api.service.ts`/`{entity}.service.ts`
→ A: emitir `const API_ENDPOINT = "/api/TODO";` con comentario `// TODO: completar endpoint` | !omitir aserción de red

## Analysis checklist (apply per HU — tag each item with severity)

> El checklist es la capa de PRESENCIA. La detección real de bugs vive en @refs **behavioral-probes.md** (P1–P6). Aplicar AMBAS.

- [ ] 🟠 Listado por-columna: cada columna ordena (LE-SS-0074) + filtra (LE-SS-0059/0071) + label/campo == HU (Figma solo si HU calla) (P1)
- [ ] 🟠 Pre-filtro por defecto del listado == HU (3624#3 "solo Disponibles")
- [ ] 🟠 Validadores BIDIRECCIONAL: required donde HU=required Y ausente donde HU=opcional (3766#3) + rango/precisión vs DTO backend (LE-SS-0084)
- [ ] 🔴 Estado/reactividad: Añadir 2× sin duplicar (B1) + cambiar padre limpia tabla (B2/3829#10) + id plantilla≠instancia (B5)
- [ ] 🟠 Campos del modelo: todos los campos requeridos por la HU presentes en el tipo + form
- [ ] 🟠 Validadores: required/pattern/maxLength alineados con la HU
- [ ] 🟠 Reglas de edición: campos deshabilitados según condiciones de la HU (ej. tipo no editable)
- [ ] 🔴 Baja/activación: activeEntityResolver + redirectIfInactive en ruta edit si la HU lo requiere
- [ ] 🟡 Tabla de listado: columnas, orden por defecto, filtro de activos/inactivos
- [ ] 🔴 Permisos: hasPermissionGuard en rutas + useFeaturePermissions + [canEdit]/[hidden] (LE-SS-0062)
- [ ] 🟠 Abastecimiento/entidades relacionadas: read-only si la HU lo exige
- [ ] 🟡 i18n: es.json + en.json sync (G:006)
- [ ] 🟡 Menú: PAGES.{ENTITY} registrado en menu.service.ts
- [ ] 🔴 Staging delete: id → deletionDate | sin id → removeAt (LE-SS-0015)
- [ ] 🟡 Transloco interpolación: keys en translate() coinciden con {{param}} del JSON
- [ ] 🟠 Side-effects booleanos: UI binding en template (LE-SS-0061)
- [ ] 🟢 Dead code: loadChange / métodos no referenciados en template
- [ ] 🟠 Smoke edit: selects/autocompletes en modo edición muestran valor existente (LE-SS-0068)
- [ ] 🟠 Smoke table-edit: celdas editables de tabla inline muestran valor al activar edición (LE-SS-0067)

## Output format

```
## Auditoría — {feat-name}

### HUs auditadas
| ID | Título | Estado HU |
|----|--------|-----------|

### Mapping
{OK / CORREGIDO: descripción}

### Pattern Compliance
| Patrón | Check | Estado |
|--------|-------|--------|
| list-module | store injected | ✅ |
| list-module | [canCreate] sin duplicado | ✅/❌ |
| form-module | builder service existe | ✅/❌ |
| ... | ... | ... |

### Comportamiento del Listado (behavioral — P1)
| Columna | Ordena | Filtra | Label==HU | Campo correcto |
|---------|--------|--------|-----------------|----------------|
| {col} | ✅/❌/NO-VERIF | ✅/❌/NO-VERIF | ✅/❌ | ✅/❌ |

Pre-filtro por defecto: {esperado HU} → {observado} ✅/❌


### {feat-name}-list — HU-XX
🔴/🟠/🟡/🟢  {requisito}: {observación}
...

### {feat-name}-form — HU-XX
🔴/🟠/🟡/🟢  {requisito}: {observación}
...

### Dead Code
| Archivo | Símbolo | Tipo |
|---------|---------|------|

### Bugs encontrados
| # | Archivo | Línea | Descripción | Severidad |
|---|---------|-------|-------------|-----------|

### Smoke Browser  ← omit section if server not detected
| Pantalla | Check | Resultado | Observación |
|----------|-------|-----------|-------------|
| list | tabla carga con datos | ✅/❌ | |
| detail | campos poblados | ✅/❌ | |
| edit | selects muestran valor | ✅/❌ | |
| table-edit | celdas editables pobladas | ✅/❌ | N/A si no aplica |
| create | validación visible al submit | ✅/❌ | |

### Runtime Tests  ← omit section if server not detected
| Test | Resultado | Error |
|------|-----------|-------|

### Audit Score
XX/100 (PRE-fix)  ·  depth: {static|smoke|runtime}  ·  techo aplicado: {YY}
(🔴 N · 🟠 N · 🟡 N · 🟢 N)
⚠️ {frase de honestidad según depth — ver severity-criteria.md}

### Conclusión
{depth==static → "pendiente verificación dinámica; techo optimista" — !!"% completo"}
{depth==runtime → "% completitud verificado en flujos cubiertos" + acción recomendada}
```

## V: (self-check before emitting)

V: [
behavioral-probes P1–P6 aplicadas — !!solo pattern-compliance (presencia)
| listado: CADA columna verificada en orden+filtro+label+campo (P1) — !!"columnas presentes" como única evidencia
| pre-filtro por defecto del listado cruzado con la HU (3624#3)
| validadores cruzados BIDIRECCIONAL (required+opcional) y contra DTO backend `@Size/@Digits/@Min/@Max` (LE-SS-0084)
| backend-crosscheck ejecutado si commons clonado (paso 7.5): validadores/payload/filtros/enums vs DTO Java — !!abortar si ausente | !!pull/checkout | !!fix por analogía de fingerprint sin confirmación runtime
| state-probes ejecutadas: Añadir 2× / cambiar padre / id plantilla (B1–B5)
| Figma cross-check si hay node-id en HU/BUG (LE-SS-0038) — !!asumir diseño
| verification*depth declarado (static/smoke/runtime); depth==static → !!"% completo" en conclusión (G:SC1)
| probes `[runtime]` no ejecutadas marcadas "NO VERIFICADO" — !!✅ (G:SC2)
| cada bug confirmado tiene escenario de regresión en el spec (G:BP4)
| modo fan-out solo con opt-in explícito (`--deep`/"workflow")
| component-feature-mapping.json leído antes de cargar HUs
| HU wikis leídas antes de leer código
| código leído con reads paralelos incluyendo .html templates
| mapping verificado y corregido si había error
| severity asignada a cada bug
| pattern compliance verificado contra ambas plantillas (list + form)
| dead code comprobado: loadChange + métodos no referenciados
| smoke-browser ejecutado si dev server activo (200) — mcp**playwright** tools
| smoke findings incluidos en bugs-encontrados si hay anomalías
| smoke omitido sin penalizar score si server no detectado
| e2e spec generado en e2e/generated/{feat-name}.spec.ts
| selector-map construido (paso 12.5) ANTES de emitir spec
| todos los data-automationid del spec están en verifiedKeys o fixedIds del selector-map
| wrappers sin [key] propagado se localizan por componente — !!inventar input{Cap(name)}
| campos no localizables emitidos como `// TODO: ...` — !!aserciones con selectores inventados
| e2e spec usa rutas relativas (sin BASE_URL hardcodeada)
| e2e spec importa runCommonListTests + getFirstRowEditId + fillRequiredFields + waitForApiResponse
| e2e spec NO contiene `process.env["E2E_TEST*_\_ID"]` — siempre getFirstRowEditId
| tests de Crear y Editar incluyen waitForApiResponse + waitForURL — !!solo toBeVisible en CRUD
| e2e spec usa data-automationid (no data-testid)
| e2e spec sin waitForTimeout ni isVisible().catch()
| e2e spec con tags @smoke en listado y @e2e en form/edit/detail | @critical en flujo CRUD completo
| es.json y en.json verificados juntos
| audit score calculado (100 - penalizaciones) — mapping gaps NO penalizan; dead code solo cuenta si callers == 0 en ALL files incl. _.spec.ts
| smoke_tested incluido en frontmatter del wiki-save
| !!reportar HU como completa sin leer su wiki
| !!severity omitida en algún bug
| !!reportar dead code si hay spec que lo prueba — Grep \*.spec.ts antes de marcar como dead
| !!restaurar dead code eliminado si falla un test — eliminar el test en su lugar
| fichero de reporte nombrado `{feat-name}-audit-{YYYY-MM-DD}.md` (con `-2`, `-3` si ya existe)
]

## @refs

@file:component-feature-mapping.json
@file:docs/wiki/articles/azure/ (HU sources)
@file:docs/wiki/bugs/azure/ (BUG sources — node-id Figma + repro steps)
@file:.claude/skills/audit-module/references/behavioral-probes.md (CORE — matriz de detección P1–P6)
@file:.claude/skills/audit-module/references/figma-crosscheck.md (verificación visual)
@file:.claude/skills/audit-module/references/severity-criteria.md (severidad + verification-depth)
@file:.claude/skills/audit-module/references/pattern-compliance.md (capa de presencia)
@file:.claude/skills/audit-module/references/e2e-spec-template.md (spec dirigido por HU + regresión)
@rule:angular-core-architecture
@rule:permissions
@rule:i18n-structure
@rule:self-learning-error-prevention (aplicar LEs conocidas durante análisis)
@skill:sync-models (cross-check de modelos/enums/filtros vs backend Java — paso 7.5 reusa sus rutas y mapeo Java→TS)
@file:<BACKEND_REPO_PATH> (fuente de verdad backend, SOLO LECTURA: dto/ · dto/export/ · dto/filter/ · enums/ — ruta configurable, ver "Configuración de proyecto" en @skill:sync-models)
