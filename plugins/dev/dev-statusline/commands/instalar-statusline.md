---
description: Activa la statusline de Attrim (modelo, proyecto, rama git, uso de contexto y rate-limits) editando el settings.json del usuario.
---

Activa la statusline personalizada que trae este plugin editando la configuración de Claude Code.

Contexto importante: un plugin no puede fijar el `statusLine` principal solo con instalarse — Claude Code solo aplica automáticamente `agent` y `subagentStatusLine` desde el `settings.json` de un plugin. Por eso este comando existe: aplica la configuración una sola vez, de forma explícita.

Pasos a seguir:

1. Pregunta al usuario si quiere activar la statusline de forma **global** (`~/.claude/settings.json`, afecta a todos sus proyectos) o solo para **este proyecto** (`.claude/settings.json` en la raíz del repo actual). Si no lo tiene claro, recomienda global.

2. Lee el archivo `settings.json` elegido. Si no existe, créalo con `{}` como contenido base.

3. Si ya existe una clave `statusLine`, avisa al usuario de qué comando tenía configurado antes de sobrescribirlo y pide confirmación.

4. Añade o actualiza la clave de nivel raíz `statusLine` con este valor exacto (usa `${CLAUDE_PLUGIN_ROOT}` literal, tal cual — Claude Code lo resuelve en tiempo de ejecución a la ruta donde está instalado este plugin):

```json
"statusLine": {
  "type": "command",
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/statusline-command.js\"",
  "padding": 2
}
```

5. Guarda el archivo preservando el resto del contenido existente (no reformatees ni borres otras claves).

6. Confirma al usuario que la statusline quedará activa en la próxima sesión de Claude Code (no hace falta reiniciar nada más, pero sí abrir una sesión nueva o recargar si la actual ya está en marcha).
