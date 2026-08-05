# Guardas de ruta

Las guardas de ruta controlan si un usuario puede navegar hacia o abandonar una ruta.

## Tipos de guardas

- **`CanActivate`**: ¿Puede el usuario acceder a esta ruta? (por ejemplo, comprobación de autenticación).
- **`CanActivateChild`**: ¿Puede el usuario acceder a los hijos de esta ruta?
- **`CanDeactivate`**: ¿Puede el usuario abandonar esta ruta? (por ejemplo, cambios sin guardar).
- **`CanMatch`**: ¿Debería siquiera considerarse esta ruta para el matching? (por ejemplo, feature flags). Si devuelve `false`, el router sigue comprobando otras rutas.

## Crear una guarda

Las guardas suelen ser funcionales desde Angular 15.

```ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirigir al login
  return router.parseUrl('/login');
};
```

## Aplicar guardas

Añádelas a la configuración de la ruta como un array. Se ejecutan en orden.

```ts
{
  path: 'admin',
  component: Admin,
  canActivate: [authGuard],
  canActivateChild: [adminChildGuard],
  canDeactivate: [unsavedChangesGuard]
}
```

## Valores de retorno

- `boolean`: `true` para permitir, `false` para bloquear.
- `UrlTree` o `RedirectCommand`: Redirige a una ruta diferente.
- `Observable` o `Promise`: Se resuelve en los tipos anteriores.

## Nota de seguridad

**Las guardas del lado del cliente NO sustituyen a la seguridad del lado del servidor.** Verifica siempre los permisos en el servidor.
