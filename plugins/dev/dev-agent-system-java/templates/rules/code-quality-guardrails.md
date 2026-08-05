---
description: >
  Checklist de reglas de análisis estático (tipo SonarQube) a verificar AL GENERAR código, no solo al
  revisar, más guardarraíles de código muerto y de build limpio. Cargar siempre (always-on).
---

# Java Code Quality Guardrails

## i:

Verificar este checklist AL GENERAR código, no solo en revisión — el catálogo extendido con ejemplos BAD/GOOD vive en la regla on-demand `legacy-static-analysis-catalog` (cargar solo al revisar/auditar, no al generar, para no gastar contexto).

## G:[IDs]

G:001 todo `@Test` con ≥1 `assert*`/`verify*`; para voids que no deben lanzar → `assertDoesNotThrow(() -> ...)`
G:002 clases base de test → `abstract`; `@TestConfiguration` con PREFIJO `Test` (`TestCacheConfig`), nunca sufijo
G:003 !!constantes con nombre de método de `Object` (`EQUALS`, `TO_STRING`...) — usar prefijo `OPERATOR_`/`FIELD_`
G:004 string literal repetido 3+ veces en un fichero → extraer a `private static final String`
G:005 todo `switch` con `default` (`default -> { }` arrow-style; `default: break;` colon-style)
G:006 complejidad cognitiva ≤ 15 — extraer métodos privados descriptivos antes de finalizar
G:007 !!auto-invocación (`this.metodo()`) de un método `@Transactional` del mismo bean — self-injection `@Lazy` o bean aparte (ver @rule:java-persistence)
G:008 evitar `<?>` en tipos de retorno salvo tipo genuinamente dinámico (justificar con comentario)
G:009 en clases `Serializable`, campos de tipo no serializable → `transient`
G:010 `assertEquals`/`assertNotEquals` con ambos argumentos del mismo tipo (`BigDecimal.ZERO`, `enum.name()`)
G:011 `@RequestParam(required = false)` con tipo boxed (`Boolean`) → desboxear con `Boolean.TRUE.equals(...)` antes de comparar
G:012 !!código muerto — todo método de repositorio/specification/service declarado debe ser alcanzable desde un controller o ejercitado por un test; se audita explícitamente en `@skill:module-audit-and-review`
G:013 objetivo de todo fichero generado: compila limpio con el build de verificación completo del proyecto, sin warnings nuevos

## @refs

@rule:legacy-static-analysis-catalog (catálogo extendido, solo para revisión/auditoría)
@skill:module-audit-and-review
