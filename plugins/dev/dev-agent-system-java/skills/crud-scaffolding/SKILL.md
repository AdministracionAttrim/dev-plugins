---
name: crud-scaffolding
description: >
  Genera el CRUD completo de una entidad Java/Spring Boot (getById/create/update/delete/search/export) con
  todas las capas: service+impl, controller, repositorio, DTOs de filtro/proyección/completo, mapper y claves
  i18n. Usar cuando se pida el CRUD completo de una entidad o cualquiera de sus 6 operaciones estándar.
---

# CRUD Scaffolding (Java/Spring Boot)

## Input

Nombre de la entidad +, idealmente, una especificación/historia de usuario con las reglas de negocio.

## T→A

T: invoked →
1. Decidir qué ficheros hacen falta: interfaz de servicio, implementación, controller, repositorio, DTO de filtro, DTO de proyección de búsqueda, clase de `Specification`, DTO completo, mapper, claves i18n (@rule:java-package-architecture, @rule:java-persistence).
2. **create**: fijar `tenantId` y fechas de sistema desde el contexto de seguridad, NUNCA desde el DTO entrante (@rule:java-security) | usar una referencia ligera (no una carga completa) para relaciones por id.
3. **update**: cargar primero la entidad real (no confiar solo en el DTO) | nunca sobrescribir la fecha de creación ni el tenant | para cada colección hija, decidir de antemano si aplica baja lógica o borrado físico de los elementos omitidos, siguiendo lo ya establecido para esa entidad (@rule:java-persistence).
4. **delete**: baja lógica vs física según si la entidad tiene un campo de fecha de baja.
5. **search**/**export**: comparten la misma construcción de condiciones de filtro (@skill:filter-and-search-scaffolding) — export NUNCA duplica la query, reutiliza la `Specification` y el builder de proyección de search.

## Genera/modifica

Los ficheros del punto 1, más las claves de error nuevas en TODOS los ficheros de idioma del proyecto.

## Verificación obligatoria

Build limpio (`./mvnw clean compile` o el comando real del proyecto) + checklist de que cada endpoint lleva su permiso `ENTIDAD_ACCION` (@rule:java-security).

## Guardarraíles

!!confiar en el `tenantId` del DTO entrante | !!borrado físico si la entidad tiene campo de baja lógica sin que se pida explícitamente | !!crear en el paquete local un tipo (entidad/DTO core/excepción/enum) que sea reusable entre proyectos (@rule:java-package-architecture).

## @refs

@rule:java-package-architecture
@rule:java-persistence
@rule:java-security
@skill:filter-and-search-scaffolding
