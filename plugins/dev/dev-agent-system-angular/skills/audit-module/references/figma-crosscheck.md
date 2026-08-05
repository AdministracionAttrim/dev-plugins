# Figma Cross-Check — señal visual SUBORDINADA a la HU

i: La HU (criterios de aceptación) es la AUTORIDAD de requisitos. SIEMPRE. Figma suele estar desactualizado → tratarlo como autoridad inventa conflictos HU↔diseño que la auditoría NO debe adjudicar. Figma sirve solo como señal corroborante donde la HU NO fija el detalle visual (label exacto de columna, orden, copy de mensaje, UX de un control). Algunos bugs escapados eran justo eso (3624#1 label, 3829#2 orden columnas, 3829#9 copy de baja): la HU no los precisaba y no había referencia visual.

## Guardrails (orden de prioridad — no negociable)

G:FG1 HU == autoridad de requisitos. T: la HU especifica el detalle → A: la HU gana | ignorar Figma aunque diverja
G:FG2 !!adjudicar HU vs Figma. T: HU y Figma CONFLICTO directo sobre el mismo punto → A: emitir `🟡 conflicto HU↔Figma sobre {X} — escalar a producto/diseño`, !!reportar como bug de código, !!asumir ninguno de los dos
G:FG3 mismatch Figma NUNCA es bug auto-confirmado. Figma desactualizado es la norma → máximo 🟡 "candidato visual — confirmar", nunca 🔴/🟠 por sí solo
G:FG4 T: HU silenciosa sobre el detalle visual Y Figma lo especifica → A: 🟡 "candidato: {valor Figma} — confirmar con producto" | sin Figma ni HU → 🟡 "sin referencia — verificar con producto", !!asumir
G:FG5 staleness guard: T: Figma `last-modified` anterior a la resolución de la HU/BUG → A: degradar a "referencia posiblemente obsoleta", peso mínimo

## T→A

T: localizar node-id → A: Grep en HU/BUG wiki (`docs/wiki/articles/azure/{ID}.md`, `docs/wiki/bugs/azure/{ID}.md`) patrón `node-id=([0-9-]+)` | sección "Discussions"/"Figma"
T: obtener referencia → A: `mcp__plugin_figma_figma__get_screenshot`(fileKey,nodeId) | `get_metadata` nombres/orden | `get_variable_defs` tokens
T: convertir URL → A: `figma.com/design/:fileKey/...?node-id=:nodeId` → en nodeId `-`→`:`

## Cómo usar la señal (solo donde la HU calla)

T: LISTADO → A: ¿la HU fija nombre/orden EXACTO de columnas? sí → HU manda | no → Figma como candidato 🟡 (3624#1, 3829#2)
T: UX de control (dropdown con/sin buscador, embudo) → A: rara vez en HU → Figma candidato 🟡 (3624#2)
T: copy de mensajes de baja/confirmación → A: ¿HU da el texto? sí → HU | no → Figma candidato 🟡 (3829#9)
T: capitalización de labels → A: ¿HU lo especifica? → si no, candidato 🟡 (3829#5)

## V:

V: [HU consultada como autoridad ANTES que Figma | conflicto HU↔Figma → 🟡 escalar, !!adjudicado | mismatch Figma → máx 🟡, !!🔴/🟠 solo | HU silenciosa → candidato "confirmar", !!asumido | staleness considerado]

@: [@file:.claude/skills/audit-module/references/behavioral-probes.md, @rule:self-learning-error-prevention (LE-SS-0038)]
