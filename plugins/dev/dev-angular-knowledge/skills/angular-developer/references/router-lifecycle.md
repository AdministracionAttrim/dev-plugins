# Ciclo de vida y eventos del Router

El Router de Angular emite eventos a través del observable `Router.events`, lo que te permite rastrear el ciclo de vida de la navegación de principio a fin.

## Eventos comunes del Router (orden cronológico)

1. **`NavigationStart`**: Comienza la navegación.
2. **`RoutesRecognized`**: El router hace coincidir la URL con una ruta.
3. **`GuardsCheckStart` / `End`**: Evaluación de `canActivate`, `canMatch`, etc.
4. **`ResolveStart` / `End`**: Fase de resolución de datos (obtención de datos mediante resolvers).
5. **`NavigationEnd`**: La navegación se completó correctamente.
6. **`NavigationCancel`**: Navegación cancelada (por ejemplo, una guarda devolvió `false`).
7. **`NavigationError`**: La navegación falló (por ejemplo, un error en un resolver).

## Suscribirse a eventos

Inyecta el `Router` y filtra el observable `events`.

```ts
import {Router, NavigationStart, NavigationEnd} from '@angular/router';

export class MyService {
  private router = inject(Router);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((event) => {
      console.log('Navigated to:', event.url);
    });
  }
}
```

## Depuración

Habilita el registro detallado en consola de todos los eventos de enrutamiento durante el arranque de la aplicación.

```ts
provideRouter(routes, withDebugTracing());
```

## Casos de uso comunes

- **Indicadores de carga**: Muestra un spinner cuando se dispara `NavigationStart` y ocúltalo en `NavigationEnd`/`Cancel`/`Error`.
- **Analítica**: Rastrea las visitas a páginas escuchando `NavigationEnd`.
- **Gestión del scroll**: Responde a eventos `Scroll` para un comportamiento de scroll personalizado.
