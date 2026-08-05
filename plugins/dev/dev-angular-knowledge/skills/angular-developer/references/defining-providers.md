# Definición de proveedores de dependencias

Angular ofrece formas automáticas y manuales de proveer dependencias a su sistema de inyección de dependencias (DI).

## Provisión automática

La forma más común de proveer un servicio es usando `providedIn: 'root'` en un `@Injectable()`.

### InjectionToken

Usa `InjectionToken` para dependencias que no son clases (objetos de configuración, funciones, primitivos). Un `InjectionToken` también puede proveerse automáticamente.

```ts
import {InjectionToken} from '@angular/core';

export interface AppConfig {
  apiUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config', {
  providedIn: 'root',
  factory: () => ({apiUrl: 'https://api.example.com'}),
});
```

## Provisión manual

Se usa el array `providers` cuando un servicio carece de `providedIn`, cuando quieres una nueva instancia para un componente específico, o al configurar valores en tiempo de ejecución.

```ts
@Component({
  providers: [
    // Shorthand for { provide: LocalService, useClass: LocalService }
    LocalService,

    // useClass: Swap implementations
    {provide: Logger, useClass: BetterLogger},

    // useValue: Provide static values
    {provide: API_URL_TOKEN, useValue: 'https://api.example.com'},

    // useFactory: Generate value dynamically
    {
      provide: ApiClient,
      useFactory: (http = inject(HttpClient)) => new ApiClient(http),
    },

    // useExisting: Create an alias
    {provide: OldLogger, useExisting: NewLogger},

    // multi: Provide multiple values for the same token as an array
    {provide: INTERCEPTOR_TOKEN, useClass: AuthInterceptor, multi: true},
  ],
})
export class Example {}
```

## Ámbitos de los proveedores

- **Bootstrap de la aplicación**: Singletons globales. Úsalo para clientes HTTP, logging o configuración a nivel de toda la app.
- **Componente/Directiva**: Instancias aisladas. Úsalo para estado específico del componente o formularios. Los servicios se destruyen cuando se destruye el componente.
- **Ruta**: Servicios específicos de una funcionalidad, cargados solo con rutas concretas.

## Patrón de bibliotecas: funciones `provide*`

Los autores de bibliotecas deberían exportar funciones que devuelvan arrays de proveedores para encapsular la configuración:

```ts
export function provideAnalytics(config: AnalyticsConfig): Provider[] {
  return [{provide: ANALYTICS_CONFIG, useValue: config}, AnalyticsService];
}
```
