# Configuración del entorno

## Estrategias de configuración

Angular admite dos estrategias de configuración principales:

- **Configuración en tiempo de compilación** usando archivos de entorno
- **Configuración en tiempo de ejecución** cargando valores al iniciar la aplicación

Elige el enfoque según los requisitos de tu despliegue.

---

## Configuración en tiempo de compilación

Los archivos de entorno definen valores de configuración que se sustituyen en tiempo de compilación.

> **Nota de seguridad:** los archivos de entorno se empaquetan dentro de la aplicación del lado del cliente.
> Son visibles para cualquiera que pueda cargar la página.
> Nunca guardes información sensible como claves de API, secretos o credenciales en los archivos de entorno.
> Estos valores pueden ser accedidos fácilmente por los usuarios.

Genera los archivos de entorno usando la CLI:

```bash
ng generate environments
```

Esto crea archivos específicos por entorno como:

```ts
// environment.ts
export const environment = {
  apiUrl: 'https://api.example.com',
};
```

```ts
// environment.development.ts
export const environment = {
  apiUrl: 'http://localhost:3000',
};
```

Importa el entorno donde se necesite:

```ts
import {environment} from '../environments/environment';

const apiUrl = environment.apiUrl;
```

La CLI de Angular sustituye el archivo apropiado según la configuración de compilación.

Si necesitas comprobar el modo de desarrollo, usa `isDevMode()` de `@angular/core` en lugar de depender de una bandera `production` mantenida manualmente.

> Los cambios en los archivos de entorno requieren recompilar la aplicación.

---

## Configuración en tiempo de ejecución (avanzado)

En algunos escenarios, las aplicaciones necesitan cargar la configuración en tiempo de ejecución en lugar de en tiempo de compilación.

Esto permite desplegar el mismo artefacto de compilación en varios entornos sin recompilar.

Un enfoque habitual es cargar un archivo de configuración JSON desde la carpeta `assets` durante la
inicialización de la aplicación.

### Ejemplo

```json
// src/assets/config.json
{
  "apiUrl": "https://api.example.com"
}
```

Carga la configuración antes de que arranque la aplicación:

```ts
import {Service, inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Service()
export class AppConfigService {
  private config!: {apiUrl: string};

  private readonly http = inject(HttpClient);

  loadConfig() {
    return this.http.get<AppConfig>('/assets/config.json').pipe(
      tap((data) => {
        this.config = data;
      }),
    );
  }

  get apiUrl(): string {
    return this.config.apiUrl;
  }
}
```

Registra el cargador durante el arranque (bootstrap) de la aplicación:

```ts
import {provideAppInitializer, inject} from '@angular/core';

provideAppInitializer(() => {
  const config = inject(AppConfigService);
  return config.loadConfig();
});
```

Esto garantiza que la configuración esté disponible antes de que se renderice la aplicación.

> La configuración en tiempo de ejecución es un patrón avanzado y no es necesaria para la mayoría de las aplicaciones.

---

## Elegir una estrategia

| Criterio                          | Tiempo de compilación | Tiempo de ejecución |
| ---------------------------------- | ---------- | ------------ |
| Cambiar sin recompilar             | No         | Sí          |
| Rendimiento de arranque            | Más rápido     | Ligero retraso |
| Complejidad                        | Baja        | Moderada     |
| Flexibilidad de despliegue         | Limitada    | Alta         |

Usa la configuración en tiempo de compilación para la mayoría de las aplicaciones, y la configuración en tiempo de ejecución cuando necesites
desplegar la misma compilación en varios entornos.
