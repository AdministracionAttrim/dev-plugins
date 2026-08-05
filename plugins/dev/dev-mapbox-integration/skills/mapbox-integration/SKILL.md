---
name: mapbox-integration
description: Patrones canónicos de integración de Mapbox GL JS en Angular (signals, OnPush) -- capas/fuentes, clustering, dibujo de polígonos, cambio de estilos y geocoding. Usar al implementar o depurar cualquier funcionalidad de mapas con Mapbox GL en el proyecto.
---

# Mapbox GL Integration

Patrones canónicos de integración con Mapbox GL en un proyecto Angular standalone + signals + OnPush.

## Convención sugerida (punto de partida, adaptar al proyecto real)

- **Servicio wrapper** de la librería externa, p. ej. `src/app/core/services/mapbox.service.ts` (mantiene la dependencia de Mapbox aislada en `core/`, nunca esparcida por componentes).
- **Componente de mapa reutilizable**, p. ej. `src/app/shared/ui/map/map.component.ts`.
- **Token de acceso** en la configuración de entorno del proyecto (p. ej. `environment.mapboxKey`) — **nunca hardcodeado en un snippet ni en un fichero versionado**; y nunca leer archivos `environment.*.ts` de producción para obtenerlo, usar siempre la referencia simbólica.

Antes de aplicar cualquier patrón de este documento, localiza (con `Glob`/`Grep`) si el proyecto ya tiene un servicio/componente equivalente — amplíalo en vez de duplicarlo.

---

## Configuración base

```typescript
// src/app/core/services/mapbox.service.ts
import { Injectable } from '@angular/core';
import mapboxgl, { Map, NavigationControl, GeolocateControl, LngLatLike } from 'mapbox-gl';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class MapboxService {
  private readonly accessToken = environment.mapboxKey;

  constructor() {
    mapboxgl.accessToken = this.accessToken;
  }

  createMap(options: {
    container: HTMLElement;
    center: LngLatLike;
    zoom: number;
    style?: string;
  }): Map {
    const map = new Map({
      container: options.container,
      style: options.style ?? 'mapbox://styles/mapbox/streets-v12',
      center: options.center,
      zoom: options.zoom,
    });

    map.addControl(new NavigationControl(), 'top-right');
    map.addControl(new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right');

    return map;
  }
}
```

---

## Capas y fuentes

### Flujo canónico

Siempre esperar el evento `load` antes de añadir fuentes o capas:

```typescript
map.on('load', () => {
  // Primero fuente, luego capa que la referencia
  map.addSource('mi-fuente', { ... });
  map.addLayer({ id: 'mi-capa', source: 'mi-fuente', ... });
});
```

### Tipos de fuente

```typescript
// GeoJSON (datos propios)
map.addSource('zonas', {
  type: 'geojson',
  data: '/assets/zonas.geojson',  // URL o objeto FeatureCollection
});

// Vector tiles (Mapbox hosted)
map.addSource('terrain', {
  type: 'vector',
  url: 'mapbox://mapbox.mapbox-terrain-v2',
});

// Raster tiles
map.addSource('satellite', {
  type: 'raster',
  url: 'mapbox://mapbox.satellite',
  tileSize: 256,
});
```

### Tipos de capa

```typescript
// fill — polígonos rellenos
map.addLayer({
  id: 'zonas-fill',
  type: 'fill',
  source: 'zonas',
  paint: {
    'fill-color': '#088',
    'fill-opacity': 0.4,
  },
});

// line — contornos y rutas
map.addLayer({
  id: 'zonas-outline',
  type: 'line',
  source: 'zonas',
  paint: {
    'line-color': '#005555',
    'line-width': 2,
  },
});

// circle — puntos
map.addLayer({
  id: 'puntos',
  type: 'circle',
  source: 'puntos',
  paint: {
    'circle-radius': 6,
    'circle-color': '#B42222',
  },
});

// symbol — iconos/texto
map.addLayer({
  id: 'etiquetas',
  type: 'symbol',
  source: 'puntos',
  layout: {
    'text-field': ['get', 'nombre'],
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
    'text-offset': [0, 1.2],
    'text-anchor': 'top',
  },
});
```

### Orden de capas (beforeId)

```typescript
// Insertar capa DEBAJO de las etiquetas del mapa base
map.addLayer({ id: 'mi-fill', ... }, 'road-label');

// Actualizar datos de una fuente GeoJSON en tiempo real
(map.getSource('zonas') as mapboxgl.GeoJSONSource).setData(nuevoGeoJSON);
```

### Visibilidad dinámica

```typescript
map.setLayoutProperty('mi-capa', 'visibility', visible ? 'visible' : 'none');
```

### Expresiones de filtro

```typescript
// Filtrar features por propiedad
map.setFilter('puntos', ['==', ['get', 'categoria'], 'playa']);

// Limpiar filtro
map.setFilter('puntos', null);
```

### Eventos de interacción sobre capas

```typescript
map.on('click', 'puntos', (e) => {
  const feature = e.features?.[0];
  if (!feature) return;
  const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
  const nombre = feature.properties?.['nombre'] as string;

  new mapboxgl.Popup()
    .setLngLat(coords)
    .setHTML(`<strong>${nombre}</strong>`)
    .addTo(map);
});

// Cambiar cursor al hover
map.on('mouseenter', 'puntos', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'puntos', () => { map.getCanvas().style.cursor = ''; });
```

---

## Clustering

Clustering nativo de Mapbox GL (sin librería extra):

```typescript
// 1. Fuente con cluster habilitado
map.addSource('recursos', {
  type: 'geojson',
  data: featureCollection,  // GeoJSON con los puntos
  cluster: true,
  clusterMaxZoom: 14,       // zoom máximo para clusterizar
  clusterRadius: 50,        // radio en píxeles
});

// 2. Capa para los círculos de cluster
map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'recursos',
  filter: ['has', 'point_count'],  // solo features clusterizadas
  paint: {
    'circle-color': [
      'step', ['get', 'point_count'],
      '#51bbd6', 10,   // azul claro si < 10
      '#f1f075', 30,   // amarillo si < 30
      '#f28cb1'        // rosa si >= 30
    ],
    'circle-radius': [
      'step', ['get', 'point_count'],
      20, 10, 30, 30, 40
    ],
  },
});

// 3. Capa para el contador dentro del cluster
map.addLayer({
  id: 'cluster-count',
  type: 'symbol',
  source: 'recursos',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12,
  },
});

// 4. Capa para puntos individuales (no clusterizados)
map.addLayer({
  id: 'unclustered-point',
  type: 'circle',
  source: 'recursos',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#11b4da',
    'circle-radius': 6,
    'circle-stroke-width': 1,
    'circle-stroke-color': '#fff',
  },
});

// 5. Click en cluster → zoom para expandir
map.on('click', 'clusters', (e) => {
  const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
  const clusterId = features[0]?.properties?.['cluster_id'] as number;
  const source = map.getSource('recursos') as mapboxgl.GeoJSONSource;

  source.getClusterExpansionZoom(clusterId, (err, zoom) => {
    if (err) return;
    const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
    map.easeTo({ center: coords, zoom: zoom! });
  });
});
```

---

## Dibujo de polígonos

Requiere `@mapbox/mapbox-gl-draw`:

```bash
npm install @mapbox/mapbox-gl-draw
npm install -D @types/mapbox__mapbox-gl-draw
```

```typescript
import MapboxDraw from '@mapbox/mapbox-gl-draw';

// En MapboxService o directamente en el componente
initDraw(map: Map): MapboxDraw {
  const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true,
    },
    defaultMode: 'draw_polygon',
  });

  map.addControl(draw);
  return draw;
}
```

### Eventos de dibujo

```typescript
// Feature creada
map.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
  const polygon = e.features[0];
  const coordinates = (polygon.geometry as GeoJSON.Polygon).coordinates;
  // Emitir al componente padre via output()
});

// Feature modificada
map.on('draw.update', (e: { features: GeoJSON.Feature[] }) => {
  const updated = e.features[0];
});

// Feature eliminada
map.on('draw.delete', (e: { features: GeoJSON.Feature[] }) => {
  const deleted = e.features[0];
});
```

### Integración en componente Angular

```typescript
@Component({
  selector: 'app-zone-draw-map',
  standalone: true,
  template: `<div #mapContainer class="h-96 w-full rounded-lg"></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZoneDrawMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  polygonChange = output<GeoJSON.Polygon | null>();

  private mapboxService = inject(MapboxService);
  private map = signal<Map | null>(null);
  private draw = signal<MapboxDraw | null>(null);

  ngAfterViewInit() {
    const map = this.mapboxService.createMap({
      container: this.mapContainer.nativeElement,
      center: [-0.3763, 39.4699],
      zoom: 10,
    });

    map.on('load', () => {
      const draw = this.mapboxService.initDraw(map);
      this.draw.set(draw);

      map.on('draw.create', (e) => {
        this.polygonChange.emit(e.features[0].geometry as GeoJSON.Polygon);
      });
      map.on('draw.update', (e) => {
        this.polygonChange.emit(e.features[0].geometry as GeoJSON.Polygon);
      });
      map.on('draw.delete', () => {
        this.polygonChange.emit(null);
      });
    });

    this.map.set(map);
  }

  ngOnDestroy() {
    this.map()?.remove();
  }
}
```

---

## Estilos

### Estilos base de Mapbox

```typescript
// URLs de estilos oficiales (v12 recomendado)
const STYLES = {
  streets:   'mapbox://styles/mapbox/streets-v12',
  outdoors:  'mapbox://styles/mapbox/outdoors-v12',
  light:     'mapbox://styles/mapbox/light-v11',
  dark:      'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;
```

### Cambio dinámico de estilo (conservando capas propias)

```typescript
changeStyle(map: Map, newStyle: string, customLayerIds: string[]) {
  // 1. Guardar datos de fuentes propias antes del cambio
  const savedData = customLayerIds.map(id => ({
    id,
    data: (map.getSource(id) as mapboxgl.GeoJSONSource)?._data,
  }));

  // 2. Cambiar estilo
  map.setStyle(newStyle);

  // 3. Re-añadir fuentes y capas cuando el nuevo estilo cargue
  map.once('style.load', () => {
    savedData.forEach(({ id, data }) => {
      if (data) {
        map.addSource(id, { type: 'geojson', data });
        // re-añadir capas que usan esta fuente
      }
    });
  });
}
```

### Expresiones de estilo dinámico

```typescript
// Color basado en propiedad del feature
'fill-color': [
  'match',
  ['get', 'tipo'],
  'playa', '#4FC3F7',
  'montana', '#81C784',
  'ciudad', '#FF8A65',
  '#BDBDBD'  // default
]

// Interpolación de tamaño por zoom
'circle-radius': [
  'interpolate', ['linear'], ['zoom'],
  5, 4,   // zoom 5 → radio 4
  15, 12  // zoom 15 → radio 12
]
```

### Capas custom sobre estilo base (sin afectar el estilo)

```typescript
// Siempre usar addLayer con beforeId para no sobreescribir etiquetas del mapa
const LABEL_LAYER = 'road-label';  // capa de referencia en streets-v12

map.addLayer({ id: 'mi-fill', type: 'fill', ... }, LABEL_LAYER);
```

---

## Geocoding

Requiere `@mapbox/mapbox-gl-geocoder`:

```bash
npm install @mapbox/mapbox-gl-geocoder
npm install -D @types/mapbox__mapbox-gl-geocoder
```

### Control integrado en el mapa

```typescript
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

addGeocoder(map: Map, options?: Partial<MapboxGeocoder.GeocoderOptions>): MapboxGeocoder {
  const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl as any,
    placeholder: 'Buscar lugar...',
    language: 'es',       // ajustar al idioma del proyecto
    countries: 'es',      // ajustar al mercado del proyecto — no asumir España
    bbox: [-9.5, 35.9, 4.5, 43.8],  // bounding box del área geográfica del proyecto
    ...options,
  });

  map.addControl(geocoder);
  return geocoder;
}
```

### Eventos del geocoder

```typescript
geocoder.on('result', (e: { result: MapboxGeocoder.Result }) => {
  const { center, place_name, geometry } = e.result;
  // center = [lng, lat]
  console.log('Seleccionado:', place_name, center);
});

geocoder.on('clear', () => {
  // El usuario limpió la búsqueda
});

geocoder.on('error', (e: { error: Error }) => {
  console.error('Geocoder error:', e.error);
});
```

### Geocoding sin UI (reverse geocoding programático)

```typescript
async reverseGeocode(lng: number, lat: number): Promise<string> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${mapboxgl.accessToken}&language=es`;

  const res = await fetch(url);
  const data = await res.json();
  return data.features?.[0]?.place_name ?? 'Lugar desconocido';
}
```

### Integración en componente Angular con formulario reactivo

```typescript
ngAfterViewInit() {
  const map = this.mapboxService.createMap({ ... });

  map.on('load', () => {
    const geocoder = this.mapboxService.addGeocoder(map);

    geocoder.on('result', (e) => {
      const [lng, lat] = e.result.center;
      this.form.patchValue({ longitude: lng, latitude: lat, address: e.result.place_name });
    });
  });
}
```

---

## Tipos comunes

```typescript
// src/app/shared/ui/map/models/map.models.ts
export interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  color?: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export type MapStyle = 'streets' | 'outdoors' | 'light' | 'dark' | 'satellite' | 'satellite-streets';
```

---

## Testing

```typescript
// Mock completo de MapboxService para tests
const mockMapboxService = {
  createMap: vi.fn(() => ({
    on: vi.fn(),
    once: vi.fn(),
    addControl: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getSource: vi.fn(),
    setStyle: vi.fn(),
    remove: vi.fn(),
    getCanvas: vi.fn(() => ({ style: {} })),
  })),
  initDraw: vi.fn(() => ({
    add: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => ({ features: [] })),
  })),
  addGeocoder: vi.fn(() => ({
    on: vi.fn(),
  })),
};
```

---

## Docs oficiales (para WebFetch)

| Tema | URL |
|------|-----|
| API completa | `https://docs.mapbox.com/mapbox-gl-js/api/` |
| Map class | `https://docs.mapbox.com/mapbox-gl-js/api/map/` |
| Sources | `https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/` |
| Layers | `https://docs.mapbox.com/mapbox-gl-js/style-spec/layers/` |
| Expressions | `https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/` |
| Clustering | `https://docs.mapbox.com/mapbox-gl-js/example/cluster/` |
| Draw plugin | `https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/API.md` |
| Geocoder plugin | `https://github.com/mapbox/mapbox-gl-geocoder/blob/main/API.md` |
