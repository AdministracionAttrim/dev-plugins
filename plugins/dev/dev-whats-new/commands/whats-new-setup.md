---
description: Instala en el proyecto actual el carrusel de novedades por versión (servicio + componente adaptados a su stack y design system, whats-new.json vacío, specs y script de validación). Se ejecuta una vez por proyecto.
argument-hint: "[angular|vanilla] (opcional; por defecto se detecta)"
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, AskUserQuestion
---

Instala la funcionalidad de novedades por versión en este proyecto. Argumentos: $ARGUMENTS

Carga primero la skill `whats-new` de este plugin (contrato de datos y comportamiento esperado). Las plantillas están en `${CLAUDE_PLUGIN_ROOT}/skills/whats-new/templates/`. Son **referencias que se adaptan**, no ficheros para copiar a ciegas: el resultado tiene que parecer escrito por el equipo del proyecto.

## 1. Reconocer el proyecto

1. **Stack** (o el que venga en los argumentos):
   - `angular.json` → plantilla `angular/` (requiere Angular >= 19; si es más antiguo, avisa y ofrece `vanilla/`).
   - `next.config.*`, o `react` en dependencias → la plantilla React llegará en una versión futura del plugin; usa `vanilla/` (el web component funciona dentro de React) y dilo.
   - Cualquier otro frontend → `vanilla/`.
   - Sin frontend (backend, librería) → detente y explica que no aplica.
2. **Convenciones**: lee `CLAUDE.md` del proyecto (y lo que enlace sobre decisiones y trampas), `package.json`, la configuración de lint y tests y dos o tres componentes recientes del mismo tipo. Anota:
   - kit de UI propio (botones, enlaces, diálogo/modal, iconos) y tokens de color/tema (claro y oscuro);
   - dónde viven servicios, componentes compartidos y constantes; nombres de fichero y prefijo de selectores;
   - framework de tests (Karma/Jasmine, Jest, Vitest…) y estilo de las specs;
   - de dónde sale la **versión en ejecución** (fichero generado de build, `environment`, import de `package.json`…);
   - cómo se comprueban permisos (servicio de auth, directiva, guard) y cómo se identifica al usuario;
   - cuál es el **shell autenticado** (layout que envuelve las pantallas tras el login);
   - idioma(s) de la UI e i18n;
   - prefijo que ya usa el proyecto para claves de `localStorage`.
3. Si `whats-new.json` ya existe o hay un servicio de novedades, informa y pregunta si continuar (actualizar) o parar.

## 2. Confirmar decisiones con el usuario

Una sola llamada a `AskUserQuestion` (máx. 4 preguntas), con la opción recomendada primero y basada en lo detectado:

1. **Dónde se monta**: shell autenticado detectado (recomendado) u otro punto.
2. **Cómo se resuelve `permit`**: el método de permisos detectado (recomendado) / sin permisos (todo visible).
3. **Clave de "visto"**: `<prefijo>.whatsNew.<userId>` (recomendado si hay id de usuario; coste nulo y evita líos en equipos compartidos) / `<prefijo>.whatsNew` por navegador.
4. **Idioma de los textos**: solo el idioma de la UI (recomendado en v1) / multidioma `{ es, en }` si el proyecto ya tiene i18n.

## 3. Generar el código

### Angular (`templates/angular/`)

- `whats-new.models.ts`, `whats-new.config.ts`, `whats-new.service.ts`: llévalos a la carpeta de servicios/modelos compartidos. Mueve los valores por defecto a la carpeta de constantes si el proyecto la tiene. Usa los alias de import del proyecto.
- `whats-new.component.*`: llévalo a la carpeta de UI compartida con el prefijo de selector del proyecto y adáptalo:
  - botones y enlace → componentes/directivas del kit de UI;
  - icono por defecto → librería de iconos del proyecto, resolviendo `item.icon`;
  - variables `--wn-*` → tokens semánticos del proyecto (verifica claro y oscuro);
  - respeta las **reglas de presentación** de la skill: diálogo ancho cuando alguna novedad de la versión trae vídeo (la plantilla ya lo hace con `hasVideo()` y `.wn--wide`; si usas el servicio de diálogos del proyecto, pásale ese tamaño), misma altura de cabecera en todas las tarjetas y, si superpones versión, contador o paginación a la cabecera, con pastilla oscura propia cuando hay imagen o vídeo;
  - si el proyecto tiene un servicio de diálogos accesible (foco atrapado, Esc, backdrop), puedes abrir el carrusel con él en lugar del `<dialog>` nativo; mantén el comportamiento: marcar visto al terminar/omitir/Esc/enlace interno, nunca al abrir.
- Registra `provideWhatsNew(() => ({ … }))` en la configuración raíz con la versión en ejecución, la clave de storage, `canSee` y el idioma decididos. Si la URL de assets o el prefijo de imágenes no son los de por defecto, ajústalos.
- Monta `<…-whats-new />` en el shell autenticado (o el disparo equivalente con el servicio de diálogos).
- Specs: adapta las tres de la plantilla al framework de tests del proyecto (Jest/Vitest: `jasmine.createSpyObj` → `jest.fn()`/`vi.fn()`; en jsdom `HTMLDialogElement.showModal` no existe, mockéalo).
- Opcional (pregunta): entrada "Novedades" en un menú existente (versión, ayuda, perfil) que llame a `WhatsNewService.showLatest()`.

### Vanilla (`templates/vanilla/`)

- Copia `whats-new.js` (y `whats-new.d.ts` si el proyecto usa TypeScript) a la carpeta de código compartido. Ajusta las variables `--wn-*` de `STYLES` a los tokens del proyecto y, si hay librería de iconos SVG, pasa el mapa `icons`. Mantén las reglas de presentación de la skill (la clase `wide` del diálogo cuando hay vídeo; nada de texto sin fondo sobre la cabecera).
- Llama a `initWhatsNew({ url, currentVersion, storageKey, canSee, lang, onNavigate })` cuando el usuario ya ha iniciado sesión. `onNavigate` debe usar el router del proyecto si es una SPA.
- Tests: adapta `whats-new.test.mjs` al runner del proyecto (o deja `node --test` si no hay ninguno).
- No copies `demo.html` ni `whats-new.example.json` al proyecto; sirven para probar la plantilla.

## 4. Datos y validación

1. Crea el JSON vacío en la carpeta de assets servida por la app (Angular: `src/assets/whats-new/whats-new.json`; Vite/Next/CRA: `public/whats-new/whats-new.json`) y comprueba que el build lo publica:

   ```json
   { "schemaVersion": 1, "releases": [] }
   ```

2. Copia `${CLAUDE_PLUGIN_ROOT}/scripts/validate-whats-new.js` y `${CLAUDE_PLUGIN_ROOT}/skills/whats-new/schema/whats-new.schema.json` juntos a `scripts/whats-new/` del proyecto (el validador busca el schema a su lado). Así la validación no depende de tener el plugin instalado.
3. Añade a `package.json`:

   ```json
   "whats-new:validate": "node scripts/whats-new/validate-whats-new.js <ruta-del-json> --assets-root=<carpeta-de-assets>"
   ```

4. Pregunta si encadenarlo en `lint`, `prebuild` o el pipeline de CI; no lo hagas sin permiso.

## 5. Verificar y resumir

- Ejecuta `npm run whats-new:validate`, las specs nuevas, el lint y (si es rápido) el build del proyecto. Corrige lo que falle.
- Resume: ficheros creados/modificados, decisiones tomadas, cómo probarlo a mano (primer acceso → modal; recargar → no aparece; borrar la clave de storage → vuelve; usuario sin permiso → no ve esa tarjeta; tema oscuro) y el siguiente paso: `/whats-new-release` en la rama de release.
- No hagas commit salvo que el usuario lo pida.
