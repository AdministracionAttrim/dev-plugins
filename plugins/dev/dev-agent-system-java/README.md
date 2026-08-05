# agent-system-java — Preset Java / Spring Boot

Preset de stack para `dev-agent-system-core`. No hace nada por sí solo: `/agent-system-core:init` detecta este plugin y copia su contenido al proyecto como base editable.

## Qué aporta

| Contenido | Destino en el proyecto | Rol |
|---|---|---|
| `templates/rules/*.md` | `.claude/rules/` | Reglas always-on: arquitectura de dos paquetes, manejo de errores, validación, seguridad, persistencia JPA, naming/estilo, guardarraíles de calidad |
| `templates/rules-on-demand/*.md` | `.claude/rules-on-demand/` | Reglas bajo demanda: filter-and-export-specification, entity-audit, exceptions-i18n, legacy-static-analysis-catalog, test-data-index, default-filters-frontend-responsibility |
| `templates/project/knowledge-log-seed.md` | copiar manualmente a `docs/wiki/knowledge-log.md` (o ingerir vía wiki) | 4 errores aprendidos semilla, ya generalizados |
| `templates/scripts/azure/*.mjs` | `scripts/azure/` (opcional) | Sincronización de HUs de Azure Boards a wiki local + publicación de comentarios técnicos, ambos con variables de entorno obligatorias, sin fallback hardcodeado |
| `skills/` | (viven en el plugin) | crud-scaffolding, module-audit-and-review, exception-and-i18n-authoring, filter-and-search-scaffolding, spec-gated-test-authoring |

No hay `.mcp.json` — no se identificó ningún MCP server maduro específico de Java/Spring Boot en el material de origen (ver "Propuestas no implementadas").

## Cómo usarlo

Las skills de este preset se activan solas cuando la petición coincide con su `description` (no son comandos slash) — igual que cualquier skill de Claude Code. También puedes forzar una en concreto pidiéndola por nombre. Ejemplos reales, tras hacer `/agent-system-core:init` con este preset:

- **Escafoldar el CRUD de una entidad:** "Genera el CRUD completo de `Invoice`, con búsqueda paginada y export" activa `crud-scaffolding`. El skill decide qué capas hacen falta (service+impl, controller, repositorio, DTOs de filtro/proyección/completo, mapper, claves i18n), fija `tenantId` y fechas de sistema desde el contexto de seguridad (nunca desde el DTO entrante) y delega la construcción de filtros en `filter-and-search-scaffolding` para que `search` y `export` reutilicen exactamente la misma `Specification`.
- **Añadir filtros/paginación o export a una entidad ya existente:** "Añade búsqueda con filtros por fecha, estado y cliente a `Order`, y su export a CSV" activa `filter-and-search-scaffolding` directamente (sin pasar por el CRUD completo). Genera el DTO de filtro (campos `String` con prefijo de operador), el DTO de proyección compartido con export, la `Specification` con un método por campo, y la condición de seguridad tenant + filtro por usuario.
- **Lanzar o registrar un error de negocio:** "Si el cliente ya tiene una factura pendiente, lanza un 409" activa `exception-and-i18n-authoring`: elige (o crea) el tipo de excepción por status HTTP, añade la constante al catálogo centralizado (`ErrorResource`), lanza con el factory estándar `XxxException.generic(...)` y añade la clave de mensaje en TODOS los ficheros de idioma en la misma pasada — nunca interpola el id en el texto.
- **Auditar un módulo antes de darlo por cerrado:** "Audita el módulo de facturación contra la HU-1234" activa `module-audit-and-review` (flujo a: auditoría completa) — cruza cada criterio de la especificación con el código real, detecta métodos muertos y construye una matriz de cobertura de test. Pedir "revisa el diff de esta rama antes de fusionar" (sin identificador de HU) activa el flujo b: agrupa hallazgos por categoría y **espera confirmación explícita** antes de aplicar ninguna corrección.
- **Escribir o revisar tests con la especificación como fuente de verdad:** "Escribe los tests de `update` para `Order`, HU-1234" activa `spec-gated-test-authoring`. Si no encuentra la especificación funcional de esa operación concreta, el skill **para** y pide el identificador de la historia en vez de inventar criterios; si el test ya existe, reporta discrepancias contra spec/código/cambios posteriores en lugar de corregirlas en silencio.

## Configuración antes del primer uso (obligatorio)

Este preset viene de un proyecto Java/Spring Boot real, con lo específico de ese proyecto **ya parametrizado por quien lo aportó** con los siguientes placeholders. Sustitúyelos por los valores reales de tu proyecto en cuanto instales el preset (recomendado: anotarlos en `.claude/agent-system.config.json`, sección `canonicalExamples` o una entrada propia):

| Placeholder | Qué es | Dónde aparece |
|---|---|---|
| `<COMMONS_PACKAGE_ROOT>` | Raíz de paquete de la librería compartida (ej. `com.miempresa.miproyecto.commons`) | `java-package-architecture.md` |
| `<COMMONS_REPO_PATH>` | Ruta local del repo hermano editable de la librería compartida | `java-package-architecture.md` |
| `<PROJECT_PACKAGE_ROOT>` | Raíz de paquete del proyecto local (ej. `com.miempresa.miproyecto`) | `java-package-architecture.md` |

Si tu proyecto **no** separa código en librería compartida + proyecto local (arquitectura mono-paquete), la regla de colocación de `java-package-architecture.md` no aplica tal cual — simplifícala a una única jerarquía de paquetes.

### Scripts de Azure DevOps (opcionales)

`templates/scripts/azure/sync-hu.mjs` y `add-work-item-comment.mjs` asumen que el proyecto rastrea trabajo en Azure Boards. Antes de usarlos, exporta (o añade a `.env.local`):

```
AZURE_ORG=<tu organización de Azure DevOps>
AZURE_PROJECT=<tu proyecto de Azure Boards>
AZURE_PAT=<tu Personal Access Token>
```

Ambos scripts fallan explícitamente con instrucciones si falta alguna. Si tu equipo no usa Azure DevOps, ignora esta carpeta — no aplica.

**Nota de seguridad**: la versión original de estos scripts (en el material de origen) tenía un Personal Access Token real hardcodeado como fallback en el propio código fuente. Ya fue revocado y los scripts de este plugin se reescribieron para exigir las tres variables de entorno sin ningún valor por defecto — no reintroduzcas ese patrón si modificas estos scripts.

## Configuración que el init debe aplicar

`rules.alwaysOn`: java-package-architecture, java-error-handling, java-validation, java-security, java-persistence, java-naming-style, code-quality-guardrails.
`rules.onDemand`: filter-and-export-specification, entity-audit, exceptions-i18n, legacy-static-analysis-catalog (solo auditoría), test-data-index, default-filters-frontend-responsibility.

Comandos de proyecto observados en el origen (confirmar contra el proyecto real, Maven):
- Build: `./mvnw clean compile` · Test: `./mvnw test` (un método: `./mvnw test -Dtest=Clase#metodo`) · Empaquetar: `./mvnw clean package` · Migraciones: `./mvnw flyway:migrate` / `./mvnw flyway:info` · Cobertura: `./mvnw clean org.jacoco:jacoco-maven-plugin:report` · Análisis estático: `./mvnw sonar:sonar`.
- **No hay formatter automático dedicado** en el proyecto de referencia — las reglas de análisis estático se verifican al generar código (ver `code-quality-guardrails.md`), no vía un comando de formateo. No asumas uno que no exista.
- **Gotcha de build a documentar en el proyecto real**: si depende de una librería hermana editable en modo SNAPSHOT, compilar siempre en modo offline (`-o`) tras reinstalarla localmente — un build online puede pisar el SNAPSHOT local con una versión remota más vieja y producir cientos de errores de compilación falsos (ver `java-package-architecture.md`).

## Errores aprendidos semilla

`templates/project/knowledge-log-seed.md` trae 4 casos reales ya generalizados (Hibernate/asociación id-only en auditoría, Maven SNAPSHOT + build offline, JPA Specification con JOIN cartesiano, encoding legacy en i18n) para sembrar el knowledge-log del proyecto vía el skill `self-learning-error-prevention` de `dev-agent-system-core`. Son punto de partida, no entradas definitivas.

## Propuestas no implementadas

El material de origen incluía además un **pipeline de wiki local** (varios scripts encadenados: cola de tareas de documentación, análisis de impacto de HU, detección de drift wiki/código, auditoría de salud de la wiki) y scripts de verificación HU/feature dedicados. **No se incluyeron en este preset**: se solapan conceptualmente con el sistema de wiki que ya aporta `dev-agent-system-core` (hooks + skills genéricas), y traerlos tal cual crearía dos sistemas de wiki paralelos y potencialmente contradictorios dentro del mismo proyecto. Si tu equipo quiere ese nivel de automatización de wiki, evalúalo como una posible mejora futura de `dev-agent-system-core` en sí, no como parte de este preset de stack.

MCP servers: ninguno identificado como maduro para Java/Spring Boot en el momento de curar este preset (Maven Central, Spring, o un gateway interno serían candidatos si aparece uno oficial).

## Notas

- Las reglas y skills copiados son de un proyecto real: **cada proyecto debe adaptarlos** a su realidad tras el init (nombres de paquete, si hay librería compartida o no, tracker de trabajo usado, etc.).
- Varios guardarraíles de este preset (snapshot de auditoría con asociación id-only, SNAPSHOT de Maven pisado por build online, JOIN cartesiano en filtro de seguridad, encoding legacy corrompido) provienen de bugs reales detectados — no son teoría.
- `spec-gated-test-authoring` es el skill más distintivo: el código nunca es la fuente de verdad para un test, solo la especificación funcional lo es. Si tu equipo no mantiene especificaciones funcionales sincronizadas en algún sitio consultable, este skill parará constantemente pidiendo el identificador de HU — evalúa si encaja con tu forma de trabajar antes de activarlo tal cual.
- Las mejoras generalizables se suben como PR a este preset.
