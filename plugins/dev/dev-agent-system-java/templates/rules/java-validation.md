---
description: >
  Bean Validation en el request, consistencia de longitud de String en tres sitios, y validadores de negocio
  como constantes invocadas explícitamente. Usar al crear un DTO de request o al añadir validación de negocio
  a un servicio.
---

# Java Validation

## i:

`@Valid` siempre en el `@RequestBody` | tres sitios deben coincidir en longitud de String | reglas de negocio reutilizables como constantes `Consumer<Dto>` invocadas explícitamente, no un validador anotado custom.

## T→A

T: recibir un DTO en un controller → A: `@Valid` en el `@RequestBody` | !!omitirlo asumiendo que el service ya valida
T: definir un campo String con longitud acotada → A: sincronizar `@Column(length = n)` en la entidad + `@Size(max = n)` en el DTO + `VARCHAR(n)` en la migración — los TRES deben coincidir
T: validación de negocio reutilizable (más allá de anotaciones) → A: constante estática `Consumer<Dto>` invocada explícitamente al principio del método de servicio (`NAME_REQUIRED.accept(dto)`) | !!crear un validador anotado custom para esto — el orden explícito (primero DTO, después dependientes de BD/entidad) es intencional y se pierde con anotaciones

## @refs

@rule:java-persistence (consistencia de longitud con la migración)
