# Efectos secundarios con `effect` y `afterRenderEffect`

En Angular, un **efecto** (effect) es una operación que se ejecuta cada vez que cambia uno o más valores de signal que rastrea.

## Cuándo usar `effect`

Los efectos están pensados para sincronizar el estado de los signals con APIs imperativas que no son signals.

**Casos de uso válidos:**

- Registro de analítica (logging).
- Sincronizar estado con `localStorage` o `sessionStorage`.
- Realizar renderizado personalizado en un `<canvas>` o en una librería de gráficos de terceros.

**REGLA CRÍTICA: NO uses efectos para propagar estado.**
Si te encuentras usando `.set()` o `.update()` sobre un signal _dentro_ de un efecto para mantener dos signals sincronizados, estás cometiendo un error. Esto provoca errores `ExpressionChangedAfterItHasBeenChecked` y bucles infinitos. **Usa siempre `computed()` o `linkedSignal()` para derivar estado.**

## Uso básico

Los efectos se ejecutan de forma asíncrona durante el proceso de detección de cambios. Siempre se ejecutan al menos una vez.

```ts
import { Component, signal, effect } from '@angular/core';

@Component({...})
export class Example {
  protected readonly count = signal(0);

  constructor() {
    // Effect must be created in an injection context (e.g., a constructor)
    effect((onCleanup) => {
      console.log(`Count changed to ${this.count()}`);

      const timer = setTimeout(() => console.log('Timer finished'), 1000);

      // Cleanup function runs before the next execution, or when destroyed
      onCleanup(() => clearTimeout(timer));
    });
  }
}
```

## Manipulación del DOM con `afterRenderEffect`

El `effect` estándar se ejecuta _antes_ de que Angular actualice el DOM. Si necesitas inspeccionar o modificar manualmente el DOM en respuesta a un cambio de signal (por ejemplo, al integrar una librería de UI de terceros), usa `afterRenderEffect`.

`afterRenderEffect` se ejecuta después de que Angular haya terminado de renderizar el DOM.

### Fases de renderizado

Para evitar reflows (forced layout thrashing), `afterRenderEffect` te obliga a dividir tus lecturas y escrituras del DOM en fases específicas.

```ts
import { Component, afterRenderEffect, viewChild, ElementRef } from '@angular/core';

@Component({...})
export class Chart {
  canvas = viewChild.required<ElementRef>('canvas');

  constructor() {
    afterRenderEffect({
      // 1. Read from the DOM
      earlyRead: () => {
        return this.canvas().nativeElement.getBoundingClientRect().width;
      },
      // 2. Write to the DOM (receives the result of the previous phase)
      write: (width) => {
        // NEVER read from the DOM in the write phase.
        setupChart(this.canvas().nativeElement, width);
      }
    });
  }
}
```

**Fases disponibles (se ejecutan en este orden):**

1. `earlyRead`
2. `write` (nunca leas aquí)
3. `mixedReadWrite` (evítala si es posible)
4. `read` (nunca escribas aquí)

_Nota: `afterRenderEffect` solo se ejecuta en el cliente, nunca durante el renderizado en el servidor (SSR, Server-Side Rendering)._
