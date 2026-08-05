---
name: self-learning-error-prevention
description: Capture and apply technical learning to avoid repeating development mistakes. Use when a bug, regression, misdiagnosis, Angular/TypeScript context error, or late fix occurs; also use in post-fix reviews to update reusable rules without duplicates.
---

# Self-Learning Error Prevention

Apply this workflow whenever a real error appears during a task.

## Goal

- Avoid repeating known mistakes.
- Convert incidents into reusable operational rules.
- Add only valid and verified knowledge.
- Prevent duplicates in the knowledge base.

## Validity Contract

Record learning only if all conditions are true:

1. Error was reproduced or observed in real output (stack trace, test, lint, runtime, or functional diff).
2. Root cause is identified concretely (not vague hypothesis).
3. Fix is applied and verified (build/lint/test or runtime behavior confirmed).
4. Rule is generalizable (not a one-off patch).

Do not record entries without evidence.

## Language Rule

- All new entries and updates in this skill must be written in English.
- If you find legacy entries in another language, translate them to English when touched.

## Operational Flow

1. Capture incident: symptom, context, file/line, exact error.
2. Identify minimal root cause.
3. Apply minimal fix and verify.
4. Ask user explicitly whether to update `references/knowledge-log.md` with this validated learning.
5. If user answers yes, convert case into reusable rule and update the log.
6. If user answers no, do not update the log and continue task delivery.
7. Apply the rule immediately in the current task when relevant.
8. For code generation/refactoring, load and apply `references/error-prevention-patterns.md`.

## Auto Prompt To User (Required)

After a difficult bug is fixed and validated, always ask this before closing the task:

`Do you want me to add/update this learning in references/knowledge-log.md so future runs can prevent this bug automatically?`

If user confirms:

- Check duplicates in `knowledge-log.md` by `ID`, `Topic`, and `Fingerprint`.
- Append or update canonical entry.

If user declines:

- Skip log update.
- Still summarize the reusable rule in the final response.

## No-Duplicate Rule

Before adding a new entry, search by `ID`, `Topic`, and `Fingerprint`.

Suggested command:

```powershell
rg -n "ID:|Topic:|Fingerprint:" references/knowledge-log.md
```

If rule already exists:

- Do not duplicate it.
- Update only `Last_validation` and `Examples` when new evidence is useful.

## Canonical Entry Format

Use exactly this block:

```markdown
## ID: LE-XXXX

- Topic: <short topic>
- Fingerprint: <technology>|<error>|<cause>
- Signal: <exact error/symptom>
- Root_cause: <concrete cause>
- Rule: <actionable rule>
- Pre_checklist:
  - <check 1>
  - <check 2>
- Minimum_validation: <how it was verified>
- Examples:
  - <path/file:line>
- Last_validation: <YYYY-MM-DD>
```

## Ongoing Auto-Update

Without waiting for explicit user request of file editing, evaluate learning continuously:

1. When a new verified error appears, evaluate whether it deserves a rule.
2. Ask user whether to persist the learning in `knowledge-log.md`.
3. If approved and not duplicated, append it.
4. If approved and already exists, reinforce the existing entry with new evidence.

Keep the log concise, actionable, and non-narrative.

## Required Seed Rules

Always load and follow these base rules from `references/knowledge-log.md`:

- Angular `takeUntilDestroyed` outside injection context requires explicit `DestroyRef`.
- In reactive forms, enable/disable decisions must use the real `FormControl` value, not unsynchronized parallel state.
- For list/non-id endpoints, assume reduced `*Search` DTOs; use full-entity fields only from id-based fetches or explicit full-entity selector outputs.

## References

- Living knowledge base: [references/knowledge-log.md](references/knowledge-log.md)
- Operational generation patterns: [references/error-prevention-patterns.md](references/error-prevention-patterns.md)
