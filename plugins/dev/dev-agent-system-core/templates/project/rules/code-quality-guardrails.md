# Code Quality Guardrails Rule

## i:

Non-negotiable gates on every create/refactor/review. !exceptions.

## Non-Negotiable Gates

1. All touched files pass the project linter w/o errors (config.commands.lint)
2. fn single purpose | !nesting >2 | !dead code | descriptive names | explicit nulls
3. !!leave known lint violations in touched files
4. Build gate: T: any source edit → A: Bash(config.commands.build) → fix errors → then "done" | !!declare done without build pass | !!skip on "trivial" changes

## Limits (adjust per project)

component/module ≤200L | service/store ≤350L | fn complexity ≤20 | !!abbreviated identifiers (<3 chars o ad-hoc) — exceptions: i/j/k índices, a/b comparators, params tipados

## @refs

@file:.claude/agent-system.config.json (commands)
