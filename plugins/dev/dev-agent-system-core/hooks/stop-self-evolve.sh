#!/usr/bin/env bash
# Stop hook: auditoría G:EVOLVE al cerrar sesión.
# Detecta señales (ficheros editados + bug keywords + claims H++) en el transcript
# y emite decision:block con la directiva de auditoría para el loop de auto-aprendizaje.
# Compatible con Git Bash en Windows. Los helpers viven en el plugin (CLAUDE_PLUGIN_ROOT).

INPUT=$(cat)

LIB_DIR="${CLAUDE_PLUGIN_ROOT}/hooks/lib"
[ -d "$LIB_DIR" ] || exit 0
# Sin init del proyecto no hay loop de aprendizaje que auditar
[ -f ".claude/agent-system.config.json" ] || exit 0

SESSION_ID=$(echo "$INPUT" | node --input-type=commonjs -e "
try {
  var d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  process.stdout.write(d.session_id || 'unknown');
} catch(e) { process.stdout.write('unknown'); }
")

TRANSCRIPT=$(echo "$INPUT" | node --input-type=commonjs -e "
try {
  var d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  process.stdout.write(d.transcript_path || '');
} catch(e) { process.stdout.write(''); }
")

STATE_DIR=".claude/state"
STATE_FILE="$STATE_DIR/audit-$SESSION_ID.done"
mkdir -p "$STATE_DIR"

# Ya auditada esta sesión → pasar en silencio
[ -f "$STATE_FILE" ] && exit 0
[ -z "$TRANSCRIPT" ] && exit 0
[ ! -f "$TRANSCRIPT" ] && exit 0

SUMMARY=$(node "$LIB_DIR/parse-transcript.cjs" "$TRANSCRIPT")

HAS_SIGNALS=$(echo "$SUMMARY" | node --input-type=commonjs -e "
try {
  var d = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  process.stdout.write((d.hasEvolveSignals === true) ? '1' : '0');
} catch(e) { process.stdout.write('0'); }
")

if [ "$HAS_SIGNALS" = "1" ]; then
  DIRECTIVE=$(node "$LIB_DIR/build-audit-directive.cjs" "$SUMMARY" "$STATE_FILE")
  echo "$DIRECTIVE" | node --input-type=commonjs -e "
var text = require('fs').readFileSync(0, 'utf8');
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: text,
  systemMessage: '⚠️ G:EVOLVE AUDIT REQUIRED — Detectado en esta sesión: cambios + bug keywords. Acciones obligatorias en Stop hook.'
}));
"
fi

exit 0
