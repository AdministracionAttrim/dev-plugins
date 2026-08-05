---
name: sync-models
description: >
  Sincroniza los modelos del frontend (*.model.ts, enums, tipos Search/Filter) contra el repositorio Java
  backend de commons del proyecto (fuente de verdad, ruta configurable — ver "Configuración de proyecto" más
  abajo). Usa `npm run check` como punto de partida, valida campo a campo contra los DTOs Java y propone
  correcciones antes de editar. Avisa y aborta si el repo commons no está clonado o si la ruta no está
  configurada. Invocar con: /sync-models (procesa todas las diferencias).
---

i: backend Java == fuente de verdad | `npm run check` == solo pista (no fiable 100%) | propose-before-edit | !!commit auto

FP: `/sync-models` | "sincroniza modelos" | "arregla modelos" | "compara con commons" | "modelos contra backend"

## Configuración de proyecto (primer uso)

Este skill asume un repo Java de "commons" hermano al frontend como fuente de verdad de los DTOs. **Antes del primer uso**, sustituye `<BACKEND_REPO_PATH>` por la ruta real en tu máquina (p.ej. `../mi-proyecto-commons/src/main/java/com/miempresa/miproyecto/commons`) — anótala en `.claude/agent-system.config.json` (`canonicalExamples` o una entrada propia) para no repetirla en cada sesión. Si tu proyecto no tiene un repo de commons separado, este skill no aplica: sáltalo y borra `.claude/rules/` o `rules-on-demand/` que lo referencien.

## Rutas

BACKEND: `<BACKEND_REPO_PATH>` (ver "Configuración de proyecto")
- DTO: `dto/<Entity>Dto.java` | Search: `dto/export/<Entity>SearchDto.java` | Filter: `dto/filter/<Entity>Filter.java` | Enums: `enums/<Name>Enum.java`
FRONTEND: `src/app/**/*.model.ts` + `src/app/shared/models/` | Enums FE: `src/app/shared/constants/domains-values.constants.ts`
BASELINE: `npm run check` → `tsx scripts/check-models-from-swagger.ts`

## T→A

T: invoked →

1. **precheck commons** → `Bash(ls <BACKEND_REPO_PATH>)`
   - `!!existe` → A: avisar `❌ Falta el repo commons en <BACKEND_REPO_PATH>. Clónalo junto al frontend o corrige la ruta configurada` → **ABORTAR** (G:001)
2. **pull develop** → `Bash(git -C <BACKEND_REPO_PATH> checkout develop && git -C <BACKEND_REPO_PATH> pull)`
   - pull falla (cambios locales/conflicto) → avisar + preguntar antes de seguir | !!forzar
3. **baseline** → `Bash(npm run check)` → parsear bloques `📌 <Dto> (<file>.model.ts)` → recoger `❌ Faltan` / `⚠️ Sobran` / `🔄`(type mismatch) / `🔢`(enum diffs). Tratar como HINT (G:002)
4. **comparar contra backend (preferencia backend)** — por cada modelo señalado:
   - localizar Java: `Glob`/`Grep` por nombre normalizado (quitar `Dto`; `<X>Search`→`<X>SearchDto`)
   - localizar tipo FE en su `*.model.ts` (variantes `<X>`, `<X>Search`; `*Form` derivadas → !!tocar salvo arrastre de campo base, G:006)
   - **campos**: Java ausente en FE → añadir | FE ausente en Java → eliminar SOLO si confirmado contra Java (el check Swagger miente)
   - **tipos** Java→TS: `UUID`→`string` | `LocalDate/LocalDateTime`→`Date` | `BigDecimal/Integer/Long/Double`→`number` | `Boolean`→`boolean` | `List<X>`→`X[]` | `<X>Dto`→`X` | `<X>SearchDto`→`XSearch` | enum Java→unión/constante FE
   - **opcionalidad/validators**: respetar `@Size`/`@Min`/`@Max`/`@NotNull` → !!eliminar validator sin cruzar anotación backend (G:005, LE-SS-0084)
   - **BaseEntity** (`{ id: string; creationDate: Date; deletionDate: Date | null }` en `@shared/models/common/base-entity.model`): T: el DTO trae `id`+`creationDate`+`deletionDate` (los 3) → A: tipar `Type = BaseEntity & { ...resto }` | !!declarar los 3 campos sueltos (G:013). T: faltan 1-2 de ellos en un modelo que ya es `BaseEntity & {}` → ya cubiertos por la intersección, no añadir
   - **enums**: `enums/<Name>Enum.java` vs constante en `domains-values.constants.ts` → añadir/quitar valores. T: nuevo `code` en DOMAIN_VALUES → A: añadir su clave i18n en `public/i18n/global/es.json` Y `en.json` (G:008, LE-SS-0036) | reusar clave existente si la hay
   - **DTO ausente en commons** (vive en backend de aplicación, no en la librería) → A: flag "no verificable", **!!tocar** (G:009)
   - **"sobran" (campo en FE no en el DTO swagger)**: casi siempre falso positivo (merge multi-DTO full/Search/Custom o patrón FE). A: cruzar contra TODA la familia de DTOs backend (full+Search+Custom+Filter) + `Grep` uso en `src/app` → borrar SOLO si ausente en toda la familia Y sin usos (G:010)
5. **proponer + confirmar** → emitir tabla por modelo (añadir / eliminar / retipar campos; enums a ajustar) → **esperar OK del usuario** antes de cualquier Edit (G:003)
6. **aplicar** (tras OK) → editar `*.model.ts` / enums / Search-Filter | ≥5 archivos cambio idéntico → script `sed` (regla bulk-edits CLAUDE.md) | !!Edit loops manuales
7. **verificar** → `Bash(npm run build)` (gate obligatorio; `tsc --noEmit` insuficiente para templates) → fix errores (campos requeridos nuevos rompen mocks/builders → completarlos) → re-`npm run check` confirmar menos incidencias → **!!commit** (G:004)
   - !!perseguir 0 incidencias: `check` compara contra **swagger** (`api-dtos`), no commons → categorías "sobran" falsos positivos + DTOs no-en-commons persisten siempre. Reportar restantes como intencionales, no como fallo (G:011)

## G:[IDs]

G:001 !!continuar si repo commons no existe → avisar ruta de clonado + ABORTAR
G:002 !!fiarse ciegamente de `npm run check` → backend Java es fuente de verdad; el check es solo punto de partida
G:003 !!editar antes de confirmar → siempre proponer tabla y esperar OK del usuario
G:004 !!commit automático → dejar árbol modificado para `git diff`
G:005 !!eliminar campo/validator sin cruzar anotación backend (`@Size`/`@Min`/`@Max`/`@NotNull`) — LE-SS-0084
G:006 !!tocar tipos `*Form` salvo arrastre de un campo del modelo base
G:007 !!declarar done sin pasar `npm run build`
G:008 !!nuevo `code` en DOMAIN_VALUES sin su clave i18n en es.json+en.json (LE-SS-0036) → etiqueta vacía en runtime (no la cazan build/lint/check)
G:009 !!editar DTO ausente en commons → flag, vive en backend de aplicación
G:010 !!borrar campo "sobran" sin cruzar familia completa de DTOs backend + uso en FE (casi siempre falso positivo del check)
G:011 !!perseguir 0 incidencias en re-check → compara swagger, no commons; D/E persisten por diseño
G:012 dominio compartido FE (ej `PAYMENT_METHOD`) que mezcla 2 enums backend con sets distintos → !!añadir valores de uno al compartido (los expone donde no aplican); requiere dominio separado + seeding backend → deferir + reportar gap runtime
G:013 !!declarar `id`+`creationDate`+`deletionDate` sueltos cuando el DTO los trae los 3 → usar `BaseEntity & {}` (consistente con `check` BASE_ENTITY_PROPS y @rule:angular-core-architecture)

## V: (self-check antes de aplicar)

V: [
repo commons verificado + pull develop hecho | baseline `npm run check` parseado
| cada diff validado contra Java (no solo contra el check) | tabla de propuesta emitida + OK recibido
| mapeo de tipos Java→TS aplicado | validators preservados según anotaciones backend
| build pasa | re-check con menos incidencias | sin commit
]

## @refs

@file:scripts/check-models-from-swagger.ts (baseline parser)
@rule:angular-core-architecture (DTO Search/full split, contrato de modelos)
@rule:self-learning-error-prevention (LE-SS-0084 validator vs anotación backend)
@file:src/app/shared/constants/domains-values.constants.ts (enums frontend)
