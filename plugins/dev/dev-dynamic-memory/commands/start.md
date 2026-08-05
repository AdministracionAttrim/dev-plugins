---
description: Carga en silencio la memoria dinamica del proyecto (.claude/memory/) al empezar una sesion, para no perder contexto entre sesiones distintas. Solo confirma que se ha leido, no muestra el contenido.
argument-hint: (sin argumentos)
allowed-tools: Read, Glob, Write, Edit
---

Carga el contexto de la ultima sesion siguiendo las reglas de la skill `memory-keeper` de este plugin.

**Principio:** cargar contexto debe ser invisible -- leer todo, no decir casi nada.

Pasos (todos en silencio, sin narrar cada uno):

1. Si `.claude/memory/` no existe todavia, crearlo con un `MEMORY.md` vacio y comprobar que `.claude/memory/` esta en el `.gitignore` del proyecto (anadirlo si falta).
2. Leer `.claude/memory/MEMORY.md` (indice).
3. Leer todos los archivos de memoria que referencia el indice (`user_*.md`, `feedback_*.md`, `project_*.md`, `reference_*.md`).
4. Leer el snapshot de sesion mas reciente en `.claude/memory/sessions/` (el archivo `YYYY-MM-DD-HH-MM.md` con fecha mas alta), si existe alguno.
5. Responder EXACTAMENTE con: `Memoria del proyecto cargada.`

No muestres el contenido de las memorias, no lo resumas, no preguntes "en que trabajamos hoy" ni nada parecido -- eso rompe el principio de carga invisible. Si algun archivo de memoria esta corrupto o mal formado, ignoralo y sigue con los demas sin mencionarlo. Si no hay memoria previa, responde igual con el mensaje de confirmacion.
