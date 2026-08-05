# Elementos anfitrión de componentes (Host Elements)

El **elemento anfitrión** (host element) es el elemento del DOM que coincide con el selector de un componente. La plantilla del componente se renderiza dentro de este elemento.

## Vincular al elemento anfitrión

Usa la propiedad `host` en el decorador `@Component` para vincular propiedades, atributos, estilos y eventos al elemento anfitrión. Este es el **enfoque preferido** frente a los decoradores heredados (legacy).

```ts
@Component({
  selector: 'custom-slider',
  host: {
    'role': 'slider', // Atributo estático
    '[attr.aria-valuenow]': 'value', // Vinculación de atributo
    '[class.active]': 'isActive()', // Vinculación de clase
    '[style.color]': 'color()', // Vinculación de estilo
    '[tabIndex]': 'disabled ? -1 : 0', // Vinculación de propiedad
    '(keydown)': 'onKeyDown($event)', // Vinculación de evento
  },
})
export class CustomSlider {
  protected readonly value = 0;
  protected readonly disabled = false;
  protected readonly isActive = signal(false);
  protected readonly color = signal('blue');

  onKeyDown(event: KeyboardEvent) {
    /* ... */
  }
}
```

## Decoradores heredados

`@HostBinding` y `@HostListener` se mantienen por compatibilidad con versiones anteriores, pero deben evitarse en código nuevo.

```ts
export class CustomSlider {
  @HostBinding('tabIndex')
  get tabIndex() {
    return this.disabled ? -1 : 0;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    /* ... */
  }
}
```

## Colisiones de vinculación

Si tanto el componente (vinculación de host) como el consumidor (vinculación de plantilla) se vinculan a la misma propiedad:

1. **Estática vs. estática**: gana la vinculación de la instancia (el consumidor).
2. **Estática vs. dinámica**: gana la vinculación dinámica.
3. **Dinámica vs. dinámica**: gana la vinculación de host del componente.

## Inyectar atributos del anfitrión

Usa `HostAttributeToken` junto con la función `inject` para leer atributos estáticos del elemento anfitrión en el momento de la construcción.

```ts
import {Component, HostAttributeToken, inject} from '@angular/core';

@Component({
  selector: 'app-btn',
  template: `<ng-content />`,
})
export class AppButton {
  // Lanza un error si falta 'type', a menos que se inyecte con { optional: true }
  type = inject(new HostAttributeToken('type'));
}
```

Uso:

```html
<app-btn type="primary">Click Me</app-btn>
```
