---
name: self-learning-error-prevention
description: Loop de auto-aprendizaje SCAN→LEARN→PROMOTE→DECAY sobre el knowledge-log del proyecto. Usar al arrancar tareas (escanear índice de LE por fingerprint), tras arreglar un bug no trivial (capturar LE nuevo), y cuando el Stop hook emite G:EVOLVE AUDIT REQUIRED (ejecutar auditoría y desbloquear).
---

# S:SELF-LEARNING

i: Prevenir errores conocidos antes de codificar | capturar aprendizajes tras cada fix | mantener el log vivo (H++, PROMOTE, DECAY).

Knowledge-log del proyecto: `config.paths.knowledgeLog` (default `docs/wiki/knowledge-log.md`). Índice compacto: regla de proyecto `@rule:self-learning-error-prevention` (`.claude/rules/`, copiada por init).

## T→A

T:task_start → A:scan índice LE en @rule:self-learning-error-prevention | FP match → Read(entrada completa en knowledge-log) → aplicar fix conocido
T:apply LE proactively → A:decir "aplicando LE-XXX" en la respuesta (el Stop hook lo captura para H++)
T:bug_fixed + !duplicate + generalizable → A:RCA → proponer entrada nueva {FP, R(oot cause), V(erification)} → ?confirm → append a knowledge-log + añadir línea al índice de la regla (sync obligatorio)
T:new_LE_id → A:Grep(knowledge-log, "LE-") → max N → N+1 (3 dígitos) | formato `LE-{INICIALES}-{NNN}` | INICIALES == iniciales de `git config user.name` | !!adivinar números
T:Stop hook emits decision:block → A:Read(references/self-evolve.md) | ejecutar checklist AUDIT | Write .claude/state/audit-<session_id>.done para desbloquear
T:audit detects LE with H > 10 → A:?propose:PROMOTE a ST (patrón estándar) en el wiki
T:audit detects LE with H == 0 + >30d → A:?propose:DELETE (limpieza de tokens)

## V

V:[índice_y_log_sincronizados | LE_ids_secuenciales | !!prosa_en_entradas | marker_.done_escrito_tras_audit]

## @refs

@: [references/self-evolve.md | @rule:self-learning-error-prevention | config.paths.knowledgeLog]
