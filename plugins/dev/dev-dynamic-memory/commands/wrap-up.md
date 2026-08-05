---
description: Punto de guardado manual de fin de sesion. Analiza el trabajo hecho, actualiza automaticamente la memoria dinamica del proyecto (.claude/memory/) y guarda un snapshot de sesion, sin pedir confirmacion. Usa la skill memory-keeper para el formato.
argument-hint: (sin argumentos; opcionalmente una nota breve de cierre)
allowed-tools: Read, Write, Edit, Glob, Bash
---

Consolida la sesion actual siguiendo las reglas de la skill `memory-keeper` de este plugin: $ARGUMENTS

**Principio:** consolidacion autonoma -- analizar, decidir, ejecutar, informar del resultado. Nada de preguntas de confirmacion a mitad del proceso.

## Fase 1 -- Analisis (silencioso)

1. Ejecutar `git diff --stat` y `git diff` para ver los cambios desde que empezo la sesion.
2. Identificar: features/modulos nuevos, decisiones de arquitectura, patrones usados, feedback o correcciones recibidas del usuario durante la sesion.

## Fase 2 -- Actualizar memoria (automatico)

3. Si `.claude/memory/` no existe, crearlo (con `MEMORY.md` vacio) y anadir `.claude/memory/` al `.gitignore` del proyecto si no esta ya.
4. Leer `.claude/memory/MEMORY.md` y las memorias que referencia.
5. Segun la taxonomia de `memory-keeper` (tipos `user`/`feedback`/`project`/`reference`):
   - Actualizar los `project_*.md` relevantes con el estado actual (rama, trabajo en curso, decisiones, fechas).
   - Crear o actualizar `feedback_*.md` si el usuario corrigio o confirmo un enfoque durante la sesion.
   - Actualizar `user_*.md` si se aprendio algo nuevo sobre el usuario relevante para este proyecto.
   - Crear `reference_*.md` si se menciono donde vive informacion externa (tickets, canal, dashboard).
   - Borrar contenido obsoleto de memorias existentes (ramas ya cerradas, plazos pasados, trabajo ya terminado).
6. Actualizar `MEMORY.md` si se creo algun archivo de memoria nuevo.

No dupliques memorias: si ya existe una del mismo tipo sobre el mismo tema, actualizala en vez de crear otra.

## Fase 3 -- Snapshot de sesion (automatico)

7. Contar los archivos `.claude/memory/sessions/*.md` existentes.
8. Si hay 5 o mas, borrar el mas antiguo (menor fecha en el nombre de archivo).
9. Crear `.claude/memory/sessions/YYYY-MM-DD-HH-MM.md` con:

```markdown
---
date: YYYY-MM-DD
branch: <rama-actual>
type: <feature|bugfix|refactor|arquitectura>
status: <en-curso|completado|bloqueado>
---

# Sesion: <titulo breve>

## Contexto
[Estado de la rama, que motivo este trabajo]

## Trabajo realizado
[Lista de lo hecho]

## Decisiones de arquitectura
[Decisiones clave tomadas, si las hubo]

## Archivos modificados
[Principales archivos cambiados]

## Siguientes pasos
[Que queda pendiente]
```

## Fase 4 -- Informe (conciso)

10. Responder SOLO con:

```markdown
## Sesion consolidada

**Cambios:** <resumen de una linea>
**Memorias actualizadas:** <numero> archivos (<nombres>)
**Snapshot guardado:** <nombre-de-archivo>.md

Listo para el proximo `/start`.
```

No muestres el contenido propuesto de las memorias, no expliques por que actualizaste cada una, no hagas preguntas. Si un permiso de herramienta es denegado, no preguntes "¿continuo?" -- intenta la alternativa disponible y, si de verdad esta bloqueado, indicalo en el informe final como bloqueador, sin detener el resto de la consolidacion.
