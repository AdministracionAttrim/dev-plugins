---
name: memory-keeper
description: Reglas de formato, taxonomia y ubicacion para el sistema de memoria dinamica del proyecto (usado por /start y /wrap-up). Activar siempre que haya que leer, crear o actualizar archivos en .claude/memory/ de este proyecto -- nunca improvisar un formato distinto.
---

# memory-keeper

Reglas compartidas para el sistema de memoria dinamica de este proyecto. `/start` y `/wrap-up` la usan para saber donde vive la memoria, que forma tiene y que se puede o no guardar en ella.

## Donde vive la memoria

Todo vive dentro del repo, en la raiz del proyecto (no en `~/.claude` ni en ninguna ruta de usuario o de maquina):

```
.claude/memory/
  MEMORY.md              # indice, siempre cargado, una linea por memoria
  user_*.md
  feedback_*.md
  project_*.md
  reference_*.md
  sessions/
    YYYY-MM-DD-HH-MM.md            # snapshots de sesion (maximo 5, ver /wrap-up)
  handoffs/
    YYYY-MM-DD-<slug-tarea>.md     # documentos de traspaso puntuales (ver /handoff)
```

**Es memoria local del proyecto, no del equipo.** `.claude/memory/` debe estar en el `.gitignore` del proyecto (misma logica que `.claude/settings.local.json`): nunca se commitea, nunca se propone en un PR. Si `.gitignore` no tiene la entrada `.claude/memory/`, anadirla la primera vez que se toque este sistema (silenciosamente, sin pedir confirmacion -- es una linea de config, no una decision de producto).

Nunca uses rutas absolutas de usuario/maquina (`C:\Users\...`, `/home/...`) en ningun archivo de memoria ni en el codigo de los comandos. Todo debe ser relativo a la raiz del proyecto.

## Tipos de memoria

Cada archivo (salvo `MEMORY.md`) es de exactamente uno de estos cuatro tipos, indicado en `metadata.type` del frontmatter:

| Tipo | Contenido | Cuando guardar |
|---|---|---|
| `user` | Rol, objetivos, nivel de conocimiento del usuario en este proyecto | Cuando se aprende algo sobre quien es el usuario o como trabaja, relevante para adaptar futuras respuestas |
| `feedback` | Correcciones o confirmaciones sobre COMO abordar el trabajo en este proyecto | Cuando el usuario corrige un enfoque ("no hagas X", "deja de...") o confirma uno no obvio ("perfecto, sigue asi") |
| `project` | Estado del trabajo en curso: rama, decisiones, bugs, iniciativas activas | Cuando cambia el estado de "quien hace que, por que, para cuando" |
| `reference` | Punteros a sistemas externos (tablero de tickets, canal de Slack, dashboard) | Cuando se menciona donde vive informacion que no esta en este repo |

### Que NO guardar nunca

- Nada que se pueda derivar leyendo el codigo actual (convenciones, arquitectura, estructura de carpetas).
- Nada que ya este en `git log`/`git blame` (historial de cambios, quien toco que).
- Recetas de depuracion puntuales -- el fix ya vive en el commit.
- Nada que ya este documentado en `CLAUDE.md`.
- Detalle efimero de la tarea en curso (eso es para `TaskCreate`/planning, no para memoria persistente).

## Formato de cada archivo de memoria

```markdown
---
name: {{slug-corto-en-kebab-case}}
description: {{una linea, especifica -- decide relevancia en sesiones futuras}}
metadata:
  type: {{user|feedback|project|reference}}
---

{{contenido}}
```

- `feedback` y `project`: estructurar el contenido como regla/hecho, luego una linea **Por que:** (la razon dada por el usuario -- a menudo un incidente o una preferencia fuerte) y una linea **Como aplicarlo:** (cuando entra en juego esta memoria). Sin el "por que" no se puede juzgar bien un caso limite futuro.
- Enlazar memorias relacionadas con `[[nombre]]`, donde `nombre` es el slug de otra memoria. Un enlace a un slug que aun no existe no es un error, marca algo pendiente de escribir.
- Convertir fechas relativas ("el jueves") a fechas absolutas antes de guardar, para que la memoria siga siendo interpretable meses despues.

## MEMORY.md (indice)

Una linea por memoria, sin frontmatter, formato:

```
- [Titulo corto](nombre-archivo.md) — gancho de una linea (menos de ~150 caracteres)
```

`MEMORY.md` se lee siempre (es el punto de entrada). Nunca escribir contenido de memoria directamente ahi, solo el puntero.

## Antes de dar por buena una memoria vieja

Una memoria que nombra un archivo, rama o funcion concreta es una afirmacion de que existia *cuando se escribio*. Antes de actuar sobre ella (no solo mencionarla):

- Si nombra una ruta de archivo: comprobar que existe.
- Si nombra una rama/funcion: comprobar con `git branch`/grep que sigue viva.
- Si el usuario va a actuar sobre la recomendacion (no solo preguntar por historia), verificar primero.

Si una memoria contradice lo que se observa ahora en el repo, confiar en lo observado y corregir o borrar la memoria, no actuar sobre el dato viejo.

## Deduplicacion

Antes de crear un archivo nuevo, revisar si ya existe una memoria del mismo tipo sobre el mismo tema y actualizarla en vez de duplicar. Organizar por tema, no por fecha de creacion.
