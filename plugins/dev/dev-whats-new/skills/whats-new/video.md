# Vídeos de novedades (opcional)

Un vídeo sustituye al icono de la cabecera del carrusel por unos 6-11 segundos de **la app real**: capturas de la pantalla de la funcionalidad, con zoom a la zona que importa, un cursor que hace la acción, el paso del "antes" al "después" y un resaltado del resultado. Va en bucle, sin audio, y pesa hasta ~1,5 MB (el script avisa si se pasa).

Dos scripts deterministas hacen el trabajo; Claude solo escribe los dos guiones (JSON) y revisa el resultado:

1. `scripts/capture-ui.js` abre la app en local con un Chrome headless, ejecuta los pasos del guion de captura y guarda las capturas (a 2x) y las **cajas** de los elementos importantes.
2. `scripts/build-video.js` monta con esas capturas una composición [HyperFrames](https://github.com/heygen-com/hyperframes) (HTML + GSAP), la renderiza a MP4 y saca el póster y una hoja de fotogramas.

## Requisitos

- Node.js >= 22 y **FFmpeg** en el `PATH`.
- La app arrancada en local contra un entorno con **datos de prueba**: nada de clientes, empleados ni importes reales, porque el vídeo acaba en el repo.
- Un usuario de prueba en `.env.whats-new` (en la raíz del proyecto y **en `.gitignore`**). Las contraseñas no se escriben nunca en los guiones ni en la conversación:

  ```
  WHATS_NEW_USER=demo@example.com
  WHATS_NEW_PASSWORD=…
  ```

- La primera vez se instalan `hyperframes@0.8.74` y `gsap@3.14.2` en `~/.cache/dev-whats-new/` (nunca en el proyecto). HyperFrames se lanza siempre sin telemetría (`HYPERFRAMES_NO_TELEMETRY=1`), sin instalar skills (`HYPERFRAMES_SKIP_SKILLS=1`) y sin análisis con IA de terceros. **No uses `hyperframes init`**: instala skills en el perfil del usuario.

## Ficheros en el proyecto

| Fichero | En git | Para qué |
|---|---|---|
| `scripts/whats-new/video/<versión>/<id>/capture.json` | sí | Guion de captura, para repetirla cuando cambie la pantalla. |
| `scripts/whats-new/video/<versión>/<id>/video.json` | sí | Guion del vídeo. |
| `scripts/whats-new/video/<versión>/<id>/shots/` | no (`.gitignore`) | Capturas y `manifest.json`. Se regeneran. |
| `<assets>/whats-new/<versión>/<id>.mp4` y `.webp` | sí | Vídeo y póster que sirve la app. |

En el item: `"video": "whats-new/<versión>/<id>.mp4"`, `"image": "whats-new/<versión>/<id>.webp"` (póster, obligatorio con vídeo) e `"imageAlt"` con lo que se ve (≤ 70 caracteres; puede ser el `title` del guion si cabe).

## Guion de captura (`capture.json`)

```json
{
  "baseUrl": "http://localhost:4200",
  "viewport": { "width": 1600, "height": 900 },
  "scale": 2,
  "colorScheme": "light",
  "steps": [
    { "goto": "/login" },
    { "fill": "input[type=email]", "value": "${WHATS_NEW_USER}" },
    { "fill": "input[type=password]", "value": "${WHATS_NEW_PASSWORD}", "secret": true },
    { "click": "button[type=submit]" },
    { "waitForUrl": "/app" },
    { "goto": "/app/boletines/nuevo" },
    { "waitFor": "form" },
    { "box": "check", "selector": "label::-p-text(Publicar en la web)" },
    { "box": "save", "selector": "button::-p-text(Guardar)" },
    { "shot": "before" },
    { "click": "label::-p-text(Publicar en la web)" },
    { "click": "button::-p-text(Guardar)" },
    { "waitFor": "table" },
    { "box": "row", "selector": "tr::-p-text(Resumen de octubre)" },
    { "shot": "after" }
  ]
}
```

- **viewport 1600×900** (16:9, la proporción del vídeo) y `scale: 2`, para que el zoom se vea nítido.
- Selectores CSS de Puppeteer, más `::-p-text(texto)` (por texto visible) y `::-p-aria(nombre)` (por nombre accesible). Prefiere texto visible o atributos estables (`formcontrolname`, `data-testid`, `aria-label`) frente a clases generadas.
- La app se carga con "reducir movimiento" y sin transiciones ni cursor de texto, para que las capturas sean estables (`"reducedMotion": false` y `"freeze": false` lo desactivan).

| Paso | Qué hace |
|---|---|
| `goto` | Navega (relativo a `baseUrl`) y espera al evento `load` (`until`: `domcontentloaded`, `networkidle2`…). Después, espera lo concreto con `waitFor`. |
| `waitFor` / `waitForHidden` | Espera a que un selector sea visible / desaparezca. |
| `waitForUrl` | Espera a que la URL contenga el texto. |
| `wait` | Espera N ms. Úsalo poco. |
| `fill` + `value` | Vacía y escribe. Admite `${VARIABLE}`; con `"secret": true` no se imprime. |
| `click`, `hover`, `press`, `select` + `value` | Interacciones. |
| `scrollTo` | Centra el elemento en pantalla (antes de medir o capturar). |
| `hide` / `blur` | Oculta o desenfoca por CSS lo que no debe salir (avisos, nombres, cifras). |
| `localStorage` | `{ "clave": "valor" }` en el origen de la app (después de un `goto`). Úsalo para marcar las novedades como vistas y que el carrusel no tape la captura. |
| `box` + `selector` | Mide la caja visible del elemento con ese nombre (px de la captura). |
| `shot` | Guarda `<nombre>.png`. `settle` (ms, 300 por defecto) espera antes. |

Si un paso falla, el script deja `error.png` con la pantalla en ese momento: mírala antes de tocar el guion.

## Guion del vídeo (`video.json`)

```json
{
  "title": "Al marcar Publicar en la web y guardar, el boletín aparece con origen Web",
  "capture": "shots/manifest.json",
  "duration": 8,
  "accent": "#3b63f0",
  "steps": [
    { "at": 0, "show": "before" },
    { "at": 0.5, "zoom": "check", "scale": 1.8, "dur": 1.1 },
    { "at": 0.8, "cursor": "check", "dx": 0.03, "dur": 0.9 },
    { "at": 1.8, "click": true },
    { "at": 2.2, "cursor": "save", "dur": 0.6 },
    { "at": 2.9, "click": true },
    { "at": 3.1, "show": "after" },
    { "at": 3.3, "zoom": "row", "scale": 1.5, "dur": 1.1 },
    { "at": 3.5, "hideCursor": true },
    { "at": 4.3, "highlight": "row", "dur": 2.4 }
  ]
}
```

Raíz: `capture` (manifiesto de `capture-ui.js`), `duration` (3-15 s; 7-11 lo normal), `size` (`[1280, 720]` por defecto: el diálogo ancho del carrusel, ~640 px, en pantallas 2x), `fps` (30), `accent` (color primario del proyecto en `#rrggbb`, para el clic y el resaltado), `posterAt` (segundo del póster; por defecto, el resultado justo antes del cierre).

Cada paso hace una sola cosa, en orden de `at` (segundos):

| Paso | Campos | Efecto |
|---|---|---|
| `show` | captura, `dur` (0,35) | Funde a esa captura. |
| `zoom` | caja o `"full"`, `scale` (2), `dur` (1), `ease` | Cámara centrada en la caja. El zoom se limita solo para que la caja quepa entera. |
| `cursor` | caja, `dx`/`dy` (0-1, punto dentro de la caja; 0,5), `dur` (0,8) | El cursor entra (la primera vez) y va a ese punto. |
| `click` | `true` | Onda y pulsación en la posición del cursor. |
| `highlight` | caja, `dur` (1,6), `padding` (6) | Marco con el color de acento alrededor de la caja. |
| `hideCursor` | `true` | Oculta el cursor. |

Una caja es un nombre del manifiesto o `{ "x", "y", "w", "h" }` en px de la captura. Los nombres de capturas y cajas solo admiten letras, números, `-` y `_`. Los últimos 0,8 s son el cierre del bucle: la cámara vuelve al plano general y a la primera captura.

## Cómo hacer un buen vídeo

1. **Una acción, un resultado.** El guion cuenta "hago esto → pasa esto". Si hacen falta dos acciones independientes, son dos novedades o sobra una.
2. **Ritmo**: 0-0,5 s plano general (sitúa la pantalla); 0,5-3 s zoom + cursor + clic; 3-4 s cambio al "después" y zoom al resultado; 4-7 s resultado resaltado y quieto para que se lea; 0,8 s de cierre.
3. **Zoom con medida**: 1,5-2,2. Más zoom pixela y desorienta; el script ya lo limita a lo que cabe.
4. **Cursor solo donde hay clic** y con tiempo de llegada (`dur` 0,6-0,9). El clic, 0,1-0,2 s después de llegar.
5. **El póster es el resultado**: lo que se ve con "reducir movimiento" o mientras carga debe entenderse solo.
6. **Nada sensible**: datos de prueba siempre; `blur`/`hide` para nombres de usuario, avatares, cifras o avisos del entorno.
7. **Sin efectos reales**: si confirmar la acción crea datos o dispara integraciones (correos, servicios externos, publicaciones), enseña la acción sin confirmarla: abrir el formulario y marcar la opción ya cuenta la novedad. El ejemplo de arriba guarda porque es un entorno de prueba; en uno compartido, no lo hagas sin avisar.
8. **El carrusel puede tapar los bordes** si pinta encima de la cabecera (versión, contador, progreso; ver "Reglas de presentación" en la skill): deja la acción y el resultado en el centro del encuadre, nunca en la franja superior ni en la inferior.

## Revisión

`build-video.js --sheet=<png>` genera una hoja con 6 fotogramas del MP4 final. Revísala siempre antes de enseñarla: que la acción se vea, que el zoom no corte lo importante, que el "después" muestre el cambio y que no salga nada sensible. Como mucho dos rondas de ajustes del guion.
