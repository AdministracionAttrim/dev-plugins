---
name: claude-config-audit
description: Checklist y rúbrica para auditar la configuración de Claude Code (seguridad, estructura, ajuste al stack), usado por el agente claude-config-auditor. Consultar antes de analizar cualquier CLAUDE.md/.claude/ de un proyecto o de la máquina local.
---

# Claude Config Audit — checklist y rúbrica

Este skill es la referencia que usa el agente `claude-config-auditor` (comando `/claude-analisis`). No modifica nada — es checklist puro.

## Rúbrica de la nota final

`Nota = 0.4 × Seguridad + 0.3 × Estructura + 0.3 × Ajuste al stack`, cada una 0-10.

Regla de no-promediado mecánico: **un hallazgo `[ERROR]` de seguridad grave (secreto real expuesto, permiso que permite exfiltración) hunde la dimensión de Seguridad a ≤3** aunque el resto del checklist de esa dimensión esté perfecto. La nota es para reflejar riesgo real, no para premiar que "9 de 10 cosas están bien" cuando la que falla es crítica.

## Checklist de Seguridad (40%)

| Qué buscar | Dónde |
|---|---|
| Secretos/credenciales hardcodeadas (API keys, PATs, contraseñas, claves privadas, tokens tipo `sk-`/`pk_live`/JWT) | `settings.json`, `settings.local.json`, `.mcp.json`, `hooks/*`, `CLAUDE.md`, cualquier skill/agent/command |
| `permissions.allow` que conceda leer/escribir `.env*`, `credentials*`, `id_rsa`, `secrets/*` | `settings.json` / `settings.local.json` |
| `permissions.allow` con `curl`/`wget`/`ssh`/`scp` sin restricción (riesgo de exfiltración de datos) | `settings.json` |
| Ausencia de `permissions.deny` razonable: `rm -rf`, `git push --force`, `git reset --hard`, `sudo`, `chmod`/`chown` sin acotar | `settings.json` |
| `git commit`/`git push`/`git add` en `allow` sin que el propio CLAUDE.md documente que el usuario lo pidió explícitamente así | `settings.json` |
| Hooks que llamen a endpoints externos no evidentes, o que salten verificaciones (`--no-verify`, `--no-gpg-sign`, `-c commit.gpgsign=false`) | `hooks/*.sh`, `hooks/*.mjs`, `hooks/*.py` |
| `.gitignore` cubre `.claude/settings.local.json` y `.env*` | raíz del proyecto (solo alcance "proyecto") |
| MCP servers con token en claro en vez de `${VAR}`/referencia a entorno | `.mcp.json` |

**Guardarraíl**: si se detecta algo que parece un secreto real, el informe NUNCA reproduce el valor — solo `fichero:línea — tipo de secreto (redactado)` + recomendación de rotar y mover a variable de entorno.

## Checklist de Estructura (30%)

- `CLAUDE.md` sin placeholders sin resolver (`{{...}}`), ni bloat evidente (si es enorme y desorganizado, hallazgo).
- `.claude/settings.local.json` existe cuando hace falta y está en `.gitignore` (proyecto).
- Sin referencias rotas (`@rule:`, `@skill:`, `@file:` a ficheros inexistentes).
- `SKILL.md` con frontmatter `name`+`description` claros (qué hace y cuándo se activa).
- Sin duplicidad evidente entre skills/reglas que cubren lo mismo de forma divergente.
- Sin rutas de máquina personal (`C:\Users\...`, `/home/...`) ni nombres de cliente hardcodeados en ficheros que se compartan/commiteen.

## Checklist de Ajuste al stack (30%)

- Stack detectado (Angular/React/Vue/Node, .NET, Java/Spring, Python, Go, Rust...) tiene comandos/agentes/skills relevantes en `.claude/`.
- Huecos evidentes: stack detectado sin ningún guardarraíl de calidad, sin skills del propio lenguaje/framework.
- Plugins del marketplace Attrim que cubrirían exactamente ese hueco (ver `references/marketplace-catalog.md`) — sugerir solo los que encajen, no listar el catálogo entero.
- Para alcance "local": no hay "stack" que ajustar — evaluar en su lugar si la config global fuerza convenciones de un proyecto concreto sobre todos los proyectos (mal, la config global debe ser agnóstica).

## @refs

@file:references/marketplace-catalog.md
