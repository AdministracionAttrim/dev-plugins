# Shorthand Legend (Locked)

Single source of truth for high-density context & recursive learning.

## 1. Core Operators

- `i:` imperative instruction (core mission)
- `P:` persona / thinking mindset
- `T → A:` trigger → action (one logic unit per line)
- `|` (AND), `/` (OR), `!` (NOT), `!!` (STRICT_NOT)
- `?` CHECKPOINT (Stop & Ask user for confirmation)
- `=>` Result / Output Contract / Expected State
- `==` Match / Required Equality

## 2. Context & Evolution

- `FP:` Fingerprint (exact error pattern, code shape, or regex)
- `V:` Verification step / Technical check
- `H:` Hit count (tracks how many times a rule was applied/saved)
- `@:` Global Pointer — subtypes: `@skill:X` (skills/X/SKILL.md) | `@rule:X` (rules/X.md) | `@file:path` (repo file)
- `G:[ID]` Guardrail (strict safety/quality rule)
- `S:[ID]` Skill (specific modular ability)
- `ST:[ID]` Standard (reusable architectural pattern)

## 3. File Skeleton (Template)

```
---
name: <preserved>
description: <preserved, ≤20% compression>
---
# <NAME>
i: <summary_of_purpose>
FP: <matching_patterns>
T→A: <logic_steps>
V: [<verification_list>]
@: [<dependency_pointers>]
E: <code_verbatim_examples>
```

## 4. G:EVOLVE (Recursive Feedback Loop)

- **SCAN:** `T:Task_Start → @knowledge-log | match:FP` (Prevent errors before coding).
- **LEARN:** `T:Bug_Fixed + !duplicate → RCA → propose:FP|R|V` (Capture new knowledge).
- **PROMOTE:** `T:H > 10 → move:SKILL → ST:[ID]` (Elevate frequent rules to standards).
- **DECAY:** `T:H == 0 + session_age > 30d → ?propose:DELETE` (Token cleanup).

## 5. Operational Foundations (WHY)

G:F1 **Lost-in-Middle (Stanford):** LLM attention peaks at context start/end; middle dilutes.
→ `T:turn_start → prioritize(i: + G: + S:)` | `minify:800→150 tokens` ensures logic survival.

G:F2 **Semantic Compression (MS):** NL has high redundancy; LLMs need only high-surprise tokens.
→ `!filler` | `nouns+actions+symbols_only` | `70%_token_reduction` without loss of meaning.

G:F3 **Code-Native Thinking:** LLMs trained on code; code is the densest logic medium.
→ `G:[ID]` as constant declaration | `T→A` as logic function | `!ambiguity`.

G:F4 **Recursive Learning:** Context is a living organism, not a static document.
→ `SCAN → LEARN → PROMOTE → DECAY` | `H:count` drives autonomous rule evolution.

## 6. Authoring Guidelines (apply when writing any .claude/ file)

G:F1 → `i:` first | G:[ID]s before T→A blocks | critical gates at TOP
G:F2 → `!!prose` | `!!numbered_lists` | `!!filler` | operators_only
G:F3 → G:[ID] = constant (define once, reference everywhere) | T→A = logic fn
G:F4 → `H:` on every reusable entry | DECAY: `H==0 + 30d → ?DELETE` | PROMOTE: `H>10 → ST:[ID]`

### Per-file-type

```
SKILL.md        → frontmatter:{name,description} | body:shorthand | !!duplicate @rule content
                  rule-backed: thin pointer (@rule:X) + workflow T→A only | target <30L
                  standalone:  self-contained | target <100L | T→A + V: + @refs

rules/*.md      → i: + G:[ID]s + T→A | !!prose | target <60L
                  FP: for error-prone patterns | @refs for canonical files

knowledge-log.md → LE-XXXX: FP+R+V | H: mandatory | !!prose RCAs
```

### Authoring Guardrails

G:A1 Code blocks inside fences → VERBATIM | !!mutate content inside ```G:A2 Frontmatter`description`→ preserve every trigger verb | ≤20% compression
G:A3`@`-pointers → must resolve (target file exists) | !!dead references
