---
description: >
  UUID como PK, repositorio de tres interfaces, Specification para todo filtrado dinámico, migraciones Flyway
  append-only, y guardarraíles N+1/lazy-loading. Usar al crear o modificar entidades, repositorios, o
  cualquier query dinámica.
---

# Java Persistence (JPA / Hibernate)

## i:

Todas las entidades usan `UUID` como PK | filtrado dinámico SIEMPRE con `Specification`, nunca query nativa ni JPQL concatenado a mano | migraciones append-only | deduplicación SIEMPRE con `DISTINCT` en JPQL a nivel de repositorio.

## T→A

T: crear un repositorio → A: extender `JpaRepository<Entity, UUID>` + `JpaSpecificationExecutor<Entity>` + `JpaSpecificationExecutorDto<Entity>` (interfaz propia del proyecto, ejecutor de queries con proyección a DTO)
T: implementar filtrado dinámico → A: `Specification` | !!query nativa | !!JPQL concatenado a mano
T: deduplicar resultados → A: `DISTINCT` en JPQL a nivel de repositorio | !!deduplicar en el service | !!`ROW_NUMBER()` nativo
T: crear/editar una migración → A: fichero nuevo (Flyway) | !!editar un fichero de migración ya versionado
T: decidir si un cambio va en la entidad Java o en una migración → A: por defecto, si la petición menciona "entidad"/"campo", editar la entidad Java
T: acceder a una colección `@OneToMany` → A: solo dentro de un contexto `@Transactional` | !!fuera de transacción (LazyInitializationException)
T: escribir vs leer en un service → A: `@Transactional` en escrituras, `@Transactional(readOnly = true)` en lecturas | !!`@Transactional` sobre un método `private` (el proxy no se aplica) | !!auto-invocación (`this.metodo()`) de un método `@Transactional` del mismo bean — usar self-injection `@Lazy` o un bean aparte
T: iterar una colección → A: batch query o `JOIN FETCH`/`IN` | !!llamar al repositorio dentro del bucle (N+1)
T: actualizar una colección `@OneToMany` desde un DTO de update → A: los elementos ausentes del DTO NUNCA se borran físicamente por defecto — baja lógica (`deletionDate = now`) si la entidad hija tiene ese campo; si no lo tiene, preservarlos sin tocar (o usar `orphanRemoval` si esa es la semántica ya existente) — decidir por entidad, nunca asumir

## @refs

@rule:java-package-architecture (gotcha de SNAPSHOT hermano)
@rule:code-quality-guardrails
@skill:filter-and-search-scaffolding
