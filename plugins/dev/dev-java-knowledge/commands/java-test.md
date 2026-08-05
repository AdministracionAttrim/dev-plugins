---
description: Genera o mejora tests JUnit 5 + AssertJ + Mockito/Testcontainers para la clase indicada, usando el agente java-test-writer del plugin dev-java-knowledge.
argument-hint: <ruta de la clase o funcionalidad a testear>
allowed-tools: Task, Read, Write, Edit, Glob, Grep, Bash
---

Invoca al agente `java-test-writer` de este plugin para escribir o mejorar los tests de: $ARGUMENTS

El agente debe decidir el tipo de test correcto (unitario/slice/integracion), escribirlo siguiendo AAA y AssertJ, ejecutarlo, y solo dar el trabajo por terminado si los tests pasan.
