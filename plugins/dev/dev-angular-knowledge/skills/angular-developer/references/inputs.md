# Inputs

Los inputs permiten que los datos fluyan de un componente padre a un componente hijo. Angular recomienda usar la API `input` basada en signals para aplicaciones modernas.

## Inputs basados en signals

Declara los inputs usando la función `input()`. Esto devuelve un `InputSignal`.

```ts
import {Component, input, computed} from '@angular/core';

@Component({
  selector: 'app-user',
  template: `<p>{{ label() }} ({{ age() }})</p>`,
})
export class User {
  // Optional input with default value
  readonly name = input('Guest');

  // Required input
  readonly age = input.required<number>();

  // Inputs are reactive signals
  protected readonly label = computed(() => `Name: ${this.name()}`);
}
```

### Uso en la plantilla

```html
<app-user [name]="userName" [age]="25" />
```

## Opciones de configuración

La función `input` acepta un objeto de configuración:

- **Alias**: cambia el nombre de propiedad usado en las plantillas.
- **Transform**: modifica el valor antes de que llegue al componente.

```ts
import { input, booleanAttribute } from '@angular/core';

@Component({...})
export class CustomButton {
  // Alias example
  readonly label = input('', { alias: 'btnLabel' });

  // Transform example using built-in helper
  readonly disabled = input(false, { transform: booleanAttribute });
}
```

## Model inputs (enlace bidireccional)

Usa `model()` para crear un input que soporte enlace de datos bidireccional (two-way data binding).

```ts
@Component({
  selector: 'custom-counter',
  template: `<button (click)="increment()">+</button>`,
})
export class CustomCounter {
  readonly value = model(0);

  increment() {
    this.value.update((v) => v + 1);
  }
}
```

### Uso

```html
<!-- Two-way binding with a signal -->
<custom-counter [(value)]="mySignal" />

<!-- Two-way binding with a plain property -->
<custom-counter [(value)]="myProperty" />
```

## Inputs basados en decoradores (@Input)

La API heredada se sigue soportando pero no se recomienda para código nuevo.

```ts
import { Component, Input } from '@angular/core';

@Component({...})
export class Legacy {
  @Input({ required: true }) value = 0;
  @Input({ transform: trimString }) label = '';
}
```

## Buenas prácticas

- **Prefiere los signals**: usa `input()` en lugar de `@Input()` para una mejor reactividad y seguridad de tipos.
- **Inputs obligatorios**: usa `input.required()` para datos obligatorios y así obtener errores en tiempo de compilación.
- **Transforms puras**: asegúrate de que las funciones de transformación de inputs sean puras y analizables estáticamente.
- **Evita colisiones**: no uses nombres de input que choquen con propiedades estándar del DOM (p. ej., `id`, `title`).
