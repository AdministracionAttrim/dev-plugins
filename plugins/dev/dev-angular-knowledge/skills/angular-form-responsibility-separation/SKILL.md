---
name: angular-form-responsibility-separation
description: Enforce strict separation of concerns in complex Angular reactive forms. Component must stay thin (orchestration + template only). Delegate to focused services. Use when form component >200 lines or mixes creation/populate/actions/effects.
---

# Angular Form Responsibility Separation

## Goal

- Component = thin glue only.
- Each service has exactly one responsibility.
- Easy to test, maintain, reuse.

## Recommended Split (Example)

- `feat-<entity>-form.component.ts` -> orchestration + DI + template bindings.
- `<entity>-form-builder.service.ts` -> creates FormGroup, controls, validators, FormArrays.
- `<entity>-form-populator.service.ts` -> loads API data (`patchValue`, `setControl`, `clear+push`).
- `<entity>-form-actions.service.ts` -> submit/save/reset and explicit user actions.
- `<entity>-form-effects.service.ts` -> `valueChanges`, reactive rules, cross-field side effects, enable/disable.

See [references/form-separation-pattern.md](references/form-separation-pattern.md) for the full responsibility matrix and a minimal wiring example.

### Responsibility contract (must be respected)

- `builder`: only form structure and validators creation.
- `populator`: only data-to-form mapping, clear/push arrays, editability patching from entity state.
- `actions`: only user-triggered form actions (add/remove/update/deactivate, confirmations, submit helpers).
- `effects`: only reactive subscriptions/effects (`valueChanges`, `effect()`, derived UI behavior).

When this skill generates code, it must create these services (or preserve equivalent services) whenever the form has medium/high complexity and mixed concerns.

## Rules

- Never put `valueChanges`, `builder.group()`, API calls, or business logic inside component.
- Inject services in component constructor, call methods only.
- Effects service subscribes in `ngOnInit` / `afterViewInit` with `takeUntilDestroyed`.
- Use clear naming: `builder`, `populator`, `actions`, `effects`.

## Refactoring Protocol (CLI)

- Before refactoring any form component:
  - Agent must ask user explicit permission.
  - Example question: "Puedo refactorizar este componente separando responsabilidades en servicios (builder/populator/actions/effects)?"
- Proceed ONLY if user answers "si" / "yes".

## When to Apply

Any form with >3 interacting fields -> split immediately.

## Validation

Component and Services under 350 lines ("skipBlankLines": true), no `valueChanges` in component.

## References

- Implementation guide: [references/form-separation-pattern.md](references/form-separation-pattern.md)
