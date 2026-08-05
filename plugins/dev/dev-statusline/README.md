# dev-statusline

Plugin de Claude Code que añade una statusline personalizada con el modelo activo, el proyecto, la rama git y el consumo de contexto y de rate-limits.

## Qué incluye

- **Comando `/instalar-statusline`** — activa la statusline editando el `settings.json` de Claude Code (global o de proyecto). Es un paso manual porque, según explica el propio comando, un plugin no puede fijar el `statusLine` principal solo con instalarse: Claude Code únicamente aplica en automático las claves `agent` y `subagentStatusLine` desde el `settings.json` de un plugin, así que hace falta este comando para escribir la clave `statusLine` de forma explícita.
- **Script `scripts/statusline-command.js`** — un script Node (sin dependencias externas) que Claude Code invoca en cada actualización de la statusline. Lee por `stdin` el JSON de estado que le pasa Claude Code y construye una línea con colores ANSI que muestra:
  - **Modelo**: nombre del modelo con un estilo/emoji distinto según sea Opus Plan/Max/Ultra (🧠✨, dorado), Opus (🟣), Sonnet (🤖) o Haiku (⚡); cualquier otro modelo se muestra en gris plano.
  - **Proyecto**: nombre de la carpeta de trabajo actual (📁).
  - **Rama git**: rama actual (🌿), obtenida con `git rev-parse --abbrev-ref HEAD`; si el directorio no es un repo git, este bloque simplemente no aparece.
  - **Uso de contexto**: barra de 8 bloques (🧠) con el porcentaje de la ventana de contexto usada.
  - **Rate-limit de 5 horas**: barra de 6 bloques (⏳) con el porcentaje consumido de la ventana de 5h.
  - **Rate-limit de 7 días**: barra de 6 bloques (📅) con el porcentaje consumido de la ventana de 7d.

  Las tres barras cambian de color según el porcentaje: verde por debajo de 60%, amarillo entre 60% y 80%, rojo a partir de 80%.

  Ejemplo de cómo se vería la línea resultante (colores omitidos, solo estructura):

  ```
  🤖 Sonnet 5 ❙ 📁 attrim-marketplace ❙ 🌿 main ★ ❙ 🧠 ██████░░ 62% ❙ ⏳ 5h ████░░ 58% ❙ 📅 7d ███░░░ 40%
  ```

## Cómo instalarlo

1. Instala el plugin `dev-statusline` desde el marketplace `attrim-marketplace` (con el flujo habitual de instalación de plugins de Claude Code para este marketplace).
2. Una vez instalado, ejecuta el comando `/instalar-statusline` dentro de Claude Code. Este comando es el que realmente activa la statusline — instalar el plugin por sí solo no la pone en marcha.

## Cómo usarlo

1. Instala el plugin desde `attrim-marketplace`.
2. Ejecuta `/instalar-statusline`.
3. El comando te preguntará si quieres activarla **globalmente** (`~/.claude/settings.json`, afecta a todos tus proyectos) o **solo para el proyecto actual** (`.claude/settings.json` en la raíz del repo). Si no lo tienes claro, la recomendación por defecto es global.
4. Si el `settings.json` elegido no existe, el comando lo crea con `{}` como base. Si ya existía, preserva el resto del contenido y solo añade o actualiza la clave `statusLine`.
5. Si ya había una statusline configurada, el comando te avisa de cuál era antes de sobrescribirla y te pide confirmación.
6. El comando añade esta clave de nivel raíz al `settings.json`:

   ```json
   "statusLine": {
     "type": "command",
     "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/statusline-command.js\"",
     "padding": 2
   }
   ```

   `${CLAUDE_PLUGIN_ROOT}` se deja literal — Claude Code lo resuelve en tiempo de ejecución a la carpeta donde quedó instalado este plugin.
7. La statusline nueva queda activa en la siguiente sesión de Claude Code (no hace falta reiniciar nada más, pero sí abrir una sesión nueva o recargar la actual si ya estaba en marcha).

## Requisitos / configuración previa

- Necesitas **Node.js** disponible en el `PATH`, ya que la statusline se ejecuta como `node scripts/statusline-command.js`.
- Los bloques de rate-limit (5h y 7d) dependen de que Claude Code incluya `rate_limits.five_hour` / `rate_limits.seven_day` en el JSON que pasa al script; si no vienen, el script los trata como `0%` (no falla).
- El bloque de rama git requiere que el directorio de trabajo sea un repositorio git con `git` disponible en el `PATH`; si no lo es, ese bloque desaparece sin dar error.

## Notas

- El comando `/instalar-statusline` **modifica un archivo de configuración del usuario** (`settings.json`, global o de proyecto), no solo archivos del propio plugin. Lo hace de forma explícita, pidiendo confirmación antes de sobrescribir una statusline previa y preservando el resto de claves existentes.
- Es reversible: para desactivarla basta con borrar o cambiar manualmente la clave `statusLine` en el `settings.json` correspondiente, o volver a ejecutar `/instalar-statusline` para sustituirla por otra configuración.
- Al desinstalar el plugin, la clave `statusLine` en `settings.json` no se elimina automáticamente (el comando solo actúa cuando se invoca) — si desinstalas el plugin conviene quitar también esa clave a mano, o la statusline dejará de funcionar porque `${CLAUDE_PLUGIN_ROOT}/scripts/statusline-command.js` ya no existirá.
