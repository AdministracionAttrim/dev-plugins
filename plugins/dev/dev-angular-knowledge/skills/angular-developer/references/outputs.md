# Outputs (eventos personalizados)

Los outputs permiten que un componente hijo emita eventos personalizados a los que un componente padre puede escuchar. Angular recomienda usar la nueva función `output()` para aplicaciones modernas.

## Outputs basados en funciones

Declara los outputs usando la función `output()`. Esto devuelve un `OutputEmitterRef`.

```ts
import {Component, output} from '@angular/core';

@Component({
  selector: 'custom-slider',
  template: `<button (click)="changeValue(50)">Set to 50</button>`,
})
export class CustomSlider {
  // Output without event data
  readonly panelClosed = output<void>();

  // Output with event data (number)
  readonly valueChanged = output<number>();

  changeValue(newValue: number) {
    this.valueChanged.emit(newValue);
  }
}
```

### Uso en la plantilla

Enlaza con el evento de output usando paréntesis `()`. Si el evento emite datos, accede a ellos mediante la variable especial `$event`.

```html
<custom-slider (panelClosed)="savePanelState()" (valueChanged)="logValue($event)" />
```

## Opciones de configuración

La función `output` acepta un objeto de configuración para especificar un alias.

```ts
@Component({...})
export class CustomSlider {
  // The event is named 'valueChanged' in the template,
  // but accessed as 'changed' in the component class.
  readonly changed = output<number>({ alias: 'valueChanged' });
}
```

## Suscripción programática

Al crear componentes dinámicamente, puedes suscribirte a los outputs de forma programática:

```ts
const componentRef = viewContainerRef.createComponent(CustomSlider);

const subscription = componentRef.instance.valueChanged.subscribe((val) => {
  console.log('Value changed:', val);
});

// Clean up manually if needed (Angular cleans up destroyed components automatically)
subscription.unsubscribe();
```

## Outputs basados en decoradores (@Output)

La API heredada usa el decorador `@Output()` con un `EventEmitter`. Se sigue soportando pero no se recomienda para código nuevo.

```ts
import { Component, Output, EventEmitter } from '@angular/core';

@Component({...})
export class LegacyExample {
  @Output() readonly valueChanged = new EventEmitter<number>();

  // With alias
  @Output('customEventName') readonly changed = new EventEmitter<void>();
}
```

## Buenas prácticas

- **Prefiere `output()`**: usa el `output()` basado en funciones en lugar de `@Output()` y `EventEmitter`.
- **Nomenclatura**: usa `camelCase` para los nombres de los outputs. Evita el prefijo `on` (p. ej., usa `valueChanged` en lugar de `onValueChanged`).
- **Sin propagación por el DOM**: los eventos personalizados de Angular no se propagan (bubbling) por el árbol del DOM como los eventos nativos.
- **Evita colisiones**: no elijas nombres que choquen con eventos nativos del DOM (como `click` o `submit`).
