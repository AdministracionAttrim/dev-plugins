# Code Quality Checklist

## Required Gates

1. `eslint`: no violations in touched files.
2. `oxlint`: no violations in touched files.
3. Sonar-oriented quality: avoid introducing maintainability, reliability, or readability smells.

## Sonar-Friendly Coding Rules

- Keep functions small and single-purpose.
- Reduce nesting; prefer early returns.
- Remove dead code and unused variables/imports.
- Avoid duplicated logic; extract shared helpers.
- Use descriptive names for variables, methods, and signals.
- Avoid unsafe assertions/casts unless strictly necessary and documented.
- Handle nullable paths explicitly.
- Keep side effects isolated and predictable.

## Pre-PR Self-Review

- Is complexity reasonable for each touched function?
- Are there hidden coupling points or duplicated condition trees?
- Is the error handling explicit and consistent?
- Are tests/lint updates needed due to behavior changes?

## Fallback Rule

If lint tools cannot be executed due to environment restrictions:

- Do not ignore likely lint warnings.
- Keep changes minimal and strongly typed.
- Report clearly which checks could not run.
