---
description: >
  Auditoría before/after de entidades con snapshot serializado, y el gotcha de asociaciones id-only en el
  snapshot. Cargar SOLO al implementar o tocar métodos de auditoría, o al añadir una entidad nueva al sistema
  de auditoría.
---

# Entity Audit (on-demand)

Trigger: implementar/tocar `sendCreateAudit`/`sendUpdateAudit`/`sendDeleteAudit`, o añadir una entidad al sistema de auditoría.

## T→A

T: auditar una entidad → A: snapshot serializado con una vista por entidad (qué campos se auditan) + metadatos de contexto (id, tenant, clase) | el snapshot se toma DESPUÉS de persistir
T: la entidad auditada tiene una asociación enviada solo con su ID → A: antes de serializar el snapshot: forzar `flush` + limpiar el contexto de persistencia + releer por repositorio dentro de la misma transacción | !!usar `refresh()` como alternativa (ver gotcha abajo)

## Gotcha real — snapshot con asociación id-only

Hibernate no reemplaza un objeto `ManyToOne` enviado solo con su ID por la fila real del contexto de persistencia; una relectura posterior por ID devuelve el mismo objeto desde la caché de primer nivel, no la fila completa de BD. Y `refresh()` no es una alternativa segura: en bases de datos embebidas de test puede marcar la transacción como rollback-only y el commit del proxy transaccional revienta fuera de cualquier `try/catch` del método. La única forma fiable: flush + clear + releer por repositorio.

## @refs

@rule:java-persistence
