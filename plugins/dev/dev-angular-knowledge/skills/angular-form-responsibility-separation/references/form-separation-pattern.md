# Angular Form Separation Patterns

## Table of Contents

- [Purpose](#purpose)
- [File Naming Pattern](#file-naming-pattern)
- [Service Responsibility Matrix](#service-responsibility-matrix)
- [Generation Checklist](#generation-checklist)
- [Anti-Patterns](#anti-patterns)
- [Minimal Wiring Example](#minimal-wiring-example)

## Purpose

Use this document as the implementation reference for complex Angular form features that must enforce strict responsibility separation.

## File Naming Pattern

Base the generated architecture on files named after the feature/entity being built, under its own feature folder:

- `src/app/<module>/<feature>/<feature>-form-builder.service.ts`
- `src/app/<module>/<feature>/<feature>-form-populator.service.ts`
- `src/app/<module>/<feature>/<feature>-form-actions.service.ts`
- `src/app/<module>/<feature>/<feature>-form-effects.service.ts`

## Service Responsibility Matrix

`builder` (`*-form-builder.service.ts`)

- Create form model structure.
- Create controls, validators, and FormArray groups.
- Expose factory methods for row/sub-form creation.
- Do not subscribe to `valueChanges`.
- Do not call APIs.

`populator` (`*-form-populator.service.ts`)

- Patch entity data into the form.
- Clear/push `FormArray` entries while keeping the same array instance.
- Apply editability rules derived from loaded entity state.
- Do not create base form structure.
- Do not execute submit/business actions.

`actions` (`*-form-actions.service.ts`)

- Implement user-triggered operations: add/remove/update/deactivate rows, confirm dialogs, submit helpers.
- Use builder factories when creating row forms.
- Centralize feedback and confirmation flows.
- Do not own reactive subscriptions.

`effects` (`*-form-effects.service.ts`)

- Centralize reactive behavior: `valueChanges`, `effect()`, cross-field dependencies.
- Manage dynamic validators and enable/disable logic.
- Use `takeUntilDestroyed` and explicit context when needed.
- Do not create base form model.
- Do not map API payloads into full form state.

`component` (`feat-*-form.component.ts`)

- Orchestrate only.
- Inject services and call methods.
- Bind template events/signals.
- Keep business logic out of component methods.

## Generation Checklist

When generating a medium/high complexity form feature:

1. Create `*-form-builder.service.ts` for form factories.
2. Create `*-form-populator.service.ts` for mapping entity to form.
3. Create `*-form-actions.service.ts` for explicit user actions.
4. Create `*-form-effects.service.ts` for reactive behavior.
5. Keep component as orchestration plus template bindings.
6. Place API orchestration outside component methods.
7. Avoid replacing tracked `FormArray` instances when adapters/managers depend on references.

## Anti-Patterns

- Component directly calling `this.fb.group(...)`.
- Component subscribing to `valueChanges`.
- One service mixing build, populate, and effects logic.
- `setControl` replacing arrays that are already tracked by table managers/adapters.

## Minimal Wiring Example

```typescript
@Component({...})
export class FeatEntityFormComponent implements OnInit {
  readonly #formBuilderService = inject(EntityFormBuilderService);
  readonly #formPopulatorService = inject(EntityFormPopulatorService);
  readonly #formActionsService = inject(EntityFormActionsService);
  readonly #formEffectsService = inject(EntityFormEffectsService);

  readonly form = this.#formBuilderService.createForm(this.formAction);

  ngOnInit(): void {
    this.#formEffectsService.setupAllListeners({ form: this.form, destroyRef: this.destroyRef });
  }

  onLoad(entity: Entity): void {
    this.#formPopulatorService.populateFormWithData(this.form, entity, this.formAction);
  }

  onAddRow(): void {
    this.#formActionsService.addRow(this.form.controls.rows, this.rowForm);
  }
}
```
