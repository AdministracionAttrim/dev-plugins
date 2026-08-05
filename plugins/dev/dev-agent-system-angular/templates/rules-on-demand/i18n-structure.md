# Estructura I18N

## i:

primeng section intocable. common section para elementos reutilizables. camelCase + agrupar por funcionalidad.

## Estructura

primeng.* → !!tocar (traducciones PrimeNG)
common.actions.{save|add|edit|delete|confirm|search|cancel}
common.placeholders.{empty|selectValue}
common.errors.{validation|invalidIBAN}
common.confirmations.{context}.{message|acceptLabel|rejectLabel}

## T→A:

T: nueva clave i18n → A: camelCase | agrupar por funcionalidad (common.actions._) !tipo (!buttons._)
T: clave ambigua → A: usar nombre descriptivo específico (common.confirmations.deactivateBankAccount.message) !genérico (common.confirmations.message)
T: traducir en código → A: this.#translocoService.translate("common.x.y") con nueva estructura !legacy (!form.confirmations.*)

## Patterns

camelCase: `"selectValue"` !`"select_value"` | funcionalidad: `"common.actions.cancel"` !`"buttons.cancel"`
detail: @file:docs/wiki/patterns/i18n-keys.md

## T→A (template strings — apply before writing any template):

T: string visible al usuario → A: definir clave en es.json | en.json | import TranslocoPipe | usar `'scope.key' | transloco`
T: valor técnico igual en todos los idiomas ('LOCAL','REMOTE',IDs) → A: literal permitido; !transloco

## G:[IDs]

G:001 !!traducciones primeng
G:002 !!snake*case claves
G:003 !!agrupación por tipo (buttons.*, inputs._); siempre por funcionalidad
G:004 !!estructura legacy form.confirmations._; usar common.confirmations.{context}._
G:005 !!strings literales en templates; siempre `'scope.key' | transloco` (LE-SS-0018)
G:006 !!añadir clave solo en es.json; siempre actualizar es.json | en.json en el mismo cambio
G:007 !!wrapper object en módulo JSON — `{ "{feature}": {...} }` INCORRECTO; fichero es.json/en.json es PLANO (LE-SS-0027). El prefijo de scope lo añade Transloco via loader, no el JSON.
G:008 !!placeholders inglés en es.json ("Title", "Name") — SIEMPRE traducciones reales en español

## @refs

@file:docs/wiki/patterns/i18n-keys.md

