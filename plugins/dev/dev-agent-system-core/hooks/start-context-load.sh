#!/usr/bin/env bash
# UserPromptSubmit hook: aviso de inbox pendiente para el sistema wiki.
# Lee la ruta del inbox de .claude/agent-system.config.json (paths.inbox).
# Si no hay config (proyecto sin /init), sale silenciosamente: el hook nunca rompe.
INPUT=$(cat)
PROJECT_ROOT=$(pwd)
CONFIG="$PROJECT_ROOT/.claude/agent-system.config.json"
[ -f "$CONFIG" ] || exit 0

INBOX_REL=$(node --input-type=commonjs -e "
try {
  var c = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
  process.stdout.write((c.paths && c.paths.inbox) || 'docs/raw/inbox');
} catch(e) { process.stdout.write('docs/raw/inbox'); }
" "$CONFIG" 2>/dev/null || echo "docs/raw/inbox")

INBOX_DIR="$PROJECT_ROOT/$INBOX_REL"
mkdir -p "$PROJECT_ROOT/.claude/state"
INBOX_COUNT=0
if [ -d "$INBOX_DIR" ]; then INBOX_COUNT=$(find "$INBOX_DIR" -maxdepth 1 -type f ! -name '.gitkeep' 2>/dev/null | wc -l | tr -d '[:space:]'); fi
if [ "$INBOX_COUNT" -gt 0 ]; then
  echo "[Wiki Inbox: $INBOX_COUNT fichero(s) pendiente(s) — pide 'wiki ingest' para procesar]"
fi
exit 0
