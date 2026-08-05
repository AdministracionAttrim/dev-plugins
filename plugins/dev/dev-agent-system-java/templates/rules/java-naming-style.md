---
description: >
  Nombres cualificados prohibidos, orden de miembros, patrón String+operador de los DTOs de filtro, y el
  gotcha de encoding legacy en ficheros i18n. Usar al escribir cualquier clase Java nueva o al tocar ficheros
  de mensajes i18n.
---

# Java Naming & Style

## T→A

T: referenciar cualquier clase (excepción, DTO, entidad, enum) → A: import + nombre corto, SIEMPRE, incluso para un `throw` puntual | !!nombre totalmente cualificado en ningún fichero
T: nombrar un método derivado de repositorio → A: navegación camelCase pura | !!separador `_` (`findBy_x_And_y`)
T: ordenar miembros de una clase → A: constantes estáticas → campos de instancia → constructores → métodos públicos → métodos privados
T: definir un DTO de filtro (`*Filter`) → A: TODO campo es `String` con prefijo de operador (`"EQUALS,valor"`, `"CONTAINS,valor"`, `"STARTS_WITH,valor"`...), independientemente del tipo real de la columna — lo parsea un helper compartido | !!marcar esto como type-mismatch en revisión, es un patrón deliberado del proyecto
T: editar un fichero de mensajes i18n en encoding legacy (p. ej. ISO-8859-1) → A: cualquier carácter no-ASCII (acentos, ñ) como escape unicode explícito (`\uXXXX`) | !!escribir el carácter crudo — corrompe el fichero en silencio | verificar el resultado con una lectura a nivel de bytes tras editar, no solo visualmente

## @refs

@rule:java-error-handling (claves i18n de mensajes de error)
@rule:code-quality-guardrails
