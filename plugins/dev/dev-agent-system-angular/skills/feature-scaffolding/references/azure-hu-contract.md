# Azure HU → Scaffold Spec Contract

i: parse pasted Azure HU text → typed spec object written to `scripts/{featureName}-spec.json`
schema: @references/spec.schema.json | example: @references/spec.example.json

## Input

HU received as: pasted markdown / plain text (Azure DevOps copy).
If user provides only a URL → ? ask them to paste the full HU content.

## Extraction Map T→A

T: HU title / entity noun →
A: entitySingular=PascalCase | entityPlural=camelCase | featureName=kebab-case
| translocoScope=camelCase (usually == entityPlural)

T: HU "campos" / "fields" section →
A: map each → { name:camelCase, type, required, inSearch, labelEs, labelEn, maxLength?, fkEntity?, selector?, i18nKey? }
Primitive types: string | number | boolean | Date
FK types: use the TS type name (e.g. SupplySearch, Periodicity)
? if type unclear → ask developer

T: HU lists permissions / roles →
A: copy codes as-is if XXX*LIST pattern | else derive "{ENTITY}*{LIST|DETAIL|CREATE|UPDATE|DELETE}"
extras: array of {key, code} for any beyond 5 base (e.g. { key: "DELETE_ACCOUNT", code: "COMPANY_ACCOUNT_DELETE" })

T: HU "dar de baja" / "eliminar lógico" / soft-delete →
A: softDelete=true | entityStatus={ activeField:"creationDate", inactiveField:"deletionDate" }

T: HU "eliminar físicamente" / hard-delete →
A: softDelete=false

T: HU "estados" / "workflow" / "transiciones" / ≥3 statuses →
A: formSplit="split+workflow" | workflow={ statuses[], transitions[] }

T: HU "pestañas" / "tabs" / "secciones" ≥2 →
A: tabs=[{ label, titleEs, titleEn, sections:[{ key, icon, titleEs, titleEn, descriptionEs, descriptionEn }] }]

T: HU "tabla editable" / "subentidad agregable" / "añadir fila" →
A: formArrays=[{ name, itemType, editable:true }]

T: HU field_count > 10 / clearly mixed responsibilities →
A: formSplit="split"

T: HU simple entity, ≤3 non-interacting fields, no FormArray, no workflow →
A: formSplit="simple"

T: moduleSrcPath not obvious →
A: infer from HU section/module context | if ambiguous → ? ask developer

T: backend baseUrl not stated →
A: ? ask developer (pattern: `${environment.apiGw.<API_GW_KEY>.url}/{entity-kebab}` — `<API_GW_KEY>` is the project's env config key, e.g. `environment.apiGw.myservice.url`; configure per project, do not assume a fixed value)

T: PAGES.XXX key not known →
A: check @file:src/app/core/shell/data/layout-pages.ts | if absent → note as new entry needed

T: ENTITIES.XXX key not known →
A: check @file:src/app/shared/models/entity-name.model.ts | if absent → note as new entry needed

T: parentRoutesFile not stated →
A: ? ask developer ("¿En qué archivo de rutas padre debo registrar esta feature?")

T: menuGroup not stated →
A: ? ask developer ("¿En qué grupo del menú lateral debe aparecer?")

T: tabs not stated and formSplit != "simple" →
A: ? ask developer for section titles/icons OR default to single basicData tab

## Ambiguity Checklist (block until confirmed)

? entitySingular / entityPlural / featureName correct?
? backendBaseUrl confirmed?
? pagesKey: exists in PAGES or new?
? entitiesKey: exists in ENTITIES or new?
? permissionCodes: string codes confirmed (not UUIDs)?
? formSplit: simple / split / split+workflow?
? softDelete: true / false?
? parentRoutesFile: which file?
? menuGroup: which section?
? formArrays: any staging tables?
? workflow statuses + transitions (if split+workflow)?
? FK field types + imports confirmed?

## Output

Write complete spec.json to `scripts/{featureName}-spec.json`.
Spec must pass validation: `node scripts/scaffold-feature.mjs scripts/{featureName}-spec.json`

All string codes in permissions must match pattern `{ENTITY}_{ACTION}` (LE-SS-0012).
All i18n labels must be real translated text, not English placeholders in labelEs (LE-SS-0018).

