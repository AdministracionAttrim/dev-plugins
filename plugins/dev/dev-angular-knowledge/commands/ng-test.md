---
description: Genera o mejora tests unitarios/integracion para el componente, servicio o ruta indicada, usando el agente angular-test-writer del plugin.
argument-hint: <ruta del componente/servicio o funcionalidad a testear>
allowed-tools: Task, Read, Write, Edit, Glob, Grep, Bash
---

Invoca al agente `angular-test-writer` de este plugin para escribir o mejorar los tests de: $ARGUMENTS

El agente debe seguir la convencion de testing ya usada en el proyecto (Vitest o Jasmine, mocks, harnesses), evitar los antipatrones ya registrados en `self-learning-error-prevention`, ejecutar los tests y solo darlos por terminados si pasan.
