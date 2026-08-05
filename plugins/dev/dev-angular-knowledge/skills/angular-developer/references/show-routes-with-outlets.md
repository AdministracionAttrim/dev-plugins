# Mostrar rutas con outlets

La directiva `RouterOutlet` es un marcador de posición donde Angular renderiza el componente correspondiente a la URL actual.

## Uso básico

Incluye `<router-outlet />` en tu plantilla. Angular inserta el componente enrutado como hermano inmediatamente después del outlet.

```html
<app-header /> <router-outlet />
<!-- El contenido de la ruta aparece aquí -->
<app-footer />
```

## Outlets anidados

Las rutas hijas requieren su propio `<router-outlet />` dentro de la plantilla del componente padre.

```ts
// Plantilla del componente padre
<h1>Settings</h1>
<router-outlet /> <!-- Componentes hijos como Profile o Security se renderizan aquí -->
```

## Outlets con nombre (rutas secundarias)

Las páginas pueden tener varios outlets. Asigna un `name` a un outlet para dirigirte a él específicamente. El nombre por defecto es `'primary'`.

```html
<router-outlet />
<!-- Primario -->
<router-outlet name="sidebar" />
<!-- Secundario -->
```

Define el `outlet` en la configuración de la ruta:

```ts
{
  path: 'chat',
  component: Chat,
  outlet: 'sidebar'
}
```

## Eventos del ciclo de vida del outlet

`RouterOutlet` emite eventos cuando los componentes cambian:

- `activate`: Se instancia un nuevo componente.
- `deactivate`: El componente se destruye.
- `attach` / `detach`: Se usan con `RouteReuseStrategy`.

```html
<router-outlet (activate)="onActivate($event)" />
```

## Pasar datos mediante `routerOutletData`

Puedes pasar datos contextuales al componente enrutado usando la entrada `routerOutletData`. El componente accede a ellos mediante el token de inyección `ROUTER_OUTLET_DATA` como un signal.

```ts
// En el padre
<router-outlet [routerOutletData]="{ theme: 'dark' }" />

// En el componente enrutado
outletData = inject(ROUTER_OUTLET_DATA) as Signal<{ theme: string }>;
```
