# E2E Spec Generation Template

When generating the Playwright spec for a feature, use this as the base structure.
Adapt URLs, selectors y escenarios al `selector-map` construido en el paso 12.5 del SKILL.

> **Conventions (this project)**
>
> - URLs: siempre **relativas** — `baseURL` está en `playwright.config.ts`; nunca `https://...`
> - Test IDs: `data-automationid` (no `data-testid`)
> - Primera carga de página incluye Angular bootstrap + Keycloak token refresh → `timeout: 30000` en el primer `toBeVisible`
> - Helpers compartidos viven en `e2e/shared/list-suite.ts`:
>   - `runCommonListTests` para listados
>   - `getFirstRowEditId` para obtener id de edición dinámicamente (NO `process.env`)
>   - `fillRequiredFields` para rellenar formularios desde un mapa declarativo
>   - `waitForApiResponse` para aserciones de red
> - Tags: `@smoke` (listado, validación) | `@e2e` (formularios) | `@critical` (flujo CRUD completo con red)

## ⚠️ Reglas vinculantes (NO negociables)

1. **Selector source-of-truth**: cada `data-automationid` emitido en el spec DEBE estar en `selector-map.verifiedKeys` (extraído del `.html` real del form en el paso 12.5). Si no está → emitir `// TODO: campo "{x}" no localizable — añadir [key] o ajustar wrapper` y omitir la aserción.
2. **Wrappers sin `[key]` propagado** (caso `app-supply-selector`): usar `page.locator("app-<name>-selector")` como localizador raíz. Nunca inventar `inputSupply` si el wrapper no propaga.
3. **Cero `process.env["E2E_TEST_*_ID"]`**: usar `getFirstRowEditId(page, LIST_ROUTE)`.
4. **Cada Crear y Editar lleva `waitForApiResponse`**: no se acepta un spec que solo verifique `toBeVisible` en flujos CRUD.
5. **`API_ENDPOINT`**: extraerlo del `feat-{name}-api.service.ts` (búsqueda `http.post/put/delete`). Si no se localiza → emitir `// TODO: endpoint API no detectado — completar manualmente`.
6. **Realismo HU > forma CRUD**: el spec codifica los CRITERIOS DE ACEPTACIÓN de la HU, no solo "crear/editar funciona". Un test "pulsar Añadir 2× no duplica" habría cazado B1; "filtrar columna X devuelve 200" habría cazado 3766#2.
7. **Regresión desde bugs**: cada bug que la auditoría confirme → un test en bloque `Regresión` que lo reproduce y verifica el fix. Cierra el bucle (no reaparece en QA).
8. **Listado = comportamiento, no presencia**: para cada columna ordenable/filtrable usar `assertColumnSorts`/`assertColumnFilters`; para el pre-filtro de la HU `assertDefaultPreFilter`. Estos helpers cazan la clase dominante 3624/3766/3829.

---

## Escenarios obligatorios dirigidos por HU + regresión

> Estos bloques son los que cazan los bugs que escapan a QA. Generar SIEMPRE que apliquen.

```typescript
import {
  runCommonListTests,
  getFirstRowEditId,
  fillRequiredFields,
  waitForApiResponse,
  assertColumnSorts,
  assertColumnFilters,
  assertDefaultPreFilter
} from "../shared/list-suite";

// ─── LISTADO — comportamiento por columna (clase 3624/3766/3829) ──────────
// SEARCH_ENDPOINT = endpoint de BÚSQUEDA del listado (POST .../search o GET paginado),
// puede diferir de API_ENDPOINT (CRUD). Contrato de los helpers: la señal de bug es una
// respuesta CON ERROR (>=400); una columna client-side o 2xx NO se marca (cero falsos positivos).
const SEARCH_ENDPOINT = "/api/{search-endpoint}";

test.describe("HU-XXX — Listado: orden y filtro por columna", { tag: "@e2e" }, () => {
  // Una entrada por columna ordenable del *-constant.ts (sin notSortable:true)
  for (const field of ["{sortableField1}", "{sortableField2}"]) {
    test(`columna ${field} ordena sin error backend (LE-SS-0074)`, async ({ page }) => {
      await assertColumnSorts(page, LIST_ROUTE, field, SEARCH_ENDPOINT);
    });
  }
  // Una entrada por columna filtrable (filterType definido)
  for (const f of [{ field: "{filterField1}", type: "text", value: "a" }] as const) {
    test(`columna ${f.field} filtra sin error backend (LE-SS-0059/0071)`, async ({ page }) => {
      await assertColumnFilters(page, LIST_ROUTE, f.field, SEARCH_ENDPOINT, f);
    });
  }
  // Pre-filtro por defecto de la HU (ej. HU-47: solo Disponibles) — 3624#3
  test("la lista arranca con el pre-filtro por defecto de la HU", async ({ page }) => {
    await assertDefaultPreFilter(
      page,
      LIST_ROUTE,
      SEARCH_ENDPOINT,
      (body) =>
        // ajustar al contrato de la HU:
        body.includes("AVAILABLE") /* TODO: predicado real del pre-filtro de la HU */
    );
  });
});

// ─── ESTADO / REACTIVIDAD — state-probes (clase B1–B5) ────────────────────
test.describe("HU-XXX — Probes de estado", { tag: "@e2e @critical" }, () => {
  // Solo si el form puebla un FormArray desde catálogo / entidad relacionada
  test("pulsar Añadir dos veces NO duplica filas (B1/LE-SS-0085)", async ({ page }) => {
    await page.goto(CREATE_ROUTE, { waitUntil: "domcontentloaded" });
    // seleccionar entidad que puebla la tabla, contar filas, Añadir 2×, recontar
    // expect(rowsAfter).toBe(rowsAfterFirst);  // no se duplica
  });
  test("cambiar la entidad padre limpia la tabla hija (B2/LE-SS-0086)", async ({ page }) => {
    // seleccionar padre A (puebla), cambiar a padre B → filas de A NO permanecen
  });
});

// ─── REGRESIÓN — un test por bug confirmado en esta auditoría ─────────────
test.describe("Regresión — bugs detectados", { tag: "@e2e" }, () => {
  // test("BUG-XXXX: {descripción} ya no ocurre", async ({ page }) => { ... });
});
```

---

## Template

```typescript
import { expect, test } from "@playwright/test";
import { runCommonListTests, getFirstRowEditId, fillRequiredFields, waitForApiResponse } from "../shared/list-suite";

const LIST_ROUTE = "/{module-path}";
const CREATE_ROUTE = "/{module-path}/new";
const EDIT_ROUTE = (id: string): string => `/{module-path}/${id}/edit`;
const DETAIL_ROUTE = (id: string): string => `/{module-path}/${id}`;
const API_ENDPOINT = "/api/{endpoint}";

test.describe("{feat-name} — E2E ({HU-IDs})", () => {
  // ─── LISTADO ────────────────────────────────────────────────
  test.describe("HU-XXX — Listado", { tag: "@smoke" }, () => {
    runCommonListTests({
      route: LIST_ROUTE,
      requiredColumns: ["{Col1}", "{Col2}"]
      // hasSplitButton: false   // si el listado no tiene splitButton de opciones
    });
  });

  // ─── CREAR — Validación ─────────────────────────────────────
  test.describe("HU-XXX — Crear: Validación", { tag: "@e2e" }, () => {
    test("submit vacío muestra errores de validación de campos requeridos", async ({ page }) => {
      await page.goto(CREATE_ROUTE, { waitUntil: "domcontentloaded" });
      const saveBtn = page.locator('[data-automationid="footerGuardar"]');
      await expect(saveBtn).toBeVisible({ timeout: 30000 });
      await saveBtn.click();

      const errors = page.locator("small.text-red-500");
      await expect(errors.first()).toBeVisible({ timeout: 5000 });
      // N = número de Validators.required en el builder service (paso 12.5)
      expect(await errors.count()).toBeGreaterThanOrEqual({ N });
    });
  });

  // ─── CREAR — Flujo completo (real) ──────────────────────────
  test.describe("HU-XXX — Crear: Flujo completo", { tag: "@e2e @critical" }, () => {
    test("rellenar campos requeridos guarda (POST 200) y redirige al listado", async ({ page }) => {
      await page.goto(CREATE_ROUTE, { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-automationid="footerGuardar"]')).toBeVisible({ timeout: 30000 });

      // ⚠️ Sólo claves de selector-map.verifiedKeys + wrapperSelectors
      await fillRequiredFields(page, {
        // {fieldKey}: { type: "text", value: `Test E2E ${Date.now()}` },
        // {selectKey}: { type: "select", optionIndex: 0 },
        // {wrapperKey}: { type: "wrapper", component: "app-{name}-selector", optionIndex: 0 },
      });

      const created = waitForApiResponse(page, API_ENDPOINT, "POST", 200);
      await page.locator('[data-automationid="footerGuardar"]').click();
      const response = await created;
      expect(response.ok()).toBeTruthy();
      await page.waitForURL(LIST_ROUTE, { timeout: 15000 });
    });
  });

  // ─── EDITAR — ID dinámico ───────────────────────────────────
  test.describe("HU-XXX — Editar", { tag: "@e2e" }, () => {
    let entityId: string;

    test.beforeEach(async ({ page }) => {
      entityId = await getFirstRowEditId(page, LIST_ROUTE);
    });

    test("formulario de edición carga con datos existentes", async ({ page }) => {
      await page.goto(EDIT_ROUTE(entityId), { waitUntil: "domcontentloaded" });
      await expect(page.locator("app-form-header")).toBeVisible({ timeout: 30000 });

      // Verifica que un input requerido tiene valor (no placeholder vacío)
      const firstInput = page.locator('[data-automationid="input{FirstVerifiedField}"]').first();
      await expect(firstInput).not.toHaveValue("", { timeout: 5000 });
    });

    // ── Disabled-on-edit (derivado del builder service) ──────
    // Para cada campo con `disabled: true` en createForm bajo modo edición:
    test("{disabledField} no es modificable en edición", async ({ page }) => {
      await page.goto(EDIT_ROUTE(entityId), { waitUntil: "domcontentloaded" });
      // - Si es input verificado: page.locator('[data-automationid="input{X}"]')
      // - Si es wrapper:           page.locator("app-{x}-selector")
      const field = page.locator("{verified-selector}");
      await expect(field).toBeVisible({ timeout: 30000 });
      await expect(field.locator('[role="combobox"]')).toHaveAttribute("aria-disabled", "true", {
        timeout: 10000
      });
    });

    test("modificar campo editable guarda cambios (PUT 200)", async ({ page }) => {
      await page.goto(EDIT_ROUTE(entityId), { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-automationid="footerGuardar"]')).toBeVisible({ timeout: 30000 });

      const editable = page.locator('[data-automationid="input{EditableField}"]');
      await editable.fill(`Updated E2E ${Date.now()}`);

      const updated = waitForApiResponse(page, `${API_ENDPOINT}/${entityId}`, "PUT", 200);
      await page.locator('[data-automationid="footerGuardar"]').click();
      const res = await updated;
      expect(res.ok()).toBeTruthy();
    });

    // ── Redirect si inactivo (sólo si activeEntityResolver redirectIfInactive) ──
    // test("entidad inactiva redirige al listado", async ({ page }) => {
    //   // requiere fixture de id inactivo — omitir si no hay forma de seedear
    // });
  });

  // ─── DETALLE — sólo lectura ─────────────────────────────────
  test.describe("HU-XXX — Detalle", { tag: "@e2e" }, () => {
    test("todos los inputs están en read-only y no hay botón Guardar", async ({ page }) => {
      const entityId = await getFirstRowEditId(page, LIST_ROUTE);
      await page.goto(DETAIL_ROUTE(entityId), { waitUntil: "domcontentloaded" });
      await expect(page.locator("app-form-header")).toBeVisible({ timeout: 30000 });

      // footerGuardar en modo detalle: puede estar ausente (toHaveCount(0)) o presente pero disabled.
      // Verificar con browser real antes de elegir aserción:
      //   - Si el DOM confirma que no existe:  toHaveCount(0)
      //   - Si existe pero inner <button> disabled:  page.locator('[data-automationid="footerGuardar"] button').toBeDisabled()
      await expect(page.locator('[data-automationid="footerGuardar"]')).toHaveCount(0); // ajustar si procede

      // Al menos un input visible debe estar deshabilitado
      const inputs = page.locator("input:not([type=hidden])");
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(inputs.nth(i)).toBeDisabled();
      }
    });
  });

  // ─── PERMISOS (placeholder) ─────────────────────────────────
  test.describe("Permisos", () => {
    test.skip(true, "Requiere fixture de usuario sin permiso");
  });
});
```

## Reglas de generación

Al producir el spec real desde una HU + selector-map:

1. Reemplaza `{feat-name}`, `{HU-IDs}`, `{module-path}`, `{endpoint}`, `{ColX}`, `{N}`, `{FirstVerifiedField}`, `{EditableField}`, `{disabledField}` con valores reales.
2. Sólo claves de `selector-map.verifiedKeys` se materializan como `[data-automationid="input{Cap(key)}"]`. Resto → `// TODO: ...`.
3. Para cada item de `selector-map.wrapperSelectors` añade `{ type: "wrapper", component: "<name>", optionIndex: 0 }` al mapa de `fillRequiredFields`.
4. Para cada campo `disabled: true` en el builder service → un test bajo `Editar > {disabledField}`.
5. `N` = número de `Validators.required` detectados en el builder service.
6. `API_ENDPOINT` = ruta base detectada en el `{entity}.service.ts` (primer `this.http.post(...)`).
7. Si la HU tiene tabla editable inline (`useEditableTable` en el .ts del form): añadir un describe extra `"Tabla editable"` con tests de add/edit/delete fila (ver patrón en `feat-pucs-form` canonical).
8. **`runCommonListTests` flags**: pasar `hasActiveToggle: false` si el store NO configura `statusToggle` | `hasSplitButton: false` si la lista no tiene `<p-splitbutton>`.
9. **Aserciones de validación**: si los required están en >1 pestaña, usar `errors.count() >= 1` (los `<small.text-red-500>` solo se renderizan para campos en la tab visible). !!`>= N` con N = total Validators.required.
10. **Selectores PrimeNG**: consultar `docs/wiki/patterns/e2e-automationid-coverage.md` sección "Convenciones PrimeNG". Reglas clave:
    - `p-select` disabled → `field.locator('[role="combobox"]').toHaveAttribute("aria-disabled","true")`. El host `<p-select>` no expone el aria.
    - Acción de fila (Editar/Detalle) → SIEMPRE `getFirstRowEditId(page, LIST_ROUTE)`. NUNCA inventar `data-automationid="rowAction-update"`.
    - Overlays (`p-select-overlay`, `p-menu`, `p-autocomplete-overlay`) viven en `<body>` → `page.locator(".p-...")` global.
    - `p-multiselect` global → siempre scoped a un contenedor para evitar colisiones cuando hay >1.
    - `input` nativo deshabilitado → `toBeDisabled()` | `p-select` deshabilitado → `[role="combobox"][aria-disabled="true"]`. Son distintos.
11. Borra todos los bloques comentados que no se hayan instanciado.
12. Escribe el spec en `e2e/generated/{feat-name}.spec.ts`.

## Selector conventions

| Elemento                       | Convención                                | Ejemplo                                               |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------- |
| Footer guardar                 | `data-automationid="footerGuardar"`       | `page.locator('[data-automationid="footerGuardar"]')` |
| Input verificado (con `[key]`) | `data-automationid="input{Cap(key)}"`     | `inputName`                                           |
| Wrapper sin `[key]` propagado  | nombre de componente                      | `page.locator("app-supply-selector")`                 |
| Botón personalizado            | `data-automationid="button{Name}"`        | `buttonAddItem`                                       |
| Toggle activos                 | `data-automationid="activeToggle"`        |                                                       |
| Crear (tabla)                  | `data-automationid="tablaAñadir"`         |                                                       |
| Error de validación            | `small.text-red-500`                      |                                                       |
| Combobox deshabilitado         | `[role="combobox"][aria-disabled="true"]` |                                                       |
| Tab                            | `data-automationid="tab{Name}"`           | sólo si está en el `.html` real                       |

## Anti-patterns prohibidos

| Anti-pattern                                                                                                   | Problema                                                                                                                           | Fix                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process.env["E2E_TEST_*_ID"]` + `test.skip`                                                                   | skips silenciosos; cero cobertura edit/detail                                                                                      | `getFirstRowEditId(page, LIST_ROUTE)`                                                                                                                |
| `data-automationid="inputXxx"` sin verificar `[key]` en HTML                                                   | selector inventado                                                                                                                 | usar `selector-map.verifiedKeys`                                                                                                                     |
| Sólo `toBeVisible()` en Crear/Editar                                                                           | smoke disfrazado, no detecta regresiones backend                                                                                   | `fillRequiredFields` + `waitForApiResponse` + `waitForURL`                                                                                           |
| `page.locator("p-multiselect")` global                                                                         | colisiona si hay >1 en la página                                                                                                   | scoped: `containerLocator.locator("p-multiselect")`                                                                                                  |
| Hardcodear `tabDetail` sin verificar HTML                                                                      | selector inexistente si el form usa otro nombre                                                                                    | extraer del HTML del form en paso 12.5                                                                                                               |
| `await page.waitForTimeout(N)`                                                                                 | espera arbitraria, flaky                                                                                                           | `expect(...).toBeVisible({ timeout: N })` o `waitForResponse`                                                                                        |
| `isVisible().catch(() => false)`                                                                               | bypasea auto-retry de Playwright                                                                                                   | `(await locator.count()) > 0`                                                                                                                        |
| `data-testid`                                                                                                  | convención incorrecta del proyecto                                                                                                 | `data-automationid`                                                                                                                                  |
| `const BASE_URL = "https://..."`                                                                               | duplica `baseURL`                                                                                                                  | rutas relativas                                                                                                                                      |
| `page.locator('app-*')` para inputs internos                                                                   | acopla a jerarquía Angular                                                                                                         | localizar por `data-automationid` salvo wrappers documentados                                                                                        |
| `page.locator("p-tree .p-tree-node").first()` + `.count()`                                                     | `.first()` limita a 1 elemento antes del count — siempre devuelve 0 o 1                                                            | asignar locator sin `.first()`, hacer `.count()`, luego `.first().click()`                                                                           |
| `await expect(locator.count()).resolves.toBeGreaterThan(0)`                                                    | mezcla Promise raw con expect-jest; `.resolves` no funciona en Playwright                                                          | `expect(await locator.count()).toBeGreaterThan(0)`                                                                                                   |
| `toBeDisabled()` en elemento ausente en modo detalle                                                           | falla si el elemento no existe en el DOM (no está disabled, simplemente no existe)                                                 | `toHaveCount(0)` cuando el elemento no debe aparecer en esa vista                                                                                    |
| `[data-automationid="inputX"] input` cuando el `data-automationid` ya está en el `<input>`                     | selector retorna 0 elementos (`<input>` no tiene hijos `<input>`)                                                                  | usar `[data-automationid="inputX"]` directamente                                                                                                     |
| `fill("A")` en autocomplete PrimeNG                                                                            | `fill()` sobreescribe el value sin disparar los eventos keydown/input que PrimeNG escucha — overlay nunca aparece                  | `await autocompleteInput.pressSequentially("A")`                                                                                                     |
| `expect(page.locator("p-toast, .p-toast")).toBeVisible()` para validación inline                               | `p-toast` está en el DOM pero vacío (height=0) cuando no hay mensajes; formularios con validación inline usan `small.text-red-500` | `await expect(page.locator("small.text-red-500").first()).toBeVisible({ timeout: 5000 })`                                                            |
| `p-tabpanel[ng-reflect-value="N"]`                                                                             | `ng-reflect-*` se elimina en builds AOT/OnPush — siempre `null` en producción                                                      | `page.locator("p-tabpanel").nth(N)` o `p-tabpanel.p-tabpanel-active` tras clic en la tab                                                             |
| `waitForURL(LIST_ROUTE)` tras crear entidad                                                                    | algunos formularios navegan a `/{id}/edit` tras POST 201, no al listado                                                            | `page.waitForURL(url => !url.pathname.endsWith("/new"), { timeout: 15000 })`                                                                         |
| `runCommonListTests({ route: ENTITY_LIST_ROUTE })` cuando la ruta redirecciona a otra vista (ej. callejero)    | los tests pasan superficialmente (ruta distinta, elementos compartidos) o fallan por ausencia de `tablaAñadir`                     | verificar que la ruta tiene página de listado propia; si redirige → eliminar `runCommonListTests` y cubrir con tests específicos de la vista destino |
| `[data-automationid="inputX"] input` en wrappers Angular                                                       | el `data-automationid` ya está en `<input>` nativo; el selector busca un `<input>` hijo de `<input>` y devuelve 0 — LE-SS-0070     | `input[data-automationid="inputX"]` o `[data-automationid="inputX"]` directo si no colisiona por tag                                                 |
| `p-button[data-automationid="X"].toBeDisabled()`                                                               | el host `<p-button>` no propaga `disabled`; la propiedad vive en el `<button>` hijo — LE-SS-0071                                   | `page.locator('[data-automationid="X"] button').toBeDisabled()` o `assertPButtonDisabled()` de `list-suite.ts`                                       |
| click en `p-button[data-automationid="footerGuardar"]` host directo                                            | form-footer con `position: fixed`; en algunos viewports Playwright no puede hacer click en el host — LE-SS-0072                    | `page.locator('[data-automationid="footerGuardar"] button').click()` o `clickPButton()` de `list-suite.ts`                                           |
| `buttonSearchinput{Name}` para el trigger del `<app-search-box>`                                               | `SearchBoxComponent` emite `buttonSearch{Name}` sin prefijo `input` — LE-SS-0073                                                   | verificar HTML real; usar `buttonSearch{Name}` (ej. `buttonSearchCustomer`)                                                                          |
| `pressSequentially("A")` (1 char) en autocomplete con `minQueryLength=2`                                       | overlay no aparece si `query.length < minQueryLength` — LE-SS-0074                                                                 | escribir al menos `minQueryLength` chars; usar `pressAutocomplete()` helper                                                                          |
| `page.locator('p-select[data-automationid="inputX"]')` dentro de wrappers compuestos (`app-location-selector`) | strict-mode collision: el wrapper renderiza otros `<p-select>` internos sin `data-automationid` — LE-SS-0075                       | scopear al wrapper: `page.locator('app-location-selector').locator('[data-automationid="inputX"]')`                                                  |
| `page.goto('/streets/new')` + assert formulario sin skip                                                       | rutas `/streets/new` y `/buildings/new` protegidas por guard; el contrato HU es el redirect — LE-SS-0076                           | `assertGuardRedirect(page, '/streets/new', /\/street-directory/)` de `list-suite.ts`                                                                 |
| `[formcontrolname="observations"]` en quotation form                                                           | el builder nombra el control `text`, no `observations`                                                                             | extraer `formControlName` del HTML real del form en paso 12.5                                                                                        |
