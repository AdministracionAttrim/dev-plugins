---
description: Revisa el diff actual (o los archivos indicados) con el agente angular-revisor, aplicando las skills de componentes, signals, forms, DI, routing, calidad de codigo y el registro de errores conocidos del plugin.
argument-hint: [archivo o alcance opcional; por defecto revisa el diff frente a la rama base]
allowed-tools: Task, Read, Glob, Grep, Bash
---

Invoca al agente `angular-revisor` de este plugin para revisar: $ARGUMENTS

Si no se ha indicado alcance, que el agente use `git diff` frente a la rama base para acotar la revision al cambio actual. El resultado debe ser el informe de revision en el formato que define `angular-revisor` -- no edites codigo tu mismo a partir de este comando.
