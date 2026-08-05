---
description: Guarda la sesión actual como página wiki persistente (<wiki>/outputs/<slug>.md) con frontmatter y commit
argument-hint: <slug>
---

Invoca la skill `save` con el slug `$ARGUMENTS`.

Si no se proporcionó slug, pregunta: "¿Cuál es el slug para esta wiki?".
Lanza el agente `wiki-saver` pasándole en el prompt: el slug, las decisiones clave, fixes, patrones y findings de esta conversación, las rutas de ficheros tocadas y los follow-ups pendientes. !!resumir en el chat en lugar de archivar.
