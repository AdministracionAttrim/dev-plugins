---
name: report-template
description: Markdown skeleton for the evolver audit report. Fill all <placeholders>. Keep total under 800 lines.
---

# Evolve Report — Session `<session_id>` — <date>

## Flow Reconstruction

| Step | Role | Turns | Tools (top 3) | Skills Invoked | Edited Files |
|------|------|-------|---------------|----------------|--------------|
| 1 | architect | N | Read:N, Grep:N, Glob:N | feature-scaffolding | — |
| 2 | dev | N | Edit:N, Read:N, Bash:N | angular-developer | file1.ts, file2.ts |
| 3 | tester | N | Write:N, Read:N, Bash:N | — | file1.spec.ts |
| 4 | reviewer | N | Read:N, Grep:N, Glob:N | audit-module | — |

Missing roles: <none | list>
Token estimate (turns × avg_response_length): ~<N> tokens

---

## Findings

| ID | Severity | Agent | Anti-Pattern | Evidence |
|----|----------|-------|--------------|----------|
| ME-0001 | med | dev | Read full vs Grep | `dev.jsonl` tool_use #42 reads `service.ts` (1200L) without offset/limit |
| ME-0006 | med | (static) | Dead @-pointer | `.claude/rules/self-learning-error-prevention.md:53` → `@skill:self-learning-error-prevention` (dir absent) |

**Clean sections:** <list sections with 0 findings, e.g. "Procedure compliance: all OK">

---

## Proposed Diffs (require ?confirm before applying — hand off to `dev` agent)

### <file_path_1>
```diff
- old line
+ new line
```
_Reason: <why this diff fixes ME-XXXX>_

### <file_path_2>
```diff
- old line
+ new line
```
_Reason: <why>_

> Cap: max 10 diffs. Omit trivial/cosmetic changes.

---

## Knowledge Gaps

_LEs to document (propose to append to `docs/wiki/knowledge-log.md` after ?confirm):_

**[LE-candidate-1]**
- FP: <code shape that triggers the error>
- T→A: <trigger → action to prevent>
- V: <verification>
- H: 0
- v: <today YYYY-MM-DD>
- E: <example file path>

---

## Skill Misuse

_Agents with declared skills that were never invoked:_

| Agent | Declared Skill | Subsession Invocations | Recommendation |
|-------|---------------|------------------------|----------------|
| architect | feature-scaffolding | 0 | Invoke at start OR remove from frontmatter if flow didn't need scaffolding |

---

## Procedure Compliance

| Role | Rule Checked | Result | Evidence |
|------|-------------|--------|----------|
| reviewer | no Edit/Write outside reports | PASS | 0 edit tool_uses |
| debugger | Observe→Hypothesize trace before fix | FAIL | dev.jsonl #15 Edit without prior hypothesis text |

---

## Action Checklist

- [ ] Apply diff to `<file>` (via `dev` agent)
- [ ] Append LE-XXXX to `docs/wiki/knowledge-log.md` (after ?confirm)
- [ ] Fix dead pointer in `<file>:<line>`
- [ ] Remove unused skill `X` from `<agent>.md` frontmatter OR add invocation
