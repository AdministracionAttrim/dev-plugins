---
name: run-tests-here
description: >
  Ejecuta los tests xUnit de la clase actual (por argumento, fichero abierto, o último tocado en el diff).
  Invocar con: /test-here [Clase|ruta]. Usar cuando se pida correr los tests de lo que se acaba de tocar.
---

# Run Tests Here (.NET)

FP: `/test-here`

## T→A

T: invoked →
1. Resolver clase objetivo: argumento explícito → fichero actualmente abierto → último tocado en el diff, en ese orden.
2. Mapear a `{Clase}Tests`.
3. Si no existe → ofrecer invocar al agente `tester` del core para crearla, en vez de asumir que no hacen falta tests.
4. `dotnet test --filter "ClassName={Clase}Tests"`.
5. Reportar pasados/fallidos/skip con `fichero:línea` de cada fallo.
