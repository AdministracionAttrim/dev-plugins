---
name: feature-scaffolding
description: >
  Genera el CRUD completo de un módulo .NET nuevo (entity + DTOs + service + mock + controller(s) + registros
  DI) siguiendo la convención de capas+módulo del proyecto. Invocar con: /new-module Name "campo:tipo ..."
  [--public] [--sync-a] [--sync-b]. Usar cuando se pida crear un módulo/entidad/recurso backend nuevo.
---

# Feature Scaffolding (.NET)

FP: `/new-module` | "crea el módulo X" | "nueva entidad X con estos campos"

i: leer el módulo análogo más cercano como referencia en cada capa antes de generar | !!inventar convenciones no vistas en el proyecto

## Input

Nombre de entidad (PascalCase singular) + lista de campos `nombre:tipo` + flags: `--public` (¿controller público además del interno?), `--sync-a`/`--sync-b` (¿sincroniza con qué providers? ver @rule:provider-sync).

## T→A

T: invoked →
1. Entity en `Core/Entities/{Name}.cs` heredando `BaseEntity` (@rule:dotnet-core-architecture).
2. DTOs en `Core/Model/Modules/Dtos/{Name}Dtos.cs` (Response posicional, Create con `required`, Update todo opcional).
3. `interface I{Name}Service` + `class {Name}Service` EN EL MISMO FICHERO, en `Modules.{Name}s/Services/`. Inyecta `IConfiguration`, `IRepository<{Name}>`, `I{Name}sMock` y providers si hay `--sync-*`. Mock guard como PRIMERA línea (@rule:mock-mode). `MapToDto` privado estático.
4. `{Name}sMock` con 2-3 items hardcodeados plausibles.
5. Controller Internal (`GetAll(filter)`, `GetById`, `Create`, `Update`) con stack de atributos de auth/CORS + XML docs + `[ProducesResponseType]` de todos los status.
6. Controller Public (si `--public`) con paridad de Create/Update respecto al Internal (@rule:dual-port-auth).
7. Registros de DI en `Program.cs`: `IRepository<{Name}>`, `I{Name}Service`, `I{Name}sMock` (+ `IExternalService<T>` por cada nuevo tipo de respuesta de provider). !!duplicar un registro ya existente (@rule:code-quality-guardrails G:004).
8. `DbSet<{Name}>` en el `DbContext`.

## Genera/modifica

Los ficheros anteriores + tests base. **Pasos manuales que SIEMPRE se reportan al usuario, nunca en silencio**: crear el `.csproj` del módulo (copiando uno existente) y añadirlo al `.sln` — esto no se automatiza.

## Verificación obligatoria

`dotnet build` sin errores → luego @skill:create-migration → luego @skill:pre-commit-validate.

## Guardarraíles

!!duplicar registros de DI | !!scaffoldear un servicio nuevo si el repositorio genérico ya cubre el caso (@rule:code-quality-guardrails G:009) | !!aplicar la migración generada sin confirmación si es destructiva (@skill:create-migration).

## @refs

@rule:dotnet-core-architecture
@rule:mock-mode
@rule:provider-sync
@rule:dual-port-auth
@skill:create-migration
@skill:pre-commit-validate
