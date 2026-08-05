---
name: debug-hypothesis
description: Use when debugging any non-trivial bug — wrong output, crash, flaky test, performance regression, or "it works locally but not in CI." Forces a scientific-method loop (Observe → Hypothesize → Experiment → Conclude) so the agent stops guessing and starts reasoning. Prevents the #1 AI debugging failure mode — bulldozing through a wrong idea instead of falsifying it.
---

i: OBSERVE→HYPOTHESIZE→EXPERIMENT→CONCLUDE | !!fix before hypothesis confirmed | write DEBUG.md.

## When

T:test_fails_non_obvious / same_bug_fixed_twice / tried_fix_didnt_work / env_diff → A: invoke
T:typo / missing_import / obvious_single-line_cause → A: !!invoke

## Hard Rules

G:001 !!write fix code during OBSERVE | HYPOTHESIZE | EXPERIMENT phases
G:002 experiment ≤5 lines | if_more: hypothesis_too_vague → split
G:003 ≥3 hypotheses minimum (not 1 favorite)
G:004 write everything to DEBUG.md (compaction eats reasoning in conversation)

## Loop

```
T:OBSERVE      → A: reproduce | exact_error+stack | minimal_repro | what_works_vs_broken | write ##Observations to DEBUG.md
T:HYPOTHESIZE  → A: list_3-5_causes | each: Supports+Conflicts+Test | rank | mark ROOT_HYPOTHESIS | write ##Hypotheses to DEBUG.md
T:EXPERIMENT   → A: write_experiment_before_run | 1_variable | diagnostic_code_only | revert_after | write ##Experiments to DEBUG.md
T:CONCLUDE     → A: if_confirmed: write_root_cause_1_sentence + production_fix + regression_test + commit | if_rejected: next_hypothesis→EXPERIMENT / all_rejected→OBSERVE
```

## Anti-Bulldozer

FP: >5L_before_hypothesis_confirmed | same_approach_2nd_attempt | ignoring_conflicting_evidence | "almost_there"_after_3_failures
→ STOP | back to HYPOTHESIZE | falsify !!confirm

V: [root_cause_1_sentence | fix+regression_test_committed | original_repro_passes | DEBUG.md complete]
