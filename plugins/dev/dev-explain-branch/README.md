# dev-explain-branch

Plugin de Claude Code que genera la descripción de una Merge/Pull Request a partir del diff de la rama actual, filtrando lo que de verdad le importa a un reviewer.

## Qué incluye

El plugin trae un único comando:

- **`/explain-this-branch [rama-base opcional, default develop] [--azure=<ID>]`**

### Comportamiento por defecto (modo MR)

Sin ningún flag, el comando:

1. Determina la rama base (el argumento que se pase, o `develop` por defecto; si el proyecto no usa `develop`, se confirma con el usuario si usar `main`/`master`).
2. Analiza los cambios con `git log <base>..HEAD --oneline` y `git diff <base>...HEAD --stat` (solo baja a diffs de ficheros concretos si el log/stat no bastan para entender la intención).
3. Aplica un filtro de valor para el reviewer: solo entra lo que cambia **cómo** revisa o **qué** debe vigilar (contrato de API, migraciones, cambios de arquitectura, seguridad, breaking changes, zonas de riesgo). Fuera lint, formato, imports reordenados, tests que solo acompañan al código, documentación interna o tooling del agente (`.claude/*`, `.agents/*`).
4. Agrupa los cambios por módulo/funcionalidad (nunca commit por commit ni archivo por archivo) y, solo si aporta, usa un diagrama `mermaid`, una tabla `antes | ahora` o un bloque `<details>`.
5. Emite el resultado como un bloque de código markdown copiable directamente en el chat, listo para pegar en la descripción de la MR. **No crea ficheros ni hace commits.**

Es agnóstico de stack: el análisis se basa en `git log`/`git diff`, no en leer el código fuente del proyecto.

Los cambios sin commitear (working tree) se ignoran por defecto; solo se incluyen si el usuario lo pide expresamente, marcados como "pendiente de commit".

### Modo Azure DevOps opcional (`--azure=<ID>`)

Si se añade `--azure=<ID>` (o se pide en lenguaje natural, p. ej. "publícalo en la HU 1099"), el comando genera además un **segundo texto**, más técnico, orientado a trazabilidad (endpoints afectados, DTOs/tipos, resumen técnico de implementación, migraciones), y lo publica como comentario en ese work item de Azure DevOps.

Este modo es aditivo: no sustituye la descripción de la MR, se genera después y reutiliza el mismo análisis git. Es aquí donde el plugin deja de ser agnóstico de stack: los patrones de extracción de endpoints y DTOs se adaptan al framework del proyecto (Spring, .NET, NestJS, Express/Fastify, etc.).

Antes de publicar, **siempre** se muestra el texto exacto en el chat y se pide confirmación explícita — nunca se publica sin ella.

## Cómo instalarlo

Instala el plugin `dev-explain-branch` desde el marketplace `attrim-marketplace` con el flujo habitual de instalación de plugins de Claude Code (`/plugin install dev-explain-branch@attrim-marketplace` o el mecanismo equivalente que use tu configuración).

## Cómo usarlo

### Ejemplo 1 — uso normal, sin Azure

```
/explain-this-branch
```

Compara la rama actual contra `develop`, analiza commits y diff, y devuelve en el chat un bloque markdown copiable con `## ¿Qué incluye esta MR?`, `### Cambios principales` y (si aporta) `### Notas para el reviewer`. También se puede indicar otra rama base explícitamente:

```
/explain-this-branch main
```

### Ejemplo 2 — con `--azure=<ID>`, pidiendo confirmación antes de publicar

```
/explain-this-branch develop --azure=1099
```

Genera primero la descripción de la MR como en el ejemplo 1 y, a continuación, construye el resumen técnico para la HU 1099 (endpoints afectados, DTOs/tipos, resumen técnico, otros cambios relevantes) y **lo muestra en el chat en una previsualización**, preguntando algo como "¿Confirmas que publique este comentario en la HU #1099?". Solo tras una respuesta explícita ("sí", "confirma", "adelante"...) ejecuta el script de publicación; un silencio o un mensaje ambiguo no se interpreta como confirmación. Si se pide un cambio en el texto, se ajusta y se vuelve a mostrar antes de publicar.

También se puede pedir en lenguaje natural sin usar el flag: "explica la rama y publícalo en la HU 1099".

### Ejemplo 3 — caso límite: rama sin commits/diff frente a la base

```
/explain-this-branch develop
```

Si `git log <base>..HEAD --oneline` y `git diff <base>...HEAD --stat` no devuelven nada (la rama actual está al día con la base o no tiene commits propios), no hay contenido que resuma un cambio para el reviewer — el comando no tiene material del que generar una descripción con sentido y así lo señala en vez de inventar contenido.

## Configuración

El modo Azure DevOps requiere tres variables de entorno (sin valores por defecto, nunca hardcodeadas):

| Variable | Significado |
|---|---|
| `AZURE_ORG` | Organización de Azure DevOps |
| `AZURE_PROJECT` | Proyecto de Azure Boards |
| `AZURE_PAT` | Personal Access Token con permiso de escritura en comentarios de work items |

Se pueden definir en `.env.local` o exportarlas en el entorno donde corre Claude Code.

Si falta alguna, el script `scripts/add-work-item-comment.mjs` se detiene con un error listando las que faltan (`❌ Faltan variables de entorno: ...`) y **no publica nada**. La skill nunca pide ni acepta un token pegado directamente en la conversación como sustituto.

Si tu equipo no usa Azure DevOps, este modo simplemente no aplica: usa el comando sin `--azure=<ID>` y obtienes solo la descripción de la MR.

## Notas relevantes

- **Seguridad del PAT**: el `AZURE_PAT` nunca se hardcodea en el script, en la conversación ni en ningún fichero del repo — siempre se lee de `process.env`. La skill tiene instrucción explícita de no aceptar ni pedir un token pegado en el chat.
- **Confirmación obligatoria**: no existe ninguna vía del modo Azure que publique sin haber mostrado antes el texto exacto y recibido una confirmación explícita del usuario.
- El comentario en Azure DevOps se construye en un fichero temporal en markdown simple y se publica con `node scripts/add-work-item-comment.mjs <ID> <ruta-fichero>` — deliberadamente no se construye el texto como string inline en `curl`/bash, porque el contenido puede llevar backticks y comillas que el shell interpretaría mal. El script convierte ese markdown mínimo (negrita, código inline, listas) a HTML, que es lo que espera la API de comentarios de work items.
- Se puede usar `--dry-run` en el script para ver el HTML resultante sin publicar nada, por encima de la previsualización en markdown que ya se muestra en el chat.
- La skill filtra endpoints y DTOs directamente del diff real: no inventa ni generaliza ("se han tocado varios DTOs") si no aparecen en el diff.
- Esta skill no es una revisión de código: no evalúa la calidad de los cambios ni propone correcciones.
