---
name: save
description: Guarda la sesión actual como página wiki persistente en docs/wiki/outputs/<slug>.md con frontmatter completo y git commit. Invocar con /save <slug>.
---

FP: user types `/save <slug>` | wants to persist session findings to wiki

## T→A

T: skill invoked → A: launch Agent(subagent_type="wiki-saver", prompt=<slug + full context below>)
!!summarize in chat instead of filing | !!skip git commit

## Prompt to pass to wiki-saver agent

Include in the prompt:
- The slug from args (required — if missing, ask user: "¿Cuál es el slug para esta wiki?")
- All key decisions, fixes, patterns and findings from the conversation
- File paths and code changes made during the session
- Any pending follow-up items
