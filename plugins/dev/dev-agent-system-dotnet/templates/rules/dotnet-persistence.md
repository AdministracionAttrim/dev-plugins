---
description: >
  EF Core, Repository<T> genérico, Fluent API, y el guardarraíl crítico de migraciones auto-aplicadas al
  arrancar. Usar al crear/modificar entidades, al tocar el DbContext, o al generar una migración.
---

# .NET Persistence (EF Core)

## i:

Un único `DbContext` | los servicios inyectan `IRepository<{Entity}>`, NUNCA el `DbContext` directamente | configuración por Fluent API en `OnModelCreating`, no por Data Annotations | **las migraciones se aplican solas al arrancar** — máxima precaución con cambios destructivos.

## Repository genérico

`Repository<T> : IRepository<T>` en Infrastructure. Métodos: `GetAllAsync`, `GetByIdAsync`, `GetFirstByFilterAsync`, `GetAllByFilterAsync`, `AddAsync`, `UpdateAsync`, `DeleteAsync`, `DeleteByFilterAsync`, `ExistsAsync`, `CountAsync`, `WhereAsync` (devuelve `IQueryable<T>`, ES SÍNCRONO — no lleva sufijo `Async`, ver @rule:dotnet-naming-style).

`SaveChangesAsync` se llama DENTRO de cada método del repositorio (`AddAsync`/`UpdateAsync` guardan de inmediato). No hay Unit of Work ni transacciones explícitas por defecto.

## T→A

T: crear un servicio → A: inyectar `IRepository<{Entity}>` | !!inyectar el `DbContext` directamente
T: operación que necesita atomicidad multi-entidad → A: introducir una transacción explícita (`_context.Database.BeginTransactionAsync`) | !!confiar en el guardado por-método del repositorio
T: configurar una entidad → A: Fluent API en `OnModelCreating`: `entity.ToTable("...")` explícito | `IsRequired()` + `HasMaxLength(n)` en cada string | índices únicos por clave de negocio `HasIndex(e => e.SapId).IsUnique()` | FKs por clave de negocio con `OnDelete(DeleteBehavior.Restrict)` (restrict, no cascade)
T: tipar el ID de un sistema externo → A: `string?` en la entidad (NUNCA garantizado como GUID) | !!`Guid.Parse` sobre un ID externo (crashea cuando el sistema externo no devuelve un GUID — bug real detectado, ver @skill:create-migration y errores semilla del plugin)
T: generar una migración → A: usar @skill:create-migration — detecta cambios destructivos (NOT NULL sin default, columna/tabla eliminada, cambio de tipo, FK sobre datos existentes) y PARA a pedir confirmación antes de generarla
T: filtrar una colección grande → A: `GetAllByFilterAsync` con el filtro completo | !!traer todo y filtrar en memoria (N+1 / carga excesiva)

## Guardarraíl crítico

No hay `dotnet ef database update` manual: las migraciones se aplican automáticamente vía `db.Database.MigrateAsync()` al arrancar cualquier entorno con el código nuevo. Una migración destructiva desplegada se ejecuta sola en cuanto el entorno levanta — confirmar SIEMPRE antes de generar una migración con cambios destructivos.

## Naming de tablas/columnas

Fijar UN estilo consistente para tablas/columnas nuevas (recomendado: PascalCase sin guiones bajos) y no replicar mezclas de estilo que puedan existir en proyectos heredados.

## @refs

@skill:create-migration
@rule:dotnet-naming-style (sufijo Async engañoso en WhereAsync)
