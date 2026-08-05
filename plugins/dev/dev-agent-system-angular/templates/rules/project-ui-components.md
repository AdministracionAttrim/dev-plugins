# Project UI Components Rule

## i:

!!build UI from scratch. Check @file:src/app/shared/ui/ before creating any component.
detail: @file:docs/wiki/patterns/project-ui-components.md

## Replacement (quick ref)

`<table>|<p-table>` → `<app-custom-table>` | `<input>` → `<app-input-text>` | `<input number>` → `<app-input-number>` | `<p-calendar>` → `<app-input-datepicker>` | `<p-dropdown>` → `<app-select>` | raw autocomplete → `<app-autocomplete>` | `<button>` → `<p-button type="button">` | `<div class="card">` → `<app-form-wrapper-item>` | enum selector → `<app-domain-value-selector>`

## T→A:

T: list view → A: `<app-custom-table [store] [columns] [defaultSort] [actions]="permissions.tableActions()" [canCreate]="permissions.canCreate()">`
T: list with export/options → A: `<p-splitButton [label]="'common.labels.options' | transloco" [model]="tableOptions | translateMenuItem: 'label'" [outlined]="true" [severity]="'secondary'" [size]="'small'">` in `#captionLeft` ng-template (LE-SS-0028)
T: form section → A: `<app-form-wrapper-item [title]>` + grid (1/md:2/lg:3)
T: icon → A: `fa-duotone fa-regular fa-{name}` as [icon] on `<p-button>`
T: dialog → A: parent owns `<app-custom-dialog>`; content component owns form; content methods PUBLIC

## G:[IDs]

G:001 !!<app-custom-dialog> inside content component; parent hosts it
G:002 content methods public — viewChild cannot see protected
G:003 !!raw HTML form controls; always @shared/ui wrapper
G:004 !!p-button for list table options; always p-splitButton + tableOptions: MenuItem[] (LE-SS-0028)

## @refs

@file:docs/wiki/patterns/project-ui-components.md

