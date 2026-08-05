---
description: Investiga huecos de conocimiento de la wiki y los expande (presupuesto limitado)
argument-hint: <query>
---

Ejecuta autoresearch sobre la wiki del proyecto para: $ARGUMENTS

1. Lee `.claude/agent-system.config.json` → `commands.wikiResearch` (si existe) y ejecútalo con `--budget 3` por defecto. Si no existe, ejecuta `node scripts/wiki/autoresearch.ts` vía tsx si el proyecto lo incluye; si tampoco, investiga manualmente: lee el index de la wiki, detecta huecos relacionados con la query y expande las páginas.
2. Comprueba contradicciones entre fuentes: cuando dos fuentes discrepan sobre la misma afirmación, emite un callout `> [!contradiction]` en la página.
3. Actualiza `<wiki>/index.md` y `<wiki>/log.md`.
