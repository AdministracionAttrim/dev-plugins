# Data Resolvers (resolutores de datos)

Los resolutores de datos (data resolvers) obtienen los datos antes de que una ruta se active, garantizando que los componentes dispongan de los datos necesarios en el momento de renderizarse.

## Creación de un resolutor

Implementa el tipo `ResolveFn`.

```ts
export const userResolver: ResolveFn<User> = (route, state) => {
  const userService = inject(UserService);
  const id = route.paramMap.get('id')!;
  return userService.getUser(id);
};
```

## Configuración de la ruta

Añade el resolutor bajo la clave `resolve`.

```ts
{
  path: 'user/:id',
  component: UserProfile,
  resolve: {
    user: userResolver
  }
}
```

## Acceso a los datos resueltos

### 1. Mediante `ActivatedRoute` (tradicional)

```ts
private readonly route = inject(ActivatedRoute);
protected readonly data = toSignal(this.route.data);
protected readonly user = computed(() => this.data().user);
```

### 2. Mediante inputs de componente (moderno)

Activa `withComponentInputBinding()` en `provideRouter` para pasar los datos resueltos directamente a un `@Input` o a `input()`.

```ts
// app.config.ts
provideRouter(routes, withComponentInputBinding());

// component.ts
user = input.required<User>();
```

## Gestión de errores

La navegación se bloquea si un resolutor falla.

- Usa `withNavigationErrorHandler` para una gestión global.
- Usa `catchError` dentro del resolutor para devolver un `RedirectCommand` o datos de reserva.

```ts
return userService
  .get(id)
  .pipe(catchError(() => of(new RedirectCommand(router.parseUrl('/error')))));
```

## Buenas prácticas

- **Manténlo ligero**: obtén solo los datos críticos.
- **Ofrece feedback**: escucha los eventos del router para mostrar una barra de carga global durante la navegación, ya que la interfaz permanece en la página anterior hasta que el resolutor termina.
