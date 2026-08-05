# Contexto de inyección (Injection Context)

La función `inject()` solo puede usarse cuando el código se ejecuta dentro de un **contexto de inyección**.

## ¿Dónde hay disponible un contexto de inyección?

Un contexto de inyección está disponible automáticamente en:

1. **Inicializadores de campo** de clases instanciadas por DI (`@Service`, `@Injectable`, `@Component`, `@Directive`, `@Pipe`).
2. **Constructores** de clases instanciadas por DI.
3. **Funciones factory** especificadas en configuraciones `useFactory` o `InjectionToken`.
4. **APIs funcionales** ejecutadas por Angular (p. ej., guards de ruta funcionales, resolvers, interceptores).

```ts
@Component({...})
export class Example {
  // ✅ Valid: Field initializer
  private router = inject(Router);

  constructor() {
    // ✅ Valid: Constructor
    const http = inject(HttpClient);
  }

  onClick() {
    // ❌ Invalid: Not an injection context
    // const auth = inject(AuthService);
  }
}
```

## `runInInjectionContext`

Si necesitas ejecutar una función dentro de un contexto de inyección (a menudo necesario para la creación dinámica de componentes o para testing), usa `runInInjectionContext`. Esto requiere acceso a un injector existente (como `EnvironmentInjector` o `Injector`).

```ts
import {inject, EnvironmentInjector, runInInjectionContext, Service} from '@angular/core';

@Service()
export class MyService {
  private injector = inject(EnvironmentInjector);

  doSomethingDynamic() {
    runInInjectionContext(this.injector, () => {
      // ✅ Now valid to use inject() here
      const router = inject(Router);
    });
  }
}
```

## `assertInInjectionContext`

Usa `assertInInjectionContext` en funciones de utilidad para garantizar que se llaman desde un contexto válido. Lanza un error claro si no es así.

```ts
import {assertInInjectionContext, inject, ElementRef} from '@angular/core';

export function injectNativeElement<T extends Element>(): T {
  assertInInjectionContext(injectNativeElement);
  return inject(ElementRef).nativeElement;
}
```
