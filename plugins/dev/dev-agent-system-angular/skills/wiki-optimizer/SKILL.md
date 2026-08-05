---
name: wiki-optimizer
description: Bucle de mejora continua de la wiki centrado en docs/wiki/guide/dev-guide.html (la guía visual del dev). Optimiza código, UI/UX, buscabilidad y cobertura Diátaxis. También audita src/ en busca de fragilidades (duplicación, antipatrones, utils infrautilizados), las documenta como patterns + WISHLIST y centraliza su solución en código verificado. Diagnostica → optimiza → regenera → verifica, iterando. Invocar con /wiki-optimizer [sección|objetivo|fragilidad]. Úsalo cuando pidan mejorar/optimizar/actualizar la wiki, la dev-guide, la documentación, las how-to o los patterns, o detectar/documentar/resolver duplicación y malas prácticas recurrentes.
---

# wiki-optimizer

i: mejora_continua(docs/wiki) + fragilidades(src/ → documentar+resolver) | eje==dev-guide.html | calidad>compresión | !!re-explicar_contexto

## G: HECHOS (no rediagnosticar)

G:W01 dev-guide.html == 100% generado por `scripts/wiki/build-guide.mjs` (`npm run wiki:guide`) | !!editar_a_mano (se sobrescribe)
G:W02 fuentes_guía == `guide/shell.html` + `guide/sections/*.html` (13, HTML curado) + render(`how-to/*.md` + `patterns/*.md`) + `guide/guide.css`
G:W03 únicas_wiki_en_guía == how-to/ + patterns/ | !!features !!azure !!decisions !!architecture !!api (no entran salvo tocar build-guide.mjs) | `guide: false` en frontmatter excluye página
G:W04 generado_fuera_scope_manual == articles/azure | bugs/azure | components/modules | services/ → mejorar vía generador+regenerar | !!editar_a_mano
G:W05 código_guía == ya_al_día Angular21 (signals/inject/@if-@for) → ROI real: cobertura_how-to / Diátaxis / buscabilidad / fragilidades_src | !!asumir "código obsoleto"
G:W06 skill `documentation-writer` == solo marco_diagnóstico Diátaxis (4 cuadrantes) | !!su loop_interactivo !!dejarla_redactar (ignora W:schema)
G:W07 MCP angular-cli == quirúrgico, solo snippets_con_código | MCP primeng NO_disponible → verificar contra `src/app/shared/ui/` + `find_examples` + código_real
G:W08 file:// bloqueado en Playwright → servir HTTP: `python -m http.server PORT` en `docs/wiki/guide/` (background) → navegar `localhost:PORT/dev-guide.html`
G:W09 WISHLIST == `docs/wiki/guide/WISHLIST.md` | backlog priorizado de gaps | entrada=={problema, evidencia(ficheros+conteos), LEs, propuesta, prioridad} | !!entrada_sin_evidencia | completada → crear pattern + marcar fecha
G:W10 fragilidad_típica == utilidad canónica YA existe pero infrautilizada (caso 2026-06-11: ApiQueryBuilder vs parseo manual ×8) → extender_existente (1 método) | !!helper_paralelo_nuevo | !!segunda_vía
G:W11 cluster ≥3 LEs mismo dominio en @knowledge-log == falta pattern (señal más fiable de gap)
G:W12 audiencia == dev medio → lenguaje natural+directo+comprensible | explicar qué_hace + para_qué_sirve | !!jerga_inflada !!tecnicismo_innecesario | tecnicismo_imprescindible → 1 frase llana en primera mención | identificadores/APIs en su forma original
G:W13 mermaid soportado en patterns/how-to (build-guide.mjs → SVG build-time, HTML autocontenido) → flujo/decisión/secuencia/arquitectura → ```mermaid > párrafo largo | mejora_visual_continua == cada iteración deja la guía igual o mejor (diagramas, tablas, callouts) | !!regresión_visual

## FP: SEÑALES DE FRAGILIDAD (Grep sobre src/app/modules; conteo == evidencia)

FP:dup_fecha `padStart\(2, "0"\)` fuera de date.utils → toLocalDateString/toLocalISOString
FP:dup_blob `URL\.createObjectURL` fuera de UtilsService/ExportDataService → getDownloadHandler
FP:dup_paging `Math\.floor\(event\.first` → ApiQueryBuilder.fromPrimeNgMeta
FP:err_adhoc `console\.(error|warn|log)` en componentes → NotifierService + estado
FP:dup_validator `function \w+Validator\(` local en feature → catálogo shared
FP:sync_hack `setTimeout\(` / `JSON\.stringify\(.*JSON\.stringify` → signals/effects correctos
T: nueva señal descubierta en iteración → A: añadir FP: aquí | H: en la entrada

## T→A: BUCLE GUÍA (por iteración)

T: /wiki-optimizer → A: baseline `npm run wiki:guide` (build verde antes de tocar) | leer este SKILL | !!plan_largo enumerando archivos
T: /wiki-optimizer sin objetivo → A: proponer 1 candidato por eje (guía: Diátaxis/buscabilidad | fragilidad: FP-grep con mayor conteo / WISHLIST prioridad ALTA) | ? elegir eje
T: diagnóstico → A: clasificar fuente por cuadrante Diátaxis (tutorial/how-to/reference/explanation) | detectar híbridos | grep antipatrones (`*ngIf|@Input|constructor\(private|BehaviorSubject|toSorted`) sobre patterns+sections
T: gap_how-to → A: derivar de clusters @knowledge-log (G:W11) | crear .md estilo `how-to/create-standard-entity-feature.md`
T: snippet_con_código → A: verificar API contra fuente_real ANTES de escribir (Grep firma) | !!código_de_memoria
T: redactar contenido (md/sections) → A: estilo G:W12 (llano, qué_hace+para_qué) | apertura "Qué es y para qué sirve" 2-3 frases | G:W13 mermaid donde haya flujo/decisión
T: editar .md → A: frontmatter YAML (type/confidence/last_updated/tags/sources_reales) | `[[]]` forward-slash BIDIRECCIONAL (G:W6 reflejar en ambas) | sintetizar !!append
T: editar sections/\*.html → A: respetar markup design-system (`.callout`/`.code-block`/`.table-wrap`) que build-guide.mjs espera
T: cambio_aplicado → A: actualizar `index.md` + `log.md` + `how-to/index.md` o `patterns/index.md`
T: fin_iteración → A: `npm run wiki:guide` (sanity checks) + verificar Playwright + auto-eval + ?proponer_siguiente_paso (preguntar continuar/cambiar_rumbo)

## T→A: BUCLE FRAGILIDADES (descubrir → documentar → resolver)

T: inicio_eje_fragilidad → A: barrer FP: + clusters G:W11 + WISHLIST pendientes → elegir 1-2 candidatos por frecuencia×daño | !!abarcar_todos
T: candidato_elegido → A: Grep cuantificar (N ficheros, lista) | buscar utilidad_existente primero (G:W10: shared/utils + shared/services + shared/data-access) | Read 2 casos reales para variantes
T: scope_solución → A: ? AskUser {solo_documentar / extender_util+migrar_2_casos_canónicos (default) / migración_completa} | !!migración_masiva_sin_confirmación | !!subagentes_sin_confirmación
T: resolver → A: extensión mínima de util existente + tests del util + migrar casos canónicos | V: build+spec verdes ANTES de documentar | quirúrgico (!tocar_no_relacionado)
T: documentar → A: pattern nuevo == {cuándo aplica (tabla decisión/mermaid), receta con código real migrado, antipatrón_real_eliminado verbatim, candidatos_pendientes, refs LE} | estilo G:W12+G:W13 | si añade API → actualizar patterns/shared-utils-reference.md (sección + "duplicaciones conocidas")
T: gaps_no_resueltos → A: filar en WISHLIST formato G:W09 | !!perder hallazgos en el chat
T: invariante_nuevo → A: sync 1 línea T→A en @rule:angular-core-architecture (mismo patrón que staging-tables) | proponer LE si error_técnico_nuevo (G:LE1 Grep numeración primero)
T: fin → A: índices + log.md + `npm run wiki:guide` + verificar secciones nuevas en dev-guide.html (grep título)

## V: VERIFICACIÓN

V: [`npm run build` => marcador `generation complete` (!!exit_code_solo, !!`| tail` como gate) | spec del área tocada verde | `wiki:guide` => `✓ generado` sin `✗` + mermaid N/N convertidos | `wiki:lint` => no broken links | `wiki:lint-fm` => 0 nuevas violaciones en fuentes_guía | Playwright: render OK + `#searchIndex` indexa lo nuevo + diagramas visibles light/dark | snippet_copiado_a_componente => `npm run build`]

## @: REFS

@: [@file:scripts/wiki/build-guide.mjs, @file:docs/wiki/guide/WISHLIST.md, @file:docs/wiki/patterns/shared-utils-reference.md, @file:docs/wiki/patterns/custom-table-without-store.md, @file:docs/wiki/how-to/create-standard-entity-feature.md, @file:docs/wiki/patterns/editable-tables-bodytemplate-pattern.md, @file:docs/wiki/index.md, @file:docs/wiki/log.md, @file:docs/wiki/knowledge-log.md, @rule:angular-core-architecture]

