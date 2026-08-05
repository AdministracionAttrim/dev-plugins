---
description: >
  Antipatrones recurrentes del backend .NET que Claude debe evitar proactivamente, sin que nadie los pida.
  Cargar siempre (always-on) — son los guardarraíles de calidad más frecuentemente violados en review.
---

# .NET Code Quality Guardrails

## G:[IDs]

G:001 !!lógica de negocio en el controller — el controller SOLO llama al servicio y devuelve `Ok(result)`/`CreatedAtAction(...)`. Bucles, orquestación, composición de mensajes, try/catch como control de flujo, mapeos → van al servicio.
G:002 !!falta el mock guard — si el proyecto usa modo mock (@rule:mock-mode), la PRIMERA línea de cada método público del servicio es `if (_useMock) return _mock.Metodo(...);`. No después de un null-check, no después de loguear. Primera.
G:003 !!400 vs 404 — "no encontrado" → 404. `BadRequest` solo para input inválido. (Deriva histórica real, ver @rule:dotnet-error-handling.)
G:004 !!registro de DI duplicado en `Program.cs` — nunca dos `AddScoped<>` para el mismo tipo (gana el último, en silencio); nunca registrar el tipo concreto Y la interfaz (`AddScoped<LogService>()` junto a `AddScoped<ILogService, LogService>()`) — registrar solo la interfaz y resolverla en todos lados, incluido middleware.
G:005 !!`Guid.Parse` sobre IDs externos — los IDs de providers son `string?`; parsearlos a `Guid` revienta cuando el sistema externo no devuelve un GUID.
G:006 !!sufijo `Async` engañoso en métodos síncronos (builders de `IQueryable`).
G:007 `[ProducesResponseType]` incompleto — cada acción declara todos los status posibles (200/201, 400/404, 401, 403, 500).
G:008 orden de lectura del body en el middleware de logging — el response body se lee DESPUÉS de `await _next(context)`, nunca antes.
G:009 !!crear un servicio nuevo cuando ya existe el repositorio genérico o un servicio que cubre el caso — reusar antes que escribir.
G:010 !!`catch (Exception) {}` que se traga la excepción; !!TODO/FIXME o código comentado en ficheros entregados.

## @refs

@rule:dotnet-error-handling (G:003)
@rule:mock-mode (G:002)
@rule:dotnet-persistence (G:005, G:009)
@rule:dotnet-naming-style (G:006)
@skill:module-audit (audita estos guardarraíles sobre código existente)
