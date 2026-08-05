---
name: filter-and-search-scaffolding
description: >
  Genera búsqueda con filtros/paginación o export de una entidad Java/Spring Boot: DTO de filtro
  String+operador, DTO de proyección, Specification compartida entre search y export, y la condición de
  seguridad (tenant + usuario). Usar al implementar búsqueda con filtros/paginación o export de una entidad.
---

# Filter & Search Scaffolding (Java/Spring Boot)

## Input

Entidad + lista de campos filtrables (incluyendo cuáles vienen de relaciones).

## T→A

T: invoked →
1. Generar el DTO de filtro: un campo por atributo filtrable, todos `String` con prefijo de operador (@rule:java-naming-style), anotación de path de orden en los que vienen de una relación.
2. Generar el DTO de proyección de búsqueda (que es a la vez la fila de export).
3. Generar la clase `Specification` con un método por campo con JOIN (`null` si el valor es `null`) y el builder de proyección.
4. Montar la condición de seguridad combinando tenant + (si aplica) el filtro de usuario por fila (@rule:java-security).
5. Cablear el export para que reutilice EXACTAMENTE la misma `Specification` y builder, sin query aparte.

## Guardarraíles

!!omitir el filtro de tenant | !!añadir el filtro de usuario por fila si no existe un path de asociación single-valued hasta la entidad que lo determina (@rule:java-security).

## @refs

@rule:java-naming-style
@rule:java-security
@rule:filter-and-export-specification
