---
description: >
  Estructura de proyectos y capas del backend .NET (capas + módulo de negocio), contrato de DTOs vs entidades,
  y el patrón de controllers finos sin MediatR. Usar como referencia al crear o modificar cualquier módulo,
  servicio, controller o DTO.
---

# .NET Core Architecture

## Placeholders de este fichero (sustituir por proyecto, ver README del plugin)

`<ROOT_NS>` raíz de namespace · `<API_PROJ>` proyecto host · `<CORE_PROJ>` / `<INFRA_PROJ>` proyectos Core/Infrastructure.

## i:

Un proyecto por responsabilidad + un proyecto por módulo de negocio (no vertical-slice puro, no capas planas) | interfaz de servicio en el mismo fichero que su implementación | controllers finos, sin MediatR/CQRS | mapeo DTO↔entidad a mano, sin AutoMapper.

## Estructura de proyectos

| Capa | Ruta | Namespace | Qué vive aquí |
|---|---|---|---|
| Host / API | `src/<API_PROJ>/` | `<ROOT_NS>.Api` | Controllers, middleware, `Program.cs` (wiring DI), auth, `Utils` |
| Core | `src/<CORE_PROJ>/` | `<ROOT_NS>.Core` | Entities, interfaces, DTOs, modelos request/response de providers, mappers |
| Infrastructure | `src/<INFRA_PROJ>/` | `<ROOT_NS>.Infrastructure` | `DbContext`, `Repository<T>` genérico, migraciones EF, servicios de infra |
| Módulo de negocio | `src/<ROOT_NS>.Modules.{Name}s/` | `<ROOT_NS>.Modules.{Name}s.Services` / `.Mocks` | `{Name}Service` (+ interfaz en el mismo fichero), `{Name}sMock` |
| Provider externo | `src/<ROOT_NS>.Providers.{System}/` | — | Cliente HTTP hacia un sistema externo (uno por sistema) |
| Tests | `tests/` | `<ROOT_NS>.Tests` | xUnit + Moq, un fichero por clase probada |

## T→A

T: crear servicio nuevo → A: `public interface I{Name}Service { … }` justo encima de `public class {Name}Service : I{Name}Service` en el MISMO fichero | !!interfaz en fichero aparte
T: crear módulo nuevo → A: carpeta bajo `src/` | !!módulo en la raíz del repo (violación de layout)
T: nombrar carpeta/csproj/namespace de un módulo → A: los tres DEBEN coincidir exactamente | !!deriva (carpeta `Modules.Clients` con namespace `Modules.Customers` es un bug, no un patrón — mantener los tres sincronizados)
T: exponer un recurso → A: controller inyecta la interfaz del servicio y llama al método | !!lógica de negocio, bucles, orquestación o mapeos en el controller
T: usar MediatR/CQRS → A: no es el patrón de este stack; servicios inyectados por DI directamente

## DTOs vs entidades

- Entidades en `Core/Entities/`, heredan de `BaseEntity` (auditoría: `Id: Guid`, `CreationUser`, `CreationDate`, `LastModificationUser?`, `LastModificationDate?`).
- DTOs en `Core/Model/Modules/Dtos/{Name}Dtos.cs` — **un fichero por recurso con los tres records dentro**: `{Name}ResponseDto` (record posicional), `Create{Name}RequestDto` (todo `required`), `Update{Name}RequestDto` (todo opcional, update parcial).
- Mapeo a mano: `private static {Name}ResponseDto MapToDto({Name} e) => new(...)` dentro del propio servicio. Mappers hacia providers externos son clases estáticas separadas (`{Entity}{Provider}Mapper.To{Provider}(dto)`).

```csharp
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string CreationUser { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public string? LastModificationUser { get; set; }
    public DateTime? LastModificationDate { get; set; }
}

public record CustomerResponseDto(Guid Id, string SAPCustomerId, string Name, /* … */ bool IsActive);

public record CreateCustomerRequestDto()
{
    public required string SAPCustomerId { get; set; }
    public required string Name { get; set; }
}

public record UpdateCustomerRequestDto()
{
    public string? Name { get; set; }   // todo opcional → update parcial
    public bool? IsActive { get; set; }
}
```

## @refs

@rule:dotnet-persistence (Repository<T>, EF Core, migraciones)
@rule:dotnet-error-handling
@rule:code-quality-guardrails
