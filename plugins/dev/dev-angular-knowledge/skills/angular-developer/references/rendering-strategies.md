# Estrategias de renderizado

Angular admite múltiples estrategias de renderizado para optimizar el SEO, el rendimiento y la interactividad.

## 1. Renderizado del lado del cliente (CSR)

**Estrategia por defecto.** El contenido se renderiza por completo en el navegador.

- **Caso de uso**: paneles interactivos, herramientas internas.
- **Ventajas**: la más sencilla de configurar, bajo coste de servidor.
- **Inconvenientes**: SEO deficiente, visibilidad inicial del contenido más lenta (hay que esperar al JS).

## 2. Generación de sitios estáticos (SSG / prerenderizado)

El contenido se pre-renderiza en archivos HTML estáticos en **tiempo de compilación**.

- **Caso de uso**: páginas de marketing, blogs, documentación.
- **Ventajas**: carga inicial más rápida, SEO excelente, compatible con CDN.
- **Inconvenientes**: requiere recompilar para actualizar el contenido, no válido para datos específicos de cada usuario.

## 3. Renderizado del lado del servidor (SSR)

El contenido se renderiza en el servidor para la **petición inicial**. Las navegaciones posteriores ocurren del lado del cliente (estilo SPA).

- **Caso de uso**: páginas de producto de e-commerce, sitios de noticias, contenido dinámico personalizado.
- **Ventajas**: SEO excelente, visibilidad inicial del contenido rápida.
- **Inconvenientes**: requiere un servidor (Node.js), mayor coste/latencia de servidor.

## Hidratación

La hidratación es el proceso de hacer interactivo en el navegador el HTML renderizado en el servidor.

- **Hidratación completa**: toda la aplicación se vuelve interactiva a la vez.
- **Hidratación incremental**: (avanzado) las partes se vuelven interactivas según se necesitan, usando bloques `@defer`.
- **Repetición de eventos (Event Replay)**: captura y reproduce los eventos de usuario que ocurrieron antes de que terminara la hidratación.

## Matriz de decisión

| Requisito                          | Estrategia            |
| :---------------------------------- | :--------------------- |
| **SEO + contenido estático**        | SSG                  |
| **SEO + contenido dinámico**        | SSR                  |
| **Sin SEO + alta interactividad**   | CSR                  |
| **Mixto**                           | Híbrido (por ruta)   |
