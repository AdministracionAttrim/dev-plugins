---
description: Muestra al usuario que hay guardado en la memoria dinamica del proyecto (.claude/memory/): indice, memorias por tipo, snapshots de sesion y handoffs. Contrapunto transparente al silencio de /start.
argument-hint: (sin argumentos)
allowed-tools: Read, Glob
---

Muestra el estado actual de la memoria dinamica del proyecto, siguiendo la ubicacion y taxonomia de la skill `memory-keeper` de este plugin.

A diferencia de `/start` (que carga en silencio), este comando es para que el usuario **vea** que hay guardado, sin tener que abrir archivos a mano.

Pasos:

1. Si `.claude/memory/` no existe, responder que todavia no hay memoria guardada en este proyecto y parar ahi.
2. Leer `.claude/memory/MEMORY.md`.
3. Listar los archivos de memoria existentes agrupados por tipo (`user`/`feedback`/`project`/`reference`), con su descripcion (del frontmatter) -- no el contenido completo de cada uno, solo el resumen que ya da `MEMORY.md`.
4. Contar los snapshots en `.claude/memory/sessions/` e indicar el mas reciente (fecha) y cuantos quedan hasta el limite de 5.
5. Listar los archivos en `.claude/memory/handoffs/`, si hay alguno, con su nombre.

Formato de salida (conciso, sin preguntas al final):

```markdown
## Memoria del proyecto

**Usuario** (N)
- <titulo> — <descripcion corta>

**Feedback** (N)
- ...

**Proyecto** (N)
- ...

**Referencias** (N)
- ...

**Snapshots de sesion:** N/5 — mas reciente: <fecha>
**Handoffs pendientes:** <lista de nombres, o "ninguno">
```

Si alguna categoria esta vacia, omitela en vez de mostrarla con "(0)". Si el usuario quiere ver el contenido completo de una memoria concreta, indicale la ruta del archivo para que la abra o pidasela explicitamente -- no vuelques contenido completo por defecto.
