---
description: Revisa el diff actual (o los archivos indicados) con el agente java-reviewer, aplicando las checklists de code review, SOLID, clean code, seguridad, concurrencia y rendimiento del plugin dev-java-knowledge.
argument-hint: [archivo o alcance opcional; por defecto revisa el diff frente a la rama base]
allowed-tools: Task, Read, Glob, Grep, Bash
---

Invoca al agente `java-reviewer` de este plugin para revisar: $ARGUMENTS

Si no se ha indicado alcance, que el agente use `git diff` frente a la rama base para acotar la revision al cambio actual, no al repositorio entero. El resultado debe ser el informe de revision en el formato que define `java-reviewer` (Critico/Alto/Medio/Bajo/Buenas practicas) -- no edites codigo tu mismo a partir de este comando.
