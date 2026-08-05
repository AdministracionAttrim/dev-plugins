---
description: >
  Convenciones de validación de entrada y de negocio en el backend .NET. Usar al crear DTOs de request o al
  añadir comprobaciones de negocio en un servicio.
---

# .NET Validation

## i:

`required` de C# es la validación dominante de obligatoriedad estructural | la validación de negocio se hace a mano en el servicio, no con validadores declarativos | no mezclar enfoques dentro de un mismo proyecto.

## T→A

T: campo obligatorio en un `Create*RequestDto` → A: keyword `required` en la propiedad | DataAnnotations (`[Required]`) solo si el proyecto ya las usa puntualmente; !!mezclar los dos enfoques en el mismo DTO sin criterio
T: validar duplicados u otra regla de negocio → A: comprobación explícita en el servicio (ej. `GetFirstByFilterAsync(...) != null → throw` con 400) | !!delegar esto a un validador declarativo si el proyecto no usa FluentValidation
T: el proyecto adopta FluentValidation → A: hazlo de forma consistente en todo el proyecto, no como parche puntual

## Regla del preset

`required` para obligatoriedad estructural + validación de negocio explícita en el servicio, lanzando `HttpRequestException` con `BadRequest` (ver @rule:dotnet-error-handling). No se usa FluentValidation salvo que el proyecto lo adopte explícitamente y de forma consistente.

## @refs

@rule:dotnet-error-handling (BadRequest para input inválido / regla de negocio violada)
@rule:dotnet-core-architecture (forma de los DTOs Create/Update)
