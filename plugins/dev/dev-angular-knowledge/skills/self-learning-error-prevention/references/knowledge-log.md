# Knowledge Log

## ID: LE-0001

- Topic: Angular takeUntilDestroyed outside injection context
- Fingerprint: angular|NG0203|takeUntilDestroyed without DestroyRef in method
- Signal: RuntimeError NG0203 stating use outside injection context
- Root_cause: `takeUntilDestroyed()` used without argument inside methods not executed in injection context
- Rule: In component methods, use `takeUntilDestroyed(this.#destroyRef)` with injected `DestroyRef`
- Pre_checklist:
  - Inject `DestroyRef` in the component
  - Review all `pipe` chains in the file to avoid mixed usage
- Minimum_validation: Runtime has no NG0203 and lint has no errors in touched file
- Examples:
  - src/app/features/<feature>/<feature>-form.component.ts:1
- Last_validation: 2026-02-17

## ID: LE-0002

- Topic: Disabled controls due to unsynchronized parallel state
- Fingerprint: angular-forms|control-disabled|enable-disable based on stale signal
- Signal: Field remains disabled even when business flow allows editing
- Root_cause: Enable/disable logic relies on parallel state (`signal`) instead of current `FormControl` value
- Rule: Use form control values as source of truth for enable/disable decisions and keep one synchronization point
- Pre_checklist:
  - Read current `FormControl` value before state transitions
  - Avoid duplicated condition trees across handlers and helpers
- Minimum_validation: Field state changes correctly when dependent controls change
- Examples:
  - src/app/features/<feature>/<feature>-form.component.ts:316
- Last_validation: 2026-02-17

## ID: LE-0003

- Topic: Editable table manager broken after FormArray replacement
- Fingerprint: angular-forms|table-not-updating|form.setControl replacing tracked FormArray
- Signal: API response contains rows but table bound through manager remains empty/stale
- Root_cause: Manager subscriptions and internal state keep reference to original FormArray; replacing it with `setControl` disconnects updates
- Rule: When a manager is bound to a FormArray, keep the same instance and mutate contents (`clear/push`) instead of replacing control
- Pre_checklist:
  - Check whether any helper/service stores the FormArray reference
  - Prefer `clear({ emitEvent: false })` + `push(..., { emitEvent: false })` + final `updateValueAndValidity`
- Minimum_validation: Table shows server rows after populate and edit operations still work
- Examples:
  - src/app/features/<feature>/<feature>-form.service.ts:66
- Last_validation: 2026-02-17

## ID: LE-0004

- Topic: Incomplete Angular Router mock breaks shell components in tests
- Fingerprint: angular-testing|router-events-undefined|manual-router-mock-without-events
- Signal: TypeError Cannot read properties of undefined (reading 'pipe') when executing `this.#router.events.pipe(...)`
- Root_cause: In TestBed, `Router` was replaced with a partial mock (`url`, `navigate`) without `events`, while shared components (breadcrumb) depend on `router.events`
- Rule: In component tests with shell/layout dependencies, prefer `provideRouter([])` and `spyOn` specific methods instead of mocking the full `Router`
- Pre_checklist:
  - Check whether any imported component uses `router.events`, `navigateByUrl`, or `url`
  - If a fixed URL is required, override only the `router.url` getter while keeping the real testing router instance
- Minimum_validation: The spec no longer throws in breadcrumb `ngOnInit`, and target component assertions run normally
- Examples:
  - src/app/features/<feature>/<feature>-form.component.spec.ts:1
  - src/app/core/shell/ui/breadcrumb/breadcrumb.component.ts:72
- Last_validation: 2026-02-17

## ID: LE-0005

- Topic: Mock providers must use the real service token
- Fingerprint: angular-testing|wrong-di-token|getProvider-returns-mock-class-token
- Signal: The spec needs manual `{ provide: Service, useValue: ... }` overrides even when `ServiceMock.getProvider()` exists
- Root_cause: `getProvider()` registered `provide: ServiceMock` instead of `provide: Service`, so component DI did not receive the intended mock
- Rule: In `*.service.mock.ts`, `getProvider()` must always expose the real service token (for example, `EntityService`)
- Pre_checklist:
  - Verify that `provide` matches the type injected by the component
  - Ensure specs can use `ServiceMock.getProvider()` without extra overrides
- Minimum_validation: TestBed injects the mock when requesting the real service, and tests pass without redundant manual bindings
- Examples:
  - src/app/features/<feature>/data-access/<feature>.service.mock.ts:8
  - src/app/features/<feature>-variant/data-access/<feature>-variant.service.mock.ts:13
- Last_validation: 2026-02-17

## ID: LE-0006

- Topic: PrimeNG Tree unstable viewport sizing (height collapse/loop and delayed option visibility)
- Fingerprint: primeng-tree|unstable-viewport-sizing|flex-100-scrollheight-observer-or-virtual-scroll-initial-gap
- Signal: `p-tree` renders with ~20px visible area, enters continuous height growth, or only shows more options after manual scroll
- Root_cause: Unstable viewport sizing in PrimeNG Tree when using `scrollHeight='flex'`/`'100%'`, resize-feedback loops, or virtual scroll with dynamic container height at initial render
- Rule: Use stable pixel-based `scrollHeight` from external signals (viewport/scroll), avoid observer feedback on the same measured element, and disable `virtualScroll` when immediate first-paint visibility is required
- Pre_checklist:
  - Do not use `scrollHeight='flex'` when Tree shows render instability
  - Avoid `scrollHeight='100%'` if parent chain height is not strictly deterministic
  - If dynamic growth is needed, base height on external stable signals (viewport/scroll) instead of element resize loops
  - Validate first paint without user interaction; if options are hidden until scroll, disable `virtualScroll`
- Minimum_validation: Tree is fully visible after data reload/selection change, no infinite growth appears while scrolling, and first paint shows options without manual scroll
- Examples:
  - src/app/features/<feature>/<feature>-directory.component.html:59
  - src/app/features/<feature>/<feature>-directory.component.ts:93
- Last_validation: 2026-02-23

## ID: LE-0007

- Topic: Selector emits full entity while form control stores its Search DTO
- Fingerprint: angular-forms|model-mismatch|selector-emits-entity-control-stores-search
- Signal: Associated fields (for example related lookups) become undefined or trigger extra HTTP calls when reading full entity fields from a Search model
- Root_cause: The form control bound to selectors stores Search DTOs for list endpoints, but business logic assumes full entity shape
- Rule: Treat non-id GET/list results as Search models; use full entity fields only from id-based retrieval or explicit full-entity output events (for example an `entitySelect` output emitting the full entity)
- Pre_checklist:
  - Verify the control type matches the Search model (for example `EntitySearch`)
  - Do not access full-only fields from Search DTOs
  - Avoid duplicate id fetches if the selector already emits the full entity
- Minimum_validation: Selecting and clearing the entity updates dependent data correctly with no duplicate id GET calls
- Examples:
  - src/app/shared/ui/<entity>-selector/<entity>-selector.component.ts:71
  - src/app/features/<feature>/<feature>-form.service.ts:101
- Last_validation: 2026-02-25
