---
description: >
  Patrón de repositorio con las tres interfaces, DTO de filtro String+operador, y Specification compartida
  entre search y export. Cargar SOLO al implementar un endpoint de búsqueda/listado o export.
---

# Filter & Export via Specification (on-demand)

Trigger: implementar un endpoint de búsqueda/listado o export.

## T→A

T: implementar búsqueda con filtros/paginación → A: repositorio con las 3 interfaces (@rule:java-persistence) | DTO de filtro con campos `String`+prefijo de operador (@rule:java-naming-style) + anotación de path de orden en campos de relación | `Specification` con un método estático por campo (devuelve `null` si el valor del filtro es `null`) + builder de proyección
T: implementar export de la misma entidad → A: reusar EXACTAMENTE la misma `Specification` y builder de proyección que el search | !!duplicar la query para export
T: ordenar por un campo calculado/traducido o por una subquery → A: resolver dedicado solo para ese caso — el resto de campos no lo necesitan

## @refs

@rule:java-persistence
@rule:java-naming-style
@skill:filter-and-search-scaffolding
