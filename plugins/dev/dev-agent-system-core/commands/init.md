---
description: Onboarding del agent-system en este proyecto — genera config, CLAUDE.md, reglas, wiki y estado. Ejecutar una vez por proyecto.
argument-hint: [--force para regenerar]
---

# /agent-system-core:init — Instalador del sistema de agentes

Eres el instalador del agent-system. Vas a dejar este proyecto completamente operativo con el sistema de agentes multi-rol + auto-aprendizaje. Sigue TODAS las fases en orden. Las plantillas viven en `${CLAUDE_PLUGIN_ROOT}/templates/`.

## Fase 0 — Precondiciones

1. Verifica que estás en la raíz de un proyecto (existe `.git/` o el usuario confirma la raíz).
2. Si ya existe `.claude/agent-system.config.json` y no se pasó `--force`: informa que el proyecto ya está inicializado y ofrece (a) re-sincronizar plantillas nuevas sin tocar estado, o (b) abortar. NUNCA sobrescribas `docs/wiki/`, `knowledge-log.md` ni `.claude/agent-memory/` existentes.
3. Si existe un `CLAUDE.md` previo: léelo; al final harás MERGE (su contenido específico se conserva bajo una sección "## Legacy"), no sobrescritura ciega.

## Fase 1 — Detección de stack

Inspecciona (sin preguntar todavía): `package.json` (scripts, dependencias → Angular/React/Vue/Node), `angular.json`, `pyproject.toml`/`requirements.txt`, `go.mod`, `Cargo.toml`, linters presentes (`oxlint`, `eslint`, `prettier`, `oxfmt`, `ruff`), runner de tests (vitest/jest/pytest), y la rama base (`git remote show origin` o ramas `develop`/`main`).

## Fase 2 — Preguntas al usuario (AskUserQuestion, máximo 2 tandas)

Pregunta SOLO lo que no hayas podido detectar con confianza:

1. Comandos: build / lint / format / test (propón los detectados como opción recomendada).
2. Rama base para diffs (develop/main).
3. Carpetas canónicas: 1-3 rutas de features maduras que sirvan de ejemplo a copiar (puede responder "ninguna aún").
4. Iniciales para IDs de learned errors (default: iniciales de `git config user.name`).
5. Si el plugin `agent-system-angular` (u otro preset) está instalado: ¿aplicar el preset a este proyecto? (default sí si detectaste Angular).

## Fase 3 — Scaffolding del estado del proyecto

Copia desde `${CLAUDE_PLUGIN_ROOT}/templates/project/` (respetando lo ya existente):

1. `_shorthand.md` → `.claude/_shorthand.md`
2. `rules/*.md` → `.claude/rules/` (sustituye `{{KNOWLEDGE_LOG}}` por la ruta real)
3. `docs/wiki/{index.md,log.md,knowledge-log.md}` → `<wiki>/` (sustituye `{{DATE}}` por hoy) — SOLO si no existen
4. Crea `<inbox>/` con `.gitkeep`, `.claude/state/.gitkeep`, `.claude/agent-memory/.gitkeep`
5. Opcional (pregunta): `${CLAUDE_PLUGIN_ROOT}/templates/scripts/wiki/` → `scripts/wiki/` del proyecto + sugiere los aliases npm (`wiki:ingest`, `wiki:lint`, `wiki:search`, `wiki:research`) para `package.json`.

## Fase 4 — Config

Genera `.claude/agent-system.config.json` desde la plantilla, rellenando: project.name, project.stack, project.leInitials, commands.* (los confirmados), hooks.postEdit.format/lint (comandos por-fichero con `{file}`, p.ej. `./node_modules/.bin/oxlint {file}`; déjalos vacíos para autodetección si el usuario prefiere), paths.*, rules.alwaysOn (las reglas copiadas), canonicalExamples (las carpetas de la Fase 2).

## Fase 5 — Preset de stack (si procede)

Si el usuario aceptó un preset instalado (p.ej. `agent-system-angular`), localiza su raíz (directorio del plugin) y:

1. Copia `templates/rules/*.md` → `.claude/rules/` y `templates/rules-on-demand/*.md` → `.claude/rules-on-demand/` como BASE EDITABLE del proyecto (el equipo las adapta; no son de solo lectura).
2. Copia `templates/scripts/*` → `scripts/` si el usuario quiere las utilidades (i18n check, scaffold, sync de modelos).
3. Añade sus reglas a `rules.alwaysOn` / `rules.onDemand` del config según indique el README del preset.
4. Anota el bloque `{{STACK_TOOL_PRIORITY}}` y `{{STACK_SECTION}}` que aporta el preset para la Fase 6.

## Fase 6 — CLAUDE.md

Genera `CLAUDE.md` desde `${CLAUDE_PLUGIN_ROOT}/templates/project/CLAUDE.md.template` sustituyendo TODOS los placeholders: `{{PROJECT_NAME}}`, `{{STACK_SUMMARY}}`, `{{ALWAYS_ON_RULES}}` (lista `@file:` de rules.alwaysOn), `{{ON_DEMAND_RULES}}`, `{{BASE_BRANCH}}`, `{{CMDS}}` (tabla alias→comando desde config.commands), `{{WIKI_PATH}}`, `{{INBOX_PATH}}`, `{{STACK_TOOL_PRIORITY}}` (líneas T→A de MCPs del preset, o vacío), `{{STACK_SECTION}}` (o vacío). Si había CLAUDE.md previo, conserva su contenido no duplicado bajo `## Legacy (revisar y consolidar)`.

Verifica que NO queda ningún `{{` sin sustituir.

## Fase 7 — Permisos (propuesta, nunca imposición)

1. Lee `${CLAUDE_PLUGIN_ROOT}/templates/project/settings-suggested.json`.
2. Ajusta los `allow` de npm/npx a los comandos reales del config.
3. Incluye `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: true` (requerido por la orquestación multi-agente; omítelo si la versión de Claude Code del usuario ya soporta agent teams de serie).
4. Muestra al usuario el diff contra su `.claude/settings.json` actual (o el fichero completo si no existe) y pide confirmación explícita antes de escribir. Respeta cualquier deny existente.
5. Recuerda al usuario que los hooks los aporta el plugin: NO deben duplicarse en settings.json.

## Fase 8 — Verificación y cierre

1. Checklist: config JSON válido (parséalo), CLAUDE.md sin placeholders, reglas referenciadas existen en disco, wiki seeds creadas, `.claude/state/` existe.
2. Prueba el hook de lint: edita y revierte un fichero trivial o simplemente ejecuta el comando lint configurado sobre un fichero para confirmar que funciona.
3. Sugiere commit: `git add .claude/ CLAUDE.md docs/ scripts/ && git commit -m "chore: init agent-system"` (el usuario lo ejecuta si git add/commit están denegados).
4. Resume en ≤10 líneas: qué se creó, qué comandos usará el sistema, y los próximos pasos (probar `/agent-system-core:save`, lanzar un flujo architect→dev→tester, leer el README del marketplace).

## Guardarraíles

- !!sobrescribir estado existente (wiki, knowledge-log, agent-memory) sin confirmación explícita.
- !!escribir settings.json sin mostrar el diff y recibir confirmación.
- !!dejar placeholders `{{...}}` en ningún fichero generado.
- Todo fichero generado usa el shorthand de `.claude/_shorthand.md` cuando aplica.
