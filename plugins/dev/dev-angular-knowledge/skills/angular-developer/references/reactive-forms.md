# Formularios reactivos

Los formularios reactivos ofrecen un enfoque dirigido por modelo para gestionar las entradas de formularios. Están construidos alrededor de flujos observables y proporcionan acceso síncrono al modelo de datos, lo que los hace más escalables y testeables que los formularios basados en plantillas.

## Clases principales

Los formularios reactivos se construyen usando estas clases fundamentales de `@angular/forms`:

- `FormControl`: Gestiona el valor y la validez de una entrada individual.
- `FormGroup`: Gestiona un grupo de controles (una estructura tipo objeto).
- `FormArray`: Gestiona un array de controles indexado numéricamente.
- `FormBuilder`/`NonNullableFormBuilder`: Un servicio que proporciona métodos factoría para crear instancias de controles.

## Configuración

Importa `ReactiveFormsModule` en tu componente.

```ts
import {Component, inject} from '@angular/core';
import {ReactiveFormsModule, NonNullableFormBuilder, Validators} from '@angular/forms';

@Component({
  selector: 'app-profile-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-editor.component.html',
})
export class ProfileEditor {
  private readonly fb = inject(NonNullableFormBuilder);

  // Usando FormBuilder para una definición concisa
  protected readonly profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: '',
    address: this.fb.group({
      street: '',
      city: '',
    }),
    aliases: this.fb.array([this.fb.control('')]),
  });

  protected onSubmit() {
    console.warn(this.profileForm.value);
  }
}
```

## Enlace con la plantilla

Usa directivas para enlazar el modelo con la vista:

- `[formGroup]`: Enlaza un `FormGroup` a un `<form>` o `<div>`.
- `formControlName`: Enlaza un control con nombre dentro de un grupo a una entrada.
- `formGroupName`: Enlaza un `FormGroup` anidado.
- `formArrayName`: Enlaza un `FormArray` anidado.
- `[formControl]`: Enlaza un `FormControl` independiente.

```html
<form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
  <input type="text" formControlName="firstName" />

  <div formGroupName="address">
    <input type="text" formControlName="street" />
  </div>

  <div formArrayName="aliases">
    @for (alias of profileForm.controls.aliases.controls; track alias) {
    <input type="text" [formControlName]="$index" />
    }
  </div>

  <button type="submit" [disabled]="!profileForm.valid">Submit</button>
</form>
```

## Acceso a los controles

Usa `.controls` para acceder fácilmente a los controles.

```ts
addAlias() {
  this.profileForm.controls.aliases.push(this.fb.control(''));
}
```

## Actualización de valores

- `patchValue()`: Actualiza solo las propiedades especificadas. Falla silenciosamente ante discrepancias estructurales.
- `setValue()`: Reemplaza el modelo completo. Exige estrictamente la estructura del formulario.

```ts
updateProfile() {
  this.profileForm.patchValue({
    firstName: 'Nancy',
    address: { street: '123 Drew Street' }
  });
}
```

## Eventos de cambio unificados

El Angular moderno (v18+) proporciona un único observable `events` en todos los controles para seguir eventos de valor, estado, pristine, touched, reset y submit.

```ts
import {ValueChangeEvent, StatusChangeEvent} from '@angular/forms';

this.profileForm.events.subscribe((event) => {
  if (event instanceof ValueChangeEvent) {
    console.log('New value:', event.value);
  }
});
```

## Gestión manual del estado

- `markAsTouched()` / `markAllAsTouched()`: Útil para mostrar errores de validación al enviar.
- `markAsDirty()` / `markAsPristine()`: Rastrea si el valor ha sido modificado.
- `updateValueAndValidity()`: Dispara manualmente el recálculo del valor y el estado.
- Las opciones `{ emitEvent: false }` u `{ onlySelf: true }` se pueden pasar a la mayoría de los métodos para controlar la propagación.
