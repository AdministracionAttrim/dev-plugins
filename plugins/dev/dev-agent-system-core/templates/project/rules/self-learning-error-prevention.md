# Self-Learning Error Prevention Rule

## i:

Pre-code: scan index → if match: read full entry. Post-fix: capture learning.

## Known Error Index

> Full log: @file:{{KNOWLEDGE_LOG}}

<!-- Índice compacto "LE-XXX: título". Sincronizar SIEMPRE con el knowledge-log. -->

## T→A

G:LE1 !!new LE without Grep first: T: new LE → A: Grep(knowledge-log,"LE-") → max N → use N+1 (3-digit zero-pad) | formato `LE-{INICIALES}-{NNN}` | INICIALES == iniciales de `git config user.name` | !!guess
T: code matches any LE above → A: Read(knowledge-log[LE-XXX]) → apply fix
T: apply LE proactively in turn → A: say "aplicando LE-XXX" in response (Stop hook parser captures it for H++)
T: new LE added to knowledge-log → A: add "LE-XXX: title" to index above (sync mandatory)
T: Stop hook emits decision:block → A: skill self-learning-error-prevention → references/self-evolve.md | execute AUDIT checklist | Write .claude/state/audit-<id>.done to release block
T: audit detects LE with H > 10 → A: ?propose:PROMOTE to ST
T: audit detects LE with H == 0 + >30d → A: ?propose:DELETE from knowledge-log

## @refs

@file:{{KNOWLEDGE_LOG}}
