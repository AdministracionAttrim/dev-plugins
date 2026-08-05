# Angular Form Responsibility Separation Rule

## i:

Form with >3 interacting fields → split into services. Component = thin glue only.

## Mandatory Split

feat-{name}-form.component.ts → orchestration + DI + template bindings
{name}-form-builder.service.ts → FormGroup structure + validators + FormArrays
{name}-form-populator.service.ts → patchValue | setControl | clear+push from API
{name}-form-actions.service.ts → submit | add row | delete | confirmations
{name}-form-effects.service.ts → valueChanges | effect() | cross-field enable-disable
{name}-workflow.service.ts → [optional] state-machine when entity has status transitions
components/tabs/{tab}-tab/ → [si p-tabs] subcomponente por pestaña (ver Tab Split)

## T→A (split triggers — any true → split immediately):

T: component file ≥300L → A: split
T: `// oxlint-disable max-lines` present → A: split
T: component mixes ≥2 of {build, populate, actions, effects} → A: split
T: valueChanges inside component class → A: move to effects.service
T: builder.group() inside component class → A: move to builder.service
T: form con p-tabs y ≥2 tabs con lógica propia (forms aux | tablas | signals UI) → A: Tab Split

## Tab Split (forms masivos basados en p-tabs)

i: "Servicios reducen lógica; tabs reducen UI. Ambos splits son ortogonales y se combinan."

Estructura: feat-{name}-form/components/tabs/{tab}-tab/{name}-{tab}-tab.component.{ts,html,spec.ts}
Selector: app-{name}-{tab}-tab | OnPush | template propio

**Comunicación — context token DI (!input.required para el form):**

- {name}-tabs-context.ts → `type {Name}TabsContext` + `InjectionToken {NAME}_TABS_CONTEXT`
- padre: `providers: [{ provide: TOKEN, useExisting: forwardRef(() => Padre) }]` + `implements {Name}TabsContext`
- tab: `readonly #context = inject(TOKEN)` → form/staticState disponibles en field initializers
- Reason: input() no está disponible en inicializadores → useEditableTable/toSignal/computed sobre el form fallarían | DI sí (LE-SS: incidente N/A, ver pattern doc)

**Reparto padre vs tab:**

padre → createForm | useEntityForm | executeAction+submit | recarga post-update | delete dialog | shell p-tabs/p-tablist | effects de form-level que cruzan tabs (ej. company→clear paymentMethods)
tab → forms auxiliares | useEditableTable | signals UI | custom actions | computeds derivados del form compartido | effects propios

**Estado cross-tab (3 canales):**

- ① form compartido → referencia mutable vía context (markAsDirty/valid propagan solos) | !!clonar form | !!form paralelo en tab
- ② dato escrito por tab + leído por padre → WritableSignal en context (ej. attachedDocuments)
- ③ evento de carga padre→tabs → `loadedSupply: Signal<LoadedContext|null>` con objeto NUEVO por (re)carga → effects de tabs re-ejecutan aunque los valores se repitan | !!primitivo/mismo objeto (recarga no re-dispara)
- template tab → root `<form [formGroup]="form">` propio (formControlName/formArrayName necesitan FormGroupDirective local; sin él → NG01050)

**Extracción (orden, 1 build por tab):** context token+provider → copiar p-tabpanel a template tab con form raíz → mover estado/métodos de un-solo-tab vía #context → hooks post-carga a effect(loadedSupply)+untracked → padre solo shell `<app-{name}-{tab}-tab />` → `npm run build` → migrar tests del tab
detail por paso + troubleshooting: @file:docs/wiki/patterns/tab-component-split.md

**Tests:** spec por tab | provider `{ provide: TOKEN, useFactory: () => createTabsContextMock(inject(FormService).createForm(...)) }` (!!useValue: form requiere injector del TestBed) | `overrideComponent({set:{template:""}})` | mock: {name}-tabs-context.mock.ts | prototype-call tests: solo cambia clase del prototipo (LE-SS-0045)

G:T1 !!estado de un solo tab en el padre (ni viceversa: cross-tab duplicado en tabs)
G:T2 !!viewChild del padre hacia tabs para lógica (solo comunicación vía context/form)
G:T3 tab ≤350L | padre ≤300L sin oxlint-disable
G:T4 !!effect cross-tab en un tab (toca controles de otro tab → padre) | effect propio (form aux local) → tab dueño
G:T5 effect sobre loadedSupply → escrituras en `untracked()` + guard null (!!loop por auto-dependencia)
G:T6 !!lazy templates en p-tabpanel (tabs eager → effects activos desde primer render; lazy → datos sin hidratar al guardar)
G:T7 provider token → `forwardRef` obligatorio (clase referenciada dentro de su propio decorador)
G:T8 visibilidad: template-only → protected | spec dot-access → public implícito (LE-SS-0045) | miembros del contrato → public (implements lo exige) | !!barrido protected sin cruzar specs
G:T9 member-ordering: dependencia de construcción > orden canónico (signal consumido por const-init precede | useEditableTable precede a computed dependientes | createControlValueSignal tras form)

detail: @file:docs/wiki/patterns/tab-component-split.md
canonical: @file:src/app/modules/master-data/configuration/supply/feat-supply-form/ (6 tabs + context)

## Workflow Service — add when:

≥3 statuses w/ field editability differences | status transitions auto-fill dates | special actions per status | edit hidden by business status (!just deletionDate)
detail: @file:docs/wiki/patterns/form-workflow-service.md

## Builder Disabled State

pass formAction → createForm(formAction) → apply `disabled: isReadOnly` per control
isReadOnly = formAction === FORM_ACTION.DETAIL

## G:[IDs]

G:001 !!form.disable() from component
G:002 Components may only disable controls OUTSIDE the main FormGroup (standalone FormControl, e.g. company selector)
G:003 Refactor protocol: ask user "¿Puedo refactorizar...separando responsabilidades?" — proceed only on sí/yes

## @refs

@file:src/app/modules/master-data/contract-management/pucs/feat-pucs-form/ (canonical)

