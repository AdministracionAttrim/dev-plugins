---
description: Ejecuta una auditoria de seguridad completa (OWASP Top 10, secretos, autenticacion, deserializacion, dependencias) con el agente java-security-auditor. Pensado para correr antes de una release.
argument-hint: [alcance opcional; por defecto audita todo el proyecto]
allowed-tools: Task, Read, Glob, Grep, Bash
---

Invoca al agente `java-security-auditor` de este plugin para auditar: $ARGUMENTS

El resultado debe ser el informe de seguridad priorizado por severidad que define `java-security-auditor`. Este comando es de solo analisis -- no apliques las correcciones automaticamente, preguntale al usuario si quiere pasarlas a `java-reviewer`/sesion normal despues de ver el informe.
