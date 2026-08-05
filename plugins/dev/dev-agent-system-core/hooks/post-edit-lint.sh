#!/usr/bin/env bash
# PostToolUse hook (Write|Edit|MultiEdit): formatea + linta los ficheros editados.
# 1) Lee comandos de .claude/agent-system.config.json → hooks.postEdit.{format,lint,include,exclude}
#    - "format"/"lint": plantilla de comando; {file} se sustituye por la ruta del fichero.
#    - "include": regex de extensiones a procesar (default: \.(ts|tsx|js|jsx|mjs|cjs|html|css|scss|py|go|rs)$)
#    - "exclude": regex de exclusión (default: \.(spec|test|mock)\.)
# 2) Sin config o sin comandos → autodetección: oxfmt/oxlint → prettier/eslint → ruff (py) → nada.
# El hook imprime violaciones a stdout; Claude las lee y las corrige en el mismo turno.
# Nunca bloquea: exit 0 siempre.

INPUT=$(cat)
PROJECT_ROOT=$(pwd)
CONFIG="$PROJECT_ROOT/.claude/agent-system.config.json"

FILES=$(echo "$INPUT" | grep -o '"filePath"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"filePath"[[:space:]]*:[[:space:]]*"//;s/"$//' | sort -u)
[ -z "$FILES" ] && exit 0

read_cfg() {
  local key=$1 fallback=$2
  local val=""
  if [ -f "$CONFIG" ]; then
    val=$(node --input-type=commonjs -e "
try {
  var c = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
  var h = (c.hooks && c.hooks.postEdit) || {};
  process.stdout.write(h[process.argv[2]] || '');
} catch(e) {}
" "$CONFIG" "$key" 2>/dev/null)
  fi
  [ -z "$val" ] && val="$fallback"
  echo "$val"
}

resolve_bin() {
  local name=$1
  if [ -f "./node_modules/.bin/$name" ]; then echo "./node_modules/.bin/$name";
  elif [ -f "./node_modules/.bin/$name.cmd" ]; then echo "./node_modules/.bin/$name.cmd";
  elif command -v "$name" > /dev/null 2>&1; then echo "$name";
  else echo ""; fi
}

INCLUDE_RE=$(read_cfg include '\.(ts|tsx|js|jsx|mjs|cjs|html|css|scss|py|go|rs)$')
EXCLUDE_RE=$(read_cfg exclude '\.(spec|test|mock)\.')
FMT_TPL=$(read_cfg format '')
LINT_TPL=$(read_cfg lint '')

# Autodetección si el config no define comandos
if [ -z "$FMT_TPL" ]; then
  for c in oxfmt prettier; do
    BIN=$(resolve_bin "$c")
    if [ -n "$BIN" ]; then
      case "$c" in
        oxfmt)    FMT_TPL="$BIN {file}";;
        prettier) FMT_TPL="$BIN --write {file}";;
      esac
      break
    fi
  done
fi
if [ -z "$LINT_TPL" ]; then
  for c in oxlint eslint ruff; do
    BIN=$(resolve_bin "$c")
    if [ -n "$BIN" ]; then
      case "$c" in
        oxlint) LINT_TPL="$BIN {file}";;
        eslint) LINT_TPL="$BIN {file}";;
        ruff)   LINT_TPL="$BIN check {file}";;
      esac
      break
    fi
  done
fi

[ -z "$FMT_TPL" ] && [ -z "$LINT_TPL" ] && exit 0

MATCHED=0
HEADER_PRINTED=0
while IFS= read -r FILE; do
  [ -z "$FILE" ] && continue
  echo "$FILE" | grep -Eq "$INCLUDE_RE" || continue
  echo "$FILE" | grep -Eq "$EXCLUDE_RE" && continue
  [ -f "$FILE" ] || continue
  MATCHED=1
  if [ "$HEADER_PRINTED" = "0" ]; then
    echo "=== Post-Edit Check (agent-system) ==="
    HEADER_PRINTED=1
  fi
  if [ -n "$FMT_TPL" ]; then
    CMD=${FMT_TPL//\{file\}/\"$FILE\"}
    eval "$CMD" > /dev/null 2>&1 || true
  fi
  if [ -n "$LINT_TPL" ]; then
    CMD=${LINT_TPL//\{file\}/\"$FILE\"}
    OUTPUT=$(eval "$CMD" 2>&1)
    STATUS=$?
    if [ $STATUS -ne 0 ] && [ -n "$OUTPUT" ]; then
      echo "--- LINT [$FILE] ---"
      echo "$OUTPUT" | head -60
      echo "→ Corrige estas violaciones en este mismo turno."
    fi
  fi
done <<< "$FILES"

exit 0
