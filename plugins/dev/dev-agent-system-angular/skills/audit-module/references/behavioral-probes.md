# Behavioral Probes — Razonamiento conductual (no chequeo-de-presencia)

i: El checklist de patrón verifica QUE algo existe. Esta matriz verifica QUÉ HACE cuando el usuario lo usa mal. Los bugs que escapan a QA (BUG-3624/3766/3829, B1–B5 feat-meter) NO se detectan listando campos — se detectan razonando "¿qué se rompe si…?". Aplicar SIEMPRE, una probe por superficie interactiva.

G:BP1 !!convertir esto en filas de ✅ — cada probe es una PREGUNTA adversarial con respuesta razonada, no un check de presencia
G:BP2 probe sin evidencia (línea de código / respuesta de red / screenshot Figma) == probe no ejecutada
G:BP3 toda probe que solo se confirma en runtime → marcar `[runtime]` y exigir verificación dinámica; !!declararla ✅ en modo estático
G:BP4 cada bug confirmado por una probe → genera escenario de regresión en el spec E2E (cierra el bucle)

---

## P1 · Comportamiento del LISTADO por-columna  (clase de bug DOMINANTE — 3624/3766/3829)

i: "columnas presentes" NO es el contrato. El contrato es: cada columna ordena, filtra, muestra el campo correcto, con el label correcto, y la lista arranca con el pre-filtro de la HU.

Para CADA columna de `*-constant.ts` (`TableColumn[]`):

T: columna marcada ordenable (sin `notSortable:true`) → A: Grep DTO backend `@OrderByPath` + nombre exacto del campo | nombre diverge del entity y sin `@OrderByPath` → 🟠 sort HTTP 500 (LE-SS-0074) | `[runtime]` click sort → response 200 !500
T: columna con `filterType` → A: verificar `alias` == nombre EXACTO del filtro backend (!nombre frontend) → mismatch → 🟠 filtro silenciado (LE-SS-0071) | `[runtime]` aplicar filtro → response 200 !400 (LE-SS-0059/0060 `.withColumns()`)
T: filtro DATE / numeric → A: verificar `filterType` mapea matchModes correctos (LE-SS-0040/0050/0051); `between`/`LTE`/`GTE` requieren `.withColumns()` → texto plano = 400
T: columna muestra entidad relacionada → A: ¿muestra el campo que pide la HU? (abreviatura vs nombre — 3829#3) | label/orden de columna == HU EXACTO; si la HU NO lo fija → Figma como candidato 🟡, conflicto HU↔Figma → escalar (3624#1 `¿Usado?`→`Usado`; 3829#2 orden+nombres)
T: HU especifica pre-filtro por defecto ("solo Disponibles", "solo activos") → A: verificar store/constant aplica ese filtro al cargar (3624#3 HU-47) | ausente → 🟠 muestra todo | `[runtime]` request inicial lleva el filtro
T: filtro DOMAIN_VALUE/select con pocas opciones → A: ¿la HU fija la UX (buscador+checkbox)? rara vez → Figma como candidato 🟡 (3624#2, ver figma-crosscheck)
T: navegar a detalle y volver → A: ¿persiste el filtro aplicado? (3766#9) → no persiste → 🟡 | `[runtime]`

---

## P2 · Validadores BIDIRECCIONAL  (no solo "required presente")

i: El miss más caro es el inverso — un validador required donde la HU dice OPCIONAL (3766#3). Y los rangos/precisión que la HU exige pero el form no aplica (3766#6).

T: campo con `Validators.required` → A: cruzar con HU → HU dice "opcional" → 🟠 bloquea guardado legítimo (3766#3) | quitar required
T: campo numérico → A: HU define precisión/rango (decimales, min, max) → cruzar `@Digits/@Size/@Min/@Max` del DTO backend (LE-SS-0084) → validator ausente → 🟠 (3766#6 "4 decimales") | error no descriptivo → 🟡
T: eliminar/no-poner un validator → A: !!sin antes Grep DTO backend (`@Size`/`@Min`/`@Max`/`@NotNull`) — el backend puede rechazar lo que el front permite (LE-SS-0084)
T: campo date → A: ¿`minDate` rechaza el día-siguiente-inmediato? (3766#4, LE-SS-0022/0026) | edit mode con valor < minDate → writeValue síncrono lo borra → usar `minDate=undefined` en edit + `futureDateValidator` condicionado a isNew (LE-SS-0070/0026)
T: `futureDateValidator()`/`pastDateValidator()` → A: ¿condicionado a `isNew`? incondicional en edit → bloquea guardado (LE-SS-0070)
T: domain-value selector → A: ¿valores system-only (`desuso`, internos) excluidos con `[excludeCodes]`? (3766#5, LE-SS-0072) | seleccionables → 🟠
T: validador condicional/cruzado (campo X required si Y) → A: ¿el validator se re-evalúa cuando cambia Y? (`updateValueAndValidity` en el effect) | estático → 🟠
T: notifyInvalidForm → A: label del error == nombre HU del campo (3829#6 "Idiomas" !"Traducciones"; LE-SS-0021/0031) | FormArray → ¿recorre items con clave correcta? (LE-SS-0031)

---

## P3 · Estado / Reactividad  (clase B1–B5 — la que exige razonamiento, no checklist)

i: Para CADA FormArray, CADA cadena signal→computed→effect, CADA cascada valueChanges, ejecutar la matriz adversarial. Estos NO aparecen leyendo el código de corrido — aparecen preguntando "¿y si el usuario…?".

T: botón "Añadir" puebla FormArray desde catálogo → A: "¿pulsar Añadir N veces duplica?" → sin `Set` de ids previos → 🔴 duplicación (B1, LE-SS-0085)
T: select de entidad padre puebla tabla hija → A: "¿cambiar el padre a mitad limpia las filas viejas?" → `clear()` solo en evento `(clear)` y no en setValue/patchValue → 🟠 mezcla datos (B2/B3, 3829#10, LE-SS-0086)
T: fila nueva en FormArray desde plantilla → A: "¿copia el id de la plantilla como id de la instancia?" → `id: template.id` → 🔴 payload incorrecto en EDIT (B5, LE-SS-0087) | strip de ids vacíos/plantilla en NEW Y EDIT
T: añadir entidad relacionada con MÁS sub-items que la actual → A: "¿se agregan los sub-items nuevos al FormArray?" (3829#10 idiomas) → cascada no actualiza → 🟠 + error al guardar
T: `computed()` → A: "¿lee ≥1 signal?" → no lee signal → valor estático (LE-SS-0025/0044) | FormControl → usar `createControlValueSignal`
T: `computed` basado en `form.dirty` + `markAsPristine()` → A: "¿se re-evalúa tras pristine?" → no → añadir `form.events` al merge (LE-SS-0047)
T: `effect()` que rastrea computed con input-signal oculto → A: "¿resetea estado del usuario en re-render?" → 🟠 reset involuntario (LE-SS-0044)
T: FormControl booleano de side-effect → A: "¿tiene binding en template?" → sin binding → siempre default, acción nunca ejecuta (LE-SS-0061)
T: `markAsPristine()` → A: ¿antes o después de la respuesta del servidor? antes → PendingChangesGuard no protege si la petición falla → mover a callback `next` (LE-JLG-005)

---

## P4 · Coherencia de MODOS  (NEW / EDIT / DETAIL / FROM-DRAFT)

i: La mayoría de bugs de modo nacen de asumir que EDIT == NEW. Construir matriz: para cada campo, comportamiento esperado por modo.

T: cada campo → A: tabla {NEW: editable/disabled/oculto | EDIT: ... | DETAIL: read-only} cruzada con HU | divergencia → flag
T: EDIT → A: "¿modificar un campo modificable dispara cascada espuria sobre otro?" (3766#7 pide modificar Fecha de validez) → 🟠
T: EDIT → A: ¿campos disabled-on-edit realmente disabled? (tipo no editable, abastecimiento read-only) | `[runtime]` smoke
T: abrir diálogo CREAR tras EDITAR → A: ¿`#closeDialog` resetea isEditMode/creationDate? → estado sucio entre diálogos (LE-JLG-001)
T: breadcrumb → A: ¿incluye todos los segmentos de la ruta real? (3829#1 falta "Términos") | herencia `data` de padre duplica → `breadcrumb:null` en hijo path="" (LE-JLG-002) | ID de padre no heredado en hijo path≠"" → derivar de entidad resuelta (LE-JLG-003)
T: form-header Edit/Detail en entidad anidada → A: ¿navega a URL correcta? `editDetailButtonVisible` + `headerActions` (LE-JLG-004)

---

## P5 · Baja / Activación — semántica y side-effects

T: dar de baja entidad con dependientes (contratos vigentes, PUCs) → A: "¿avisa al usuario antes?" → sin aviso → 🟠 (3766#8, 3829#7) | quitar relación con dependientes → 500 backend → 🔴 (3829#7)
T: fecha de baja → A: ¿la fecha mostrada en detalle == la que puso el usuario? → diverge → 🟠 (3766#8)
T: diálogo de baja con datepicker → A: ¿`[minDate]` impide fecha pasada como inactividad? (LE-SS-0073)
T: botón "Dar de baja" → A: ¿oculto en entidad YA inactiva? `deleteVisible()` + `isDeleted` (LE-SS-0057/0062) | `useFeaturePermissions` con `isDeleted` en entidades con `entityState`
T: `deleteItem` desde detail view → A: ¿`setSelectedEntityDetail` previo? sin él → `{{param}}` vacío en popup (LE-SS-0052)
T: baja FormArray → A: sin id → physical delete (removeAt) | con id → `patchValue({deletionDate})` (LE-SS-0015)
T: mensaje de advertencia de baja → A: == HU; si la HU no da el copy → Figma como candidato 🟡 (3829#9, ver figma-crosscheck)

---

## P6 · i18n / labels entre modos

T: labels de campo → A: capitalización CONSISTENTE entre CREATE/EDIT/DETAIL (3829#5) — la inconsistencia es bug 🟡 por sí sola; el formato correcto lo fija la HU, si calla → Figma candidato | cruzar es.json/en.json
T: key i18n nueva → A: existe en es.json Y en.json (G:006) | key en template no definida (LE-SS-0036) | key fallback en TS no definida (LE-SS-0036)
T: módulo i18n file → A: JSON plano, !wrapper `{"feature":{...}}` (LE-SS-0027)
T: interpolación → A: `{{param}}` del JSON == params pasados en `translate()`

---

## V: (la auditoría no termina sin esto)

V: [
cada columna del listado pasó P1 (sort+filter+label+campo+pre-filtro) — !!"columnas presentes" como única evidencia
| validadores cruzados bidireccional con HU Y con anotaciones DTO backend (P2)
| FormArray + signals + cascadas pasaron la matriz adversarial P3 (Añadir 2×, cambiar padre, id plantilla, computed reactivo)
| matriz de modos construida (P4) — NEW/EDIT/DETAIL/draft
| semántica de baja con dependientes + fecha + visibilidad (P5)
| probes `[runtime]` verificadas con server o marcadas explícitamente como NO verificadas (G:BP3)
| cada bug confirmado tiene escenario de regresión en el spec (G:BP4)
]

@: [@file:docs/wiki/knowledge-log.md, @file:.claude/skills/audit-module/references/figma-crosscheck.md, @rule:self-learning-error-prevention]
