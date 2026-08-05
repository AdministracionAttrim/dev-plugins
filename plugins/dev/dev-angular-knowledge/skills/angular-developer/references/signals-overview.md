# Resumen de Angular Signals

Los signals son el fundamento de la reactividad en las aplicaciones modernas de Angular. Un **signal** es un envoltorio alrededor de un valor que notifica a los consumidores interesados cuando ese valor cambia.

## Signals escribibles (`signal`)

Usa `signal()` para crear estado que pueda actualizarse directamente.

```ts
import {signal} from '@angular/core';

// Crear un signal escribible
const count = signal(0);

// Leer el valor (siempre requiere llamar a la función getter)
console.log(count());

// Actualizar el valor directamente
count.set(3);

// Actualizar en base al valor anterior
count.update((value) => value + 1);
```

### Exponer como solo lectura

Al exponer estado desde un servicio, es buena práctica exponer una versión de solo lectura para evitar mutaciones externas.

```ts
private readonly _count = signal(0);
// Los consumidores pueden leer esto, pero no pueden llamar a .set() ni .update()
readonly count = this._count.asReadonly();
```

## Signals computados (`computed`)

Usa `computed()` para crear signals de solo lectura que derivan su valor de otros signals.

- **Evaluación perezosa**: La función de derivación no se ejecuta hasta que se lee el signal computado.
- **Memoizado**: El resultado se cachea. Solo se recalcula cuando cambia uno de los signals de los que depende.
- **Dependencias dinámicas**: Solo se rastrean los signals que _realmente se leen_ durante la derivación.

```ts
import {signal, computed} from '@angular/core';

const count = signal(0);
const doubleCount = computed(() => count() * 2);

// doubleCount se actualiza automáticamente cuando cambia count.
```

## Contextos reactivos

Un **contexto reactivo** es un estado en tiempo de ejecución en el que Angular monitoriza las lecturas de signals para establecer una dependencia.

Angular entra automáticamente en un contexto reactivo al evaluar:

- Signals `computed`
- Callbacks de `effect`
- Cálculos de `linkedSignal`
- Plantillas de componentes

### Lecturas sin seguimiento (`untracked`)

Si necesitas leer un signal dentro de un contexto reactivo _sin_ crear una dependencia (para que el contexto no se vuelva a ejecutar cuando el signal cambie), usa `untracked()`.

```ts
import {effect, untracked} from '@angular/core';

effect(() => {
  // Este effect solo se ejecuta cuando cambia currentUser.
  // NO se ejecuta cuando cambia counter, aunque counter se lea aquí.
  console.log(`User: ${currentUser()}, Count: ${untracked(counter)}`);
});
```

### Operaciones asíncronas en contextos reactivos

El contexto reactivo solo está activo para código **síncrono**. Las lecturas de signals después de un `await` no se rastrearán. **Lee siempre los signals antes de los puntos asíncronos.**

```ts
// ❌ INCORRECTO: theme() no se rastrea porque se lee después de await
effect(async () => {
  const data = await fetchUserData();
  console.log(theme());
});

// ✅ CORRECTO: Lee el signal antes del await
effect(async () => {
  const currentTheme = theme();
  const data = await fetchUserData();
  console.log(currentTheme);
});
```
