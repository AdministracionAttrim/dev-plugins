---
description: >
  Catálogo extendido de reglas de análisis estático con ejemplos BAD/GOOD, fix recomendado, y ficheros legacy
  que aún las violan. Cargar SOLO en revisión/auditoría de código — NUNCA en generación (para no gastar
  contexto en cada turno).
---

# Legacy Static Analysis Catalog (on-demand — solo auditoría)

Trigger: `@skill:module-audit-and-review`, o cualquier revisión/auditoría explícita de código ya escrito.

Este fichero es el punto de partida para el catálogo real del proyecto: durante el `/agent-system-core:init`, sustituye este contenido por (o enlaza a) el catálogo real de reglas de análisis estático de tu proyecto (SonarQube u otra herramienta), con:

- Tabla regla → ejemplo BAD → ejemplo GOOD → fix recomendado.
- Lista de ficheros legacy que aún violan cada regla (para no repetir el mismo hallazgo en cada auditoría sin contexto de que ya es conocido).

El checklist resumido que SÍ se aplica al generar código (no solo al auditar) vive en @rule:code-quality-guardrails — este fichero es el detalle ampliado, no un duplicado.

## @refs

@rule:code-quality-guardrails
@skill:module-audit-and-review
