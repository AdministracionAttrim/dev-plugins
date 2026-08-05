---
description: >
  Jerarquía de excepciones custom con status HTTP embebido, factory estándar, catálogo centralizado de errores
  e i18n. Usar al lanzar o crear cualquier excepción de negocio, o al registrar un mensaje de error nuevo.
---

# Java Error Handling

## i:

Sin `@ControllerAdvice` global — cada tipo de excepción lleva su `@ResponseStatus` propio | factory estático uniforme `XxxException.generic(ErrorResource)` | catálogo centralizado `ErrorResource` (enum) en la librería compartida | mensaje resuelto vía clave i18n, nunca string suelto.

## T→A

T: crear un tipo de excepción de negocio → A: anotarla `@ResponseStatus(code=..., reason=...)` directamente sobre la clase, en la librería compartida (@rule:java-package-architecture) | reusar uno existente (`NotFoundException`, `BadRequestException`, `ConflictException`, `ForbiddenException`, `UnauthorizedException`) si ya cubre el caso
T: lanzar una excepción → A: `XxxException.generic(ErrorResource.MI_CODIGO)` o `.generic(ErrorResource.MI_CODIGO, args...)` | !!`throw new XxxException("mensaje literal")`
T: el único dato disponible para el mensaje es un ID/UUID → A: usar el overload SIN argumentos + mensaje i18n sin placeholders (`{0}`) | !!interpolar un ID crudo en un mensaje de cara al usuario
T: registrar un error nuevo → A: constante nueva en el enum `ErrorResource` (nunca un string suelto) + clave i18n `error.<exception-key>.<ENUM_VALUE>` en TODOS los ficheros de idioma del proyecto en la misma pasada
T: necesitar devolver contexto adicional junto al error (p. ej. un objeto payload) → A: variante `withPayload(...)` sobre la excepción correspondiente, si el proyecto ya la tiene (patrón visto en `ConflictException`)
T: los argumentos del mensaje ya vienen traducidos → A: flag `argsContainsTranslations` para que no se re-traduzcan

```java
// ❌ mensaje sin sentido para el usuario final
throw ConflictException.generic(PRICE_TYPE_INVALID, priceTypeId);

// ✅ mensaje genérico, sin dato interno
throw ConflictException.generic(PRICE_TYPE_INVALID);
```

## @refs

@rule:code-quality-guardrails
@skill:exception-and-i18n-authoring
