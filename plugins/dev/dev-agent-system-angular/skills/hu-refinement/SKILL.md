---
name: hu-refinement
description: >
  Refinement de User Stories para sprint planning. Lee HUs de la wiki, inspecciona
  el módulo existente y genera una tabla de estimación por tasks (máx 5). más peso en lógica/diseño, menos en i18n/tests.
  Invocar con: /hu-refinement HU-3055 HU-3153 (uno o varios IDs).
---

i: HU IDs → estimación tasks para devs | max 5 tasks/HU | output markdown table

FP: `/hu-refinement` | "refina HU" | "estima HU" | "refinement" | "¿cuánto tarda" + HU-ID

## T→A

T: invoked →

1. parse: extract HU IDs from user message (pattern HU-\d+)
2. for each ID: Read(`docs/wiki/articles/azure/HU-{id}.md`) | if not found: warn + skip
3. scan: Glob module matching HU entity (check `src/app/modules/`) → detect existing files
4. apply: G:CALIBRATE → compute task times
5. emit: output format below per HU + summary table at end

T: HU not in wiki → A: ask "¿Tienes el texto de la HU? Pégalo aquí."
T: >4 HUs in one call → A: warn "Esto procesará ~{n} HUs. ¿Continúo?" | wait confirm

## Task taxonomy (always in this order, adapt names)

1. **Data access** — DTOs/modelos, endpoint service, store action, mocks
2. **Diseño UI** — template layout, tablas, diálogos/popups, `<app-custom-table>` columns
3. **Lógica** — form builder, validators, branch conditions, effects, reglas negocio
4. **Integración** — rutas, permisos/guard, navegación, i18n (es+en), menu entry
5. **Tests** — specs componente + servicios críticos únicamente

G:T1 !!crear task "i18n" separada — siempre dentro de "Integración"
G:T2 !!crear task "Tests" si total HU ≤ 14h — merge en la task más cercana
G:T3 Lógica == task más grande si HU tiene validaciones/branches/transacción
G:T4 max 5 tasks; si HU es simple → merge Integración+Tests en una sola

## G:CALIBRATE

base = senior_estimate
Lógica: base × 1.30 (branches, validators, business rules no triviales)
Diseño UI: base × 1.20 (template patterns, PrimeNG unfamiliarity)
Data access: base × 1.15 (DTO mapping, store wiring)
Integración: base × 1.00 (rutas/permisos son mecánicos)
Tests: cap at 15% of HU total

## Output format

```
### HU-{id} — {título} · **{total}h**

> {1-line complexity driver: qué hace a esta HU difícil o simple}

| # | Task | h | Descripción |
|---|------|---|-------------|
| 1 | Data access | Xh | {≤12 palabras} |
| 2 | Diseño UI | Xh | {≤12 palabras} |
| 3 | Lógica | Xh | {≤12 palabras} |
| 4 | Integración | Xh | {≤12 palabras} |
| 5 | Tests | Xh | {≤12 palabras} |
```

After all HUs: emit summary table `| HU | Título | Total |` + total sprint hours.

## V: (self-check before emitting)

V: [
all HU wikis read before estimating | !!estimate from title only
| existing module scanned → calibrate (detail already done ≠ rebuild)
| Lógica ≥ 25% of HU total if HU has validations/transactions
| Tests ≤ 15% of HU total
| i18n inside Integración task !!standalone
| task descriptions ≤ 12 words
| summary table present at end
]

## @refs

@file:docs/wiki/articles/azure/ (HU sources)
@rule:angular-core-architecture (calibrate data-access complexity)
@rule:angular-form-responsibility-separation (calibrate lógica split)
@rule:self-learning-error-prevention (surface known error risks per HU)

