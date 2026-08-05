export const meta = {
  name: "audit-module-dynamic",
  description:
    "Auditoría dinámica paralela: context-loader + behavioral-probes (P1–P6) + smoke-browser fan-out + E2E spec generation con regresión + rule adherence verification",
  phases: [
    {
      title: "Context Loading",
      detail: "Extrae slices de código por probe (1 agente, evita repetir archivos en P1–P6)"
    },
    { title: "Behavioral-Probes P1–P6", detail: "Agentes especializados en paralelo + panel adversarial" },
    { title: "Smoke-Browser Fan-Out", detail: "5 pantallas en paralelo (list, detail, edit, table-edit, create)" },
    { title: "E2E Spec Generation", detail: "Base CRUD + bug-regression tests" },
    { title: "Rule Adherence Verification", detail: "Panel LE-SS contra hallazgos" },
    { title: "Report Synthesis", detail: "Merge findings + audit score + wiki-save" }
  ]
};

// Phase 0: Context Loading
// Lee todos los archivos una sola vez y extrae slices por probe.
// Acepta codeFilePaths (rutas) o codeFiles (contenido) para flexibilidad.
// Evita enviar formComponent×4 y store×3 a los agentes en paralelo.
phase("Context Loading");

const filePaths = args.codeFilePaths || {};
const hasFilePaths = Object.keys(filePaths).length > 0;

const contextSlices = await agent(
  `Eres un extractor de contexto estructurado para auditoría Angular. Tu tarea es leer el código del módulo "${args.feat}" y extraer ÚNICAMENTE el código literal relevante para cada probe de auditoría. NO analices, NO resumas — extrae fragmentos de código exactos.

${
  hasFilePaths
    ? `Debes leer los siguientes archivos con la herramienta Read:
- list component (.ts): ${filePaths.listComponent || "N/A"}
- list template (.html): ${filePaths.listTemplate || "N/A"}
- store.ts: ${filePaths.store || "N/A"}
- form component (.ts): ${filePaths.formComponent || "N/A"}
- form template (.html): ${filePaths.formTemplate || "N/A"}
- builder service (.ts): ${filePaths.builderService || "N/A"}
- es.json: ${filePaths.es_json || "N/A"}
- en.json: ${filePaths.en_json || "N/A"}

Lee cada archivo con la herramienta Read antes de extraer los slices.`
    : `Usa los archivos proporcionados directamente en args.codeFiles (ya inyectados por el orquestador).`
}

Análisis estático previo del orquestador (hallazgos ya detectados, para contexto):
${JSON.stringify(args.staticFindings || {})}

Extrae para cada probe SOLO el código literal relevante (fragmentos, no paráfrasis):

**p1_columns** (probe columnas): definición de columns[], withTableCustomConfig, defaultSort, filtros pre-aplicados en store/list. Incluye alias, filterType, notSortable flags.
**p2_validators** (probe validators): método createForm() completo con todos los Validators.*, min/max/pattern/required declarations, minDate/maxDate, futureDateValidator.
**p3_state** (probe reactividad): operaciones FormArray (push/removeAt/clear/setValue), computed() definitions, markAsPristine calls, form.events usage, signal dependencies.
**p4_modes** (probe modos): branches isNew/isEdit/isDetail, campos disabled/readonly, @if(editing)/@else blocks en template, transiciones de modo (pristine/dirty reset).
**p5_deactivation** (probe baja): lógica deletionDate, diálogo de baja, deleteItem/deactivateItem flow, deleteVisible()/isDeleted checks, minDate en datepicker de baja.
**p6_i18n** (probe i18n): todas las keys transloco referenciadas en TS (translate(), translocoService.translate()) y en HTML (| transloco), más el contenido completo de es.json y en.json para comparación de sincronía.`,
  {
    label: "Context-Loader",
    phase: "Context Loading",
    schema: {
      type: "object",
      properties: {
        p1_columns: { type: "string", description: "Column defs, sort config, pre-filters" },
        p2_validators: { type: "string", description: "createForm() and all validators" },
        p3_state: { type: "string", description: "FormArray ops, computed deps, pristine handling" },
        p4_modes: { type: "string", description: "Mode branches, disabled/readonly logic" },
        p5_deactivation: { type: "string", description: "Soft-delete flow and visibility logic" },
        p6_i18n: { type: "string", description: "All transloco keys used in TS+HTML + both JSON files" }
      },
      required: ["p1_columns", "p2_validators", "p3_state", "p4_modes", "p5_deactivation", "p6_i18n"]
    }
  }
);

if (!contextSlices) {
  log("⚠️ Context-Loader fue omitido — abortando workflow");
  return { error: "context_loader_skipped", feat: args.feat };
}

log(`Context-Loader complete — slices listos para P1–P6`);

phase("Behavioral-Probes P1–P6");

// Input: args.feat, args.hus, contextSlices (ya extraído por Context-Loader)
// Output: {P1, P2, P3, P4, P5, P6} findings + severities

const behavioralProbes = await parallel([
  // P1: List column behavior (sort/filter/label/field)
  () =>
    agent(
      `Analiza el módulo "${args.feat}" enfocándote en COMPORTAMIENTO DE COLUMNAS en el listado.

Eres experto en detección de bugs de UI en listas Angular + PrimeNG. Lee los archivos proporcionados y ejecuta P1 behavioral-probe:

**P1: Columnas ordenables/filtrables**
- Cada columna ¿ordena? Verifica en el código: @ref mcp__angular-cli__search_documentation "ordering Angular tables"
- Cada columna ¿filtra? Verifica en el código y @ref mcp__primeng__get_component_props para p-column filterType
- Label de columna == campo de la HU (Figma solo si HU calla sobre el label)
- Campo mapeado correctamente al campo backend (@ref mcp__angular-cli__search_documentation "table column binding")
- Pre-filtro por defecto aplicado al cargar lista

Código relevante (columnas, sort, filtros):
\`\`\`
${contextSlices.p1_columns}
\`\`\`

HU requisito:
${args.huContext}

Retorna JSON: { probeId: 'P1', findings: [{column, sorts, filters, label_matches_hu, field_correct, pre_filter_applied}], bugs: [{desc, severity, le_ss_ref}] }`,
      {
        label: "P1-Columnas",
        phase: "Behavioral-Probes P1–P6",
        schema: {
          type: "object",
          properties: {
            probeId: { type: "string" },
            findings: { type: "array" },
            bugs: { type: "array" }
          }
        }
      }
    ),

  // P2: Validators bidirectional
  () =>
    agent(
      `Analiza validadores en AMBAS direcciones para "${args.feat}".

Eres especialista en validación Angular + Reactive Forms + Backend DTOs.

**P2: Validadores BIDIRECCIONAL**
- Required: ¿dónde HU=required la HU, está el validador Validators.required? ¿Dónde HU=opcional, NO hay required?
- Rango/precisión: verifica @ref mcp__primeng__get_component_props para min/max en p-inputNumber, pattern en p-input, etc.
- Cruzado con DTO backend: @Size/@Digits/@Min/@Max anotaciones (solicita al usuario o grep DTO si está disponible)
- DatePicker validators: minDate/maxDate/futureDateValidator según HU (LE-SS-0022, LE-SS-0026, LE-SS-0070)
- Autocomplete/Select excludeCodes si HU requiere filtrado (LE-SS-0072)

Código relevante (createForm, validators):
\`\`\`
${contextSlices.p2_validators}
\`\`\`

HU requisito (campos, validación):
${args.huContext}

Retorna JSON: { probeId: 'P2', validators: [{field, required, min, max, pattern, matches_hu}], bidirectional_gaps: [{field, issue, severity}] }`,
      {
        label: "P2-Validadores",
        phase: "Behavioral-Probes P1–P6",
        schema: {
          type: "object",
          properties: {
            probeId: { type: "string" },
            validators: { type: "array" },
            bidirectional_gaps: { type: "array" }
          }
        }
      }
    ),

  // P3: State/Reactivity (B1–B5)
  () =>
    agent(
      `Analiza ESTADO Y REACTIVIDAD en "${args.feat}" — busca B1–B5 bugs.

Eres especialista en Angular signals, reactivity, state mutations.

**P3: Estado/Reactividad**
- B1: Añadir 2× a FormArray sin duplicar → ¿hay deduplicación? (LE-SS-0085)
- B2: Cambiar entidad relacionada limpia tabla hija → ¿hay clear()/reset()? (LE-SS-0086)
- B3: Id plantilla NO contamina instancia nueva → ¿se genera nuevo id? (LE-SS-0087)
- B4: computed() reacciona a signals de los que depende → grep y verifica reactivity @ref mcp__angular-cli__search_documentation "computed dependencies"
- B5: markAsPristine() re-evalúa computed basados en form.dirty → ¿hay form.events merge? (LE-SS-0047)

Código relevante (FormArray, computed, pristine):
\`\`\`
${contextSlices.p3_state}
\`\`\`

Retorna JSON: { probeId: 'P3', state_checks: [{scenario, implemented, risk_level}], bugs: [{B_number, desc, severity}] }`,
      {
        label: "P3-Reactividad",
        phase: "Behavioral-Probes P1–P6",
        schema: {
          type: "object",
          properties: {
            probeId: { type: "string" },
            state_checks: { type: "array" },
            bugs: { type: "array" }
          }
        }
      }
    ),

  // P4: Modes (NEW/EDIT/DETAIL/draft)
  () =>
    agent(
      `Analiza MODOS DE FORMULARIO para "${args.feat}".

Eres experto en Angular form modes, disabled states, visibility rules.

**P4: Modos NEW/EDIT/DETAIL**
- CREATE modo: campos editables, validación requerida, botón "Crear"
- EDIT modo: campos muestran valor existente (LE-SS-0068 p-select), validación, botón "Guardar"
- DETAIL modo: todos los campos readonly, sin validación, sin botón guardar
- Transiciones entre modos: pristine/dirty reset? (LE-JLG-001)
- Breadcrumb correcto por modo (LE-JLG-002)

Código relevante (modos, disabled, editing):
\`\`\`
${contextSlices.p4_modes}
\`\`\`

Retorna JSON: { probeId: 'P4', mode_matrix: [{mode, fields_editable, validation_required, buttons_visible}], issues: [{mode, issue, severity}] }`,
      {
        label: "P4-Modos",
        phase: "Behavioral-Probes P1–P6",
        schema: {
          type: "object",
          properties: {
            probeId: { type: "string" },
            mode_matrix: { type: "array" },
            issues: { type: "array" }
          }
        }
      }
    ),

  // P5: Deactivation (soft delete)
  () =>
    agent(
      `Analiza BAJA/DESACTIVACIÓN en "${args.feat}".

Eres experto en soft-delete flows, confirmaciones, visibilidad post-baja.

**P5: Baja/Activación**
- Dialog de confirmación con campo fecha (LE-SS-0073 minDate)
- Aviso de dependientes si aplica
- Estado actualizado a inactivo (deletionDate)
- Visibilidad en listado tras inactividad (LE-SS-0057: botón "Dar de baja" NO visible si ya inactivo)
- Editar bloqueado si inactivo (activeEntityResolver + redirectIfInactive) (LE-SS-0062)

Código relevante (baja, deletionDate, visibilidad):
\`\`\`
${contextSlices.p5_deactivation}
\`\`\`

Retorna JSON: { probeId: 'P5', deactivation_flow: [{step, implemented, issue}], bugs: [{desc, severity}] }`,
      {
        label: "P5-Baja",
        phase: "Behavioral-Probes P1–P6",
        schema: {
          type: "object",
          properties: {
            probeId: { type: "string" },
            deactivation_flow: { type: "array" },
            bugs: { type: "array" }
          }
        }
      }
    ),

  // P6: Error labels + i18n
  () =>
    agent(
      `Analiza LABELS DE ERROR E I18N en "${args.feat}".

Eres experto en mensajes de validación, transloco, labels multiidioma.

**P6: Labels de Error + I18n**
- Mensajes de validación (required, pattern, min, max) ¿usan i18n? (LE-SS-0018, LE-SS-0021)
- Key de error camelCase capitalizado vs common.labels global (LE-SS-0021)
- es.json + en.json sincronizadas (todas las keys presentes en ambos)
- Transloco interpolación: {{param}} en el JSON coincide con translate() en TS (LE-SS-0027)

Código relevante (keys transloco usadas + ambos JSON para verificar sincronía):
\`\`\`
${contextSlices.p6_i18n}
\`\`\`

Retorna JSON: { probeId: 'P6', i18n_keys: [{key, exists_es, exists_en}], error_labels: [{field, label, uses_i18n}], issues: [{desc, severity}] }`,
      {
        label: "P6-I18n",
        phase: "Behavioral-Probes P1–P6",
        schema: {
          type: "object",
          properties: {
            probeId: { type: "string" },
            i18n_keys: { type: "array" },
            error_labels: { type: "array" },
            issues: { type: "array" }
          }
        }
      }
    )
]);

// Adversarial verification panel: 3 verifiers per probe
log(`Parallelizing adversarial verification (3 verifiers × 6 probes = 18 agents)...`);

const allProbesFormatted = behavioralProbes
  .filter(Boolean)
  .map((p) => JSON.stringify(p))
  .join("\n---\n");

const adversarialVerification = await parallel(
  behavioralProbes.filter(Boolean).flatMap((probe) =>
    Array.from(
      { length: 3 },
      (_, i) => () =>
        agent(
          `Eres un escéptico adversarial. Verifica este hallazgo de la probe ${probe.probeId} y asume que está EQUIVOCADO hasta que encuentres evidencia.

Hallazgo original:
\`\`\`
${JSON.stringify(probe, null, 2)}
\`\`\`

Tu tarea:
1. Intenta REFUTAR cada bug/issue reportado. ¿La evidencia es sólida?
2. ¿Hay falsos positivos? (e.g., hallazgo reportado pero en realidad está OK)
3. ¿Hay falsos negativos? (e.g., bug real no detectado)
4. Asigna confianza (0–100%) a cada hallazgo
5. Sugiere investigación adicional si hay incertidumbre

Retorna JSON: { probeId: '${probe.probeId}', verifier_id: ${i + 1}, confidence: {bug_id: percent}, suggestions: [...] }`,
          {
            label: `V${i + 1}-${probe.probeId}`,
            phase: "Behavioral-Probes P1–P6",
            schema: {
              type: "object",
              properties: {
                probeId: { type: "string" },
                verifier_id: { type: "number" },
                confidence: { type: "object" },
                suggestions: { type: "array" }
              }
            }
          }
        )
    )
  )
);

// Merge P1–P6 + verifier consensus
const behavioralFindings = {
  probes: behavioralProbes.filter(Boolean),
  verifiers: adversarialVerification.filter(Boolean),
  consensus: {} // computed below
};

log(
  `Behavioral-Probes complete: ${behavioralProbes.filter(Boolean).length} probes, ${adversarialVerification.filter(Boolean).length} verifiers`
);

// Phase 2: Smoke-Browser Fan-Out
if (args.serverAvailable) {
  phase("Smoke-Browser Fan-Out");

  const smokeTests = await parallel([
    () =>
      agent(
        `Ejecuta smoke test en LIST vista del módulo "${args.feat}".

Requisitos:
- Navega a ${args.listRoute} usando @ref mcp__playwright__browser_navigate
- Verifica tabla carga con datos: @ref mcp__playwright__browser_snapshot
- Pre-filtro de HU aplicado (¿muestra solo "Disponibles" si HU lo especifica?)
- Cada columna visible y con label correcto vs HU

Retorna: { screen: 'list', loads: boolean, pre_filter: { expected, observed, matches } }`,
        {
          label: "Smoke-List",
          phase: "Smoke-Browser Fan-Out",
          schema: {
            type: "object",
            properties: { screen: { type: "string" }, loads: { type: "boolean" }, pre_filter: { type: "object" } }
          }
        }
      ),

    () =>
      agent(
        `Ejecuta smoke test en DETAIL vista del módulo "${args.feat}".

Requisitos:
- Navega a lista, click en primer row
- Verifica campos poblados (no vacíos) @ref mcp__playwright__browser_snapshot
- Usa @ref mcp__playwright__browser_wait_for para esperar datos si lazy-load

Retorna: { screen: 'detail', fields_populated: boolean, load_time_ok: boolean }`,
        {
          label: "Smoke-Detail",
          phase: "Smoke-Browser Fan-Out",
          schema: {
            type: "object",
            properties: {
              screen: { type: "string" },
              fields_populated: { type: "boolean" },
              load_time_ok: { type: "boolean" }
            }
          }
        }
      ),

    () =>
      agent(
        `Ejecuta smoke test en EDIT vista del módulo "${args.feat}".

Requisitos (usa @ref mcp__playwright__browser_*):
- Click botón "Editar" en detail
- Verifica p-select/app-select muestran valor existente (no placeholder) — LE-SS-0068
- @ref mcp__primeng__get_component_props para validar comportamiento de p-select con [ngModel]
- Autocompletables muestran descripción, no vacío

Retorna: { screen: 'edit', selects_have_value: boolean, autocompletes_have_value: boolean }`,
        {
          label: "Smoke-Edit",
          phase: "Smoke-Browser Fan-Out",
          schema: {
            type: "object",
            properties: {
              screen: { type: "string" },
              selects_have_value: { type: "boolean" },
              autocompletes_have_value: { type: "boolean" }
            }
          }
        }
      ),

    () =>
      agent(
        `Ejecuta smoke test en tabla EDITABLE (inline editing) si aplica a "${args.feat}".

Requisitos:
- Click ícono editar en primera fila
- Verifica celdas editables pobladas (no empty inputs) — LE-SS-0067
- @ref mcp__primeng__get_component_props para p-select dentro de p-cellEditor

Retorna: { screen: 'table-edit', cells_populated: boolean, applies: boolean }`,
        {
          label: "Smoke-TableEdit",
          phase: "Smoke-Browser Fan-Out",
          schema: {
            type: "object",
            properties: {
              screen: { type: "string" },
              cells_populated: { type: "boolean" },
              applies: { type: "boolean" }
            }
          }
        }
      ),

    () =>
      agent(
        `Ejecuta smoke test en CREATE vista del módulo "${args.feat}".

Requisitos:
- Navega a ${args.createRoute}
- Submit form vacío
- Verifica errores visibles en cada campo required (LE-SS-0045: public implicit, no protected para templates)
- @ref mcp__primeng__get_component_props para validar que componentes custom (app-input-*, app-select) muestran errores

Retorna: { screen: 'create', validation_errors_visible: boolean, error_count: number }`,
        {
          label: "Smoke-Create",
          phase: "Smoke-Browser Fan-Out",
          schema: {
            type: "object",
            properties: {
              screen: { type: "string" },
              validation_errors_visible: { type: "boolean" },
              error_count: { type: "number" }
            }
          }
        }
      )
  ]);

  const smokeFindings = {
    tests: smokeTests.filter(Boolean),
    timestamp: new Date().toISOString()
  };

  log(`Smoke-Browser complete: ${smokeTests.filter(Boolean).length} screens tested`);
} else {
  log(`⚠️ Dev server no disponible — smoke-browser omitido, E2E spec generado pero no ejecutado`);
  var smokeFindings = { skipped: true, reason: "dev_server_unavailable" };
}

// Phase 3: E2E Spec Generation
phase("E2E Spec Generation");

const e2eSpec = await agent(
  `Eres especialista en Playwright E2E testing y Angular @ref /playwright-best-practices.

Genera spec DIRIGIDO POR COMPORTAMIENTO para ${args.feat}, consumiendo:
- Behavioral-probes findings (P1–P6 con bugs)
- Smoke findings (si disponibles)
- Selector-map del análisis estático: ${JSON.stringify(args.selectorMap)}

Estructura del spec:
1. **Imports**: mcp__angular-cli__ y @ref /playwright-best-practices para patrones
2. **List tests** (@smoke tag):
   - Para CADA columna orderable: test "ordena por {campo}" → valida con @ref mcp__primeng__get_component_props
   - Para CADA columna filtrable: test "filtra por {campo}" → @ref mcp__playwright__ network assertions
   - Pre-filtro: test verifica pre-filtro por defecto aplicado
3. **State-probes** (@e2e tag):
   - B1: "Añadir 2× no duplica" si FormArray
   - B2: "Cambiar padre limpia tabla" si cascading
4. **Regression tests** (@e2e @critical tag):
   - UN test por CADA bug de behavioral-probes
   - E.g. LE-SS-0068 bug → test valida p-select mostraría valor en edit
5. **CRUD flow** (@e2e @critical tag):
   - CREATE: validación, submit, navigate
   - EDIT: cargar, cambiar, submit
   - DETAIL: readonly
   - DELETE: soft-delete con fecha (LE-SS-0073)

Requisitos Playwright:
- Usa data-automationid SOLO si está en verifiedKeys o fixedIds
- NO inventar selectores como input{Cap(name)}
- Para wrappers sin [key]: localizar por componente (page.locator('app-supply-selector'))
- @ref mcp__playwright__ browser_* tools en todas las navegaciones
- Usa getFirstRowEditId() — !!process.env["E2E_TEST_*_ID"]
- fillRequiredFields() + waitForApiResponse() en CRUD
- Timeouts 30s en primer toBeVisible (Angular bootstrap)
- NO waitForTimeout; usa web-first assertions

Retorna JavaScript string (ready to Write to e2e/generated/{feat}.spec.ts)`,
  {
    label: "E2E-Generator",
    phase: "E2E Spec Generation",
    agentType: "dev"
  }
);

log(`E2E spec generated for ${args.feat}`);

// Phase 4: Rule Adherence Verification
phase("Rule Adherence Verification");

const leVerifiers = await parallel([
  () =>
    agent(
      `Verifica que los hallazgos de behavioral-probes coinciden con las LE-SS conocidas del proyecto.

Hallazgos:
${allProbesFormatted}

Referencia LE-SS (aplica estas):
- LE-SS-0019: PrimeNG con bare string attrs ([attr]="'value'")
- LE-SS-0054: [canCreate] binding duplicado
- LE-SS-0068: p-select sin [dataKey] en tabla editable
- LE-SS-0067: bodyTemplate sin @if(editing)
- LE-SS-0070: futureDateValidator incondicional en edit
- LE-SS-0074: Backend DTO sin @OrderByPath → sort HTTP 500
- LE-SS-0084: Validator eliminado sin cruzar @Size/@Min/@Max backend

¿Detecta algún hallazgo que debería estar cubierto por LE-SS? ¿Hay LE-SS obsoletas?
¿Hay NEW patrón que debería convertirse en LE-SS?

Retorna: { covered_by_le: [{bug_id, le_ss_id}], new_le_candidate: [{pattern, severity}] }`,
      {
        label: "LE-Verify-1",
        phase: "Rule Adherence Verification",
        schema: {
          type: "object",
          properties: { covered_by_le: { type: "array" }, new_le_candidate: { type: "array" } }
        }
      }
    )
]);

log(`Rule adherence verification complete`);

// Phase 5: Report Synthesis
phase("Report Synthesis");

const finalReport = await agent(
  `Sintetiza el reporte final de auditoría para ${args.feat}.

Inputs:
- Static findings (pattern compliance, dead code, i18n): ${JSON.stringify(args.staticFindings)}
- Behavioral-probes (P1–P6 + verifiers): ${JSON.stringify(behavioralFindings)}
- Smoke findings: ${JSON.stringify(smokeFindings)}
- E2E spec: generado (ver archivo)
- LE-SS adherence: ${JSON.stringify(leVerifiers[0] || {})}

Output:
1. Tabla de bugs encontrados (severidad, LE-SS ref, componente)
2. Audit score (100 - penalizaciones por severidad)
3. Verification depth (static|smoke|runtime)
4. Conclusión + próximos pasos
5. Wiki-save path (docs/wiki/audits/{module-path}/{feat}/{feat}-audit-{date}.md)

Formato: markdown con frontmatter YAML (type: audit | feat | date | hus | bugs_found | audit_score | verification_depth | smoke_tested | runtime_tested | figma_checked)`,
  {
    label: "Report-Synthesis",
    phase: "Report Synthesis"
  }
);

return {
  feat: args.feat,
  behavioral_probes: behavioralFindings,
  smoke: smokeFindings,
  e2e_spec: e2eSpec,
  report: finalReport,
  verification_depth: args.serverAvailable ? "smoke" : "static"
};
