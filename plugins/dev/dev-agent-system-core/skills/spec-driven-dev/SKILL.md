---
name: spec-driven-dev
description: Use when starting any non-trivial feature, refactor, or new project that will touch more than one file. Drives an AI coding agent through a gated Spec → Plan → Build → Test → Review → Ship lifecycle so work is specified before it is built, verified before it is reviewed, and reviewed before it ships.
---

i: gated lifecycle SPEC→PLAN→BUILD→TEST→REVIEW→SHIP | !!skip gates | human approves each.

## When

T:>1_file_touched / vague_requirement / architectural_decision / >100L_without_plan → A: invoke
T:typo_fix / single_variable_rename / dependency_bump → A: !!invoke

## Gated Phases (!!advance without closing gate)

```
T:SPEC    → A: restate_in_1_sentence + list_assumptions + measurable_success_criteria + save SPEC.md | ? human_approve
T:PLAN    → A: read_only | dependency_graph | thin_vertical_slices | task≤5_files | save PLAN.md | ? human_approve
T:BUILD   → A: one_thing_per_increment | always_compilable | lint+type_pass | 1_commit_per_concern
T:TEST    → A: RED→GREEN→REFACTOR | bug_fix→failing_test_first | suite_green | !!manual_only
T:REVIEW  → A: 5-axis(correctness|readability|architecture|security|performance) | severity_labels | all_Critical_resolved
T:SHIP    → A: pre-launch_checklist | feature_flag(owner+expiry) | rollback_plan_before_deploy | monitor_1h
```

G:001 !!code before SPEC | !!BUILD before PLAN approved | !!SHIP before REVIEW
G:002 task size: XS(1f) S(1-2f) M(3-5f) L(5-8f) XL(8+f→SPLIT)
G:003 REVIEW severity: `Critical:` blocks merge | no-prefix required | `Consider:` optional | `Nit:` style

## Red Flags (→ return to last unpassed gate)

FP: code_before_spec | PLAN_tasks="implement_feature"(vague) | single_commit_mixes_schema+UI+config | "tests_pass"(no_output) | deploy_without_rollback_plan | feature_flag_no_owner

## Artifacts

SPEC.md | PLAN.md | code+tests | review_note/PR_description | launch+rollback_note

V: [SPEC committed+approved | PLAN all_tasks_checked | every_behavior_has_test | 5-axis_review_done | rollback_plan_exists | monitoring_live]
