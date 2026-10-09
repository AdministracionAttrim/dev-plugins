# dev-whats-new

Plugin de Claude Code para enseñar a los usuarios de una app **qué hay de nuevo** en cada versión: un carrusel modal con las 3 novedades principales (icono, imagen o vídeo de la app, título, texto, enlace "Saber más", Anterior / puntos / Continuar) que cada usuario ve **una sola vez por versión**.

El contenido sale de los commits entre el tag anterior y la rama de release, lo selecciona y redacta Claude para usuario final, lo revisa un humano y queda versionado en el repo como `whats-new.json`. Sin backend y sin LLM en CI.

## Qué incluye

| Pieza | Qué hace |
|---|---|
| Comando `/whats-new-release [desde] [hasta]` | Recoge los cambios del rango (por defecto, último tag → `HEAD`, versión de `package.json`), propone hasta 3 novedades con ruta y permiso reales sacados del código, enseña el borrador con los descartes, y tras tu aprobación escribe la entrada en `whats-new.json` y la valida. Si no hay nada de cara al usuario, propone versión silenciosa. |
| Comando `/whats-new-setup [angular\|vanilla]` | Instala la funcionalidad una vez por proyecto: detecta stack y convenciones (`CLAUDE.md`, kit de UI, tokens, tests, permisos, versión en ejecución), te pregunta dónde montarlo, cómo resolver permisos, clave de storage e idioma, y genera servicio + componente adaptados, el JSON vacío, specs y el script `npm run whats-new:validate`. |
| Comando `/whats-new-video [versión] [id...]` | **Opcional, nunca se ejecuta por defecto.** Sustituye el icono de la cabecera por un vídeo de unos 6-11 s de **la app real**: captura la pantalla en local con datos de prueba (antes y después de la acción), monta zoom, cursor, clic y resaltado, y lo renderiza a MP4 con [HyperFrames](https://github.com/heygen-com/hyperframes). Enseña el vídeo y una hoja de fotogramas y solo guarda lo que apruebas. También con `/whats-new-release --video`. |
| Skill `whats-new` | Contrato de datos y criterios: qué es novedad de usuario y qué no, cómo agrupar y elegir las 3, tono de redacción, iconos, enlaces, permisos y casos límite. |
| `skills/whats-new/schema/whats-new.schema.json` | JSON Schema del contrato (`schemaVersion: 1`). |
| `skills/whats-new/templates/angular/` | Servicio, configuración (`provideWhatsNew`), componente standalone con signals, `OnPush` y `<dialog>` nativo, y specs Jasmine. Angular >= 19. |
| `skills/whats-new/templates/vanilla/` | Web component `<whats-new-dialog>` sin dependencias (`initWhatsNew` / `showWhatsNew`), tipos `.d.ts`, tests `node --test`, JSON de ejemplo y `demo.html`. Sirve para cualquier stack, React incluido. |
| `scripts/collect-changes.js` | Determinista, solo Node + git: rango, versión nueva y anterior, commits sin merges con ficheros, estadísticas, áreas tocadas y pistas de "probablemente interno". Las cifras del borrador salen de aquí, no del modelo. |
| `scripts/capture-ui.js` | Abre la app en un Chrome headless, ejecuta un guion de captura (login con credenciales de `.env.whats-new`, navegar, clic, ocultar o desenfocar zonas) y guarda capturas a 2x y las cajas de los elementos a enfocar. |
| `scripts/build-video.js` | Convierte las capturas y un guion de cámara (zoom, cursor, clic, fundido, resaltado) en una composición HyperFrames y la renderiza a MP4 en bucle, con póster y hoja de fotogramas para revisar. Formato en `skills/whats-new/video.md`. |
| `scripts/validate-whats-new.js` | Valida un `whats-new.json` contra el schema (sin dependencias) y añade reglas semánticas: versiones únicas y en orden descendente, ids únicos por versión, imágenes y vídeos existentes y de peso razonable, versión requerida. |

## El contrato

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
          "link": { "label": "Ver informes", "route": "/informes" },
          "permit": "REPORTS.EXPORT"
        }
      ]
    }
  ]
}
```

- 1 a 3 `items` por versión; versiones en orden descendente; `version` final sin `-SNAPSHOT`.
- `link` interno (`route`) o externo (`href`). `image` opcional (si falta: degradado + icono). `video` opcional, siempre con `image` como póster.
- `permit` es un string genérico que cada proyecto resuelve con su sistema de permisos; si el usuario no lo tiene, la tarjeta no se muestra, y si no queda ninguna, no hay modal.
- `title`, `body` y `link.label` admiten `{ "es": "…", "en": "…" }`.

En ejecución, la app muestra la versión más alta del JSON que sea `<=` la versión en ejecución (ignorando `-SNAPSHOT`) si el usuario aún no la ha visto, y la marca como vista al terminar, omitir, pulsar Esc o seguir un enlace interno (nunca al abrir). Persistencia v1: `localStorage`, con clave por usuario si el proyecto lo permite.

## Cómo usarlo

1. Instala el plugin:

   ```
   /plugin install dev-whats-new@attrim-dev-skills
   ```

2. Una vez por proyecto, en una rama de trabajo: `/whats-new-setup`. Revisa el resultado, prueba en navegador y commitea.
3. En cada release, ya en la rama `release/x.y.z` (con git-flow el tag aún no existe, así que el rango por defecto es último tag → `HEAD`): `/whats-new-release`. Revisa el borrador, aprueba o edita, y commitea el JSON antes del build.

Rango a mano: `/whats-new-release 2.8.0 3.0.0` o `/whats-new-release origin/master HEAD`.

Vídeos de la app (opcional): `/whats-new-release --video` los graba al terminar, o `/whats-new-video` después, sobre una versión ya escrita. Necesitan la app arrancada en local con datos de prueba, FFmpeg y, si hay login, un usuario de prueba en `.env.whats-new` (fuera de git). Los guiones quedan en `scripts/whats-new/video/<versión>/<id>/` para poder regenerar el vídeo cuando cambie la pantalla.

Los scripts también se pueden usar sueltos:

```bash
node <plugin>/scripts/collect-changes.js --format=md          # resumen legible del rango por defecto
node <plugin>/scripts/collect-changes.js 2.8.0..3.0.0         # JSON para otro uso
node <plugin>/scripts/capture-ui.js capture.json --out=shots
node <plugin>/scripts/build-video.js video.json --out=video.mp4 --sheet=hoja.png
node <plugin>/scripts/validate-whats-new.js src/assets/whats-new/whats-new.json --assets-root=src/assets --require=3.1.0
```

## Requisitos

- Node.js >= 18 y `git` en el `PATH`.
- Para el rango por defecto, tags semver (`1.2.3` o `v1.2.3`) en el repo. Si no hay ninguno anterior, el comando pide el inicio del rango (caso habitual en repos sin tags).
- Plantilla Angular: Angular >= 19 (`afterRenderEffect`, control flow `@if`/`@for`).
- Vídeos (opcional): Node.js >= 22, FFmpeg y Chrome; la app en local con datos de prueba.

## Qué datos toca

- `collect-changes.js` solo **lee** el repo con `git` (log, tags, diff stat, `package.json` en la ref final). Incluye autor y mensaje de cada commit en su salida local; no envía nada a ningún sitio.
- `validate-whats-new.js` solo lee el JSON, el schema y, con `--assets-root`, comprueba que existan las imágenes y los vídeos.
- `capture-ui.js` abre la app **en local** y lee las credenciales de prueba de `.env.whats-new` (no las imprime). Guarda capturas en disco (y `error.png` si un paso falla); no envía nada fuera.
- `build-video.js` instala la primera vez `hyperframes@0.8.74` y `gsap@3.14.2` en `~/.cache/dev-whats-new/` (nunca en el proyecto) y los ejecuta **sin telemetría, sin instalar skills y sin análisis con IA de terceros**. Esa instalación descarga paquetes del registro de npm; el render es local (Chrome headless + FFmpeg).
- `/whats-new-release` escribe únicamente el `whats-new.json` del proyecto, después de tu aprobación. `/whats-new-setup` crea/modifica ficheros del proyecto (código, specs, `package.json`, configuración raíz) y te los resume. `/whats-new-video` escribe los guiones, el MP4, el póster y los campos `video`/`image`/`imageAlt` del JSON, también después de tu aprobación. Ninguno hace commit salvo que se lo pidas.

## Pendiente

- Plantilla React/Next nativa (hoy se usa el web component vanilla).
- Persistencia de "visto" por usuario en backend (el servicio está preparado para cambiar `readSeen`/`writeSeen`).
- Página de histórico "Novedades" que pinte todas las `releases`.
