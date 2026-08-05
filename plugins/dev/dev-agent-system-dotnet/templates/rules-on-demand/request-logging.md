---
description: >
  Middleware de logging de requests que además actúa como manejador global de excepciones, y su política de
  retención. Cargar SOLO al tocar el middleware de logging o el retention de logs.
---

# Request Logging (on-demand)

Trigger: tocar el middleware de logging o el retention de logs.

## i:

Un `LogMiddleware` (registrado después de `UseAuthorization`) persiste por cada request: método, URL, usuario, body de request, body de response, status, duración y excepción, como entidad `Log` | doble función: TAMBIÉN es el manejador global de excepciones (ver @rule:dotnet-error-handling).

## T→A

T: tocar el middleware de logging → A: leer el response body SIEMPRE DESPUÉS de `await _next(context)`, nunca antes (orden incorrecto = body vacío o corrupto en el log) — reposicionar el stream antes de copiarlo al original
T: el endpoint tiene payloads grandes o sensibles → A: blanquear el body antes de loguearlo (ver @rule:dotnet-security — nunca token/PII en el log)
T: configurar retención → A: `CleanLogsDays` (entero negativo, ej. `-7`) purga logs más antiguos automáticamente

## @refs

@rule:dotnet-error-handling (este middleware es el exception handler global)
@rule:dotnet-security (qué nunca debe loguearse)
@rule:code-quality-guardrails (G:008, orden de lectura del body)
