# dev-mapbox-integration

Plugin de Claude Code especialista en **Mapbox GL JS integrado en Angular** (standalone, signals, `OnPush`): resuelve dudas de arquitectura, genera snippets y ayuda a depurar mapas, capas, clustering, dibujo de polígonos, estilos y geocoding.

## Qué incluye

- **Agente `mapbox-architect`** (`agents/mapbox-architect.md`) — especialista que responde preguntas de arquitectura, genera código y diagnostica problemas de Mapbox GL JS. Antes de responder, siempre lee la skill del plugin y decide si necesita `WebFetch` a la documentación oficial de Mapbox (docs.mapbox.com o los repos de `mapbox-gl-draw`/`mapbox-gl-geocoder`) para precisar firmas de método, opciones o tipos exactos. Nunca propone Zone.js, NgModules ni patrones deprecados de Angular; nunca hardcodea un access token; siempre destruye el mapa en `ngOnDestroy()` con `map.remove()`.
- **Comando `/mapbox`** (`commands/mapbox.md`) — invoca al agente `mapbox-architect` con la pregunta indicada. Admite flags para acotar el contexto:
  - `--layers` — capas y fuentes
  - `--cluster` — clustering de marcadores
  - `--draw` — dibujo de polígonos con `mapbox-gl-draw`
  - `--style` — estilos y expresiones
  - `--geocode` — geocoding y búsqueda de lugares
  - `--docs <tema>` — fuerza `WebFetch` a docs.mapbox.com antes de responder
  - `--snippet <feature>` — responde solo con código, sin explicación
- **Skill `mapbox-integration`** (`skills/mapbox-integration/SKILL.md`) — patrones canónicos curados que el agente consulta siempre antes de responder. Cubre:
  - **Capas y fuentes**: `addSource`/`addLayer` (GeoJSON, vector, raster), tipos de capa (fill, line, circle, symbol), orden con `beforeId`, `setData()` en tiempo real, visibilidad y filtros dinámicos, eventos de interacción por capa.
  - **Clustering**: clustering nativo de Mapbox GL (sin librería extra) con capas `clusters`, `cluster-count` y `unclustered-point`, y expansión de zoom con `getClusterExpansionZoom()`.
  - **Dibujo de polígonos**: integración de `@mapbox/mapbox-gl-draw`, eventos `draw.create`/`draw.update`/`draw.delete` y su cableado a un componente Angular con `output()`.
  - **Estilos**: estilos base oficiales (streets, light, dark, satellite, outdoors), cambio dinámico de estilo conservando capas propias, expresiones (`match`, `interpolate`, `step`, `case`).
  - **Geocoding**: control `MapboxGeocoder` integrado en el mapa, reverse geocoding programático, e integración con formularios reactivos (`patchValue`).
  - Además incluye tipos comunes sugeridos y un ejemplo de mocks para tests (`vi.fn()`).

## Cómo instalarlo

Instala este plugin desde el marketplace `attrim-marketplace` con el flujo habitual de plugins de Claude Code (comando `/plugin` o el mecanismo equivalente de tu versión de Claude Code), seleccionando `dev-mapbox-integration`.

## Cómo usarlo

**1. Clustering de puntos con `/mapbox`:**

```
/mapbox --cluster ¿cómo agrupo 5000 marcadores de sucursales sin librería extra y expando el cluster al hacer click?
```

El agente responderá usando el patrón de clustering nativo de la skill (fuente GeoJSON con `cluster: true`, capas `clusters`/`cluster-count`/`unclustered-point` y `getClusterExpansionZoom()`), adaptado al servicio wrapper que ya exista en tu proyecto.

**2. Dibujo de polígonos, pidiendo solo código:**

```
/mapbox --draw --snippet componente Angular standalone que permita dibujar una zona de cobertura y emita el GeoJSON del polígono con output()
```

Con `--snippet` la respuesta es solo código TypeScript tipado, sin explicación, basado en la integración de `@mapbox/mapbox-gl-draw` de la skill.

**3. Petición en lenguaje natural que dispara al agente `mapbox-architect`** (sin usar `/mapbox` explícitamente, simplemente describiendo el problema):

```
Tengo un mapa Mapbox en un componente Angular con signals y necesito que al cambiar de estilo (streets → satellite) no se me borren las capas de zonas que dibujé yo. ¿Cómo lo hago sin duplicar código?
```

Claude Code puede delegar esta consulta al agente `mapbox-architect`, que consultará la skill (sección "Cambio dinámico de estilo conservando capas propias") y, si la pregunta requiere precisión de API, hará `WebFetch` a la documentación oficial antes de responder.

**4. Forzar consulta a documentación oficial:**

```
/mapbox --docs expressions ¿qué diferencia hay entre "step" e "interpolate" para el color de un cluster por tamaño?
```

## Requisitos / configuración previa

- Proyecto **Angular standalone** con **signals** (`signal()`, `computed()`, `effect()`, `output()`) y componentes **`OnPush`** — el agente asume este estilo y no propone Zone.js, NgModules ni `@Input()`/`@Output()` clásicos.
- **Access token de Mapbox** disponible en la configuración de entorno del proyecto (p. ej. `environment.mapboxKey`) — el agente y la skill nunca lo hardcodean en un snippet ni leen ficheros `environment.*.ts` de producción para obtenerlo.
- Para dibujo de polígonos: `@mapbox/mapbox-gl-draw` (+ `@types/mapbox__mapbox-gl-draw`).
- Para geocoding con UI: `@mapbox/mapbox-gl-geocoder` (+ `@types/mapbox__mapbox-gl-geocoder`).
- Tailwind (u otro sistema de estilos del proyecto) para el contenedor/wrapper del mapa — nunca estilos inline, según la convención asumida por el agente.

## Notas relevantes

- La skill propone una convención de rutas de referencia (`src/app/core/services/mapbox.service.ts` para el servicio wrapper, `src/app/shared/ui/map/map.component.ts` para el componente reutilizable), pero tanto el agente como la skill insisten en que es solo un **punto de partida**: antes de aplicar cualquier patrón, hay que localizar con `Glob`/`Grep` si el proyecto ya tiene un servicio o componente equivalente y ampliarlo en vez de duplicarlo.
- El agente tiene acceso a `Read`, `Glob`, `Grep` y `WebFetch` — puede inspeccionar el código real del proyecto y consultar documentación externa, pero no edita archivos directamente (no tiene `Edit`/`Write`); las respuestas son código sugerido para que el desarrollador lo aplique.
- Reglas duras del agente que conviene conocer: nunca añade fuentes o capas fuera del evento `load` del mapa, nunca usa `(mapboxgl as any)` salvo necesidad absoluta y documentada, y ante preguntas ambiguas hace una única pregunta de aclaración antes de responder.
