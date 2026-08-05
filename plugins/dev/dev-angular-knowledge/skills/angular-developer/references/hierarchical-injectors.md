# Inyectores jerárquicos

El sistema de inyección de dependencias de Angular es jerárquico, lo que significa que los servicios pueden acotarse (scope) a distintos niveles de la aplicación.

## Tipos de jerarquías de inyectores

1. **Jerarquía `EnvironmentInjector`**: se configura mediante `@Service()`, `@Injectable({ providedIn: 'root' })` o `ApplicationConfig.providers` durante el arranque (bootstrap). Son singletons globales.
2. **Jerarquía `ElementInjector`**: se crea implícitamente en cada elemento del DOM. Se configura mediante el array `providers` o `viewProviders` en `@Component()` o `@Directive()`.

## Reglas de resolución

Cuando se solicita una dependencia, Angular la resuelve en dos fases:

1. Busca hacia arriba en el árbol de **`ElementInjector`**, empezando por el componente/directiva solicitante hasta llegar al elemento raíz.
2. Si no la encuentra, busca en el árbol de **`EnvironmentInjector`**, empezando por el inyector de entorno más cercano hasta llegar a la raíz.
3. Si aun así no la encuentra, lanza un error (a menos que esté marcada como opcional).

## Modificadores de resolución

Puedes alterar cómo busca Angular una dependencia usando el objeto de opciones de `inject()`:

- **`optional`**: si no se encuentra la dependencia, devuelve `null` en lugar de lanzar un error.
- **`self`**: comprueba solo el `ElementInjector` actual. No sube por el árbol de padres.
- **`skipSelf`**: empieza a buscar en el `ElementInjector` padre, omitiendo el elemento actual.
- **`host`**: deja de buscar al llegar al límite de la vista del componente host.

```ts
@Component({...})
export class Example {
  // Returns null if not found instead of crashing
  optionalService = inject(MyService, { optional: true });

  // Skips this component's providers, looks at parent
  parentService = inject(ParentService, { skipSelf: true });
}
```

## `providers` frente a `viewProviders`

Al proveer un servicio a nivel de componente:

- **`providers`**: el servicio está disponible para el componente, su vista (plantilla) y cualquier **contenido proyectado** (`<ng-content>`).
- **`viewProviders`**: el servicio está disponible para el componente y su vista, pero **NO** para el contenido proyectado. Úsalo para aislar servicios del contenido que pasan los consumidores.
