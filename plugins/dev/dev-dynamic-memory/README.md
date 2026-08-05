# dev-dynamic-memory

Sistema de memoria dinámica por proyecto para Claude Code: mantiene contexto entre sesiones (usuario, feedback, estado del proyecto, referencias externas), permite traspasar tareas a otro miembro del equipo y da control manual para inspeccionar o corregir lo guardado. Todo vive dentro del repo, en `.claude/memory/`, fuera de git.

## Qué incluye

### Comandos

| Comando | Qué hace |
|---|---|
| `/start` | Al empezar una sesión, carga en silencio toda la memoria guardada (índice, memorias por tipo, último snapshot de sesión) para no perder contexto. No muestra ni resume nada, solo confirma: `Memoria del proyecto cargada.` |
| `/wrap-up` | Punto de guardado manual de fin de sesión. Analiza el `git diff` de la sesión, actualiza automáticamente las memorias relevantes (`project_*`, `feedback_*`, `user_*`, `reference_*`) y guarda un snapshot de la sesión en `.claude/memory/sessions/`. No pide confirmación durante el proceso, solo informa del resultado al final. |
| `/handoff [en qué se centrará la siguiente sesión]` | Genera un documento de traspaso puntual y autocontenido en `.claude/memory/handoffs/`, pensado para entregar a **otra persona** (o a una sesión sin contexto previo), no para que lo retomes tú mismo. Redacta datos sensibles y evita duplicar contenido que ya vive en otros artefactos (specs, ADRs, issues, commits). |
| `/memory-status` | Muestra al usuario, de forma transparente, qué hay guardado: memorias agrupadas por tipo, número de snapshots de sesión (hasta el límite de 5) y handoffs pendientes. Es el contrapunto visible al silencio de `/start`. |
| `/memory-forget <tema o archivo>` | Borra o corrige a mano una memoria concreta (obsoleta, equivocada, o que ya no se quiere guardar), sin esperar a que `/wrap-up` la detecte sola. Pide confirmación antes de borrar si hay ambigüedad sobre qué archivo se refiere. |

### Skill

- **memory-keeper**: no es un comando, es la skill que define las reglas compartidas de formato, taxonomía y ubicación que usan todos los comandos anteriores (dónde vive la memoria, formato de cada archivo, qué no guardar nunca). Se activa automáticamente siempre que hay que leer, crear o actualizar `.claude/memory/`.

### Organización de la memoria por tipos

Toda la memoria vive en `.claude/memory/` dentro del repo, indexada en `MEMORY.md`. Cada archivo (menos el índice) es de exactamente uno de estos cuatro tipos, indicado en `metadata.type` del frontmatter:

| Tipo | Contenido | Cuándo se guarda |
|---|---|---|
| `user_*.md` | Rol, objetivos, nivel de conocimiento del usuario en este proyecto | Al aprender algo sobre quién es el usuario o cómo trabaja |
| `feedback_*.md` | Correcciones o confirmaciones sobre CÓMO abordar el trabajo | Cuando el usuario corrige o confirma un enfoque no obvio |
| `project_*.md` | Estado del trabajo en curso: rama, decisiones, bugs, iniciativas activas | Cuando cambia el estado de "quién hace qué, por qué, para cuándo" |
| `reference_*.md` | Punteros a sistemas externos (tickets, canal de Slack, dashboard) | Cuando se menciona dónde vive información fuera del repo |

Además de estos cuatro tipos, existen dos carpetas especiales:

- `.claude/memory/sessions/YYYY-MM-DD-HH-MM.md` — snapshots de sesión (máximo 5; `/wrap-up` borra el más antiguo al superar el límite).
- `.claude/memory/handoffs/YYYY-MM-DD-<slug-tarea>.md` — documentos de traspaso puntuales generados por `/handoff`.

No se guarda nunca lo que se puede derivar leyendo el código, lo que ya está en `git log`/`git blame`, recetas de depuración puntuales, ni nada ya documentado en `CLAUDE.md`.

## Cómo instalarlo

Instala el plugin `dev-dynamic-memory` desde el marketplace interno `attrim-marketplace` con el flujo habitual de instalación de plugins de Claude Code (añadir el marketplace si no lo tienes ya, y luego instalar este plugin por su slug).

## Cómo usarlo

**Flujo básico de sesión:**

1. Al abrir una sesión de trabajo en un proyecto, ejecuta `/start`. Si es la primera vez, el plugin crea `.claude/memory/` (con `MEMORY.md` vacío) y añade la entrada al `.gitignore` del proyecto. Si ya había memoria previa, la carga en silencio y responde solo `Memoria del proyecto cargada.`
2. Trabajas normalmente en la tarea (features, decisiones, feedback que le das a Claude sobre cómo abordar el proyecto).
3. Al terminar la sesión, ejecuta `/wrap-up` (opcionalmente con una nota breve, ej. `/wrap-up terminada la migración de auth`). El comando mira el `git diff` de la sesión, actualiza las memorias de tipo `project`/`feedback`/`user`/`reference` que correspondan y guarda un snapshot en `.claude/memory/sessions/`.

**Traspasar una tarea a un compañero:**

- Si vas a dejar una tarea a medias para que la continúe otro miembro del equipo (o tú mismo en otra máquina), ejecuta `/handoff continuar la migración de auth a signals`. Se genera un archivo como `.claude/memory/handoffs/2026-07-20-migrar-auth-a-signals.md` con el resumen del estado, qué queda pendiente y qué skills debería invocar el siguiente agente. Como `.claude/memory/` está fuera de git, ese archivo no viaja con un `git pull` — hay que compartirlo aparte (Slack, copiar el contenido, etc.).

**Consultar y corregir la memoria a mano:**

- Para ver qué hay guardado sin abrir archivos uno a uno: `/memory-status`. Lista las memorias agrupadas por tipo, cuántos snapshots hay (de un máximo de 5) y qué handoffs quedan pendientes.
- Si una memoria quedó obsoleta o es incorrecta (por ejemplo, menciona una rama ya cerrada), corrígela con `/memory-forget rama feature/auth-antigua`. El comando busca coincidencias, pide confirmación si hay ambigüedad, y borra o actualiza el archivo según lo que se le pida.

## Requisitos / configuración previa

- No requiere configuración ni dependencias externas: los comandos solo usan herramientas estándar (`Read`, `Write`, `Edit`, `Glob`, `Bash`).
- La memoria se guarda siempre en `.claude/memory/` **dentro del repo del proyecto actual**, nunca en `~/.claude` ni en rutas absolutas de usuario/máquina.
- `.claude/memory/` debe estar en el `.gitignore` del proyecto — el propio plugin añade esa entrada automáticamente la primera vez que se usa, si no está ya. Es memoria local del proyecto (y de quien la generó), no memoria de equipo: nunca se commitea ni se propone en un PR.

## Notas relevantes

- `/wrap-up` y `/handoff` son complementarios, no equivalentes: `/wrap-up` guarda contexto acumulativo y tipado para que **tú mismo** lo retomes en una sesión futura (vía `/start`); `/handoff` genera un documento suelto, de un solo uso, para entregar a **otra persona** sin acceso a tu historial de conversación.
- Como los handoffs quedan fuera de git, compartirlos con un compañero requiere un paso manual (Slack, pegar el contenido, etc.) — no basta con que el compañero haga `git pull`.
- `/handoff` redacta explícitamente datos sensibles (claves, contraseñas, tokens, datos personales) antes de guardarlos en el documento de traspaso.
- Los snapshots de sesión están limitados a 5: al crear uno nuevo por encima del límite, `/wrap-up` borra automáticamente el más antiguo.
