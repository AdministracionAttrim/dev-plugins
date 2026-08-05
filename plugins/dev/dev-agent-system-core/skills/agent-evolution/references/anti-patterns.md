---
name: anti-patterns
description: FP catalog of tool/skill/procedure misuse detected by the evolver agent. Each ME-XXXX entry is data-driven — add new entries here without touching the agent or skill.
---

# Anti-Patterns Catalog (ME-XXXX)

## Tool misuse

ME-0001: Read full vs Grep
FP: tool_use.name=="Read" && !input.offset && !input.limit && stat(file).size > 1024
R: Grep first to find relevant lines | then Read(file_path, offset, limit) targeted
V: ratio Read-full / (Read-full + Read-targeted) ≤ 0.3 per agent subsession
Severity: med

ME-0002: Explore without confirm
FP: (result_lines > 20 from Glob/Grep) || (tool_use.name == "Agent") and preceding assistant text !contains("?" | "¿" | "~3-5x")
R: add explicit user confirmation before broad exploration ("Esto gastará ~3-5x más tokens. ¿Continúo?")
V: 0 broad-explorations without a preceding ? in the same turn
Severity: high

## Skill misuse

ME-0003: Skill declared not used
FP: agent.frontmatter.skills contains "X" && agent subsession has 0 Skill tool_use with skill=="X"
R: invoke the skill at the start of the relevant task | or remove from frontmatter if truly not needed
V: every declared skill invoked ≥1× per relevant subsession
Severity: low

## Knowledge gaps

ME-0004: Bug keyword + no LE mention
FP: assistant prose (excluding Bash tool_use input and code fences) matches /\b(fix|bug|error|crash|corregido|resuelto|arreglado|solved|broke|broken|patch)\b/i && text !matches /LE-\d{4}/
R: SCAN knowledge-log → if match: cite LE-XXXX in response | if no match: propose new LE entry
V: every bug-keyword turn has a paired LE reference or new LE proposal
Severity: high

ME-0005: H++ honor-system violation
FP: assistant text contains "H++" | "aplicando LE-" | "incrementando LE-" && docs/wiki/knowledge-log.md NOT in session editedFiles
R: actually Edit knowledge-log.md to bump H: field and update v: date field
V: every claimed H++ has a paired Edit tool_use on knowledge-log.md in the same session
Severity: high

ME-0006: Dead @-pointer
FP: any .claude/**/*.md or docs/wiki/**/*.md has a reference matching `@(file|skill|rule):TARGET` where TARGET path does not exist on disk (outside inline code spans)
R: fix path to real location | remove the pointer | create the missing file
V: 0 dead pointers across .claude/ (detectable via analyze-flow.cjs deadPointerDetails)
Severity: med

## Procedure compliance

ME-0007: Reglas violation per agent role
FP per role:
  architect: Edit|Write|MultiEdit tool_use count > 0 in subsession → "no escribe código" violated
  reviewer: Edit|Write|MultiEdit count > 0 on files other than .claude/state/evolve-reports/** → "consultivo, no edita" violated
  dev: edits *.spec.ts without any paired tester subsession in same flow → handoff violated
  tester: edits source *.ts (non-spec) without nearby comment explaining testability necessity → "solo modifica si imprescindible" violated
  debugger: applies Edit/Write without any Observe→Hypothesize→Experiment text trace prior in subsession → debug-hypothesis skill violated
R: see agent.md Reglas section for per-role remediation
V: 0 procedure-compliance hits per agent role across last 5 flows
Severity: high
