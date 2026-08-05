# Animaciones de transición de rutas

El Router de Angular admite la **View Transitions API** del navegador para transiciones visuales fluidas entre rutas.

## Habilitar las View Transitions

Añade `withViewTransitions()` a tu configuración del router.

```ts
provideRouter(routes, withViewTransitions());
```

Esto es una **mejora progresiva**. En navegadores que no admiten la API, el router seguirá funcionando pero sin la animación de transición.

## Cómo funciona

1. El navegador toma una captura del estado antiguo.
2. El router actualiza el DOM (activa el nuevo componente).
3. El navegador toma una captura del nuevo estado.
4. El navegador anima entre los dos estados.

## Personalización con CSS

Las transiciones se personalizan en **archivos CSS globales** (no en CSS con ámbito de componente).

Usa los pseudoelementos `::view-transition-old()` y `::view-transition-new()`.

```css
/* Ejemplo: Cross-fade + Slide */
::view-transition-old(root) {
  animation: 90ms cubic-bezier(0.4, 0, 1, 1) both fade-out;
}
::view-transition-new(root) {
  animation: 210ms cubic-bezier(0, 0, 0.2, 1) 90ms both fade-in;
}
```

## Control avanzado

Usa `onViewTransitionCreated` para omitir transiciones o personalizar el comportamiento según el contexto de la navegación.

```ts
withViewTransitions({
  onViewTransitionCreated: ({transition, from, to}) => {
    // Omitir la animación para rutas específicas
    if (to.url === '/no-animation') {
      transition.skipTransition();
    }
  },
});
```

## Buenas prácticas

- **Estilos globales**: Define siempre las animaciones de transición en `styles.css` para evitar problemas de encapsulación de vistas.
- **Nombres de View Transition**: Asigna un `view-transition-name` único a los elementos que deban transicionar de forma fluida entre rutas (por ejemplo, una imagen de cabecera).
