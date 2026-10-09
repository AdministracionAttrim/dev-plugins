---
description: Genera la entrada de novedades de la versión nueva (máx. 3, para usuario final) a partir de los commits entre el tag anterior y HEAD, la muestra para revisión y la escribe en whats-new.json validada.
argument-hint: "[desde: tag/ref, por defecto el último tag] [hasta: ref, por defecto HEAD] [--video]"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, AskUserQuestion
---

Prepara las novedades de usuario de la versión que se está cerrando. Argumentos: $ARGUMENTS

Antes de nada, carga la skill `whats-new` de este plugin: sus criterios (qué es novedad de usuario, cómo elegir las 3, cómo redactar, casos límite) mandan sobre cualquier intuición propia.

## 1. Localizar el fichero de novedades

1. Si `package.json` tiene un script `whats-new:validate` (lo crea `/whats-new-setup`), la ruta del JSON es la que aparece en él.
2. Si no, busca `whats-new.json` fuera de `node_modules`, `dist` y similares.
3. Si no existe, avisa de que la app aún no muestra novedades y ofrece dos caminos: lanzar `/whats-new-setup` primero, o seguir y crear solo el JSON en la ruta por defecto del stack (Angular: `src/assets/whats-new/whats-new.json`; Vite/Next/CRA: `public/whats-new/whats-new.json`).

## 2. Recoger los cambios (determinista)

Si los argumentos incluyen `--video`, quítalo de la lista y recuérdalo para el paso 6: es una opción de este comando, no del script. Ejecuta, desde la raíz del repo y con el resto de argumentos (vacíos = rango por defecto):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/collect-changes.js" <desde> <hasta> --max-files=15
```

- Las cifras (nº de commits, ficheros, versión, rango) se citan **tal cual las da el script**; no las recalcules ni las estimes.
- Si sale con código 2 (repo sin tags, ref inexistente…), enseña el mensaje y pregunta al usuario el inicio del rango. Si la ref puede faltar en local, sugiere `git fetch --tags`.
- Si `version.next` es null, pregunta la versión y relanza con `--version=x.y.z`.
- Informa en una línea: rama actual, rango usado (`range.from`..`range.to`, y si viene de tag o de argumento), versión anterior → nueva, nº de commits sin merges.
- Si la rama actual no es `release/*` ni `hotfix/*`, avísalo (no bloquea).

## 3. Analizar y seleccionar

Aplica la skill: agrupa por funcionalidad, descarta lo interno, mira diffs dirigidos solo donde el mensaje no basta y elige **como máximo 3** novedades. Para cada una, busca en el código la **ruta real** (`link.route`) y el **permiso real** (`permit`) que la protege; si no lo encuentras con seguridad, déjalo fuera y dilo.

Si no queda ninguna novedad de usuario, propón versión silenciosa (sin entrada) y explica por qué en 2-3 líneas.

## 4. Enseñar el borrador y pedir aprobación

Muestra en el chat:

1. Tabla de las propuestas: orden, título, por qué entra (commits que la respaldan, por `short` sha), ruta y permiso.
2. El bloque JSON exacto de la entrada (`version` final sin `-SNAPSHOT`, `date` = hoy salvo que el usuario indique la fecha de publicación prevista).
3. Descartes relevantes, una línea cada uno con el motivo.

Pide decisión con `AskUserQuestion`: aprobar tal cual / editar (el usuario indica cambios y vuelves a enseñar el JSON) / versión silenciosa. No escribas nada hasta tener la aprobación.

## 5. Escribir y validar

1. Si ya hay entrada para esa versión, enséñala y pregunta si sustituir, fusionar o cancelar.
2. Inserta la entrada en `releases` respetando el orden descendente de versión. Conserva el formato del fichero (indentación, salto final).
3. Valida: `npm run whats-new:validate` si existe; si no, `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-whats-new.js" <ruta> --require=<version>` (añade `--assets-root=<carpeta de assets>` si hay imágenes). Si falla, corrige y repite hasta que pase.
4. No hagas commit salvo que el usuario lo pida.

## 6. Vídeos de la app (solo con `--video`)

Por defecto no se generan. Si se pasó `--video` y se ha escrito la entrada, continúa con el flujo de `/whats-new-video` para esa versión (todos sus items), desde su paso 1.2. Sin `--video`, no lo ofrezcas más allá de mencionar en una línea que existe `/whats-new-video`.

## 7. Extras opcionales (ofrécelos en una línea, no los hagas sin permiso)

- **Changelog legible**: si el proyecto tiene `CHANGELOG.md`, ofrecer añadir la sección de la versión con las mismas novedades más las mejoras menores descartadas que sí sean visibles.
- **Capturas reales**: si hay herramientas de navegador disponibles y la app corre en local, ofrecer capturar la pantalla de cada novedad como `image` (`whats-new/<version>/<id>.webp` en assets, 16:9, sin datos reales de clientes). Es la alternativa estática al vídeo.
