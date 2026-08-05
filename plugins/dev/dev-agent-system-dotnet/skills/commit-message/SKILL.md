---
name: commit-message
description: >
  Genera un mensaje de commit en formato Conventional Commits para el backend .NET. Invocar con:
  /commit-message. Usar al preparar un commit.
---

# Commit Message (.NET)

FP: `/commit-message`

## T→A

T: invoked → A: analizar staged (o unstaged vs HEAD) + estilo del `git log` reciente → generar `<type>(<scope>): <descripción imperativa en inglés ≤72 chars>`. Types: `feat/fix/refactor/test/chore/docs/perf`. Body solo para lógica no obvia o breaking changes.

## Guardarraíl

!!línea `Co-Authored-By`. Si hay varios scopes plausibles, proponer 2-3 variantes en vez de decidir por el usuario.
