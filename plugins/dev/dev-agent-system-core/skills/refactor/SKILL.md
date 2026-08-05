---
name: refactor
description: >
  Multi-file refactor workflow: map blast radius → propose approach → confirm → implement in batches →
  verify all call sites, test mocks, and spec fixtures → run npm run build → check form modes and i18n.
  Use when renaming, migrating, or restructuring code across more than 2 files.
---

i: blast_radius_first | propose+confirm | batches_5-8 | npm run build after each | !!edit_before_mapping.

T:invoked → A: Grep all references (impl + specs + templates) | group + report | !!edit_yet
T:scope_reported → A: state what+where+order | mocks_needing_update | i18n_impact | ? confirm
T:confirmed → A: core_model_first → consuming_components → test_mocks_last | Bash(`npm run build 2>&1 | tail -30`) each batch
T:touches_form → A: verify CREATE+EDIT+DETAIL modes all work
T:touches_i18n → A: verify keys exist in es.json + en.json
T:finish → A: Bash(`npm run build 2>&1 | tail -50`) | Bash(npm run test -- --reporter=verbose 2>&1 | tail -40) | ✅/❌

G:001 !!edit before blast radius mapped
G:002 !!change model without updating test mocks
G:003 !!declare done before build clean (npm run build must pass)
G:004 !!scattered per-component fix when centralized solution exists
G:005 !!skip confirm when scope >3 files
