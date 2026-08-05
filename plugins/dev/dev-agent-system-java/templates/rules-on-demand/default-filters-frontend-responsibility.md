---
description: >
  Los filtros por defecto (excluir borrados lógicos, etc.) son responsabilidad del frontend, no del backend.
  Cargar SOLO al revisar si un listado "solo muestra activos" o similar.
---

# Default Filters = Frontend Responsibility (on-demand)

Trigger: revisar si un listado "solo muestra activos" o similar carece de un filtro por defecto.

## i:

Los filtros por defecto los aplica el cliente enviándolos explícitamente en la petición — el backend no debe asumir ningún default salvo los de seguridad (tenant, usuario).

## T→A

T: revisar `getSearchSpecification()` (o equivalente) y no ver un filtro de "solo activos" por defecto → A: NO marcarlo como defecto de backend — es responsabilidad del frontend enviar el filtro
T: la especificación (HU/spec) dice EXPLÍCITAMENTE que el backend debe aplicar el filtro sin que el cliente lo envíe → A: entonces sí es un criterio de backend a verificar — la excepción está en la spec, no se asume

## @refs

@rule:java-security (los únicos defaults de backend son tenant/usuario)
@skill:module-audit-and-review
