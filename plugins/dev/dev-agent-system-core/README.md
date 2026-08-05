# dev-agent-system-core

Motor genérico de un sistema de agentes multi-rol con auto-aprendizaje para Claude Code: 7 agentes especializados (architect, dev, tester, reviewer, debugger, evolver, wiki-saver), hooks de lint automático y auto-evolución al cerrar sesión, skills genéricas de desarrollo, y un sistema de wiki/knowledge-log persistente por proyecto. Es agnóstico de stack — toda la configuración específica del proyecto vive en `.claude/agent-system.config.json`, generado por `/agent-system-core:init`.

## Qué incluye

### Agentes (`agents/`)

| Agente | Rol | Herramientas | Puede editar código |
|---|---|---|---|
| **architect** | Analista técnico y arquitecto. Planifica historias de usuario y estructura de componentes/módulos antes de escribir código. Usa la skill `spec-driven-dev`. | Read, Write, Glob, Grep | No — solo diseño y documentos de plan |
| **dev** | Desarrollador principal. Implementa componentes, servicios y lógica siguiendo las convenciones del proyecto (rules + config). Usa `typescript-best-practices`. | Read, Write, Edit, Bash, Glob, Grep | Sí |
| **tester** | Especialista en testing automatizado. Escribe specs exhaustivas, mocks y casos límite; ejecuta el runner configurado en `config.commands.test`. | Read, Write, Edit, Bash, Glob, Grep | Solo si es estrictamente necesario para testabilidad |
| **reviewer** | QA/revisor de código. Audita cambios recientes (`git diff`) buscando malas prácticas, deuda y fallos de rendimiento. Usa `refactor` y `typescript-best-practices`. | Read, Glob, Grep | No — solo análisis y feedback |
| **debugger** | Especialista en resolución de problemas. Aplica método científico (Observar → Hipotetizar → Experimentar → Concluir) para bugs complejos. Usa `debug-hypothesis`. | Read, Write, Edit, Bash, Glob, Grep | Sí |
| **evolver** | Meta-evolver. Audita una sesión multi-agente completa (flujo, malgasto de tokens, mal uso de tools/skills) y emite un informe con diffs propuestos — nunca los aplica solo. Usa `agent-evolution`. | Read, Glob, Grep, Bash, Write | No — solo propone, requiere confirmación humana |
| **wiki-saver** | Archivista técnico. Compila la conversación actual en una página wiki permanente (`docs/wiki/outputs/<slug>.md`) con frontmatter y hace commit. Se invoca con `/agent-system-core:save <slug>`. | Read, Write, Bash | Solo en la wiki, no en código fuente |

Todos los agentes leen primero `.claude/agent-system.config.json` y las reglas `alwaysOn` del proyecto antes de actuar (contexto obligatorio).

### Comandos (`commands/`)

| Comando | Qué hace |
|---|---|
| `/agent-system-core:init [--force]` | **Instalador.** Detecta el stack del proyecto, hace preguntas mínimas, genera `.claude/agent-system.config.json`, copia reglas y seeds de wiki, opcionalmente instala el preset de stack correspondiente, genera `CLAUDE.md`, propone permisos en `settings.json` y verifica que todo quedó consistente. Se ejecuta una vez por proyecto. |
| `/agent-system-core:save <slug>` | Lanza al agente `wiki-saver` con el contexto de la conversación actual para archivarla en `docs/wiki/outputs/<slug>.md` + commit. |
| `/agent-system-core:autoresearch <query>` | Investiga huecos de conocimiento en la wiki del proyecto relacionados con la query y expande las páginas correspondientes (presupuesto limitado); marca contradicciones entre fuentes con un callout. |
| `/agent-system-core:wiki-lint` | Linta la wiki del proyecto: frontmatter inválido, enlaces rotos, páginas huérfanas. Ofrece corregir tras reportar. |

### Hooks (`hooks/hooks.json`)

| Hook | Se dispara en | Qué hace |
|---|---|---|
| `start-context-load.sh` | `UserPromptSubmit` (cada prompt) | Si hay ficheros pendientes en el inbox de la wiki (`paths.inbox`), avisa en el propio prompt. Silencioso si el proyecto no está inicializado. |
| `post-edit-lint.sh` | `PostToolUse` tras `Write\|Edit\|MultiEdit` | Formatea y linta automáticamente cada fichero tocado, usando los comandos de `config.hooks.postEdit` o autodetectando `oxfmt/prettier` + `oxlint/eslint/ruff`. Las violaciones se imprimen a stdout para que Claude las corrija en el mismo turno. Nunca bloquea (`exit 0` siempre). |
| `stop-self-evolve.sh` | `Stop` (al cerrar la sesión/turno) | Analiza el transcript de la sesión buscando señales de auto-aprendizaje (ficheros editados + palabras clave de bug). Si detecta señales y no se ha auditado ya esta sesión, bloquea el cierre (`decision: block`) con una directiva de auditoría `G:EVOLVE` que obliga a revisar y, si procede, registrar un error aprendido (`LE-...`) en el knowledge-log antes de continuar. |

### Skills genéricas (`skills/`)

- **spec-driven-dev** — ciclo obligatorio Spec → Plan → Build → Test → Review → Ship con puertas de aprobación humana; se usa para cualquier feature/refactor no trivial que toque más de un fichero.
- **debug-hypothesis** — fuerza el método científico (Observar→Hipotetizar→Experimentar→Concluir) al depurar bugs no obvios, en vez de "probar cosas" a ciegas.
- **refactor** — flujo de refactor multi-fichero: mapear el radio de impacto, proponer enfoque, confirmar, implementar en lotes verificando build tras cada uno.
- **typescript-best-practices** — guía extensa de tipado, manejo de errores, patrones de arquitectura y organización de código TypeScript (incluye scripts de análisis/scaffolding y presets de `tsconfig`).
- **playwright-best-practices** — referencia muy amplia (30+ documentos) de testing E2E/componentes/API con Playwright: locators, fixtures, CI/CD, mocking, accesibilidad, flaky tests, frameworks (Angular/React/Vue/Next), etc.

Además, el plugin trae skills de soporte interno que usan los propios agentes/comandos (no pensadas para invocación manual directa, salvo la última):

- **agent-evolution** — usada por el agente `evolver` para auditar una sesión multi-agente contra un catálogo de antipatrones.
- **self-learning-error-prevention** — implementa el loop SCAN→LEARN→PROMOTE→DECAY del knowledge-log (errores aprendidos `LE-...`); se activa al empezar tareas, tras arreglar bugs, y cuando el hook `Stop` exige auditoría.
- **save** — la que ejecuta realmente `/agent-system-core:save`, lanzando al agente `wiki-saver`.
- **documentation-writer** — experto en documentación técnica siguiendo el framework Diátaxis; disponible para redactar documentación de calidad cuando se necesite.

### Templates (`templates/`)

Plantillas que `/agent-system-core:init` copia al proyecto: `_shorthand.md`, `agent-system.config.json`, `CLAUDE.md.template`, reglas (`rules/code-generation.md`, `rules/code-quality-guardrails.md`, `rules/self-learning-error-prevention.md`), seeds de wiki (`docs/wiki/index.md`, `log.md`, `knowledge-log.md`), `settings-suggested.json` (permisos propuestos), y scripts opcionales de wiki (`scripts/wiki/*` — ingest, lint, search, autoresearch, sync).

## Concepto de "preset de stack"

`dev-agent-system-core` es el **motor genérico**: agentes, hooks, comandos y skills que funcionan en cualquier proyecto, sin saber nada de un framework concreto. No incluye reglas de arquitectura de Angular, .NET o Java.

Los plugins hermanos son **presets de stack** que se instalan *encima* de este motor y aportan lo específico de una tecnología:

- `dev-agent-system-angular` — reglas de arquitectura Angular 20+/PrimeNG/Tailwind/NgRx Signal Store, feature-scaffolding, audit-module, sync-models, MCP servers (angular-cli, primeng).
- `dev-agent-system-dotnet` — reglas de capas/módulos, EF Core, JWT/Keycloak, manejo de errores; skills de scaffolding/auditoría/migraciones/pre-commit.
- `dev-agent-system-java` — arquitectura de dos paquetes (librería compartida + proyecto), seguridad Keycloak/OAuth2 multi-tenant, persistencia JPA/Specification, skills de scaffolding/auditoría/tests-gated-por-spec.

Los tres declaran explícitamente `Requiere dev-agent-system-core` en su descripción del marketplace, y todos exigen sustituir placeholders propios del proyecto antes del primer uso (ver el README de cada preset).

El punto de conexión entre ambos es la **Fase 5 de `/agent-system-core:init`**: si detecta (o el usuario confirma) que hay un preset instalado, `init` copia las `rules/` y `rules-on-demand/` de ese preset al proyecto como base editable, añade sus scripts si se desea, y las registra en `agent-system.config.json` (`rules.alwaysOn`/`rules.onDemand`) y en los placeholders `{{STACK_TOOL_PRIORITY}}`/`{{STACK_SECTION}}` del `CLAUDE.md` generado.

## Cómo instalarlo

Instala el plugin `dev-agent-system-core` desde el marketplace `attrim-marketplace` con el flujo habitual de plugins de Claude Code (marketplace ya añadido → `/plugin install dev-agent-system-core@attrim-marketplace` o equivalente desde el gestor de plugins). Si el proyecto usa Angular, .NET o Java, conviene instalar también el preset de stack correspondiente (`dev-agent-system-angular`, `dev-agent-system-dotnet` o `dev-agent-system-java`) **antes o justo después** de ejecutar `/agent-system-core:init`, para que la Fase 5 del instalador lo detecte y lo aplique automáticamente.

## Cómo usarlo

### 1. Inicializar un proyecto nuevo

```
/agent-system-core:init
```

Detecta el stack (package.json, angular.json, linters, test runner…), hace un máximo de 2 tandas de preguntas sobre lo que no pudo inferir (comandos de build/lint/test, rama base, carpetas canónicas, iniciales para IDs de errores aprendidos, y si aplicar un preset instalado), y deja el proyecto operativo: `.claude/agent-system.config.json`, `CLAUDE.md`, reglas en `.claude/rules/`, seeds de wiki en `docs/wiki/`, y una propuesta de `settings.json` (que siempre se muestra como diff antes de escribir). Nunca sobrescribe wiki/knowledge-log/agent-memory existentes sin confirmación.

### 2. Invocar a un agente concreto

Por ejemplo, pedir al **architect** que planifique una feature antes de tocar código:

> "Actúa como el agente architect y planifica cómo estructurar un módulo de facturación con listado, alta y edición, reutilizando los componentes canónicos del proyecto."

El architect lee primero `agent-system.config.json` y las reglas `alwaysOn`, propone estructura de carpetas/ficheros, modelos de datos y patrón de estado — pero no escribe código funcional (eso lo hace después el agente `dev`).

O pedir al **reviewer** que audite lo último hecho:

> "Que el agente reviewer revise los cambios del último commit contra las convenciones del proyecto y me dé feedback."

El reviewer analiza el `git diff` reciente, marca los patrones repetidos como el problema principal (no el más fácil de arreglar primero), y responde en Markdown con fichero/línea/motivo/sugerencia — sin editar nada él mismo.

### 3. Cerrar la sesión (auto-evolución y wiki)

Al terminar una sesión de trabajo donde se editaron ficheros y aparecieron señales de bug, el hook `Stop` (`stop-self-evolve.sh`) detecta esas señales en el transcript y bloquea el cierre con una directiva `G:EVOLVE AUDIT REQUIRED`: obliga a revisar si hubo un error no trivial resuelto y, si es generalizable, proponer una entrada nueva en el knowledge-log (`LE-<INICIALES>-NNN`) antes de continuar. Independientemente de eso, si la conversación produjo conocimiento valioso, se puede archivar explícitamente con:

```
/agent-system-core:save nombre-de-la-decision
```

que lanza al agente `wiki-saver`, el cual escribe `docs/wiki/outputs/nombre-de-la-decision.md` con frontmatter completo (tipo, confianza, tags, fuentes) y hace `git commit` (o avisa si el commit está denegado en `settings.json`).

## Requisitos / configuración previa

- El proyecto debe tener `.git/` (o confirmarse como raíz) para que `/agent-system-core:init` pueda funcionar con normalidad (diffs, `canonicalExamples`, etc.).
- El flujo de orquestación multi-agente (architect → dev → tester → reviewer) depende de que `settings.json` tenga `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: true` — `init` lo propone en la Fase 7, salvo que la versión de Claude Code ya soporte agent teams de forma nativa.
- Los hooks de lint/format esperan `oxfmt`/`prettier` y `oxlint`/`eslint`/`ruff` en `node_modules/.bin/` o en el PATH (autodetección); si el proyecto usa otra herramienta, hay que configurar `hooks.postEdit.format`/`lint` explícitamente en `agent-system.config.json`.
- Los hooks son scripts Bash (compatibles con Git Bash en Windows, según comentario en `stop-self-evolve.sh`) y dependen de `node` disponible en el PATH para parsear JSON.
- Sin `.claude/agent-system.config.json` (es decir, sin haber corrido `/agent-system-core:init` en ese proyecto), los tres hooks y la mayoría de agentes salen en silencio o degradan su comportamiento — el plugin no rompe proyectos no inicializados, pero tampoco aporta valor hasta que se inicializan.

## Notas relevantes

- Los agentes `architect` y `reviewer` tienen prohibido explícitamente escribir/editar código (`!!writes_functional_code` / `!!direct_code_edit`) — son puramente de planificación y auditoría; solo `dev` y `debugger` tienen `Edit`/`Bash` para modificar el proyecto.
- El agente `evolver` tiene una guardarraíl de auto-protección: nunca se analiza ni se edita a sí mismo ni a su propia skill (`agent-evolution`), y cualquier propuesta suya sobre el propio motor del plugin (agentes/hooks/skills de `dev-agent-system-core`) se marca como "PROPUESTA UPSTREAM: PR al repo del plugin", no como un diff local a aplicar.
- El hook `post-edit-lint.sh` nunca bloquea (`exit 0` siempre) — solo imprime violaciones para que se corrijan en el mismo turno, no interrumpe el flujo del agente.
- El hook `stop-self-evolve.sh` sí puede bloquear el cierre de turno (`decision: block`) cuando detecta señales de auto-aprendizaje sin auditar; se desbloquea escribiendo `.claude/state/audit-<session_id>.done` tras completar la auditoría descrita en la skill `self-learning-error-prevention`.
- Aunque la descripción del marketplace lista 5 skills "genéricas", el plugin trae 4 skills adicionales de soporte interno (`agent-evolution`, `self-learning-error-prevention`, `save`, `documentation-writer`) que sostienen el ciclo de auto-aprendizaje y los comandos — no son casuales, forman parte del mecanismo, aunque no se invocan manualmente salvo `documentation-writer`.
