---
name: add-endpoint
description: >
  Añade un endpoint nuevo a un controller existente, manteniendo la paridad Public/Internal cuando aplica.
  Invocar con: /add-endpoint Controller "descripción funcional". Usar cuando se pida añadir un endpoint,
  acción o método de API a un recurso ya existente.
---

# Add Endpoint (.NET)

FP: `/add-endpoint`

## Input

Nombre del controller + descripción funcional del endpoint.

## T→A

T: invoked →
1. Leer controllers Internal y Public del recurso (si existen ambos) + interfaz de servicio + DTOs.
2. Decidir verbo/ruta y si el endpoint va en Internal, Public, o ambos (@rule:dual-port-auth).
3. Añadir método a la interfaz de servicio (con `<summary>`/`<exception>` XML docs) e implementarlo — mock guard como PRIMERA línea (@rule:mock-mode).
4. Añadir el/los endpoints con atributos de auth+CORS correctos, XML docs, y `[ProducesResponseType]` de TODOS los status posibles (@rule:code-quality-guardrails G:007).
5. Añadir el método correspondiente al mock.
6. Añadir tests: happy path, mock-path, not-found.

## Verificación

`dotnet build` + los tests del recurso afectado.

## Guardarraíles

Si el endpoint va en Public, el Internal debe quedar con la misma firma de Create/Update (paridad, @rule:dual-port-auth) | !!dejar el fichero de tests sin cobertura del endpoint nuevo.

## @refs

@rule:dual-port-auth
@rule:mock-mode
@rule:code-quality-guardrails
