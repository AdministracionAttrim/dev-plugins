---
description: >
  Tabla tipo→status HTTP→prefijo de clave i18n, regla de "nunca IDs en el mensaje", y checklist de traducir en
  todos los idiomas. Cargar SOLO al lanzar/crear un tipo de excepción o una clave de error.
---

# Exceptions & i18n (on-demand)

Trigger: lanzar/crear un tipo de excepción o una clave de error.

## T→A

T: elegir el tipo de excepción → A: por el status HTTP que debe producir (`NotFoundException`→404, `BadRequestException`→400, `ConflictException`→409, `ForbiddenException`→403, `UnauthorizedException`→401) | crear uno nuevo SOLO si ninguno encaja
T: registrar una clave de error nueva → A: constante en el catálogo `ErrorResource` (@rule:java-error-handling) + clave `error.<exception-key>.<ENUM_VALUE>` en TODOS los ficheros de idioma disponibles, en la MISMA pasada | !!dejar un idioma sin traducir
T: el único dato disponible es un ID/PK → A: variante sin argumentos, mensaje sin placeholders | !!interpolar el ID en el mensaje

## @refs

@rule:java-error-handling
@rule:java-naming-style (encoding legacy de los ficheros i18n)
@skill:exception-and-i18n-authoring
