---
name: pre-commit-validate
description: >
  Batch de validación "listo/bloqueado" antes de commitear, fuera del pipeline de CI completo. Invocar con:
  /validate. Usar antes de dar una tarea de backend por terminada.
---

# Pre-Commit Validate (.NET)

FP: `/validate`

i: SOLO reporta, !!commitear

## T→A

T: invoked →
1. Detectar ficheros cambiados.
2. `dotnet build` → falla → veredicto `BLOCKED` inmediato.
3. Correr los tests afectados: `dotnet test --filter "ClassName={Clase}Tests"` por cada clase tocada.
4. Detectar entidad cambiada sin migración correspondiente → warning (no bloquea).
5. Checks de convención del proyecto: mock guard primera línea (@rule:mock-mode), controllers finos (@rule:code-quality-guardrails G:001), DI sin duplicados (G:004), paridad Public/Internal (@rule:dual-port-auth), sync a todos los providers (@rule:provider-sync), `[ProducesResponseType]` completo (G:007), cabecera de copyright (@rule:dotnet-naming-style).
6. Check de idioma: marcar contenido no-inglés en código/comentarios/mensajes (@rule:dotnet-naming-style).

## Salida

Reporte con `✅/⚠️/❌` por dimensión y veredicto final `READY TO COMMIT | BLOCKED`. No commitea.

## @refs

@rule:mock-mode
@rule:code-quality-guardrails
@rule:dual-port-auth
@rule:provider-sync
@rule:dotnet-naming-style
