---
description: >
  Contrato de reintentos al llamar a sistemas externos (providers). Cargar SOLO al tocar clientes de
  provider o su manejo de errores.
---

# Provider Retry (on-demand)

Trigger: tocar clientes de provider o su manejo de errores.

## T→A

T: un provider recibe un error de un sistema externo → A: pasa por `I{System}ErrorProvider.SaveLog(error, log)`, que persiste el error y devuelve si NO hay que reintentar (`return !IsRetriable(status)`), contra un `HashSet<int>` de status reintentables
T: añadir lógica de reintento a un cliente de provider → A: respetar ese contrato — no reintentar en bucle infinito; los status marcados como no reintentables cortan inmediatamente

## @refs

@rule:provider-sync
