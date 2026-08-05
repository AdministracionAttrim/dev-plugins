# Pattern Compliance Checklist

Compare implementation against canonical project patterns. Flag any mismatch as Low severity (missing pattern) or High (pattern present but broken).

## List Module — expected structure

| Check | How to verify |
|-------|--------------|
| Store injected via `inject()` | store field in list .ts |
| `columns: TableColumn[]` defined | columns property or readonly in list .ts |
| `defaultSort` set | bound in template `[defaultSort]` |
| `[actions]="permissions.tableActions()"` bound | template — only `"view"` action (LE-SS-0058) |
| `[canCreate]="permissions.canCreate()"` bound | template — single binding, no duplicate (LE-SS-0054) |
| Active/inactive toggle present | store `statusToggle` configured + UI toggle |
| `loadChange` not duplicated | if template uses `store.loadData`, no standalone `loadChange` method in .ts |
| `<app-custom-table>` used (not `<p-table>`) | template |
| `<p-splitButton>` for options with export | template (if HU has export/options) |

## Form Module — expected structure

| Check | How to verify |
|-------|--------------|
| `FormGroup` defined in `*-form-builder.service.ts` | builder service file exists + `createForm()` method |
| `patchValue`/`setControl` in `*-form-populator.service.ts` | populator service exists |
| Save/delete in `*-form-actions.service.ts` | actions service exists |
| `valueChanges`/`effect()` in `*-form-effects.service.ts` | effects service exists (required if >3 interacting fields) |
| `PendingChangesGuard` on create+edit routes | routes file |
| `activeEntityResolver` + `redirectIfInactive:true` on edit/detail routes | routes file |
| `useFeaturePermissions(PERMS)` in form component | form .ts — not `inject(PermissionService)` |
| `[canEdit]` bound in form-header | template |
| `[hidden]` on delete button uses `permissions.canDelete()` + `isDeleted` signal | template + form .ts (LE-SS-0062) |
| `onRequestSuccess` called in constructor or actions service | form .ts or actions service (LE-SS-0023) |
| `<app-form-wrapper-item>` wraps each section | template |
| All inputs are `<app-input-*>` or `<app-select>` wrappers | template — no raw `<input>` |
