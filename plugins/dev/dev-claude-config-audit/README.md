# dev-claude-config-audit

Plugin de Claude Code que audita tu propia configuración de Claude Code (la del proyecto, la de tu máquina, o ambas) y te devuelve un informe con nota 1-10 en seguridad, estructura y ajuste al stack, más sugerencias de plugins del marketplace Attrim que cubrirían los huecos detectados.

## Qué incluye

- **Comando `/claude-analisis`** — punto de entrada. Acepta un argumento opcional con el alcance:
  - `proyecto` — audita `<cwd>/CLAUDE.md`, `<cwd>/.claude/` y `.mcp.json` de la raíz del proyecto actual.
  - `local` (o `máquina`) — audita `~/.claude/CLAUDE.md` (o `~/.claude/settings.json` si no hay CLAUDE.md global) y la configuración de `~/.claude/` (settings, `agents/`, `commands/`, `skills/`, `hooks/`, `.mcp.json`, plugins/marketplaces instalados) — nunca el contenido de `~/.claude/projects/*/` (transcripts o historial de sesiones, que no es configuración).
  - `ambos` — las dos secciones anteriores, con un informe combinado y una conclusión conjunta.

  Si no se indica el alcance como argumento, el comando pregunta con `AskUserQuestion`.

- **Agente `claude-config-auditor`** — hace el trabajo real de lectura y análisis. Solo tiene acceso a `Read`, `Glob`, `Grep` y `Bash` (deliberadamente sin `Edit`/`Write`). Detecta el stack del proyecto (Angular/React/Vue/Node, .NET, Java/Spring, Python, Go, Rust, etc.) para evaluar el ajuste al stack, calcula la nota final (`0.4 × seguridad + 0.3 × estructura + 0.3 × ajuste al stack`) y redacta el informe.

- **Skill `claude-config-audit`** — checklist y rúbrica que consulta el agente antes de analizar nada: qué buscar en cada dimensión (seguridad, estructura, ajuste al stack) y en qué ficheros. Incluye como referencia `marketplace-catalog.md`, una foto fija del catálogo de plugins de `attrim-marketplace` (con fecha de captura) usada para las sugerencias del informe.

## Solo lectura — nunca modifica nada

Este plugin **nunca edita, borra ni crea ningún fichero**. El agente auditor no tiene las herramientas `Edit`/`Write` habilitadas y el propio prompt del agente indica explícitamente que, si detecta la tentación de "arreglarlo ya que estás", debe reportarlo como hallazgo en vez de tocar nada. El informe se muestra solo en el chat; no se genera ningún fichero de salida.

Además, si el auditor detecta lo que parece un secreto real (API key, token, contraseña, clave privada...), **nunca lo reproduce en el informe** — lo reporta redactado como `fichero:línea — tipo de secreto detectado (redactado)` junto a la recomendación de rotarlo.

## Cómo instalarlo

Instala el plugin `dev-claude-config-audit` desde el marketplace `attrim-marketplace` con el flujo habitual de instalación de plugins de Claude Code (marketplace ya añadido → `/plugin install dev-claude-config-audit`, o el equivalente en tu cliente).

## Cómo usarlo

**1. Auditar la configuración del proyecto actual:**

```
/claude-analisis proyecto
```

Obtendrás un informe con secciones `[ERROR]` / `[WARNING]` / `[OK]`, sugerencias de plugins del marketplace que encajen con el stack detectado (por ejemplo, `dev-angular-knowledge` si el proyecto es Angular y no tiene skills de Angular) y una nota final desglosada, del tipo:

```
Seguridad: 8/10 · Estructura: 7/10 · Ajuste al stack: 6/10
Nota final: 7/10
```

**2. Auditar la configuración de tu máquina (global, `~/.claude/`):**

```
/claude-analisis local
```

Aquí la dimensión "ajuste al stack" se reinterpreta: en vez de comprobar si hay skills para un framework concreto, evalúa si la configuración global es agnóstica y no impone convenciones de un proyecto específico a todos tus proyectos.

**3. Auditar ambas a la vez:**

```
/claude-analisis ambos
```

Devuelve un informe con una sección para el proyecto y otra para la máquina, más una conclusión conjunta de 2-3 líneas (por ejemplo, si algo de tu configuración local entra en conflicto con la del proyecto).

**4. Sin argumento** — si simplemente escribes `/claude-analisis`, el comando te pregunta qué quieres analizar (proyecto / máquina / ambos) antes de invocar al agente.

## Requisitos previos

- El alcance analizado debe tener un `CLAUDE.md` (de proyecto y/o global, según corresponda). Si falta, el agente **detiene esa sección del análisis** y te indica que ejecutes `/init` ahí primero — sin `CLAUDE.md` no hay línea base que auditar. En el alcance "ambos", si solo falta uno de los dos, avisa de esa sección y continúa con la que sí existe.
- No requiere configuración adicional (no usa `.mcp.json` propio ni variables de entorno).

## Notas

- El catálogo de plugins usado para las sugerencias (`skills/claude-config-audit/references/marketplace-catalog.md`) es una **foto fija** del marketplace, con fecha de captura en la cabecera del fichero (a día de escribir este README: 2026-07-21). Si esa fecha es antigua, el propio informe te lo advertirá — hay que refrescar ese fichero a mano cada vez que se cure/publique un plugin nuevo en `attrim-marketplace`.
- El propio plugin `dev-claude-config-audit` nunca se sugiere a sí mismo como recomendación (sería circular).
- Una violación de seguridad grave (secreto real expuesto, permiso que permite exfiltración) hunde la nota de esa dimensión a ≤3 aunque el resto del checklist esté impecable — el informe no promedia mecánicamente hallazgos críticos con hallazgos menores.
