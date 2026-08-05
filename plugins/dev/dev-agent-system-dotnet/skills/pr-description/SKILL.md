---
name: pr-description
description: >
  Genera la descripción de un PR de backend .NET a partir del diff contra la rama base. Invocar con:
  /branch-summary. Usar al abrir un PR.
---

# PR Description (.NET)

FP: `/branch-summary`

## T→A

T: invoked →
1. `git log develop..HEAD` + `git diff develop...HEAD`.
2. Título imperativo (≤70 caracteres).
3. Descripción funcional (audiencia: revisor, no el propio autor).
4. Cambios agrupados por capa: Api / Modules / Core / Infrastructure / Providers / Tests / Pipelines.
5. Notas de revisor SOLO si hay algo no obvio (no repetir lo que ya dice el diff).
6. Checklist de review: build, tests, migración incluida si aplica, mock guard, paridad Public/Internal, sync a todos los providers.

## Salida

Bloque Markdown listo para pegar en el gestor de PRs.

## @refs

@rule:dual-port-auth (checklist: paridad)
@rule:provider-sync (checklist: sync completo)
