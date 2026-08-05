---
description: Genera un documento de traspaso (handoff) que resume la conversacion actual para que otro agente/sesion sin contexto previo pueda continuar el trabajo. Se guarda en .claude/memory/handoffs/ con un titulo descriptivo, para pasar tareas entre miembros del equipo.
argument-hint: <en que se va a centrar la siguiente sesion (opcional)>
allowed-tools: Read, Write, Glob, Bash
---

Escribe un documento de traspaso que resuma la conversacion actual para: $ARGUMENTS

## Que es (y que no es) este comando

Este comando genera un paquete puntual y autocontenido para pasarselo a **otro agente sin memoria previa** (otra sesion, otro miembro del equipo). Es distinto de `/wrap-up`:

- `/wrap-up` guarda contexto acumulativo, tipado e indexado en `.claude/memory/` para que **tu mismo** lo retomes en una sesion futura.
- `/handoff` genera un documento suelto, de un solo uso, pensado para entregarselo a **otra persona** del equipo, para que entienda de golpe donde esta el trabajo sin leer el historial de la conversacion.

## Donde se guarda

En `.claude/memory/handoffs/`, con un nombre de archivo descriptivo (no un timestamp pelado): `YYYY-MM-DD-<slug-de-la-tarea>.md` (ej. `2026-07-20-migrar-auth-a-signals.md`). El slug sale del tema de la tarea o de `$ARGUMENTS` si se pasaron.

`.claude/memory/` esta en el `.gitignore` del proyecto (ver skill `memory-keeper`) -- **este archivo no viaja por git**. Para entregarselo a otro miembro del equipo, comparte el archivo por fuera del repo (Slack, copiar el contenido, etc.); no asumas que un `git pull` se lo trae. Si no existe todavia `.claude/memory/handoffs/`, crearlo.

## Contenido del documento

1. **Resumen del estado actual**: en que consiste la tarea, que se ha hecho, que queda pendiente.
2. **Skills sugeridas**: seccion explicita listando que skills de los plugins instalados deberia invocar el siguiente agente (usa lo que sepas del repo y del plugin `memory-keeper` si esta disponible).
3. Si existe `.claude/memory/MEMORY.md` en el proyecto, referencialo por ruta (no dupliques su contenido en el handoff -- el siguiente agente puede correr `/start` para cargarlo, si tiene acceso a esta misma copia del repo).
4. **No dupliques** contenido que ya vive en otros artefactos (specs, planes, ADRs, issues, commits, el propio diff) -- referencialos por ruta o URL en vez de copiarlos.
5. **Redacta cualquier dato sensible**: claves de API, contraseñas, tokens, datos personales identificables. Ante la duda, omite el dato y anota que fue redactado.
6. Si se han pasado argumentos, tratalos como la descripcion de en que se va a centrar la siguiente sesion y ajusta el documento a eso.

## Al terminar

Informa al usuario de la ruta completa del archivo generado (`.claude/memory/handoffs/<nombre>.md`), para que pueda compartirlo con el siguiente miembro del equipo.
