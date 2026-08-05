---
description: >
  Manejo de errores del backend .NET: formato de respuesta estándar, mapeo excepción→status code, y dónde
  vive el try/catch global. Usar al lanzar o capturar excepciones, o al decidir qué status code devolver.
---

# .NET Error Handling

## i:

No hay `UseExceptionHandler`/`IExceptionHandler` — el manejo global vive en el middleware de logging, que envuelve `await _next(context)` en un try/catch | formato de error = `{ "error": string }`, NO `application/problem+json`/`ProblemDetails` | los controllers NUNCA capturan excepciones (son finos).

## T→A

T: entidad/recurso no encontrado → A: `throw new HttpRequestException($"{name} not found", null, HttpStatusCode.NotFound)` → **404** | !!`BadRequest` para este caso (es una deriva conocida, no lo repitas — ver ejemplo abajo)
T: input malformado / regla de negocio violada (duplicado, datos insuficientes) → A: `HttpRequestException(..., HttpStatusCode.BadRequest)` → **400**
T: fallo de autenticación/autorización → A: lo produce la capa de auth (JWT/roles) automáticamente; el servicio NUNCA lanza 401/403 a mano
T: capturar una excepción en un controller → A: no lo hagas; el try/catch vive únicamente en el middleware de logging

## Regla de oro (bug real detectado en proyectos de este stack — no lo reintroduzcas)

Es fácil copiar-pegar el patrón de "lanzar excepción" y dejar el status code equivocado: varios servicios reales han lanzado `BadRequest` para el caso "no encontrado" en vez de `NotFound`, rompiendo la distinción que espera el consumidor entre "no existe" y "petición inválida". La regla correcta y única es:

- "no encontrado" → siempre `HttpStatusCode.NotFound` (404)
- input inválido / regla de negocio → `HttpStatusCode.BadRequest` (400)

## Middleware de logging (ver también @rule:request-logging on-demand)

El middleware captura `HttpRequestException`, usa su `.StatusCode`, y escribe `{ "error": "<mensaje>" }`. Cualquier otra `Exception` no controlada → 500 con `{ "error": "Internal Server Error" }`.

## @refs

@rule:code-quality-guardrails (guardarraíl #3: 400 vs 404)
@rule:request-logging (orden de lectura del body, doble función como exception handler)
