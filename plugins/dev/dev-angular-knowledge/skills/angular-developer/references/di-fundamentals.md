# Fundamentos de la inyección de dependencias (DI)

La inyección de dependencias (DI) es un patrón de diseño usado para organizar y compartir código a través de una aplicación, permitiendo "inyectar" funcionalidades en distintas partes de esta. Esto mejora la mantenibilidad, la escalabilidad y la testabilidad del código.

## Cómo funciona la DI en Angular

Hay dos formas principales en las que el código interactúa con el sistema de DI de Angular:

1.  **Proveer (Providing)**: poner valores (objetos, funciones, primitivos) a disposición del sistema de DI.
2.  **Inyectar (Injecting)**: solicitar al sistema de DI esos valores.

Los componentes, directivas y servicios de Angular participan automáticamente en la DI.

## Servicios

Un **servicio** es la forma más habitual de compartir datos y funcionalidad a través de una aplicación. Es una clase de TypeScript decorada con `@Service()`.

### Crear un servicio

Usa el decorador `@Service()` para convertir el servicio en un singleton disponible en toda la aplicación. Este es el enfoque recomendado para la mayoría de los servicios.

```ts
import {Service} from '@angular/core';

@Service()
export class AnalyticsLogger {
  trackEvent(category: string, value: string) {
    console.log('Analytics event logged:', {category, value});
  }
}
```

Usos habituales de los servicios:

- Clientes de datos (llamadas a la API)
- Gestión de estado
- Autenticación y autorización
- Registro de logs y manejo de errores
- Funciones de utilidad

## Inyectar dependencias

Usa la función `inject()` de Angular para solicitar dependencias.

### La función `inject()`

Puedes usar la función `inject()` para obtener una instancia de un servicio (o de cualquier otro token proporcionado).

```ts
import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {AnalyticsLogger} from './analytics-logger.service';

@Component({
  selector: 'app-navbar',
  template: `<a href="#" (click)="navigateToDetail($event)">Detail Page</a>`,
})
export class Navbar {
  // Inyectando dependencias mediante inicializadores de campo de clase
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsLogger);

  navigateToDetail(event: Event) {
    event.preventDefault();
    this.analytics.trackEvent('navigation', '/details');
    this.router.navigate(['/details']);
  }
}
```

### ¿Dónde se puede usar `inject()`? (Contexto de inyección)

Puedes llamar a `inject()` en un **contexto de inyección**. Los contextos de inyección más habituales se dan durante la construcción de un componente, directiva o servicio.

Lugares válidos para llamar a `inject()`:

1.  **Inicializadores de campo de clase** (recomendado)
2.  **Cuerpo del constructor**
3.  **Guards y resolvers de rutas** (que se ejecutan en un contexto de inyección)
4.  **Funciones factory** usadas en los providers

```typescript
import {Component, Directive, Service, inject, ElementRef} from '@angular/core';
import {HttpClient} from '@angular/common/http';

// 1. En un componente (inicializador de campo y constructor)
@Component(/* ... */)
export class Example {
  private service1 = inject(MyService); // ✅ Inicializador de campo

  private service2: MyService;
  constructor() {
    this.service2 = inject(MyService); // ✅ Cuerpo del constructor
  }
}

// 2. En una directiva
@Directive({
  /*...*/
})
export class MyDirective {
  private element = inject(ElementRef); // ✅ Inicializador de campo
}

// 3. En un servicio
@Service()
export class MyService {
  private http = inject(HttpClient); // ✅ Inicializador de campo
}

// 4. En un guard de ruta (funcional)
export const authGuard = () => {
  const auth = inject(AuthService); // ✅ Guard de ruta
  return auth.isAuthenticated();
};
```
