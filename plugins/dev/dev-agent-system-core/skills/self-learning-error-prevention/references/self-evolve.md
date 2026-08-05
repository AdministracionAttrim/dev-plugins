# ST:SELF-EVOLVE (Stop hook audit)

## i:

Stop hook blocks only when session looks like a regression. Run a quick audit and then unblock by writing `.claude/state/audit-<session_id>.done`.

## T→A:

T: Stop hook emits `decision:block` → A:
1) Read `.claude/state/evolve-reports/<session>.md` if present | else scan transcript summary (edited files + keywords)
2) If new generalizable learning: update the knowledge-log (config.paths.knowledgeLog) with a new LE and/or `<wiki>/decisions/*` (new decision)
3) Create marker file to unblock:
   - Write: `.claude/state/audit-<session_id>.done` (empty file OK)

## @refs

@file:.claude/rules/self-learning-error-prevention.md (regla de proyecto)

