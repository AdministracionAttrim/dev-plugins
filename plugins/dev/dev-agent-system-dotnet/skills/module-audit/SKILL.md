---
name: module-audit
description: >
  Audita un recurso o todo el backend .NET contra las convenciones del proyecto (paridad Public/Internal,
  completitud de provider-sync, DI sin duplicados, tests presentes, mock guard, cobertura de docs). Solo
  reporta, no modifica código. Invocar con: /sync-check [Recurso]. Usar antes de una PR grande o cuando se
  pida revisar consistencia del backend.
---

# Module Audit (.NET)

FP: `/sync-check` | "revisa que X esté consistente" | antes de una PR grande

i: SOLO reporta, !!modificar código | cada finding se confirma LEYENDO el código, no por pattern-matching

## Input

Opcionalmente un recurso concreto; sin argumento, audita todos.

## Checklist (de reviewer senior)

- Paridad de controllers Public/Internal (@rule:dual-port-auth): mismas firmas Create/Update.
- Completitud de provider-sync (@rule:provider-sync): Create y Update llaman a TODOS los syncs y actualizan flags/IDs.
- Completitud de DI en `Program.cs`: `IRepository`/`IService`/`IMock` registrados, sin duplicados (@rule:code-quality-guardrails G:004).
- Tests presentes por servicio/controller.
- Mock guard como PRIMERA línea de cada método público (@rule:mock-mode).
- Cobertura de docs: XML `<summary>` + `[ProducesResponseType]` en cada acción; `<summary>` en propiedades de DTO.

## Salida

Findings agrupados por severidad `[ERROR]/[WARNING]/[OK]` con `fichero:línea`, y un recuento final.

## @refs

@rule:dual-port-auth
@rule:provider-sync
@rule:mock-mode
@rule:code-quality-guardrails
