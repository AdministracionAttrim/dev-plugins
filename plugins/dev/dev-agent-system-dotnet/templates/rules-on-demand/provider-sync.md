---
description: >
  Patrón de sincronización de una entidad contra N sistemas externos (providers). Cargar SOLO al crear o
  editar entidades que se sincronizan con sistemas externos. No aplica si el proyecto no tiene providers.
---

# Provider Sync (on-demand)

Trigger: crear/editar entidades que se sincronizan con sistemas externos.

Patrón general reutilizable: "entidad con estado de sincronización hacia N sistemas externos". El ejemplo de referencia usa dos providers (`<PROVIDER_A>`, `<PROVIDER_B>`) — adapta al número real de sistemas de tu proyecto.

## Estructura

- Cada sistema externo tiene un `I{System}Provider` con sub-providers especializados (login, customer, product, entitlement, error…) inyectados por DI.
- Las llamadas HTTP pasan por un wrapper genérico `IExternalService<T>` que devuelve `ResponseAPI<T>` (`{ IsValid, Model, Error }`). Requiere un registro de DI por cada tipo de respuesta (`AddScoped<IExternalService<XResponse>, ExternalService<XResponse>>()`).
- La entidad lleva campos de estado de sync por sistema: `Is{System}Sync` (bool) e `Id{System}` (ID externo, **`string?`** — nunca `Guid`, ver @rule:dotnet-persistence).

## T→A

T: crear o actualizar una entidad con sync → A: llamar a TODOS los helpers de sync (`Sync{ProviderA}`, `Sync{ProviderB}`, ...) → actualizar flags/IDs según resultado → **luego** persistir:
```csharp
await SyncProviderA(entity, ...);
await SyncProviderB(entity, ...);
await _repository.AddAsync(entity, ct);   // o UpdateAsync
```
T: un sync falla → A: guardar igualmente la entidad local con el flag de sync correspondiente a `false` | !!perder la entidad local por un fallo de sync
T: tocar la lógica de sync → A: considerar TODOS los providers | !!tocar solo uno (bug real detectado: solo se sincroniza uno de N sistemas tras crear/editar, porque se tocó un provider olvidando que la entidad se sincroniza contra varios)
T: mapear la respuesta de un sistema externo → A: contemplar TODAS las claves/formas bajo las que puede venir la entidad (algunos sistemas exponen la misma entidad bajo distintas claves, ej. producto simple vs. suite) | !!mapear solo el caso simple

## @refs

@rule:provider-retry (contrato de reintentos de cada provider)
@skill:module-audit (verifica que Create/Update llaman a todos los syncs)
