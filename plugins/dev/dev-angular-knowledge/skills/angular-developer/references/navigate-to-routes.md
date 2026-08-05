# Navegar a rutas

Angular ofrece formas tanto declarativas como programáticas de navegar entre rutas.

## Navegación declarativa (`RouterLink`)

Usa la directiva `RouterLink` en elementos de anclaje.

```ts
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav>
      <a routerLink="/dashboard" routerLinkActive="active-link">Dashboard</a>
      <a [routerLink]="['/user', userId]">Profile</a>
    </nav>
  `,
})
export class Nav {
  userId = '123';
}
```

- **Rutas absolutas**: Empiezan por `/` (p. ej., `/settings`).
- **Rutas relativas**: Sin `/` inicial. Usa `../` para subir un nivel.

## Navegación programática (`Router`)

Inyecta el servicio `Router` para navegar mediante código TypeScript.

### `router.navigate()`

Usa un array de comandos.

```ts
private router = inject(Router);
private route = inject(ActivatedRoute);

// Standard navigation
this.router.navigate(['/profile']);

// With parameters
this.router.navigate(['/search'], {
  queryParams: { q: 'angular' },
  fragment: 'results'
});

// Relative navigation
this.router.navigate(['edit'], { relativeTo: this.route });
```

### `router.navigateByUrl()`

Usa una ruta en forma de cadena. Ideal para navegación absoluta o URLs completas.

```ts
this.router.navigateByUrl('/products/123?view=details');

// Replace current entry in history
this.router.navigateByUrl('/login', {replaceUrl: true});
```

## Parámetros de URL

- **Parámetros de ruta**: Forman parte del path (p. ej., `/user/123`).
- **Parámetros de consulta (Query Params)**: Después del `?` (p. ej., `/search?q=query`).
- **Parámetros de matriz (Matrix Params)**: Con ámbito en un segmento (p. ej., `/products;category=books`).
