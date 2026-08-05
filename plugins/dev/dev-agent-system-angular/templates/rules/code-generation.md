# Code Generation Rules

## i:

Complements CLAUDE.md. Apply both simultaneously, !repeat.

## T→A:

T: inject dep → A: `readonly #field = inject(X);` (readonly + # private + inject())
T: component button → A: `<p-button type="button" ...>` !native `<button>`
T: non-button interactive el → A: role + (click) + (keyup.enter) both required
T: new component → A: OnPush + standalone (implicit) + selector="app-feat-\*" + templateUrl
T: nombrar variable/parámetro/inyección/callback → A: nombre descriptivo completo (≥3 chars + significado claro en el scope) | !!1-2 char names | !!abreviaturas inventadas (`sl`, `sc`, `wm`, `val`, `m`, `p`, `cb`, `el`, `tmp`, `arr`, `res`) | prefer `supplyLanguage`/`supplyCenter`/`waterMethod`/`controlValue`/`parameter` | OK: i/index en for, a/b en sort comparator, tipados estructurales (`ctx: DocumentActionsContext`), abreviaturas convencionales aceptadas por el usuario (`#fb` para FormBuilder)

## Member ordering (inject → input/output → viewChild → const → signal → computed → getter → constructor → protected → private)

G:M1 !!computed() before signal() it depends on
G:M2 computed() only when reads ≥1 signal; else plain readonly const
G:M3 viewChild/contentChild: `private readonly` (no #) — Angular no resuelve view queries en native private fields
G:M4 separar bloques por UNA línea en blanco (inject / input/output / viewChild / const / signal / resource / computed / hook+alias / form+table / getter / constructor / protected / private). !!líneas en blanco DENTRO de un bloque | !!bloques contiguos sin separación
detail: @file:docs/wiki/patterns/angular-component-skeleton.md

## T→A (PrimeNG attributes — apply to every PrimeNG component in templates):

T: PrimeNG component attr → A: `[attr]="'value'"` (!bare `attr="value"`);

## Naming — variables, params, fields

!!abbreviations in any identifier (vars, params, class fields, computed names).
Name must be self-documenting: `supplyGroupId` not `sgId`, `formValue` not `raw`, `currentQuery` not `qry`, `conceptId` not `id`.
Exception: established project-wide shorthands (`#fb` for FormBuilder, `#http` for HttpClient) — keep for consistency.
T: tempted to shorten a name → A: write the full, unambiguous name | !!save keystrokes at the cost of readability

## G:[IDs]

G:001 !!missing readonly on injected fields (oxlint prefer-readonly)
G:002 !!native <button>; always p-button type="button"
G:003 !!constructor injection
G:004 non-button interactive: role + click + keyup.enter (all three)
G:005 !!bare string attributes on PrimeNG components; always [attr]="'value'" (LE-SS-0019)
G:006 !!member-ordering blocks sin línea en blanco entre ellos (ver G:M4)
G:007 !!abbreviated identifiers; full descriptive names always (ver Naming section)
G:008 !!short cryptic identifier names (<3 chars o abreviatura ad-hoc) en variables/parámetros/inyecciones/callbacks. Reason: legibilidad rota y mantenimiento costoso (incidente refactor supply 2026-05). Exceptions: índices clásicos `i/j/k`, comparadores `a/b`, params tipados (`ctx: SomeContext`).
G:009 !!`as unknown as import("path").Type` (cast con import inline). A: `import type { Type } from "path"` arriba + `as unknown as Type`. !!`X as unknown as T` cuando X ya es asignable a T (Sonar S4325) — eliminar el cast entero. Reason: incidente refactor supply 2026-05-25 con 58 ocurrencias detectadas. Exceptions: `Class.prototype as unknown as { method: ... }` para invocar métodos privados desde tests (LE-SS-0045).

## Tailwind — layout+spacing ONLY (!!colors|typography via Tailwind)

form grid 3col: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`
form grid 2col: `grid grid-cols-1 gap-4 md:grid-cols-2`
sections: `flex flex-col gap-6` wrapping `<app-form-wrapper-item>`
!!arbitrary values (!mt-[17px]) | !!tailwind.config.ts (CSS-first v4; new utility → @utility in main CSS)

## @refs

@rule:project-ui-components (tables, inputs, selects)
@file:docs/wiki/patterns/angular-component-skeleton.md (injection, a11y, skeleton, member ordering)
