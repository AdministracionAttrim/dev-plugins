---
name: agent-evolution
description: Audit a multi-agent session — flow order, tool usage, skill usage, procedure compliance, knowledge gaps — and emit a Markdown report with proposed diffs. Use after a flow involving ≥2 of {architect,dev,tester,reviewer,debugger}.
---

# S:AGENT-EVOLUTION

i: SCAN(main+subagents) → CLASSIFY(misuse via FP catalog) → COMPOSE(report) → ?confirm_apply.

## T→A

T:start → A:resolve PLUGIN_ROOT (dir del plugin agent-system-core; esta skill vive en PLUGIN_ROOT/skills/agent-evolution) | Bash(node "PLUGIN_ROOT/hooks/lib/analyze-flow.cjs" auto) | parse JSON metrics (auto=most-recent transcript for cwd)
T:metrics.error → A:ask user for explicit transcript path (~/.claude/projects/<encoded-cwd>/<session>.jsonl)
T:metrics_loaded → A:Read(references/anti-patterns.md (relativo a esta skill)) | match per-agent tool_use stream against FP catalog
T:flow_detected → A:reconstruct order(architect→dev→tester→reviewer→debugger) | tag missing/skipped roles | note tokenEstimate
T:Read(file_path) w/o offset+limit + size>1KB in agent stream → A:flag ME-0001 (read_full_vs_grep)
T:Glob/Grep result_count>20 + no_? in next text block → A:flag ME-0002 (explore_without_confirm)
T:skill in agent frontmatter + !Skill_tool_use in agent's subsession → A:flag ME-0003 (skill_unused)
T:bug_keyword in agent text + !LE-XXXX mention → A:flag ME-0004 (LE_undocumented)
T:H++_claimed in text + knowledge-log.md NOT in editedFiles → A:flag ME-0005 (honor_system_violation)
T:@-reference in .claude/**/*.md with target absent on disk → A:flag ME-0006 (dead_pointer)
T:procedure rule per agent.md violated → A:flag ME-0007 (procedure_compliance)
T:report_built → A:Read(references/report-template.md (relativo a esta skill)) | fill template | Write(.claude/state/evolve-reports/<session>.md) | Write(.claude/state/evolve-meta-<session>.done) empty
T:finding mentions new LE candidate → A:?confirm | Edit(config.paths.knowledgeLog) to append entry

V:[≥1 finding_or_clean_section | report<800L | diffs≤10 | sentinel_written | !Edit_to_agents_or_skills]

## G:[IDs]

G:S1 !!analyze own files (agente evolver | skill agent-evolution)
G:S2 cost guard — turnCount(main)<5 → emit "flow too short" + write sentinel + exit
G:S3 token budget — cap report 800L | cap proposed_diffs 10 | cap evidence-snippets 200ch each
G:S4 idempotency — if .claude/state/evolve-meta-<session>.done exists → reply "already audited" + exit

## @refs

@: [PLUGIN_ROOT/hooks/lib/analyze-flow.cjs | references/anti-patterns.md | references/report-template.md | @rule:self-learning-error-prevention (regla de proyecto, copiada por init)]
