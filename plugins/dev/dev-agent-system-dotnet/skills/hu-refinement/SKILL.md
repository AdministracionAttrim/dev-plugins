---
name: hu-refinement
description: >
  Refina una historia de usuario de backend antes de estimarla o implementarla, haciendo las preguntas que
  un senior del equipo haría siempre primero. Usar antes de estimar/implementar cualquier HU de backend.
---

# HU Refinement (.NET)

i: skill propuesto a partir del spec original — no existía como comando en el proyecto de referencia, pero cubre un flujo genérico y valioso. Ajustar las preguntas si tu equipo tiene otras prioridades.

## Preguntas que hacer siempre antes de tocar código

- ¿Es un endpoint público, interno, o ambos? (afecta a paridad y auth — @rule:dual-port-auth)
- ¿La entidad se sincroniza con algún sistema externo? ¿Qué campos de sync? ¿Qué pasa si el sync falla? (@rule:provider-sync)
- ¿Implica cambio de esquema → migración? ¿Es potencialmente destructiva? (@skill:create-migration)
- ¿Qué status de error espera el consumidor: 404 vs 400? (@rule:dotnet-error-handling)
- ¿Hay modo mock que mantener en paralelo? (@rule:mock-mode)
- ¿El contrato (DTO) lo consume otro equipo? ¿Es un breaking change?

## Salida

HU refinada + lista de tareas por capa (Api / Modules / Core / Infrastructure / Providers / Tests) + flags de riesgo explícitos: migración destructiva / breaking change / sync externo.

## @refs

@rule:dual-port-auth
@rule:provider-sync
@rule:dotnet-error-handling
@rule:mock-mode
@skill:create-migration
