---
description: Borra o corrige manualmente una memoria concreta de .claude/memory/ (obsoleta, equivocada, o que el usuario ya no quiere guardada), sin esperar a que /wrap-up la detecte sola.
argument-hint: <tema, nombre de archivo o descripcion de que memoria olvidar>
allowed-tools: Read, Write, Edit, Glob, Bash
---

Olvida o corrige la memoria relacionada con: $ARGUMENTS

Este comando existe para que el usuario tenga **control manual** sobre la memoria guardada, complementando a `/wrap-up` (que actualiza solo, en automatico). Usa la skill `memory-keeper` de este plugin para la taxonomia y el formato.

Pasos:

1. Si `.claude/memory/` no existe, informar que no hay memoria guardada y parar.
2. Leer `.claude/memory/MEMORY.md` y buscar que archivo(s) coinciden con `$ARGUMENTS` (por nombre de archivo, por `description` del frontmatter, o por tema del contenido).
3. Si no hay coincidencia clara, listar los candidatos mas parecidos y pedir al usuario que confirme cual -- **esta es la unica confirmacion que este comando debe pedir**, porque borrar memoria es una accion que conviene confirmar antes de ejecutarla.
4. Una vez confirmado el archivo:
   - Si el usuario pidio borrar del todo: eliminar el archivo de memoria y quitar su entrada de `MEMORY.md`.
   - Si el usuario pidio corregir/actualizar (no borrar): editar el archivo con la correccion, manteniendo el frontmatter y el tipo.
5. Informar en una linea que se hizo: `Memoria "<nombre>" eliminada.` o `Memoria "<nombre>" actualizada.`

No borres nada sin haber identificado primero un archivo concreto -- si `$ARGUMENTS` es demasiado ambiguo para acotar a un candidato razonable, pide que se precise en vez de borrar por aproximacion.
