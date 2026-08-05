# Estado dependiente con `linkedSignal`

La función `linkedSignal` te permite crear un estado escribible que está intrínsecamente vinculado a otro estado. Es perfecta para estado que necesita un valor por defecto derivado de una entrada u otra señal, pero que el usuario aún puede modificar de forma independiente.

Si el estado de origen cambia, `linkedSignal` se reinicia a un nuevo valor calculado.

## Uso básico

Cuando solo necesitas recalcular a partir de un origen, pasa una función de cálculo. `linkedSignal` funciona como `computed`, pero la señal resultante es escribible (puedes llamar a `.set()` o `.update()` sobre ella).

```ts
import { Component, signal, linkedSignal } from '@angular/core';

@Component({...})
export class ShippingMethodPicker {
  protected readonly shippingOptions = signal(['Ground', 'Air', 'Sea']);

  // Por defecto, la primera opción.
  // Si shippingOptions cambia, selectedOption se reinicia a la nueva primera opción.
  protected readonly selectedOption = linkedSignal(() => this.shippingOptions()[0]);

  changeShipping(index: number) {
    // ¡Todavía podemos actualizar esta señal manualmente!
    this.selectedOption.set(this.shippingOptions()[index]);
  }
}
```

## Uso avanzado: teniendo en cuenta el estado anterior

A veces, cuando el estado de origen cambia, quieres conservar la selección manual del usuario si sigue siendo válida. Para ello, usa la sintaxis de objeto proporcionando `source` y `computation`.

La función `computation` recibe el nuevo valor del origen y un objeto `previous` que contiene el valor anterior del origen y el valor anterior de `linkedSignal`.

```ts
interface ShippingMethod { id: number; name: string; }

@Component({...})
export class ShippingMethodPicker {
  protected readonly shippingOptions = signal<ShippingMethod[]>([
    {id: 0, name: 'Ground'}, {id: 1, name: 'Air'}, {id: 2, name: 'Sea'}
  ]);

  protected readonly selectedOption = linkedSignal<ShippingMethod[], ShippingMethod>({
    source: this.shippingOptions,
    computation: (newOptions, previous) => {
      // Si las opciones recién cargadas siguen conteniendo la opción
      // previamente seleccionada por el usuario, se mantiene seleccionada.
      // Si no, se reinicia a la primera opción.
      return newOptions.find(opt => opt.id === previous?.value.id) ?? newOptions[0];
    }
  });
}
```

### Cuándo usar `linkedSignal` frente a `computed` frente a `effect`

- Usa `computed`: cuando el estado se deriva **estrictamente** de otro estado y nunca debe actualizarse manualmente.
- Usa `linkedSignal`: cuando el estado se deriva de otro estado, pero el usuario **debe** poder sobrescribirlo o actualizarlo manualmente.
- **Nunca** uses `effect` para sincronizar una pieza de estado con otra. Eso es un antipatrón. Usa `computed` o `linkedSignal` en su lugar.
