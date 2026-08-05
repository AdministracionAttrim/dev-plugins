# Estrategias de carga de rutas

Angular soporta dos estrategias principales para cargar rutas y componentes, con el fin de equilibrar el tiempo de carga inicial y la capacidad de respuesta en la navegación.

## Carga anticipada (Eager Loading)

Los componentes se empaquetan en el payload de JavaScript inicial y están disponibles de inmediato.

```ts
{ path: 'home', component: Home }
```

- **Ventajas**: transiciones fluidas.
- **Inconvenientes**: aumenta el tamaño del paquete inicial.

## Carga diferida (Lazy Loading)

Los componentes o rutas se cargan solo cuando el usuario navega hasta ellos. Esto crea "chunks" de JavaScript independientes.

### Carga diferida de componentes

Usa `loadComponent` para obtener el componente bajo demanda.

```ts
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)`,
}
```

### Carga diferida de rutas hijas

Usa `loadChildren` para obtener un conjunto de rutas.

```ts
{
  path: 'settings',
  loadChildren: () => import('./settings/settings.routes'),
}
```

## Contexto de inyección y carga diferida

Las funciones de carga se ejecutan dentro del **contexto de inyección** de la ruta actual. Esto te permite llamar a `inject()` para tomar decisiones de carga sensibles al contexto.

```ts
{
  path: 'dashboard',
  loadComponent: () => {
    const flags = inject(FeatureFlags);
    return flags.isPremium
      ? import('./premium-dashboard')
      : import('./basic-dashboard');
  },
}
```

## Recomendación

- Usa **carga anticipada** para las páginas de aterrizaje principales.
- Usa **carga diferida** para el resto de áreas funcionales, para mantener pequeño el paquete inicial.
