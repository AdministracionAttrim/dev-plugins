# Formularios basados en plantillas (Template-Driven Forms)

Los formularios basados en plantillas usan enlace de datos bidireccional (`[(ngModel)]`) para actualizar el modelo de datos del componente a medida que se hacen cambios en la plantilla, y viceversa. Son ideales para formularios sencillos y usan directivas en la plantilla HTML para gestionar el estado del formulario y la validación.

## Directivas principales

Los formularios basados en plantillas dependen de `FormsModule`, que proporciona estas directivas clave:

- `NgModel`: Reconcilia los cambios de valor en el elemento del formulario con el modelo de datos (`[(ngModel)]`).
- `NgForm`: Crea automáticamente un `FormGroup` de nivel superior enlazado a la etiqueta `<form>`.
- `NgModelGroup`: Crea un `FormGroup` anidado enlazado a un elemento del DOM.

## Configuración

Primero, importa `FormsModule` en tu componente o módulo.

```ts
import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-user-form',
  imports: [FormsModule],
  templateUrl: './user-form.component.html',
})
export class UserForm {
  user = {name: '', role: 'Guest'};

  onSubmit() {
    console.log('Form submitted!', this.user);
  }
}
```

## Construcción de la plantilla del formulario

### Enlace bidireccional con `[(ngModel)]`

Usa `[(ngModel)]` en elementos input. **Todo elemento que use `[(ngModel)]` DEBE tener un atributo `name`.** Angular usa el atributo `name` para registrar el control con el `NgForm` padre.

```html
<form #userForm="ngForm" (ngSubmit)="onSubmit()">
  <!-- Basic Input -->
  <div>
    <label for="name">Name:</label>
    <input type="text" id="name" required [(ngModel)]="user.name" name="name" #nameCtrl="ngModel" />
  </div>

  <!-- Select Box -->
  <div>
    <label for="role">Role:</label>
    <select id="role" [(ngModel)]="user.role" name="role">
      <option value="Admin">Admin</option>
      <option value="Guest">Guest</option>
    </select>
  </div>

  <!-- Submit Button (disabled if form is invalid) -->
  <button type="submit" [disabled]="!userForm.form.valid">Submit</button>
</form>
```

## Estado del formulario y de los controles

Angular aplica automáticamente clases CSS a los controles y formularios según su estado:

| Estado                | Clase si es verdadero              | Clase si es falso |
| :--------------------- | :--------------------------------- | :------------- |
| Visitado               | `ng-touched`                       | `ng-untouched` |
| Valor cambiado         | `ng-dirty`                         | `ng-pristine`  |
| Valor válido           | `ng-valid`                         | `ng-invalid`   |
| Formulario enviado     | `ng-submitted` (solo en `<form>`)  | -              |

Puedes usar estas clases para dar feedback visual en tu CSS:

```css
.ng-valid[required],
.ng-valid.required {
  border-left: 5px solid #42a948; /* verde */
}
.ng-invalid:not(form) {
  border-left: 5px solid #a94442; /* rojo */
}
```

## Validación y mensajes de error

Para mostrar mensajes de error condicionalmente, exporta la directiva `ngModel` a una variable de referencia de plantilla (p. ej., `#nameCtrl="ngModel"`).

```html
<input type="text" id="name" required [(ngModel)]="user.name" name="name" #nameCtrl="ngModel" />

<!-- Show error only if the control is invalid AND (touched OR dirty) -->
@if (nameCtrl.invalid && (nameCtrl.dirty || nameCtrl.touched)) {
<div class="alert alert-danger">
  @if (nameCtrl.errors?.['required']) {
  <div>Name is required.</div>
  }
</div>
}
```

## Envío del formulario

1. Usa el evento `(ngSubmit)` en el elemento `<form>`.
2. Enlaza el estado disabled del botón de envío a la validez general del formulario usando la variable de referencia de plantilla `NgForm` (p. ej., `[disabled]="!userForm.form.valid"`).

## Restablecer el formulario

Para restablecer programáticamente el formulario a su estado pristine (borrando valores y marcas de validación), usa el método `reset()` de la instancia de `NgForm`.

```html
<button type="button" (click)="userForm.reset()">Reset</button>
```
