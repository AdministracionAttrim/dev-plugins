#!/usr/bin/env node
// Builds the actionable audit directive for the Stop hook decision:block reason.
// Usage: node build-audit-directive.cjs '<summary_json>' '<state_file_path>'
// Output: plain text to stdout

const summaryArg = process.argv[2] || "{}";
const stateFile = process.argv[3] || ".claude/state/audit-unknown.done";

var summary;
try {
  summary = JSON.parse(summaryArg);
} catch {
  summary = {};
}

var editedFiles = summary.editedFiles || [];
var keywords = summary.keywords || [];
var appliedLEs = summary.appliedLEs || [];
var turnCount = summary.turnCount || 0;

var today = new Date().toISOString().split("T")[0];

var filesSection = editedFiles.length
  ? editedFiles
      .map(function (f) {
        return "  - " + f;
      })
      .join("\n")
  : "  (ninguno detectado)";

var kwSection = keywords.length
  ? keywords
      .map(function (k) {
        return '"' + k + '"';
      })
      .join(", ")
  : "(ninguno)";

var leSection = appliedLEs.length
  ? appliedLEs.join(", ")
  : '(no detectadas — menciona "aplicando LE-XXXX" cuando apliques una)';

var directive =
  "G:EVOLVE AUDIT REQUIRED\n\n" +
  "Detectado en esta sesión (" +
  turnCount +
  " turno(s)):\n" +
  "Ficheros editados:\n" +
  filesSection +
  "\n" +
  "Keywords de fix: " +
  kwSection +
  "\n" +
  "LEs mencionadas: " +
  leSection +
  "\n\n" +
  "Acciones obligatorias:\n" +
  "1. LEARN: para cada fix no trivial sin LE matching → pregunta ONCE al usuario:\n" +
  '   "¿Quieres que añada LE-{INICIALES}-XXX: <título> al knowledge-log?"\n' +
  "2. H++: para cada LE listada arriba → Edit knowledge-log.md:\n" +
  "   - Incrementar H: en 1\n" +
  "   - Actualizar v: a " +
  today +
  "\n" +
  "3. PROMOTE: si alguna LE tiene H > 10 → proponer moverla a error-prevention-patterns.md como ST\n" +
  "4. DECAY: si alguna LE tiene H == 0 y v: > 30d antes de hoy → proponer eliminarla\n" +
  "5. Cerrar auditoría: Write tool → " +
  stateFile +
  ' → contenido "" (libera el bloqueo)\n\n' +
  "Ref: skill self-learning-error-prevention → references/self-evolve.md (plugin agent-system-core)";

process.stdout.write(directive);
