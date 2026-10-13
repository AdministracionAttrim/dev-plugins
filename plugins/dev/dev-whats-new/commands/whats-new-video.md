---
description: (Opcional) Graba para las novedades de una versión un vídeo corto con la app real (capturas en local con datos de prueba, zoom, cursor, clic y resaltado), renderizado con HyperFrames a MP4 en bucle con póster. Se revisa antes de guardarlo.
argument-hint: "[versión, por defecto la última del JSON] [id de item...]"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, AskUserQuestion
---

Genera vídeos de la app real para las novedades. Argumentos: $ARGUMENTS

Es un paso **opcional**: el carrusel funciona igual sin vídeo (degradado + icono, o imagen). Antes de nada, carga la skill `whats-new` de este plugin y lee `${CLAUDE_PLUGIN_ROOT}/skills/whats-new/video.md` entero: requisitos, formato de los dos guiones, pasos disponibles y reglas de un buen vídeo.

Nunca ejecutes `hyperframes init` ni instales skills de HyperFrames: los scripts del plugin ya llaman a la versión fijada sin telemetría ni skills.

## 1. Qué items y qué entorno

1. Localiza `whats-new.json` y la carpeta de assets como `/whats-new-release` (script `whats-new:validate` de `package.json`, o busca el fichero). Versión: la de los argumentos o la primera de `releases`. Items: los ids indicados o todos los de la versión; si alguno ya tiene `video`, pregunta si regenerarlo o saltarlo.
2. Comprueba requisitos: `node -v` (>= 22) y `ffmpeg -version`. Si falta algo, explica cómo instalarlo y para.
3. **App en local**: averigua cómo se arranca (`package.json`, `CLAUDE.md`) y en qué URL. Pregunta al usuario si ya la tiene levantada; si no, arráncala en segundo plano y espera a que responda. Debe apuntar a un entorno con **datos de prueba**.
4. **Usuario de prueba**: si la pantalla necesita login, comprueba que existe `.env.whats-new` con las variables que vayas a usar (por ejemplo `WHATS_NEW_USER` y `WHATS_NEW_PASSWORD`) y que está en `.gitignore`; si no, añade la entrada a `.gitignore` y pide al usuario que cree el fichero él mismo. **Nunca** pidas ni aceptes la contraseña en la conversación ni la escribas en un guion.
5. Añade `scripts/whats-new/video/**/shots/` a `.gitignore` si no está.

## 2. Guion de captura (por item)

1. Entiende la funcionalidad desde su código (`link.route`, plantilla, commits de la versión): pantalla, acción del usuario y resultado visible. Busca selectores estables (texto visible con `::-p-text()`, `formcontrolname`, `data-testid`, `aria-label`).
2. Escribe `scripts/whats-new/video/<versión>/<id>/capture.json`: login si hace falta, ir a la pantalla, `box` de cada elemento que el vídeo vaya a enfocar, `shot` del "antes", la acción, espera al resultado, `box` del resultado y `shot` del "después". Oculta o desenfoca (`hide`/`blur`) lo que no deba salir.
3. Ejecuta:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/capture-ui.js" scripts/whats-new/video/<versión>/<id>/capture.json --out=scripts/whats-new/video/<versión>/<id>/shots
   ```

   Si falla, mira `shots/error.png`, corrige el guion y repite. **Mira las capturas** (`before.png`, `after.png`…): que sea la pantalla correcta, que se vea el cambio y que no haya datos reales ni nada sensible.
4. Si la acción crea datos de verdad en el entorno (un registro, un envío), avisa al usuario antes de ejecutar y propón cómo deshacerlo.

## 3. Guion del vídeo y render

1. Escribe `scripts/whats-new/video/<versión>/<id>/video.json` siguiendo `video.md`: `title` (una frase con la acción y el resultado; será el `imageAlt`, así que como mucho 70 caracteres), `accent` con el color primario del proyecto (sácalo de sus tokens) y los pasos.
2. Valida y renderiza:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/build-video.js" <video.json> --check
   node "${CLAUDE_PLUGIN_ROOT}/scripts/build-video.js" <video.json> --out=<tmp>/<id>.mp4 --sheet=<tmp>/<id>-sheet.png
   ```

   La primera vez instala las herramientas en la caché (un minuto). Cada render tarda unos 30-60 s.
3. **Revisa la hoja de fotogramas** (`--sheet`) antes de enseñar nada: acción visible, zoom que no corta, "después" con el cambio, nada sensible. Como mucho dos rondas de ajustes del guion.

## 4. Revisión del usuario

Abre el MP4 y la hoja en su visor (`start` en Windows, `open` en macOS, `xdg-open` en Linux). Indica por item la frase del vídeo, la duración y el peso. Pide decisión con `AskUserQuestion` (una pregunta por item, máx. 4 por llamada): aprobar / cambiar (el usuario describe el cambio; vuelves al paso 3, o al 2 si hay que capturar otra cosa) / sin vídeo.

## 5. Guardar

Para cada vídeo aprobado:

1. Renderiza (o copia) a `<assets>/whats-new/<versión>/<id>.mp4`; el póster queda al lado como `<id>.webp`.
2. En el item: `"video"`, `"image"` (el póster) e `"imageAlt"` (la frase del vídeo). Mantén `icon` como respaldo.
3. Si el carrusel del proyecto todavía no pinta `video` (código anterior a esta versión del plugin), díselo al usuario y ofrece adaptarlo: `<video muted autoplay loop playsinline>` con el póster y, con `prefers-reduced-motion: reduce`, solo la imagen (ver las plantillas del plugin). Comprueba también las **reglas de presentación** de la skill (diálogo ancho cuando la versión trae vídeo; versión, contador y paginación con fondo propio si van encima del vídeo) y ofrece aplicarlas si faltan.
4. Valida con `npm run whats-new:validate` o `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-whats-new.js" <json> --assets-root=<assets> --require=<versión>`. Si el validador del proyecto es una copia antigua y no conoce `video`, vuelve a copiar `validate-whats-new.js` y el schema del plugin a `scripts/whats-new/`.
5. Borra los temporales. Los `capture.json` y `video.json` se quedan para poder regenerar. Resume lo creado. No hagas commit salvo que el usuario lo pida.
