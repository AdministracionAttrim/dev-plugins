---
name: whats-new
description: Criterios y contrato para el "qué hay de nuevo" de una app (carrusel modal que el usuario ve una sola vez por versión). Úsala al preparar las novedades de una versión a partir de los commits entre el tag anterior y la rama de release (/whats-new-release), al instalar la funcionalidad en un proyecto (/whats-new-setup), al grabar vídeos de la app para la cabecera (/whats-new-video) o cuando el usuario pida redactar, revisar o validar un whats-new.json. No la uses para changelogs técnicos, notas para desarrolladores ni descripciones de MR/PR.
---

# whats-new — novedades por versión para usuario final

La funcionalidad tiene dos tiempos y esta skill gobierna ambos:

1. **Release (dev + Claude)**: git → selección curada → entrada en `whats-new.json`, commiteada en la rama de release antes del build. Comando `/whats-new-release`.
2. **Ejecución (app)**: la app lee el JSON, compara con lo que el usuario ya vio (localStorage) y, si toca, abre el carrusel con la última versión. Instalado por `/whats-new-setup` a partir de `templates/`.

Nada de backend ni de LLM en CI: el contenido lo revisa un humano y queda versionado en el repo.

## Contrato de datos

Schema: `schema/whats-new.schema.json` (JSON Schema 2020-12). Validación: `node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-whats-new.js <ruta>` (o la copia que deja `/whats-new-setup` en el proyecto). Ejemplo completo: `templates/vanilla/whats-new.example.json`.

```json
{
  "schemaVersion": 1,
  "releases": [
    {
      "version": "1.4.0",
      "date": "2026-10-20",
      "items": [
        {
          "id": "exportar-excel",
          "title": "Exporta cualquier listado a Excel",
          "body": "Desde el menú de cada tabla descargas lo que estás viendo, con tus filtros aplicados.",
          "icon": "file-spreadsheet",
          "image": "whats-new/1.4.0/exportar.webp",
          "link": { "label": "Ver informes", "route": "/informes" },
          "permit": "REPORTS.EXPORT"
        }
      ]
    }
  ]
}
```

Reglas que el schema y el validador imponen:

- `releases` en orden **descendente** de versión, sin duplicados. `version` es `X.Y.Z` final (nunca `-SNAPSHOT`), `date` es `YYYY-MM-DD`.
- `items`: **1 a 3**, en orden de relevancia. `id` kebab-case único dentro de la versión.
- `title` ≤ 70 caracteres, `body` 10-320, `link.label` ≤ 40. Cualquiera de los tres admite `{ "es": "…", "en": "…" }`; en v1, salvo que el proyecto ya sea multidioma, solo string en el idioma de la UI.
- `link`: `route` interna (empieza por `/`) **o** `href` externa `http(s)`, nunca las dos.
- `image`: relativa a la carpeta de assets, sin barra inicial, o URL `https`. Opcional: sin ella la cabecera es degradado + icono.
- `video`: MP4/WebM, mismas reglas de ruta. Opcional y **siempre con `image`** como póster.
- `permit`: string genérico; cada proyecto decide cómo resolverlo. Si el usuario no lo tiene, la tarjeta no se muestra; si no queda ninguna, no hay modal.
- Una versión sin novedades de cara al usuario **no lleva entrada** (versión silenciosa).

Lógica de la app (igual en todas las plantillas, función `pickPendingRelease`): se toma la versión más alta del JSON que sea `<=` la versión en ejecución (ignorando sufijos tipo `-SNAPSHOT`); se muestra si el usuario no la ha marcado como vista; se marca como vista al terminar, omitir, pulsar Esc o seguir un enlace interno, nunca al abrir. Un usuario sin registro previo ve la última versión. Las versiones intermedias que se saltó no se encadenan.

## Reglas de presentación del carrusel

Obligatorias en cualquier proyecto, también cuando `/whats-new-setup` adapta el diseño al kit de UI propio:

1. **Tamaño según la versión, no según la tarjeta.** Compacto (~480 px) por defecto. Si **alguna** novedad de la versión trae `video`, el diálogo es ancho (~640 px, siempre con `calc(100vw - 32px)` como tope) en **todas** sus tarjetas: la interfaz grabada necesita sitio para leerse y el modal no debe cambiar de tamaño al pasar de una tarjeta a otra.
2. **Nada de texto suelto sobre imagen o vídeo.** La versión, el contador (`2 / 3`) y la paginación van preferiblemente fuera de la cabecera multimedia, como en las plantillas. Si el diseño del proyecto los superpone a la cabecera, cuando hay `image` o `video` cada uno lleva **fondo propio**: pastilla oscura semiopaca (≈60-70 %) con difuminado y texto blanco, que se lea sobre cualquier fotograma, claro u oscuro. Un degradado tenue sobre todo el vídeo no basta: oscurece la grabación y no garantiza contraste.
3. **Misma altura de cabecera en todas las tarjetas de la versión.** Si alguna trae `image` o `video`, todas las cabeceras son 16:9 (la de icono también), con `object-fit: cover`. Una cabecera de icono más baja solo vale cuando ninguna tarjeta de la versión lleva imagen ni vídeo. El modal no debe crecer ni encoger al pasar de tarjeta.

## Qué es una novedad de usuario

Pregunta de corte: **¿un usuario final notará este cambio y le conviene saberlo para hacer algo distinto o mejor?** Si no, fuera.

Entra:
- Pantallas, módulos o flujos nuevos.
- Capacidades nuevas dentro de pantallas existentes (filtros, exportaciones, acciones de fila, agrupaciones, integraciones visibles).
- Cambios de comportamiento que el usuario debe conocer para no perderse (algo que se movió de sitio, un paso que desaparece).
- Cambios visuales grandes y con valor de uso propio (tema oscuro, rediseño completo de una sección), contados por lo que aportan, no por la técnica.

No entra (descartar y decir por qué):
- Infraestructura, CI/CD, build, dependencias, versionado (`buildspec`, `Dockerfile`, `Set "version"`, lockfiles).
- Refactors, migraciones de framework o librerías de UI, limpieza de código, comentarios, tests, documentación interna.
- Andamiaje de funcionalidades que no llegan a producción (flags apagados, módulos excluidos del build).
- Telemetría o analítica que el usuario no ve.
- Correcciones de errores, salvo un arreglo muy visible que el usuario estaba esperando (y entonces se cuenta como mejora, no como "bug").
- Cambios solo para administradores de plataforma o soporte, salvo que la app tenga esos usuarios y el item lleve su `permit`.

Las pistas `hints.likelyInternal` de `collect-changes.js` son **heurísticas**: sirven para ordenar la revisión, no para decidir. Un commit `fix:` puede ser una mejora visible y un `feat:` puede ser andamiaje.

## Agrupar y elegir las 3

1. Agrupa commits por funcionalidad, no uno a uno: varios commits del mismo módulo o del mismo prefijo (`clientes:`, `operaciones › tarifas:`) suelen ser una sola novedad. Las `areas` del script ayudan a ver el peso de cada zona.
2. Si un mensaje no basta para entender qué ve el usuario, mira el diff dirigido (`git show <sha> --stat`, luego `git show <sha> -- <ruta>`) o la documentación del módulo. No inventes funcionalidad que no esté en el código.
3. Ordena por: alcance (cuántos usuarios lo usan) > frecuencia de uso > novedad (nuevo frente a mejora) > descubribilidad (lo que no encontrarían solos sube).
4. Propón **como máximo 3**. Si hay menos de 3 con valor, propón menos; no rellenes. Si hay 0, la versión es silenciosa.
5. Lista también los descartes relevantes con el motivo en una línea, para que el dev pueda rescatar alguno.

## Redacción

- Lenguaje de usuario final: beneficio y acción, no implementación. "Agrupa proyectos por varios criterios a la vez", no "refactor del pipe de agrupación".
- Mismo tratamiento (tú/usted) e idioma que la UI del proyecto; por defecto, tú y castellano.
- `title`: frase corta con verbo o sustantivo concreto, sin punto final, sin "Nuevo:" ni emojis.
- `body`: 1-2 frases, ≤ 320 caracteres; qué puedes hacer ahora y dónde está. Sin jerga técnica, nombres de componentes ni tickets.
- No prometas lo que depende de permisos que el usuario puede no tener: para eso está `permit`.
- `id`: kebab-case descriptivo y estable (`boletines-en-web`, no `item-1`).

## Icono, enlace, permiso e imagen

- `icon`: nombre kebab-case de la librería de iconos del proyecto (si usa Lucide: `newspaper`, `moon`, `chart-bar`, `users`…). Si no hay librería, un nombre descriptivo; la plantilla pone un icono por defecto.
- `link.route`: **busca la ruta real** en el enrutado del proyecto (ficheros de rutas, menús, `routerLink`). Nunca una ruta inventada. Si la pantalla está detrás de un parámetro, enlaza al listado.
- `permit`: **busca el permiso real** que protege esa ruta o acción (guards, `canActivate`, directivas de permisos, configuración del menú) y usa exactamente el mismo identificador. Si la funcionalidad es para todos, omítelo.
- `image`: opcional. Captura de la pantalla (`whats-new/<version>/<id>.webp`, 16:9, ≤ 300 KB, sin datos reales de clientes). Con `image`, rellena también `imageAlt`.
- `video`: opcional, siempre con `image` como póster. MP4 en bucle de 6-9 s con la app real (ver abajo).

## Vídeos de la app (opcional)

`/whats-new-video`, o `/whats-new-release --video`, cambia el icono de la cabecera por un vídeo corto de **la app real**: capturas en local con datos de prueba (`scripts/capture-ui.js`) montadas con zoom, cursor, clic y resaltado, y renderizadas a MP4 con HyperFrames (`scripts/build-video.js`). Nunca se generan si no se piden. Requisitos, guiones y reglas: `video.md`.

## Casos límite

- **Repo sin tags** o sin tag anterior a la versión: `collect-changes.js` sale con código 2; pide al usuario el inicio del rango (sha, rama, `origin/master`…), no lo adivines.
- **Versión en `-SNAPSHOT`**: la entrada se escribe con la versión final (`3.1.0-SNAPSHOT` → `3.1.0`). La app en desarrollo ya la mostrará porque compara ignorando el sufijo.
- **Tag de la versión nueva ya creado** sobre `HEAD`: el script lo detecta y usa el anterior.
- **Entrada ya existente** para esa versión: enseña la actual y pregunta si sustituir, fusionar o dejarla.
- **Hotfix** (`X.Y.Z` con Z > 0): normalmente silenciosa. Solo entrada si hay algo que el usuario note.
- **Commits que tocan producción y andamiaje a la vez**: cuenta solo lo que llega al usuario.
