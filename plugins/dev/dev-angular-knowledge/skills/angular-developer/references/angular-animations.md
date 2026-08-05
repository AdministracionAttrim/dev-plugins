# Animaciones en Angular

Al animar elementos en Angular, **primero analiza la versión de Angular del proyecto** en `package.json`.
Para aplicaciones modernas (**Angular v20.2 y superior**), prefiere usar CSS nativo con `animate.enter` y `animate.leave`. Para aplicaciones más antiguas, puede que necesites usar el paquete obsoleto `@angular/animations`.

## 1. Animaciones CSS nativas (recomendado para v20.2+)

El Angular moderno proporciona `animate.enter` y `animate.leave` para animar elementos cuando entran o salen del DOM. Aplican clases CSS en los momentos apropiados.

### `animate.enter` y `animate.leave`

Úsalos directamente en elementos para aplicar clases CSS durante la fase de entrada o salida. Angular elimina automáticamente las clases de entrada cuando la animación termina. Para `animate.leave`, Angular espera a que la animación termine antes de eliminar el elemento del DOM.

Ejemplo de `animate.enter`:

```html
@if (isShown()) {
<div class="enter-container" animate.enter="enter-animation">
  <p>The box is entering.</p>
</div>
}
```

```css
/* Ensure you have a starting style if using transitions instead of keyframes */
.enter-container {
  border: 1px solid #dddddd;
  margin-top: 1em;
  padding: 20px;
  font-weight: bold;
  font-size: 20px;
}
.enter-container p {
  margin: 0;
}
.enter-animation {
  animation: slide-fade 1s;
}
@keyframes slide-fade {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

_Nota: `animate.leave` puede añadirse a elementos hijos que se están eliminando._

### Enlaces de eventos y bibliotecas de terceros

Puedes enlazar a `(animate.enter)` y `(animate.leave)` para llamar a funciones o usar bibliotecas JS como GSAP.

```html
@if(show()) {
<div (animate.leave)="onLeave($event)">...</div>
}
```

```ts
import { AnimationCallbackEvent } from '@angular/core';

onLeave(event: AnimationCallbackEvent) {
  // Custom animation logic here
  // CRITICAL: You MUST call animationComplete() when done so Angular removes the element!
  event.animationComplete();
}
```

## 2. Animaciones CSS avanzadas

CSS ofrece herramientas robustas para secuencias de animación avanzadas.

### Animar el estado y los estilos

Alterna clases CSS en elementos usando enlace de propiedades para disparar transiciones.

```html
<div [class.open]="isOpen">...</div>
```

```css
div {
  transition: height 0.3s ease-out;
  height: 100px;
}
div.open {
  height: 200px;
}
```

### Animar altura automática (auto height)

Puedes usar `css-grid` para animar hacia una altura automática.

```css
.container {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s;
}
.container.open {
  grid-template-rows: 1fr;
}
.container > div {
  overflow: hidden;
}
```

### Animaciones escalonadas (staggering) y en paralelo

- **Escalonadas (Staggering)**: Usa `animation-delay` o `transition-delay` con valores distintos para los elementos de una lista.
- **En paralelo (Parallel)**: Aplica varias animaciones en la propiedad abreviada `animation` (p. ej., `animation: rotate 3s, fade-in 2s;`).

### Control programático

Recupera las animaciones directamente usando las APIs web estándar:

```ts
const animations = element.getAnimations();
animations.forEach((anim) => anim.pause());
```

## 3. DSL de animaciones heredado (obsoleto)

Para proyectos más antiguos (anteriores a v20.2 o donde `@angular/animations` ya se usa intensamente), se emplea el DSL de metadatos del componente.

**Importante:** No mezcles las animaciones heredadas con `animate.enter`/`leave` en el mismo componente.

### Configuración

```ts
bootstrapApplication(App, {
  providers: [provideAnimationsAsync()],
});
```

### Definir transiciones

```ts
import {signal} from '@angular/core';
import {trigger, state, style, animate, transition} from '@angular/animations';

@Component({
  animations: [
    trigger('openClose', [
      state('open', style({opacity: 1})),
      state('closed', style({opacity: 0})),
      transition('open <=> closed', [animate('0.5s')]),
    ]),
  ],
  template: `<div [@openClose]="isOpen() ? 'open' : 'closed'">...</div>`,
})
export class OpenClose {
  protected readonly isOpen = signal(true);
}
```
