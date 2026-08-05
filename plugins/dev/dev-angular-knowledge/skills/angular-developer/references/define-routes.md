# Definir rutas

Las rutas son objetos que definen qué componente debe renderizarse para una ruta URL concreta.

## Configuración básica

Define las rutas en un array `Routes` y facilítalas mediante `provideRouter` en tu `appConfig`.

```ts
// app.routes.ts
export const routes: Routes = [
  {path: '', component: HomePage},
  {path: 'admin', component: AdminPage},
];

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes)],
};
```

## Rutas URL

- **Estática**: coincide con una cadena exacta (p. ej., `'admin'`).
- **Parámetros de ruta**: segmentos dinámicos precedidos por dos puntos (p. ej., `'user/:id'`).
- **Comodín**: coincide con cualquier URL usando `**`. Útil para páginas de "No encontrado". **Colócalo siempre al final del array.**

## Estrategia de coincidencia

Angular utiliza una estrategia de **la primera coincidencia gana**. Las rutas específicas deben ir antes que las menos específicas.

## Redirecciones

Usa `redirectTo` para hacer que una ruta apunte a otra.

```ts
{ path: 'articles', redirectTo: '/blog' },
{ path: 'blog', component: Blog },
```

## Títulos de página

Asocia títulos a las rutas por motivos de accesibilidad. Los títulos pueden ser estáticos o dinámicos (mediante `ResolveFn` o una `TitleStrategy` personalizada).

```ts
{ path: 'home', component: Home, title: 'Home Page' }
```

## Datos de ruta y proveedores

- **Datos estáticos**: adjunta metadatos usando la propiedad `data`.
- **Proveedores de ruta**: acota dependencias a una ruta concreta y sus hijas usando el array `providers`.

## Rutas anidadas (hijas)

Define subvistas usando la propiedad `children`. Los componentes padre deben incluir un `<router-outlet />`.

```ts
{
  path: 'product/:id',
  component: Product,
  children: [
    { path: 'info', component: ProductInfo },
    { path: 'reviews', component: ProductReviews },
  ],
}
```
