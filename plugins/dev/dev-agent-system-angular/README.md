# agent-system-angular — Preset Angular 20+ / PrimeNG / Tailwind / NgRx Signal Store

Preset de stack para `agent-system-core`. No hace nada por sí solo: `/agent-system-core:init` detecta este plugin y copia su contenido al proyecto como base editable.

## Qué aporta

| Contenido | Destino en el proyecto | Rol |
|---|---|---|
| `templates/rules/*.md` | `.claude/rules/` | Reglas always-on: arquitectura core, code-generation Angular, UI components |
| `templates/rules-on-demand/*.md` | `.claude/rules-on-demand/` | Reglas bajo demanda: forms, i18n, stores, permisos |
| `templates/scripts/*` | `scripts/` | check-i18n, scaffold-feature, sync de modelos vs swagger |
| `templates/workflows/*` | `.claude/workflows/` | Motores dinámicos de audit-module y feature-scaffolding |
| `skills/` | (viven en el plugin) | feature-scaffolding, audit-module, sync-models, hu-refinement, wiki-optimizer |
| `.mcp.json` | (vive en el plugin) | MCP servers angular-cli y primeng |

## Cómo usarlo

Una vez instalado (via `/agent-system-core:init`), las skills se invocan como slash commands normales. Ejemplos reales:

- **`/feature-scaffolding HU-3055`** — genera una feature CRUD completa (data-access + rutas + constants + list + form + i18n) a partir de una user story de Azure DevOps. Con `--verify` (`/feature-scaffolding HU-3055 --verify`) añade una fase de validación paralela (spec + código + tests + arquitectura) antes de implementar L6/L7.
- **`/audit-module companies`** — auditoría completa de un módulo ya implementado: compliance contra las HUs asociadas (via `component-feature-mapping.json`), behavioral probes, cross-check con Figma, pattern compliance y generación de E2E spec. `/audit-module companies --workflow` lanza la variante fan-out con ~30 agentes en paralelo (probes P1–P6 + smoke-browser + síntesis). Sin argumentos (`/audit-module` o "revisa cambios") hace code review del diff actual (`git diff <base>..HEAD`).
- **`/sync-models`** — compara los modelos TypeScript del frontend (`*.model.ts`, enums, tipos Search/Filter) contra los DTOs Java del repo de commons configurado en `<BACKEND_REPO_PATH>`, usando `npm run check` como punto de partida; propone una tabla de cambios y espera confirmación antes de editar nada.
- **`/hu-refinement HU-3055 HU-3153`** — refinamiento de sprint: lee las HUs de la wiki, inspecciona el módulo existente y devuelve una tabla de estimación por tasks (máx. 5 por HU) para planificación.
- **MCP servers**: no se invocan directamente, los usan las skills anteriores. `mcp__angular-cli__search_documentation` / `find_examples` para consultar docs/API de Angular; `mcp__primeng__get_component` / `get_component_props` / `list_examples` / `get_example` para info y ejemplos de componentes PrimeNG. Ver bloque `{{STACK_TOOL_PRIORITY}}` más abajo para la política exacta de cuándo usarlas.

## Configuración que el init debe aplicar

`rules.alwaysOn`: angular-core-architecture, code-generation, code-quality-guardrails, project-ui-components, self-learning-error-prevention.
`rules.onDemand`: angular-form-responsibility-separation, i18n-structure, ngrx-entity-store, permissions.

`hooks.postEdit` recomendado: `"format": "./node_modules/.bin/oxfmt {file}"`, `"lint": "./node_modules/.bin/oxlint {file}"`, include `\.(ts|html)$`, exclude `\.(spec|mock)\.`.

### Bloque {{STACK_TOOL_PRIORITY}} para CLAUDE.md

```
T: Angular docs/API/examples needed → A: mcp__angular-cli__search_documentation | mcp__angular-cli__find_examples | !Read local files
T: PrimeNG component info needed → A: mcp__primeng__get_component | mcp__primeng__get_component_props | mcp__primeng__generate_component_template | !Read local files
T: PrimeNG section/example needed → A: mcp__primeng__list_examples(component) first → then mcp__primeng__get_example(component, section, variant)
```

### Bloque {{STACK_SECTION}} para CLAUDE.md

```
## Stack: Angular (preset agent-system-angular)

Skills de stack: feature-scaffolding (nueva feature CRUD desde spec JSON) | audit-module (auditoría HU + probes + Figma) | sync-models (modelos TS vs swagger) | hu-refinement (refinamiento de historias de usuario) | wiki-optimizer (mejora continua de la dev-guide de la wiki — contiene supuestos del proyecto original, revisar antes de reutilizar).
T: /review / "revisa cambios" / "review branch" → A: @skill:audit-module | Bash(git diff <base>..HEAD --name-only) first | !subagent
```

## Configuración antes del primer uso (backend commons)

`sync-models` y el paso 7.5 (backend-crosscheck) de `audit-module` asumen un repo Java de "commons" hermano al frontend, como fuente de verdad de los DTOs. Estas rutas están **parametrizadas** con el placeholder `<BACKEND_REPO_PATH>` — la primera vez que uses cualquiera de estos dos skills en un proyecto nuevo:

1. Clona (o localiza) el repo de commons del proyecto junto al frontend.
2. Anota su ruta real en `.claude/agent-system.config.json` (o dile a Claude la ruta la primera vez que invoques `/sync-models`; puede guardarla en `canonicalExamples` para no repetirla).
3. Del mismo modo, `backendBaseUrl` en las specs de `feature-scaffolding` usa `${environment.apiGw.<API_GW_KEY>.url}` como plantilla — sustituye `<API_GW_KEY>` por la clave real de `environment.apiGw.*` de tu proyecto (revisa `src/environments/environments.ts`).

Si tu proyecto no tiene un repo de commons Java separado, `sync-models` y el paso 7.5 de `audit-module` no aplican: puedes ignorarlos o quitar la regla `self-learning-error-prevention` asociada.

## Notas

- `project-ui-components.md` y varios LE del proyecto original referencian componentes `@shared/ui` propios (`app-custom-table`, `app-input-text`…). Son la base de partida: **cada proyecto debe adaptarlos** a su design system tras el init.
- `.mcp.json` usa los paquetes oficiales: `@angular/cli mcp` y `@primeng/mcp` (PrimeFaces). Nota: el MCP de PrimeNG expone muchas tools; si tu cliente avisa de límite de tools, desactiva las que no uses.
- Las reglas copiadas son del proyecto: evolucionan con él vía el loop G:EVOLVE. Las mejoras generalizables se suben como PR a este preset.
