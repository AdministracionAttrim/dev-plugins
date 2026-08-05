---
description: Linta la wiki del proyecto (frontmatter, enlaces rotos, huérfanos, contradicciones)
---

Ejecuta el lint de la wiki del proyecto:

1. Lee `.claude/agent-system.config.json` → `paths.wiki` y `commands.wikiLint` (si existe).
2. Si `commands.wikiLint` está definido → Bash(ese comando). Si no, ejecuta `node scripts/wiki/lint-frontmatter.mjs --all` si el script existe en el proyecto.
3. Reporta violaciones agrupadas por tipo (frontmatter inválido, enlaces rotos, páginas huérfanas).
4. ?Pregunta si quieres que las corrija; si confirma, corrígelas.
