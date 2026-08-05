# Feature Scaffolding Templates

i: verbatim code per layer | substitute {Entity}/{entity}/{feature} with spec values | G:A1 no mutation inside fences

---

## L1 — data-access/{entity}.model.ts

@rule:angular-core-architecture (DTO split | BaseEntity)

```ts
import { FormControl } from "@angular/forms";
import { BaseEntity } from "@shared/models/common/base-entity.model";

// Full entity — returned by GET /:id
export type {Entity} = BaseEntity & {
  name: string;
  // ...spec.fields mapped to their TS types
};

// Reduced — returned by POST /search (list)
export type {Entity}Search = BaseEntity & {
  name: string;
  // ...only displayable/filterable fields
};

// Form shape — typed FormControls
export type {Entity}Form = {
  id: FormControl<string | null>;
  name: FormControl<string>;
  // ...one FormControl<T> per editable field
};
```

> Never use {Entity}Search where full {Entity} is required.
> FK fields: Full entity holds object (e.g. `supply: SupplySearch`); Search holds string (e.g. `supply: string`).

---

## L2 — data-access/{entity}.service.ts

@rule:angular-core-architecture | @rule:code-generation (inject + readonly)

```ts
import { Injectable } from "@angular/core";
import { environment } from "@environments/environments";
import { {Entity}, {Entity}Search } from "./{entity}.model";
import { EntityService } from "@shared/services/entity-service";

@Injectable({ providedIn: "root" })
export class {Entity}Service extends EntityService<{Entity}, {Entity}Search> {
  protected override filterFieldName = "name"; // adjust to main search field
  protected override baseUrl = `${environment.apiGw.myservice.url}/{entity-kebab}`; // replace 'myservice' with your project's apiGw config key

  // Add createXxxResource() helpers here if needed (httpResource pattern from zones canonical)
}
```

---

## L3 — data-access/{entity}.store.ts

@rule:ngrx-entity-store

```ts
import { signalStore } from "@ngrx/signals";
import { {Entity}, {Entity}Search } from "./{entity}.model";
import { {Entity}Service } from "./{entity}.service";
import { {FEATURE}_LIST_TABLE_ID } from "../{feature}.constants";
import { withCrudOperations } from "@shared/data-access/store-features/with-crud-operations";
import { withTableCustomConfig } from "@shared/data-access/store-features/with-table-custom-config";

export const {Entity}Store = signalStore(
  { providedIn: "root" },
  withCrudOperations<{Entity}, {Entity}Search>({Entity}Service, {
    statusToggle: { enabled: true },           // set false if no soft-delete
    entityStatus: { activeField: "creationDate", inactiveField: "deletionDate" }
  }),
  withTableCustomConfig({FEATURE}_LIST_TABLE_ID)
);
```

---

## L4 — {feature}.constants.ts

@rule:permissions (FeaturePermissions | LE-SS-0012) | @rule:i18n-structure

```ts
import { {Entity}Search } from "./data-access/{entity}.model";
import { InitialTableSortConfig } from "@shared/models/common/sort.model";
import { FeaturePermissions } from "@shared/models/permission.types";
import { BODY_TYPE, FILTER_TYPE, TableColumn } from "@shared/ui/custom-table/custom-table.models";
import { ContentIndex } from "@shared/ui/form-wrapper/form-wrapper-content-index/form-wrapper-content-index.component";

export const {FEATURE}_LIST_TABLE_ID = "{feature}_list";

export const {ENTITY}_PERMISSIONS = {
  LIST:   "{ENTITY}_LIST",
  DETAIL: "{ENTITY}_DETAIL",
  CREATE: "{ENTITY}_CREATE",
  UPDATE: "{ENTITY}_UPDATE",
  DELETE: "{ENTITY}_DELETE"
  // extras: ADD_EXTRA: "{ENTITY}_ADD_EXTRA"
} as const satisfies FeaturePermissions<never>; // replace never with extra key union if extras

export const {ENTITY}_TITLE = {
  LIST:   "{feature}.breadcrumb.list",
  DETAIL: "{feature}.breadcrumb.detail",
  EDIT:   "{feature}.breadcrumb.edit",
  CREATE: "{feature}.breadcrumb.create"
};

export const {FEATURE}_DEFAULT_SORT: InitialTableSortConfig<{Entity}Search>[] = [
  { sortField: "name", sortOrder: 1 }
];

export const {FEATURE}_COLUMNS: TableColumn<{Entity}Search>[] = [
  { field: "name",         header: "{feature}.table.name",         filterType: FILTER_TYPE.TEXT, bodyType: BODY_TYPE.TEXT },
  { field: "creationDate", header: "common.table.creationDate",    filterType: FILTER_TYPE.DATE, bodyType: BODY_TYPE.DATE },
  { field: "deletionDate", header: "common.table.deletionDate",    filterType: FILTER_TYPE.DATE, bodyType: BODY_TYPE.DATE }
];

// ContentIndex per tab (one inner array = one tab)
export const {FEATURE}_CONTENT_INDEX: ContentIndex[][] = [
  [
    {
      icon: "fa-duotone fa-regular fa-circle-info text-primary",
      title: "{feature}.tabs.basicData.sections.generalInfo.title",
      description: "{feature}.tabs.basicData.sections.generalInfo.description"
    }
  ]
];
```

---

## L5 — {feature}.routes.ts

@rule:permissions (3-layer L1)

```ts
import { Route } from "@angular/router";
import { activeEntityResolver } from "@core/guards/active-entity.resolver";
import { hasPermissionGuard } from "@core/guards/has-permission.guard";
import { PendingChangesGuard } from "@core/guards/pending-changes/pending-changes.guard";
import { {ENTITY}_PERMISSIONS, {ENTITY}_TITLE } from "./{feature}.constants";
import { {Entity}Service } from "./data-access/{entity}.service";
import { {Entity}Store } from "./data-access/{entity}.store";

export const {FEATURE}_ROUTES: Route[] = [
  {
    path: "",
    canActivate: [hasPermissionGuard],
    data: { breadcrumb: {ENTITY}_TITLE.LIST, permission: {ENTITY}_PERMISSIONS.LIST },
    loadComponent: () =>
      import("./feat-{feature}-list/feat-{feature}-list.component").then((c) => c.Feat{Entity}ListComponent)
  },
  {
    path: "new",
    canActivate: [hasPermissionGuard],
    canDeactivate: [PendingChangesGuard],
    data: { breadcrumb: {ENTITY}_TITLE.CREATE, permission: {ENTITY}_PERMISSIONS.CREATE },
    loadComponent: () =>
      import("./feat-{feature}-form/feat-{feature}-form.component").then((c) => c.Feat{Entity}FormComponent)
  },
  {
    path: ":id/edit",
    canActivate: [hasPermissionGuard],
    canDeactivate: [PendingChangesGuard],
    resolve: { resolvedEntity: activeEntityResolver({Entity}Service, { redirectIfInactive: true, storeType: {Entity}Store }) },
    data: { isEdition: true, breadcrumb: {ENTITY}_TITLE.EDIT, permission: {ENTITY}_PERMISSIONS.UPDATE },
    loadComponent: () =>
      import("./feat-{feature}-form/feat-{feature}-form.component").then((c) => c.Feat{Entity}FormComponent)
  },
  {
    path: ":id",
    canActivate: [hasPermissionGuard],
    resolve: { resolvedEntity: activeEntityResolver({Entity}Service) },
    data: { isDetail: true, breadcrumb: {ENTITY}_TITLE.DETAIL, permission: {ENTITY}_PERMISSIONS.DETAIL },
    loadComponent: () =>
      import("./feat-{feature}-form/feat-{feature}-form.component").then((c) => c.Feat{Entity}FormComponent)
  }
];
```

> G:003: hasPermissionGuard + data.permission on ALL 4 routes.
> G:003: activeEntityResolver with { redirectIfInactive: true, storeType } on :id/edit; plain activeEntityResolver on :id.
> G:003: PendingChangesGuard on new + :id/edit only.

---

## L6 — feat-{feature}-list/feat-{feature}-list.component.ts

@rule:project-ui-components | @rule:permissions | @rule:code-generation
G:L6-1: !!input() for entity/parent IDs in list — only in form components (LE-SS-0030)
G:L6-2: list with export → p-splitButton (LE-SS-0028) | canonical: feat-utility-bill-list

```ts
import { ChangeDetectionStrategy, Component, inject, OnInit } from "@angular/core";
import { MenuItem } from "primeng/api";
import { SplitButton } from "primeng/splitbutton";
import { PAGES } from "@core/shell/data/layout-pages";
import { {FEATURE}_COLUMNS, {FEATURE}_DEFAULT_SORT, {ENTITY}_PERMISSIONS } from "../{feature}.constants";
import { {Entity}Store } from "../data-access/{entity}.store";
import { SHARED_LIST_IMPORTS } from "@shared/imports/shared.imports";
import { ACTIONS, EntityNavigationService, ListAction } from "@shared/services/entity-navigation.service";
import { ExportDataOptions, ExportDataService } from "@shared/services/export-data.service";
import { TranslateMenuItemPipe } from "@shared/pipes/translate-menu-item.pipe";
import { useFeaturePermissions } from "@shared/utils/use-feature-permissions";

@Component({
  selector: "app-feat-{feature}-list",
  imports: [SHARED_LIST_IMPORTS, SplitButton, TranslateMenuItemPipe],
  templateUrl: "./feat-{feature}-list.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Feat{Entity}ListComponent implements OnInit {
  protected readonly store = inject({Entity}Store);
  readonly #entityNavigationService = inject(EntityNavigationService);
  readonly #exportData = inject(ExportDataService);

  protected readonly ACTIONS = ACTIONS;
  protected readonly {FEATURE}_DEFAULT_SORT = {FEATURE}_DEFAULT_SORT;
  protected readonly permissions = useFeaturePermissions({ENTITY}_PERMISSIONS, {
    isDeleted: this.store.isSelectedEntityDeleted
  });

  readonly tableOptions: MenuItem[] = [
    {
      label: "{feature}.table.actions.exportExcel",
      icon: "fa-duotone fa-regular fa-file-export text-green-800",
      command: (): void => this.#exportData.exportToExcel({
        data: this.store.entities(),
        columns: {FEATURE}_COLUMNS,
        tabName: "{Entity}",
        fileName: "{feature}"
      } as ExportDataOptions<any>)
    }
  ];

  ngOnInit(): void {
    this.store.setColumns({FEATURE}_COLUMNS);
    this.store.getConfig();
  }

  navigateToForm(action: ListAction, id?: string): void {
    this.store.setSelectedEntityId(null);
    this.#entityNavigationService.navigateToForm(action, PAGES.{ENTITY}, id);
  }
}
```

List template pattern (with splitButton in captionLeft):

```html
<app-header [title]="'{feature}.title'" />
<main class="p-4">
  <p-card>
    <app-custom-table
      [actions]="permissions.tableActions()"
      [canCreate]="permissions.canCreate()"
      [captionLeftTpl]="captionLeft"
      [columns]="store.columns()"
      [data]="store.entities()"
      [initialCustomConfig]="store.tableConfig()"
      [initialSortConfig]="{FEATURE}_DEFAULT_SORT"
      [isLoading]="store.isPending()"
      [rows]="store.page().size"
      [showActionsMenu]="true"
      [showColumnsMenu]="true"
      [statusToggle]="store.statusToggle()"
      [totalRecords]="store.page().totalElements"
      (create)="navigateToForm(ACTIONS.CREATE)"
      (customConfigChange)="store.saveConfig($event)"
      (loadChange)="store.loadData($event)"
      (rowsChange)="store.setRowsPerPage($event)"
      (view)="navigateToForm(ACTIONS.VIEW, $event.id)">
      <ng-template #captionLeft>
        <p-splitButton
          [label]="'common.labels.options' | transloco"
          [model]="tableOptions | translateMenuItem: 'label'"
          [outlined]="true"
          [severity]="'secondary'"
          [size]="'small'" />
      </ng-template>
    </app-custom-table>
  </p-card>
</main>
```

---

## L7a — Simple form (formSplit == "simple") — canonical: zones/

@rule:project-ui-components | @rule:code-generation | @rule:code-quality-guardrails

### feat-{feature}-form/feat-{feature}-form.component.ts

```ts
import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { FormWithPendingChanges } from "@core/guards/pending-changes/form-with-pending-changes";
import { PAGES } from "@core/shell/data/layout-pages";
import { {Entity}, {Entity}Form } from "../data-access/{entity}.model";
import { {Entity}Service } from "../data-access/{entity}.service";
import { {Entity}Store } from "../data-access/{entity}.store";
import { {Entity}FormService } from "./{entity}-form.service";
import { {ENTITY}_TITLE, {FEATURE}_CONTENT_INDEX } from "../{feature}.constants";
import { DeleteRequest } from "@shared/data-access/delete-request";
import { SHARED_FORM_IMPORTS } from "@shared/imports/shared.imports";
import { ENTITIES } from "@shared/models/entity-name.model";
import { EntityFormConfigService } from "@shared/services/entity-form-config.service";
import { FormHelperService } from "@shared/services/form-helper.service";
import { NotifierService } from "@shared/services/notifier.service";
import { onDefinedSignalValue, useRoutedEntityState } from "@shared/utils/use-entity-by-input-id";

@Component({
  selector: "app-feat-{feature}-form",
  imports: [SHARED_FORM_IMPORTS],
  templateUrl: "./feat-{feature}-form.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Feat{Entity}FormComponent extends FormWithPendingChanges {
  protected readonly store = inject({Entity}Store);
  readonly #formService = inject({Entity}FormService);
  readonly #formHelperService = inject(FormHelperService);
  readonly #notifierService = inject(NotifierService);
  readonly #entityFormConfigService = inject(EntityFormConfigService);
  readonly #service = inject({Entity}Service);

  protected readonly id = input<string>();
  protected readonly resolvedEntity = input<{Entity} | null>(null);
  protected readonly entityState = useRoutedEntityState(this.id, this.resolvedEntity, this.#service, this.store);

  protected readonly PAGE = PAGES.{ENTITY};
  protected readonly DeleteRequest = DeleteRequest;

  protected readonly staticState = this.#entityFormConfigService.createEntityFormStaticConfig({
    entityName: ENTITIES.{ENTITY},
    titleKeys: { create: {ENTITY}_TITLE.CREATE, edit: {ENTITY}_TITLE.EDIT, detail: {ENTITY}_TITLE.DETAIL }
  });

  protected readonly dynamicState = this.#entityFormConfigService.createEntityFormDynamicConfig({
    content: { index: {FEATURE}_CONTENT_INDEX }
  });

  readonly form: FormGroup<{Entity}Form> = this.#formService.createForm(this.staticState.formAction);

  constructor() {
    super();
    this.#onEntityLoaded();
    this.#formHelperService.onRequestSuccess(this.store, this.staticState.isNew, this.PAGE);
  }

  protected executeAction(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.form.markAsPristine();
      const rawFormValue = this.form.getRawValue() as unknown as {Entity};
      const action = this.staticState.isNew ? "addItem" : "updateItem";
      this.store[action](rawFormValue);
    } else {
      this.#notifierService.notifyInvalidForm(this.form, "{feature}.form.labels");
    }
  }

  #onEntityLoaded(): void {
    onDefinedSignalValue(this.entityState.value, (entity) => {
      this.#formService.populateFormWithData(this.form, entity);
    });
  }
}
```

### feat-{feature}-form/{entity}-form.service.ts

```ts
import { inject, Injectable } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { {Entity}, {Entity}Form } from "../data-access/{entity}.model";
import { FORM_ACTION, FormAction } from "@shared/services/entity-form-config.service";

@Injectable({ providedIn: "root" })
export class {Entity}FormService {
  readonly #fb = inject(FormBuilder);

  createForm(formAction: FormAction): FormGroup<{Entity}Form> {
    const isReadOnly = formAction === FORM_ACTION.DETAIL;
    return this.#fb.group<{Entity}Form>({
      id: this.#fb.control<string | null>({ value: null, disabled: isReadOnly }),
      name: this.#fb.nonNullable.control({ value: "", disabled: isReadOnly }, [
        Validators.required,
        Validators.maxLength(100)
      ])
      // ...add remaining fields following same { value, disabled: isReadOnly } pattern
    });
  }

  populateFormWithData(form: FormGroup<{Entity}Form>, entity: {Entity}): void {
    form.patchValue(entity);
  }
}
```

---

## L7b — Split form (formSplit == "split") — canonical: companies/

@rule:angular-form-responsibility-separation G:003

> G:003 of angular-form-responsibility-separation rule — before splitting an existing component, ask
> "¿Puedo refactorizar separando responsabilidades?" and proceed only on sí/yes.

Split generates these services alongside the component:

```
{entity}-form-builder.service.ts   → FormGroup structure + validators + FormArrays
{entity}-form-populator.service.ts → patchValue | setControl | clear+push from API data
{entity}-form-actions.service.ts   → submit | add/delete row | confirmation dialogs
{entity}-form-effects.service.ts   → valueChanges | effect() | cross-field enable/disable
```

For split+workflow also add:

```
{entity}-workflow.service.ts       → status machine | configureFieldsByStatus | canEdit | canEditLines
```

Canonical references:
- split:          @file:src/app/modules/master-data/configuration/companies/feat-companies-form/
- split+workflow: @file:src/app/modules/contracting/finances/quotations/feat-quotations-form/

---

## L8 — i18n

@rule:i18n-structure (camelCase | common.* | LE-SS-0018 | LE-SS-0027)
G:005: es.json + en.json ALWAYS in the same change. G:001: !!touch primeng.*.
G:007: !!wrapper object — es.json / en.json are FLAT (no top-level `"{feature}": {...}`)
G:008: !!placeholder English in es.json ("Title", "Name") — always real Spanish translations.

Transloco scope prefix comes from the module loader (file path), NOT from a JSON key.
canonical reference: @file:public/i18n/modules/master-data/periodic-billing/billable-concepts/es.json

### es.json (standalone file at public/i18n/modules/{path}/{feature}/es.json)

```json
{
  "title": "Listado de {entidades}",
  "breadcrumb": {
    "list":   "Listado de {entidades}",
    "create": "Nueva {entidad}",
    "edit":   "Editar {entidad}",
    "detail": "Detalle de {entidad}"
  },
  "messages": {
    "deletionTitle":   "Dar de baja una {entidad}.",
    "deletionMessage": "Está a punto de dar de baja la {entidad} {{code}}. <br/><br/> Esta acción la marcará como inactiva."
  },
  "table": {
    "name": "Nombre"
  },
  "dataSection": {
    "generalInfo": {
      "title":       "Datos básicos",
      "description": "Añade información que facilite su identificación."
    }
  },
  "form": {
    "labels": {
      "name": "Nombre"
    },
    "placeholders": {
      "name": "Introduce un nombre"
    }
  }
}
```

### en.json (same keys, English values)

```json
{
  "title": "{Entity} list",
  "breadcrumb": {
    "list":   "{Entity} list",
    "create": "New {entity}",
    "edit":   "Edit {entity}",
    "detail": "{Entity} detail"
  },
  "messages": {
    "deletionTitle":   "Deactivate {entity}.",
    "deletionMessage": "You are about to deactivate {entity} {{code}}. <br/><br/> This will mark it as inactive."
  },
  "table": {
    "name": "Name"
  },
  "dataSection": {
    "generalInfo": {
      "title":       "Basic data",
      "description": "Add information to facilitate identification."
    }
  },
  "form": {
    "labels": {
      "name": "Name"
    },
    "placeholders": {
      "name": "Enter a name"
    }
  }
}
```

---

## L9 — menu.service.ts registration (MANDATORY)

@file:src/app/core/shell/data/menu.service.ts
G:L9-1: !!skip — every new feature MUST be registered in menu.service.ts (LE-SS-0029)
G:L9-2: HU specifies section → add PAGES.{ENTITY} directly | HU silent → ?ask: "¿En qué sección del menú debo añadir el enlace?"

```ts
// In the relevant items[] group inside menuItems signal:
PAGES.{ENTITY}
```

---

## Layer → Rule Map

```
L1 model       → @rule:angular-core-architecture (DTO split) | @skill:typescript-best-practices
L2 service     → @rule:angular-core-architecture | @rule:code-generation (inject + readonly)
L3 store       → @rule:ngrx-entity-store
L4 constants   → @rule:permissions (FeaturePermissions | LE-SS-0012) | @rule:i18n-structure
L5 routes      → @rule:permissions (3-layer L1)
L6 list        → @rule:project-ui-components | @rule:permissions | @rule:code-generation (Tailwind layout)
L7 form        → @rule:project-ui-components | @rule:angular-form-responsibility-separation | @rule:code-generation | @rule:code-quality-guardrails (≤200L component limit)
L8 i18n        → @rule:i18n-structure (camelCase | common.* | LE-SS-0018 | LE-SS-0027)
L9 menu        → @file:src/app/core/shell/data/menu.service.ts (LE-SS-0029)
ALL            → @rule:self-learning-error-prevention (scan LE index pre-generate)
```
