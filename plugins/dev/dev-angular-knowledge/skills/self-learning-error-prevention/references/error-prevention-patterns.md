# Error Prevention Patterns

## Table of Contents

- [Purpose](#purpose)
- [When Generating Code](#when-generating-code)
- [Rule Application Workflow](#rule-application-workflow)
- [Pattern Catalog](#pattern-catalog)
- [Output Contract](#output-contract)

## Purpose

Use this file as the operational guide for applying learned rules during code generation and refactoring. Keep `knowledge-log.md` as the source of incidents and validated rules.

## When Generating Code

Always do this before writing code:

1. Scan `knowledge-log.md` for matching `Fingerprint`, `Topic`, or stack trace hints.
2. Select only relevant rules for the current task.
3. Convert selected rules into concrete pre-checks for touched files.

## Rule Application Workflow

1. Detect risk signals from the request and local code.
2. Match risk signals with existing entries in `knowledge-log.md`.
3. Apply preventive rule before editing code.
4. Validate behavior with minimal verification (test/lint/runtime).
5. If a new verified incident appears, append a canonical entry to `knowledge-log.md`.

## Pattern Catalog

### Angular Reactive Effects

- Pattern: If using `takeUntilDestroyed` in methods, use explicit `DestroyRef` outside injection context.
- Verify: no NG0203 runtime error.

### Reactive Forms Enable/Disable

- Pattern: Use `FormControl` value as source of truth for enable/disable conditions.
- Verify: dependent controls transition correctly in all form states.

### FormArray With Managers/Adapters

- Pattern: Keep same `FormArray` instance when table managers store references; mutate via `clear/push`.
- Verify: loaded rows are visible and editable after populate.

### Angular Test Router Mocks

- Pattern: Prefer `provideRouter([])` and spy selective methods instead of partial `Router` mocks.
- Verify: no `router.events` undefined errors in shell components.

### Search DTO vs Full Entity Contract

- Pattern: Assume non-id GET/list calls return reduced `*Search` models; only id-based fetches or explicit selector outputs provide full entities.
- Verify: code does not read full-only fields from `*Search` DTOs and does not duplicate id fetches when full entity is already emitted.

## Output Contract

When finishing a task that used this skill, report:

- Which rule IDs were applied.
- Which files were protected by those rules.
- What validation confirms no regression.
