---
description: >
  Estructura de dos paquetes (librería compartida + proyecto local), mapeo con MapStruct, inyección de
  dependencias por constructor, y el gotcha de compilar contra un SNAPSHOT hermano editable. Usar como
  referencia al crear o modificar cualquier entidad, DTO, service o mapper.
---

# Java Package Architecture

## Placeholders de este fichero (sustituir por proyecto, ver README del plugin)

`<COMMONS_PACKAGE_ROOT>` raíz de paquete de la librería compartida · `<COMMONS_REPO_PATH>` ruta local del repo hermano editable · `<PROJECT_PACKAGE_ROOT>` raíz de paquete del proyecto local.

## i:

Dos paquetes, no una jerarquía única por capa: `<COMMONS_PACKAGE_ROOT>` (librería compartida, repo hermano editable) vs `<PROJECT_PACKAGE_ROOT>` (proyecto local) | mapeo SIEMPRE vía MapStruct, nunca manual | DI por constructor explícito, nunca `@RequiredArgsConstructor`/`@Autowired` en campo.

## Regla de oro de colocación

Si un tipo (entidad, DTO-core, excepción, enum) es reusable entre proyectos del mismo stack → librería compartida. Si es específico de este proyecto → paquete local. Nunca crear algo reusable en el paquete local "porque es más rápido".

## T→A

T: crear entidad JPA, DTO compartido, excepción, enum de dominio genérico → A: `<COMMONS_PACKAGE_ROOT>` (repo hermano `<COMMONS_REPO_PATH>` — nunca bloqueante modificarlo, es un repo propio del equipo)
T: crear controller, service/impl, repository, mapper, validator, specification, o DTO de request/response NO reusable → A: `<PROJECT_PACKAGE_ROOT>` (p. ej. `dto/custom/*` para los DTOs locales)
T: mapear entidad↔DTO → A: mapper MapStruct generado | !!`entity.setX(dto.getX())` manual, ni siquiera dentro de un service
T: inyectar una dependencia → A: constructor explícito, todas `private final` | !!`@RequiredArgsConstructor` de Lombok | !!`@Autowired` en campo o setter
T: tocar la librería compartida (`<COMMONS_PACKAGE_ROOT>`) → A: tras el cambio, reinstalarla localmente (`mvn install -DskipTests` en su repo) y compilar el proyecto consumidor en modo offline (`mvn -o`)

## Gotcha real — SNAPSHOT hermano

Un build online resuelve la dependencia SNAPSHOT contra el repositorio remoto en vez de respetar el `.jar` recién instalado localmente, y produce **cientos de falsos "cannot find symbol"**. Tras tocar la librería compartida: reinstalar localmente → compilar el proyecto consumidor con `-o` (offline). Si aparecen decenas de errores de símbolo no encontrado justo después de editar la librería compartida, esta es la primera hipótesis a comprobar, no un fallo real de código.

## @refs

@rule:java-persistence
@rule:java-error-handling
