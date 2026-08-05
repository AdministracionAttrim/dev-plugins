# Signal Forms

Signal Forms es el enfoque recomendado para gestionar formularios en las aplicaciones Angular modernas (v21+). Ofrece una forma reactiva, con seguridad de tipos y dirigida por el modelo (model-driven) de gestionar el estado del formulario usando Angular Signals.

**CRÍTICO**: DEBES usar la nueva API de Signal Forms de Angular para toda la funcionalidad relacionada con formularios. NO uses null como valor ni como tipo de ningún campo.

## Importaciones

Puedes importar lo siguiente desde `@angular/forms/signals`:

```ts
import {
  form,
  FormField,
  submit,
  // Reglas para el estado del campo
  disabled,
  hidden,
  readonly,
  debounce,
  // Ayudantes de esquema
  applyWhen,
  applyEach,
  schema,
  // Validación personalizada
  validate,
  validateHttp,
  validateStandardSchema,
  // Metadatos
  metadata,
} from '@angular/forms/signals';
```

## Crear un formulario

Usa la función `form()` con un modelo Signal. La estructura del formulario se deriva directamente del modelo.

```ts
import {Component, signal} from '@angular/core';
import {form, FormField} from '@angular/forms/signals';

@Component({
  // ...
  imports: [FormField],
})
export class Example {
  // 1. Define tu modelo con valores iniciales (evita undefined)
  protected readonly userModel = signal({
    name: '', // CRÍTICO: NUNCA uses null o undefined como valores iniciales
    email: '',
    age: 0, // Usa 0 para números, NO null
    address: {
      street: '',
      city: '',
    },
    hobbies: [] as string[], // Usa [] para arrays, NO null
  });

  // INCORRECTO - NO HAGAS ESTO:
  // badModel = signal({
  //   name: null,      // ERROR: usa '' en su lugar
  //   age: null,       // ERROR: usa 0 en su lugar
  //   items: null      // ERROR: usa [] en su lugar
  // });

  // 2. Crea el formulario
  protected readonly userForm = form(this.userModel);
}
```

## Validación

Importa los validadores desde `@angular/forms/signals`.

```ts
import {required, email, min, max, minLength, maxLength, pattern} from '@angular/forms/signals';
```

Úsalos en la función de esquema pasada a `form()`:

```ts
userForm = form(this.userModel, (schemaPath) => {
  // Obligatorio
  required(schemaPath.name, {message: 'Name is required'});

  // Obligatorio condicional.
  required(schemaPath.name, {
    when({valueOf}) {
      return valueOf(schemaPath.age) > 10;
    },
  });
  // when solo está disponible para required
  // No hagas esto: pattern(p.name, /xxx/, {when /* ERROR */)

  // Email
  email(schemaPath.email, {message: 'Invalid email'});

  // Min/Max para números
  min(schemaPath.age, 18);
  max(schemaPath.age, 100);

  // MinLength/MaxLength para cadenas/arrays
  minLength(schemaPath.password, 8);
  maxLength(schemaPath.description, 500);

  // Pattern (Regex)
  pattern(schemaPath.zipCode, /^\d{5}$/);
});
```

## FieldState vs FormField: el requisito parental

Es importante entender la diferencia entre **FormField** (la estructura) y **FieldState** (los datos/signals reales).

**REGLA**: debes **LLAMAR** a un campo como función para acceder a sus signals de estado (valid, touched, dirty, hidden, etc.).

```ts
// f es un FormField (estructural)
const f = form(signal({cat: {name: 'pirojok-the-cat', age: 5}}));

f.cat.name; // FormField: ¡no puedes obtener flags desde aquí!
f.cat.name.touched(); // ERROR: touched() no existe en FormField

f.cat.name(); // FieldState: llamarlo te da acceso a los signals
f.cat.name().touched(); // VÁLIDO: accediendo al signal
f.cat().name.touched(); // ERROR: f.cat() es estado, ¡no tiene hijos!
```

De forma similar en una plantilla:

```html
<!-- INCORRECTO: la propiedad 'hidden' no existe en el tipo 'FormField' -->
@if (bookingForm.hotelDetails.hidden()) { ... }

<!-- CORRECTO: llámalo primero -->
@if (bookingForm.hotelDetails().hidden()) { ... }
```

## Disabled / Readonly / Hidden

Controla el estado del campo usando reglas en el esquema.

```ts
import {disabled, readonly, hidden} from '@angular/forms/signals';

userForm = form(this.userModel, (schemaPath) => {
  // Deshabilitado condicionalmente
  disabled(schemaPath.password, {when: ({valueOf}) => !valueOf(schemaPath.createAccount)});

  // Oculto condicionalmente (NO se elimina del modelo, solo se marca como oculto)
  hidden(schemaPath.shippingAddress, {when: ({valueOf}) => valueOf(schemaPath.sameAsBilling)});

  // Solo lectura
  readonly(schemaPath.username);
});
```

## Enlazado (Binding)

Importa `FormField` y usa la directiva `[formField]`.

```ts
import {FormField} from '@angular/forms/signals';
```

Todas las propiedades del estado, como `disabled`, `hidden`, `readonly` y `name`, se enlazan automáticamente.
NO enlaces el campo `name`.

**CRÍTICO: ATRIBUTOS PROHIBIDOS**
Al usar `[formField]`, NO debes establecer los siguientes atributos en la plantilla (ni estáticos ni enlazados):

- `min`, `max` (usa validadores en el esquema en su lugar)
- `value`, `[value]`, `[attr.value]` en **inputs de texto/número/fecha** (ya gestionado por `[formField]`)
- `[attr.min]`, `[attr.max]`
- `[disabled]`, `[readonly]` (ya gestionado por `[formField]`)

**Excepción**: el `value` estático en `<input type="radio">` y `<input type="checkbox">` está **permitido y es obligatorio**: identifica qué opción representa el input, no el valor del campo enlazado.

```html
<!-- CORRECTO: value en radio especifica qué opción representa este botón -->
<input type="radio" value="economy" [formField]="bookingForm.package.tier" />

<!-- INCORRECTO: enlace de value en un input normal -->
<input [value]="someVar" [formField]="form.name" />
```

No hagas esto: `<input min="1" [formField]>` ni `<input [value]="val" [formField]>`.

```html
<!-- Input -->
<input [formField]="userForm.name" />

<!-- Checkbox -->
<input type="checkbox" [formField]="userForm.isAdmin" />

<!-- Select -->
<select [formField]="userForm.country">
  <option value="us">US</option>
</select>

<!-- userForm.name NO puede ser anulable, porque el input no acepta null-->
<input [formField]="userForm.name" />
```

## Reactive Forms

**NO importes** `FormControl`, `FormGroup`, `FormArray` ni `FormBuilder` desde `@angular/forms`. Signal Forms reemplaza estos conceptos por completo.
Signal Forms no tiene un builder.

## Acceder al estado

Cada campo del formulario es una función que devuelve su estado.

```ts
// Accede al campo llamándolo
const emailState = this.userForm.email();

// Valor (WritableSignal)
const value = this.userForm().value();

// Estado de validación (Signals)
const isValid = this.userForm().valid();
const isInvalid = this.userForm().invalid();
const errors = this.userForm().errors(); // Array de errores
const isPending = this.userForm().pending(); // Validación asíncrona pendiente

// Estado de interacción (Signals)
const isTouched = this.userForm().touched();
const isDirty = this.userForm().dirty();

// Estado de disponibilidad (Signals)
const isDisabled = this.userForm().disabled();
const isHidden = this.userForm().hidden();
const isReadonly = this.userForm().readonly();
```

¡IMPORTANTE!: asegúrate de llamar al campo para obtener su estado.

```ts
form().invalid()
form.field().dirty()
form.field.subfield().touched()
form.a.b.c.d().value()
form.address.ssn().pending()
form().reset()

// La única excepción es length:
form.children.length
form.length // NOTA: ¡sin paréntesis!
form.client.addresses.length  // Sin "()"

@for (income of form.addresses; track $index) {/**/}
```

## Enviar (Submitting)

Usa la función `submit()`. Marca automáticamente todos los campos como touched antes de ejecutar la acción.

**CRÍTICO**: el callback de `submit()` DEBE ser `async` y DEBE devolver una Promise.

```ts
import { submit } from '@angular/forms/signals';

// CORRECTO - callback async
onSubmit() {
  submit(this.userForm, async () => {
    // Esto solo se ejecuta si el formulario es válido
    await this.apiService.save(this.userModel());
    console.log('Saved!');
  });
}

// INCORRECTO - falta la palabra clave async
onSubmit() {
  submit(this.userForm, () => {  // ERROR: debe ser async
    console.log('Saved!');
  });
}
```

## Manejo de errores

`field().errors()` devuelve el array de errores de ValidationError:

```ts
interface ValidationError {
  readonly kind: string;
  readonly message?: string;
}
```

NO devuelvas null desde los validadores.
Cuando no haya errores, devuelve undefined.

### Contexto

Las funciones pasadas a reglas como `validate()`, `disabled()`, `applyWhen` reciben un objeto de contexto. Es **CRÍTICO** entender su estructura:

```ts
validate(
  schemaPath.username,
  ({
    value, // Signal<T>: valor actual editable del campo
    fieldTree, // FieldTree<T>: subcampos (si es un grupo/array)
    state, // FieldState<T>: acceso a flags como state.valid(), state.dirty()
    valueOf, // (path) => T: lee valores de OTROS campos (con seguimiento de dependencias), p. ej. valueOf(schemaPath.password)
    stateOf, // (path) => FieldState: accede al estado (valid/dirty) de OTROS campos, p. ej. stateOf(schemaPath.password).valid()
    pathKeys, // Signal<string[]>: ruta desde la raíz hasta este campo
  }) => {
    // INCORRECTO: if (touched()) ... (touched no está en el contexto)
    // CORRECTO: if (state.touched()) ...

    if (value() === 'admin') {
      return {kind: 'reserved', message: 'Username admin is reserved'};
    }
  },
);
```

### IMPORTANTE: las rutas NO son Signals

Dentro del callback de `form()`, `schemaPath` y sus hijos (p. ej., `schemaPath.user.name`) NO son signals y NO se pueden llamar.

```ts
// INCORRECTO - esto lanzará un error:
applyWhen(p.ssn, () => p.ssn().touched(), (ssnField) => { ... });

// CORRECTO - usa stateOf() para obtener el estado de una ruta:
applyWhen(p.ssn, ({ stateOf }) => stateOf(p.ssn).touched(), (ssnField) => { ... });

// CORRECTO - usa valueOf() para obtener el valor de una ruta:
applyWhen(p.ssn, ({ valueOf }) => valueOf(p.ssn) !== '', (ssnField) => { ... });
```

### Múltiples elementos

- Usa `applyEach` para aplicar reglas por elemento.
- **CRÍTICO**: el callback de `applyEach` recibe SOLO UN argumento (la ruta del elemento), NO dos:

```ts
// CORRECTO - un solo argumento
applyEach(s.items, (item) => {
  required(item.name);
});

// INCORRECTO - NO pases el índice
applyEach(s.items, (item, index) => {
  // ERROR: el callback recibe 1 argumento
  required(item.name);
});
```

- En la plantilla, usa `@for` para iterar sobre los elementos.
- Para eliminar un elemento de un array, simplemente elimina el elemento correspondiente del array en los datos.
- **Enlace `select`**: PUEDES enlazar a `<select [formField]="form.country">`. Asegúrate de que las opciones tengan atributos `value`.

### Bucles @for anidados

**CRÍTICO**: Angular NO tiene `$parent`. En bucles anidados, guarda el índice externo en una variable:

```html
<!-- INCORRECTO - $parent no existe -->
@for (item of form.items; track $index) { @for (option of item.options; track $index) {
<button (click)="removeOption($parent.$index, $index)">Remove</button>
<!-- ERROR -->
} }

<!-- CORRECTO - usa let para guardar el índice externo -->
@for (item of form.items; track $index; let outerIndex = $index) { @for (option of item.options;
track $index) {
<button (click)="removeOption(outerIndex, $index)">Remove</button>
} }
```

### Deshabilitar el botón del formulario

```html
<button [disabled]="form().invalid() || form().pending()" />
<!-- O -->
<button [disabled]="taxForm.invalid()" />
```

NO uses `[disabled]` en un input. `[formField]` lo hará por ti.
NO uses `[readonly]` en un input. `[formField]` lo hará por ti.
Si necesitas deshabilitar o hacer de solo lectura un campo, usa las reglas `disabled()` o `readonly()` en el esquema.

### Validación asíncrona

No uses `validate()` para asincronía; en su lugar usa `validateAsync()`:

**CRÍTICO**:

1. La opción `params` DEBE ser una función que devuelva el valor a validar.
2. El manejador `onError` es **OBLIGATORIO**: ¡no es opcional!

```ts
import {resource} from '@angular/core';
import {validateAsync} from '@angular/forms/signals';

userForm = form(this.userModel, (s) => {
  validateAsync(s.username, {
    // 1. DEBE ser una función - params recibe el contexto y devuelve el valor
    params: ({value}) => value(),

    // 2. Crea el resource - la factory recibe un Signal
    factory: (username) =>
      resource({
        params: username, // Usa 'params' en resource()
        loader: async ({params: value}) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return value === 'taken';
        },
      }),

    // 3. Mapea el éxito a errores
    onSuccess: (isTaken) =>
      isTaken ? {kind: 'taken', message: 'Username is already taken'} : undefined,

    // 4. Maneja los errores - ¡ESTO ES OBLIGATORIO!
    onError: () => ({kind: 'error', message: 'Validation failed'}),
  });
});
```

**Ejemplos INCORRECTOS:**

```ts
// INCORRECTO - params debe ser una función
validateAsync(s.username, {
  params: s.username, // ERROR: debe ser ({ value }) => value()
  // ...
});

// INCORRECTO - falta onError (¡es obligatorio!)
validateAsync(s.username, {
  params: ({value}) => value(),
  factory: (username) =>
    resource({
      /* ... */
    }),
  onSuccess: (result) => (result ? {kind: 'error'} : undefined),
  // ERROR: ¡falta 'onError' pero es obligatorio!
});
```

### Uso de Resource

**CRÍTICO**: en `resource()` de Angular, usa `params` para el signal de entrada.

```ts
// CORRECTO
resource({
  params: mySignal,
  loader: async ({params: value}) => {
    /* ... */
  },
});

// INCORRECTO
resource({
  request: mySignal, // ERROR: debería ser 'params'
  loader: async ({request}) => {
    /* ... */
  },
});
```

Usa `debounce()` para retrasar la sincronización entre la UI y el modelo.

```ts
import {debounce} from '@angular/forms/signals';

userForm = form(this.userModel, (s) => {
  // Retrasa las actualizaciones del modelo 300ms
  debounce(s.username, 300);
});
```

### Validación condicional

```ts
form(
  data,
  (path) => {
    applyWhen(
      name,
      ({value}) => value() !== 'admin',
      (namePath) => {
        validate(namePath.last /* ... */);
        disable(namePath.last /* ... */);
      },
    );
  },
  {injector: TestBed.inject(Injector)},
);
```

`applyWhen` pasa la ruta mapeada al primer argumento.
Si necesitas el campo padre, simplemente pásalo a `applyWhen`:

```ts
form(
  data,
  (path) => {
    applyWhen(
      cat,
      ({value}) => value().name !== 'admin',
      (catPath) => {
        require(cat.catPath /* ... */);
      },
    );
  },
  {injector: TestBed.inject(Injector)},
);
```

## Errores comunes (NO HAGAS ESTO)

| Escenario de error         | INCORRECTO (error habitual)                        | CORRECTO (forma correcta)                                                              |
| :--------------------- | :-------------------------------------------- | :------------------------------------------------------------------------------- |
| **Acceder a flags**    | `form.field.valid()`                          | `form.field().valid()`                                                           |
| **Acceder al valor**    | `form.field.value()`                          | `form.field().value()`                                                           |
| **Establecer el valor**      | `form.field.set(x)`                           | Actualiza el signal del modelo: `this.model.update(...)`                                    |
| **Flags de la raíz del formulario**    | `form.invalid()`                              | `form().invalid()`                                                               |
| **Doble llamada**     | `form.field()()`                              | `form.field().value()`                                                           |
| **Contexto de reglas**      | `({ touched }) => touched()`                  | `({ state }) => state.touched()`                                                 |
| **Llamar a rutas**      | `applyWhen(p.foo, () => p.foo() === 'x')`     | `applyWhen(p.foo, ({ valueOf }) => valueOf(p.foo) === 'x')`                      |
| **Argumentos de applyWhen**     | `applyWhen(condition, () => {...})`           | `applyWhen(path, condition, schemaFn)` - necesita 3 argumentos                            |
| **Longitud de array**       | `form.items().length`                         | `form.items.length` (estructural)                                                 |
| **Array de selección múltiple** | `<select [formField]="form.tags">` (string[]) | Usa checkboxes para campos de tipo array                                                  |
| **Atributo readonly** | `<input readonly [formField]>`                | Usa la regla `readonly()` en el esquema                                                  |
| **Atributos min/max** | `<input min="1" max="10">`                    | Usa las reglas `min()` y `max()` en el esquema                                          |
| **Enlace de value**      | `<input [value]="val">`                       | NO uses `[value]` con `[formField]` (el `value` estático en radio/checkbox está bien) |
| **Opción when**        | `pattern(p.x, /.../, {when: ...})`            | `when` solo funciona con `required()`                                              |
| **Callback de Submit**    | `submit(form, () => { ... })`                 | `submit(form, async () => { ... })`                                              |
| **Params async**       | `params: s.field`                             | `params: ({ value }) => value()`                                                 |
| **onError en async**      | Omitir `onError`                            | `onError` es OBLIGATORIO en `validateAsync`                                         |
| **API de resource()**     | `request: signal`                             | `params: signal`                                                                 |
| **Argumentos de applyEach**     | `applyEach(s.items, (item, index) => ...)`    | `applyEach(s.items, (item) => ...)`                                              |
| **@for anidado**        | `$parent.$index`                              | Usa `let outerIndex = $index`                                                    |
| **Import de FormState**   | `import { FormState }`                        | `FormState` no existe, usa `FieldState`                                     |
| **Null en el modelo**      | `signal({ name: null })`                      | `signal({ name: '' })` o `signal({ age: 0 })`                                   |
| **Sintaxis de validate**    | `validate(s.field, { value } => ...)`         | `validate(s.field, ({ value }) => ...)`                                          |
| **Array de checkbox**     | `[formField]="form.tags"` (string[])          | Los checkboxes SOLO se enlazan a `boolean`                                                |

## Ejemplo de formulario grande

### `src/app/app.ts`

```ts
import {Component, signal} from '@angular/core';
import {
  form,
  FormField,
  submit,
  required,
  email,
  min,
  hidden,
  applyEach,
  validate,
} from '@angular/forms/signals';

@Component({
  selector: 'app-root',
  imports: [FormField],
  templateUrl: './app.html',
})
export class App {
  protected readonly model = signal({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      age: 0,
    },
    tripDetails: {
      destination: 'Mars',
      launchDate: '',
    },
    package: {
      tier: 'economy',
      extras: [] as string[],
    },
    companions: [] as Array<{name: string; relation: string}>,
  });

  protected readonly bookingForm = form(this.model, (s) => {
    required(s.personalInfo.firstName, {message: 'First name is required'});
    required(s.personalInfo.lastName, {message: 'Last name is required'});
    required(s.personalInfo.email, {message: 'Email is required'});
    email(s.personalInfo.email, {message: 'Invalid email address'});
    required(s.personalInfo.age, {message: 'Age is required'});
    min(s.personalInfo.age, 18, {message: 'Must be at least 18'});

    required(s.tripDetails.destination);
    required(s.tripDetails.launchDate);
    validate(s.tripDetails.launchDate, ({value}) => {
      const date = new Date(value());
      if (isNaN(date.getTime())) return undefined;
      const today = new Date();
      if (date < today) {
        return {kind: 'pastData', message: 'Launch date must be in the future'};
      }
      return undefined;
    });

    // valueOf se usa para acceder a valores de otros campos en las reglas
    hidden(s.package.extras, {when: ({valueOf}) => valueOf(s.package.tier) === 'economy'});

    applyEach(s.companions, (companion) => {
      required(companion.name, {message: 'Companion name required'});
      required(companion.relation, {message: 'Relation required'});
    });
  });

  addCompanion() {
    this.model.update((m) => ({
      ...m,
      companions: [...m.companions, {name: '', relation: ''}],
    }));
  }

  removeCompanion(index: number) {
    this.model.update((m) => ({
      ...m,
      companions: m.companions.filter((_, i) => i !== index),
    }));
  }

  onSubmit() {
    // CRÍTICO: el callback de submit DEBE ser async
    submit(this.bookingForm, async () => {
      console.log('Booking Confirmed:', this.model());
      // Si necesitas hacer trabajo asíncrono:
      // await this.apiService.save(this.model());
    });
  }
}
```

### `src/app/app.html`

```html
<form (submit)="onSubmit(); $event.preventDefault()">
  <h1>Interstellar Booking</h1>

  <section>
    <h2>Personal Info</h2>

    <label>
      First Name
      <input [formField]="bookingForm.personalInfo.firstName" />
      @if (bookingForm.personalInfo.firstName().touched() &&
      bookingForm.personalInfo.firstName().errors().length) {
      <span>{{ bookingForm.personalInfo.firstName().errors()[0].message }}</span>
      }
    </label>

    <label>
      Last Name
      <input [formField]="bookingForm.personalInfo.lastName" />
      @if (bookingForm.personalInfo.lastName().touched() &&
      bookingForm.personalInfo.lastName().errors().length) {
      <span>{{ bookingForm.personalInfo.lastName().errors()[0].message }}</span>
      }
    </label>

    <label>
      Email
      <input type="email" [formField]="bookingForm.personalInfo.email" />
      @if (bookingForm.personalInfo.email().touched() &&
      bookingForm.personalInfo.email().errors().length) {
      <span>{{ bookingForm.personalInfo.email().errors()[0].message }}</span>
      }
    </label>

    <label>
      Age
      <input type="number" [formField]="bookingForm.personalInfo.age" />
      @if (bookingForm.personalInfo.age().touched() &&
      bookingForm.personalInfo.age().errors().length) {
      <span>{{ bookingForm.personalInfo.age().errors()[0].message }}</span>
      }
    </label>
  </section>

  <section>
    <h2>Trip Details</h2>

    <label>
      Destination
      <select [formField]="bookingForm.tripDetails.destination">
        <option value="Mars">Mars</option>
        <option value="Moon">Moon</option>
        <option value="Titan">Titan</option>
      </select>
    </label>

    <label>
      Launch Date
      <input type="date" [formField]="bookingForm.tripDetails.launchDate" />
      @if (bookingForm.tripDetails.launchDate().touched() &&
      bookingForm.tripDetails.launchDate().errors().length) {
      <span>{{ bookingForm.tripDetails.launchDate().errors()[0].message }}</span>
      }
    </label>
  </section>

  <section>
    <h2>Package</h2>

    <label>
      <input type="radio" value="economy" [formField]="bookingForm.package.tier" />
      Economy
    </label>
    <label>
      <input type="radio" value="business" [formField]="bookingForm.package.tier" />
      Business
    </label>
    <label>
      <input type="radio" value="first" [formField]="bookingForm.package.tier" />
      First Class
    </label>

    @if (!bookingForm.package.extras().hidden()) {
    <div>
      <h3>Extras</h3>
      <!-- La selección múltiple para arrays debe usar select multiple -->
      <select multiple [formField]="bookingForm.package.extras">
        <option value="wifi">WiFi</option>
        <option value="gym">Gym</option>
      </select>
    </div>
    }
  </section>

  <section>
    <h2>Companions</h2>
    <button type="button" (click)="addCompanion()">Add Companion</button>

    @for (companion of bookingForm.companions; track $index) {
    <div>
      <input [formField]="companion.name" placeholder="Name" />
      @if (companion.name().touched() && companion.name().errors().length) {
      <span>{{ companion.name().errors()[0].message }}</span>
      }

      <input [formField]="companion.relation" placeholder="Relation" />
      @if (companion.relation().touched() && companion.relation().errors().length) {
      <span>{{ companion.relation().errors()[0].message }}</span>
      }

      <button type="button" (click)="removeCompanion($index)">Remove</button>
    </div>
    }
  </section>

  <button [disabled]="bookingForm().invalid()">Submit</button>
</form>
```

## Recuperarse de errores de compilación

Si te encuentras con errores de compilación, aquí tienes las soluciones más habituales:

### `Property 'value' does not exist on type 'FieldTree'`

**Problema**: acceder a `.value()` directamente en un campo sin llamarlo primero.

```ts
// INCORRECTO
const val = this.form.field.value();
// CORRECTO
const val = this.form.field().value();
```

### `Property 'set' does not exist on type 'FieldTree'`

**Problema**: intentar establecer valores en el árbol del formulario. Signal Forms está dirigido por el modelo (model-driven).

```ts
// INCORRECTO
this.form.address.street.set('Main St');
// CORRECTO - actualiza el signal del modelo en su lugar
this.model.update((m) => ({...m, address: {...m.address, street: 'Main St'}}));
```

### `Type 'string[]' is not assignable to type 'string'`

**Problema**: enlazar `[formField]` a un campo de tipo array con un `<select>` de valor único.

```html
<!-- INCORRECTO - assignees es string[], select espera string -->
<select [formField]="form.assignees">
  ...
</select>

<!-- CORRECTO - usa select multiple para campos de tipo array -->
<select multiple [formField]="form.assignees">
  <option value="us">US</option>
</select>
```

### `NG8022: Setting the 'readonly/min/max/value' attribute is not allowed`

**Problema**: conflicto entre atributos HTML y la directiva `[formField]`.

```html
<!-- INCORRECTO -->
<input [formField]="form.age" min="18" max="99" />
<input [formField]="form.name" [value]="'John'" />

<!-- CORRECTO - usa reglas en el esquema -->
min(s.age, 18); max(s.age, 99); // Luego simplemente:
<input [formField]="form.age" />
```

### `TS2322: Type 'string[]' is not assignable to type 'boolean'`

**Problema**: enlazar un checkbox a un campo de tipo array en lugar de a un campo booleano.

```html
<!-- INCORRECTO - tags es string[] -->
<input type="checkbox" [formField]="form.tags" />

<!-- CORRECTO - usa select multiple para valores de tipo array -->
<select multiple [formField]="form.tags">
  <option value="a">A</option>
</select>

<!-- O - mapea a campos booleanos en el modelo -->
protected readonly model = signal({ hasWifi: false, hasGym: false });
<input type="checkbox" [formField]="form.hasWifi" />
```

### `'when' does not exist in type` para pattern/email/min/max

**Problema**: usar la opción `when` con validadores distintos de `required`.

```ts
// INCORRECTO - when solo funciona con required
pattern(s.ssn, /^\d{3}-\d{2}-\d{4}$/, {when: isJoint});

// CORRECTO - usa applyWhen para validadores condicionales que no son required
applyWhen(s.ssn, isJoint, (ssnPath) => {
  pattern(ssnPath, /^\d{3}-\d{2}-\d{4}$/);
});
```

### `Expected 3 arguments, but got 2` para applyWhen

**Problema**: falta el argumento de ruta en `applyWhen`.

```ts
// INCORRECTO
applyWhen(isJoint, () => { ... });

// CORRECTO - applyWhen(path, condition, schemaFn)
applyWhen(s.spouse, ({valueOf}) => valueOf(s.status) === 'joint', (spousePath) => {
  required(spousePath.name);
});
```

### `Module has no exported member 'FormState'`

**Problema**: importar un tipo inexistente.

```ts
// INCORRECTO
import {FormState} from '@angular/forms/signals';

// FormState no existe. Si necesitas acceso a tipos, la instancia
// del formulario proporciona todo el estado necesario mediante field().valid(), etc.
```

### `No pipe found with name 'number'` / `'json'` / `'date'`

**Problema**: usar pipes en las plantillas.

```html
<!-- INCORRECTO -->
{{ totalPrice() | number:'1.2-2' }}

<!-- CORRECTO - formatea en el componente -->
protected readonly totalPriceFormatted = computed(() => this.totalPrice().toFixed(2));
<!-- luego: -->
{{ totalPriceFormatted() }}
```

### `$parent.$index` en bucles @for anidados

**Problema**: Angular no tiene `$parent`.

```html
<!-- INCORRECTO -->
@for (item of items; track $index) { @for (sub of item.subs; track $index) {
<button (click)="remove($parent.$index, $index)">X</button>
} }

<!-- CORRECTO -->
@for (item of items; track $index; let outerIdx = $index) { @for (sub of item.subs; track $index) {
<button (click)="remove(outerIdx, $index)">X</button>
} }
```
