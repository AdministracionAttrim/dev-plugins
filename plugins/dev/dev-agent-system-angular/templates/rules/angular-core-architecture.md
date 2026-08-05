---
description: >
  Core architectural patterns for the Angular project. Covers NgRx Signal Store, dependency injection,
  DTO contracts (SupplySearch vs Supply), staging-form tables (delete vs deactivate), and TS conventions.
  Use as reference when building or modifying Angular forms, tables, states, or components.
---

# Angular Core Architecture & Data Contracts

## i:

Core invariants: Signal Store via EntityService subclass | inject() everywhere | signals-first | DTO Search/full split | staging-table delete-vs-deactivate by id presence.

## NgRx Signal Store

- feature API service extends EntityService<EntityDetail, EntitySummary>
- !!inject HttpClient directly in component | store
- post addItem|updateItem → navigation by FormHelperService.onRequestSuccess() (!manual nav in component)

## T→A (Angular patterns)

T: new component → A: standalone default (!write standalone: true) | ChangeDetectionStrategy.OnPush
T: inject dep → A: inject() function | !constructor injection
T: state → A: signal() + computed() for derived | !BehaviorSubject | !getters for derived
T: route params → A: withComponentInputBinding (already in app.config.ts) | !inject ActivatedRoute (except relativeTo: this.#route for relative nav)
T: subscription → A: takeUntilDestroyed() | !manual unsubscribe | !takeUntil(destroy$) | !Subscription bags
T: template control flow → A: @if | @for | @switch (!*ngIf | !*ngFor)
T: component I/O → A: input() | output() (!@Input | !@Output)
T: template-bound prop → A: protected modifier
T: tabla lazy sin store (endpoint anidado/no-CRUD) → A: ApiQueryBuilder .withColumns().withDefaultSort().fromPrimeNgMeta() | !!parseo manual event.filters | !Math.floor(event.first/rows) inline | detail: @file:docs/wiki/patterns/custom-table-without-store.md

## DTO Contract

- GET/list → \*Search reduced model | !full entity
- full entity only from id-based GET | explicit selector output
- `supply-selector` value == SupplySearch; supplySelect output emits full Supply
- !!duplicate id-based GET if selector already provides full entity

## Staging-Form Tables (delete vs deactivate)

no id → physical delete (remove FormArray) | has id → soft delete patchValue({ deletionDate: new Date() })
impl: useEditableTable + useFormTableEditable | id+rowId via FormHelperService.createIdRowControls()
TableMenuComponent resolves label at runtime: no id → "Eliminar" | id → "Dar de baja"; just [actions]="['delete']"
detail: @file:docs/wiki/patterns/staging-form-delete-vs-deactivate.md

## TypeScript

- strict mode | !any
- ES2022 target | !!ES2023+ (!toSorted() | !Array.findLast() | !Object.groupBy()); use [...arr].sort() etc.
- `type` for object shapes | !interface (oxlint consistent-type-definitions)
- !I/Type/Data prefixes or suffixes on types
- shared models → dedicated .model.ts
- prefer inference | !redundant annotations
- private class fields (#field) for injected deps

## Architecture Quality

Pre-code: state structure + complexity reduction + logic location | unanswerable → redesign first
Post-code: component ≤200L | service/store ≤350L | fn complexity ≤20 | !business logic in templates
T: component reaches 200L → A: delegate to service | T: doubt on pattern → A: copy canonical; !invent
Canonicals: companies/ (mature list+form) | zones/ (simple form) | contracts/ (store+effects)
detail: @file:docs/wiki/patterns/code-quality-checklist.md

## @refs

@rule:ngrx-entity-store (store API, withCrudOperations)

