# Componentes

Los componentes de Angular son los bloques de construcción fundamentales de una aplicación. Cada componente consiste en una clase TypeScript con comportamientos, una plantilla HTML y un selector CSS.

## Definición de un componente

Usa el decorador `@Component` para definir los metadatos de un componente.

```ts
@Component({
  selector: 'app-profile',
  template: `
    <img src="profile.jpg" alt="Profile photo" />
    <button (click)="save()">Save</button>
  `,
  styles: `
    img {
      border-radius: 50%;
    }
  `,
})
export class Profile {
  save() {
    /* ... */
  }
}
```

## Opciones de metadatos

- `selector`: el selector CSS que identifica este componente en las plantillas.
- `template`: plantilla HTML en línea (preferida para plantillas pequeñas).
- `templateUrl`: ruta a un archivo HTML externo.
- `styles`: estilos CSS en línea.
- `styleUrl` / `styleUrls`: ruta(s) a archivo(s) CSS externo(s).
- `imports`: lista los componentes, directivas o pipes usados en la plantilla de este componente.

## Uso de componentes

Para usar un componente, añádelo al array `imports` del componente consumidor y usa su selector en la plantilla.

```ts
@Component({
  selector: 'app-root',
  imports: [Profile],
  template: `<app-profile />`,
})
export class App {}
```

## Control de flujo en plantillas

Angular usa bloques integrados para el renderizado condicional y los bucles.

### Renderizado condicional (`@if`)

Usa `@if` para mostrar contenido condicionalmente. Puedes incluir bloques `@else if` y `@else`.

```html
@if (user.isAdmin) {
<admin-dashboard />
} @else if (user.isModerator) {
<mod-dashboard />
} @else {
<standard-dashboard />
}
```

**Alias del resultado**: guarda el resultado de la expresión para reutilizarlo.

```html
@if (user.settings(); as settings) {
<p>Theme: {{ settings.theme }}</p>
}
```

### Bucles (`@for`)

El bloque `@for` itera sobre colecciones. La expresión `track` es **obligatoria** por motivos de rendimiento y reutilización del DOM.

```html
<ul>
  @for (item of items(); track item.id; let i = $index, total = $count) {
  <li>{{ i + 1 }}/{{ total }}: {{ item.name }}</li>
  } @empty {
  <li>No items to display.</li>
  }
</ul>
```

**Variables implícitas**: `$index`, `$count`, `$first`, `$last`, `$even`, `$odd`.

### Cambio de contenido (`@switch`)

El bloque `@switch` renderiza contenido según un valor. Usa igualdad estricta (`===`) y **no tiene fallthrough**.

```html
@switch (status()) { @case ('loading') { <app-spinner /> } @case ('error') { <app-error-msg /> }
@case ('success') { <app-data-grid /> } @default {
<p>Unknown status</p>
} }
```

**Comprobación exhaustiva de tipos**: usa `@default never;` para asegurarte de que se gestionan todos los casos de un tipo unión.

```html
@switch (state) { @case ('on') { ... } @case ('off') { ... } @default never; // Da error si se añade un nuevo
estado como 'standby' }
```

## Conceptos fundamentales

- **Elemento anfitrión (Host Element)**: el elemento del DOM que coincide con el selector del componente.
- **Vista (View)**: el DOM renderizado por la plantilla del componente dentro del elemento anfitrión.
- **Standalone**: por defecto, los componentes son standalone (desde Angular 19, `standalone: true` es el valor por defecto). En versiones anteriores, `standalone: true` debe indicarse explícitamente o el componente debe formar parte de un `NgModule`.
- **Árbol de componentes**: las aplicaciones Angular se estructuran como un árbol de componentes, donde cada componente puede albergar componentes hijos.
- **Nomenclatura de componentes**: no añadas el sufijo `Component` a las clases de componente (por ejemplo, AppComponent) a menos que el proyecto esté configurado para usar esa convención de nomenclatura.
