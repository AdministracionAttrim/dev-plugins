---
name: code-quality-guardrails
description: Enforce strict code quality gates with ESLint, Oxlint, and Sonar-oriented clean code practices. Use for any code creation/refactor/review where lint compliance and low code smell risk are required.
---

# Code Quality Guardrails

Apply this skill on every code change that must be production-ready.

## Non-Negotiable Rules

1. Always respect lint rules from ESLint and Oxlint.
2. Always write code that is Sonar-friendly (readable, low complexity, no obvious code smells).
3. Never leave known lint violations in touched files.
4. Prefer small and explicit changes over clever or implicit logic.

## Mandatory Workflow

1. Before editing, read [references/code-quality-checklist.md](references/code-quality-checklist.md).
2. While editing, proactively avoid smell patterns (long methods, duplicated logic, dead code, weak naming, unsafe casts).
3. After editing, run applicable lint checks.
4. If lint cannot run in the environment, state it explicitly and keep changes conservative.

## Output Contract

When finishing, report:

- Which quality checks were run (or why not run).
- Which smell-prone areas were intentionally avoided or refactored.
