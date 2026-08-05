---
description: >
  Patrón de API con dos superficies (pública e interna) escuchando en puertos distintos, cada una con su
  policy, CORS y aislamiento de red. Cargar SOLO al tocar controllers, Program.cs, o middleware de puerto.
  No aplica si el proyecto no tiene esta separación pública/interna.
---

# Dual-Port Auth (on-demand)

Trigger: tocar controllers, `Program.cs`, o middleware de puerto.

Es un patrón reutilizable para cualquier API con superficie pública + interna, no exclusivo de un proyecto — pero solo cárgalo si tu proyecto realmente separa tráfico público de interno por puerto.

## Placeholders (sustituir por proyecto)

`<PORT_PUBLIC>` / `<PORT_INTERNAL>` puertos de escucha · `<PUBLIC_AZP>` / `<INTERNAL_AZP>` valores esperados del claim `azp` por esquema · `<INTERNAL_ROLE>` rol requerido en el esquema interno.

## Patrón

| Puerto | Prefijo | Policy | Requisito de token |
|---|---|---|---|
| `<PORT_PUBLIC>` | `/api/public/*` | `PublicPolicy` | `azp` == `<PUBLIC_AZP>` |
| `<PORT_INTERNAL>` | `/api/internal/*` | `InternalPolicy` | `azp` == `<INTERNAL_AZP>` **+** rol `<INTERNAL_ROLE>` |

## T→A

T: tocar el middleware de protección de puerto → A: debe devolver 403 a cualquier `/api/internal/*` (y `/swagger/internal/*`) que llegue por el puerto público — el aislamiento es de RED, no solo de policy | !!sustituirlo por auth a secas
T: exponer documentación Swagger → A: dos docs separadas (`/swagger/public/swagger.json`, `/swagger/internal/swagger.json`); la interna también bloqueada en el puerto público
T: crear/editar un controller Public para un recurso → A: el Internal debe exponer las MISMAS firmas de Create/Update (mismos DTOs) — paridad obligatoria | el Internal puede tener endpoints de lectura extra que el Public no tiene

## @refs

@rule:dotnet-security
@skill:module-audit (verifica paridad de controllers Public/Internal)
