---
name: spec-gated-test-authoring
description: >
  Escribe o revisa tests Java/Spring Boot usando la especificación funcional (no el código) como única fuente
  de verdad. Si no existe especificación, para y pide el identificador de la historia en vez de inventar
  criterios. Usar al escribir tests nuevos para una entidad/operación, o al revisar/corregir tests existentes.
---

# Spec-Gated Test Authoring (Java/Spring Boot)

i: el código NUNCA es la fuente de verdad para escribir o corregir un test — la especificación funcional lo es. Este es el eje distintivo del skill.

## Input

Entidad y operación bajo test.

## T→A

T: invoked →
1. Localizar la especificación funcional que define EXACTAMENTE esa operación — no "toda mención" de la entidad, la historia de usuario concreta que describe esa operación.
2. **Si no existe ninguna especificación funcional** (solo hay documentación técnica del código o de la API) → **PARAR** y pedir al usuario el identificador de la historia o que la sincronice. !!usar la documentación de "qué hay" como sustituto de "qué se exige".
3. Comprobar que la especificación no está obsoleta (sello de última sincronización); si lleva demasiado sin refrescarse, avisar y preguntar si se continúa o se resincroniza antes.
4. Si el test ya existe, contrastarlo en tres frentes y **reportar discrepancias en vez de corregir en silencio**:
   - (a) contra la especificación — ¿cada criterio relevante tiene un test?
   - (b) contra el código real — ¿lo que asierta el test es lo que hace la implementación de verdad?
   - (c) contra cambios posteriores (bugs/CRs aún abiertos) que puedan haber derogado una regla que el test todavía asume vigente.
5. Exigir que el happy-path de create/update use un payload RICO (todos los opcionales informados, todas las colecciones hijas con varios elementos), no solo el mínimo obligatorio — de lo contrario gran parte de la lógica de mapeo/validación queda sin ejercitar.
6. Para cualquier colección hija en un `update`, exigir en el mismo test (o en tests dedicados) los tres efectos: alta de un elemento nuevo, modificación de uno existente, y borrado (lógico o físico, el que corresponda a esa entidad — @rule:java-persistence) del que se omite en la petición.

## Genera/modifica

Los tests; NUNCA código de producción.

## Verificación obligatoria

Cada test debe terminar con al menos una aserción que compruebe exactamente lo que su nombre promete — nada de aserciones triviales que siempre pasan.

## Guardarraíles

!!ejecutar la suite de tests para "descubrir" el fallo — diagnosticar leyendo el código. Si el usuario pide explícitamente ejecutar tests y algo falla al primer intento: parar y devolver el control con el nombre del test y la primera línea del error, sin reintentar con comandos alternativos.

## @refs

@rule:test-data-index
@rule:java-persistence
