---
name: exception-and-i18n-authoring
description: >
  Lanza o crea una excepción de negocio nueva, o registra/traduce un mensaje de error, siguiendo el catálogo
  centralizado y la regla de nunca interpolar IDs en el mensaje. Usar al necesitar lanzar una excepción de
  negocio nueva o registrar un mensaje de error.
---

# Exception & i18n Authoring (Java/Spring Boot)

## Input

Descripción de la condición de error (qué falla y con qué status HTTP debería responder).

## T→A

T: invoked →
1. Elegir el tipo de excepción existente por status HTTP (o crear uno nuevo SOLO si no hay ninguno que encaje — @rule:java-error-handling).
2. Añadir la constante de error al catálogo centralizado (`ErrorResource`) si no existe.
3. Lanzarla con el factory estándar (`XxxException.generic(...)`).
4. Añadir la clave de mensaje en TODOS los ficheros de idioma del proyecto en la MISMA pasada.
5. Aplicar la regla de "nunca IDs en el mensaje": si el único dato disponible es un id, usar la variante sin argumentos.

## Genera/modifica

La constante de error, el `throw`, y N líneas (una por idioma) en los ficheros de mensajes.

## Guardarraíles

!!dejar un idioma sin traducir | !!interpolar un UUID/PK en el mensaje.

## @refs

@rule:java-error-handling
@rule:java-naming-style (encoding legacy de los ficheros i18n)
