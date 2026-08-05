---
description: Audita la configuración de Claude Code (proyecto/máquina/ambos) y da un informe con nota 1-10 y sugerencias de plugins del marketplace. Solo lee, no modifica nada.
argument-hint: "[opcional: proyecto | local | ambos — si se omite, se pregunta]"
allowed-tools: AskUserQuestion, Task
---

1. Si `$ARGUMENTS` ya especifica el alcance (`proyecto`, `local`/`máquina`, o `ambos`), úsalo directamente. Si no, pregunta con `AskUserQuestion`:

   **¿Qué configuración de Claude Code quieres analizar?**
   - Este proyecto (carpeta actual)
   - Mi Claude local (máquina)
   - Ambos

2. Invoca al agente `claude-config-auditor` de este plugin, pasándole el alcance elegido y el directorio de trabajo actual.

3. Muestra el informe que devuelva el agente tal cual — no lo resumas ni le añadas comentario adicional. El agente ya deja claro que esto es un análisis de solo lectura: nada se ha modificado.
