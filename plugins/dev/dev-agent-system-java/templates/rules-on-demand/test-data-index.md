---
description: >
  Estrategia de fixtures de test repartidas en ficheros SQL temáticos por dominio, con índice y orden de carga
  validado contra foreign keys. Cargar SOLO al escribir o modificar tests que necesiten datos de BD.
---

# Test Data Index (on-demand)

Trigger: escribir o modificar tests que necesiten fixtures en BD.

## i:

Los datos de fixtures viven repartidos en varios ficheros SQL temáticos por dominio (nunca un monolito), cargados en orden explícito por configuración de test | existe un índice dominio→fichero | el orden de carga está validado contra las foreign keys REALES de las migraciones, nunca contra un orden "lógico" documental.

## T→A

T: necesitar datos de test de un dominio → A: consultar el índice dominio→fichero del proyecto (mantenlo actualizado en `docs/` o donde viva la config de test) → leer solo el fichero temático correspondiente | !!leer todos los ficheros de fixtures para localizar uno
T: insertar un registro de prueba nuevo → A: añadirlo ÚNICAMENTE en su fichero temático correspondiente por dominio | !!crear un monolito nuevo o mezclar dominios en un fichero
T: reordenar o dividir ficheros de fixtures → A: respetar el orden de dependencias por foreign key extrayendo las FKs reales de los scripts de migración | !!usar un orden documental/intuitivo como criterio

## @refs

@rule:java-persistence
@skill:spec-gated-test-authoring
