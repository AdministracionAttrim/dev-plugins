---
name: module-audit-and-review
description: >
  Dos flujos de calidad de módulo backend Java/Spring Boot: (a) auditoría completa de un módulo dado un
  identificador de HU/feature, con matriz de cobertura de test y detección de código muerto; (b) revisión de
  un diff/rama, que reporta y espera confirmación antes de aplicar ninguna corrección. Usar antes de fusionar
  cambios o para verificar que una feature está correctamente implementada.
---

# Module Audit & Review (Java/Spring Boot)

## a) Auditoría de módulo completo

**Input**: identificador de historia de usuario o de feature.

T: invoked (con identificador) →
1. Localizar la especificación correspondiente.
2. Localizar el código real de cada capa relacionada (controller, service, repositorio, `Specification`, mapper, tests, datos de test).
3. Cruzar cada criterio de la especificación con evidencia de código.
4. Comparar contra los patrones canónicos del proyecto (capas, transacciones, repositorios, mappers, excepciones, tests — @rule:java-package-architecture, @rule:java-persistence, @rule:java-error-handling).
5. Detectar código muerto: métodos declarados nunca invocados (@rule:code-quality-guardrails G:012).
6. Construir una matriz de cobertura de test por cada método/endpoint REALMENTE existente — nunca asumir un CRUD fijo de 6 operaciones si el módulo tiene menos o más.
7. Puntuar y escribir un informe persistente.

**Genera**: un informe de auditoría con score que SIEMPRE sustituye al informe anterior de ese mismo módulo (nunca se acumulan versiones) y sincroniza un fichero global de "bugs abiertos".

**Guardarraíl**: si no hay especificación para el identificador dado, avisar y continuar SOLO con inspección de código, dejándolo explícito en el informe — nunca rellenar el hueco inventando criterios.

## b) Revisión de un diff/rama

**Input**: ninguno (rama actual vs base) o una rama concreta.

T: invoked (sin identificador, o pidiendo revisión de rama) →
1. `git diff` contra la rama base.
2. Agrupar hallazgos por categoría fija: violaciones de capas, transacciones, riesgos JPA (N+1, lazy-loading), seguridad, colocación de paquete (@rule:java-package-architecture), i18n, reglas de análisis estático (@rule:legacy-static-analysis-catalog), cobertura de test.
3. **Reportar y esperar confirmación explícita** antes de tocar nada.
4. Aplicar las correcciones SOLO de las categorías confirmadas por el usuario.
5. Recompilar.
6. Actualizar el informe/tracker persistente de bugs.

## Guardarraíles (los más importantes de todo el skill)

- !!aplicar una corrección durante la fase de análisis — reportar primero, esperar confirmación, corregir después.
- !!revisar solo los ficheros cambiados sin comprobar sus consumidores — una firma de método que cambia rompe silenciosamente a quien la llama.
- !!saltarse la actualización del tracker de bugs tras aplicar fixes.

## @refs

@rule:code-quality-guardrails
@rule:legacy-static-analysis-catalog
@rule:java-package-architecture
