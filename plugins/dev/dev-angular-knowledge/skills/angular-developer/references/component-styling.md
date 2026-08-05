# Estilos de componentes

Los componentes de Angular pueden definir estilos que se aplican específicamente a su plantilla, lo que permite el encapsulamiento y la modularidad.

## Definir estilos

Los estilos se pueden definir en línea o en archivos separados.

```ts
@Component({
  selector: 'app-photo',
  // Estilos en línea
  styles: `
    img {
      border-radius: 50%;
    }
  `,
  // O archivo externo
  styleUrl: 'photo.component.css',
})
export class Photo {}
```

## Encapsulamiento de vista

Todo componente tiene una configuración de encapsulamiento de vista que determina cómo se delimitan los estilos.

| Modo                             | Comportamiento                                                                                          |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| `Emulated` (por defecto)         | Delimita los estilos al componente usando atributos HTML únicos. Los estilos globales aún pueden filtrarse. |
| `ShadowDom`                      | Usa la API nativa Shadow DOM del navegador para aislar completamente los estilos.                        |
| `None`                           | Desactiva el encapsulamiento. Los estilos del componente se vuelven globales.                            |
| `ExperimentalIsolatedShadowDom`  | Garantiza estrictamente que solo se apliquen los estilos del propio componente.                          |

### Uso

```ts
import { ViewEncapsulation } from '@angular/core';

@Component({
  ...,
  encapsulation: ViewEncapsulation.None,
})
export class GlobalStyled {}
```

## Selectores especiales

### `:host`

Apunta al elemento anfitrión del componente (el elemento que coincide con el selector del componente).

```css
:host {
  display: block;
  border: 1px solid black;
}
```

### `:host-context()`

Apunta al elemento anfitrión según alguna condición en su ascendencia.

```css
/* Aplica estilos si algún ancestro tiene la clase 'theme-dark' */
:host-context(.theme-dark) {
  background-color: #333;
}
```

### `::ng-deep`

Desactiva el encapsulamiento de vista para una regla concreta, permitiendo que "se filtre" a los componentes hijos.
**Nota: el equipo de Angular desaconseja firmemente el uso de `::ng-deep`.** Solo se mantiene por compatibilidad con versiones anteriores.

## Estilos en plantillas

Puedes usar elementos `<style>` directamente en la plantilla de un componente. Las reglas de encapsulamiento de vista siguen aplicándose.

```html
<style>
  .dynamic-class {
    color: red;
  }
</style>
<div class="dynamic-class">Hola</div>
```

## Estilos externos

El uso de `<link>` o `@import` en CSS se trata como estilos externos. **Los estilos externos no se ven afectados por el encapsulamiento de vista emulado.**
