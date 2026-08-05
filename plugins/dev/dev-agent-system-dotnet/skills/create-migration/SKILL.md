---
name: create-migration
description: >
  Genera una migración EF Core con guardarraíl obligatorio de detección de cambios destructivos. Invocar
  con: /create-migration Name (o /migrate Name). Usar siempre que una entidad haya cambiado, antes de
  generar la migración a mano.
---

# Create Migration (.NET)

FP: `/create-migration` | `/migrate`

## Placeholders (sustituir por proyecto)

`<INFRA_PROJ>` / `<API_PROJ>` — nombres de proyecto para los flags `--project`/`--startup-project`.

## T→A

T: invoked →
1. Verificar cambios reales en `Entities/` e `Infrastructure/` (`git diff`).
2. Listar migraciones existentes.
3. **Detectar cambios destructivos**: NOT NULL sin default, columna/tabla eliminada, cambio de tipo, FK sobre datos existentes.
4. Si es destructivo → **PARAR y pedir confirmación explícita** antes de continuar. !!generar la migración sin este paso.
5. Generar: `dotnet ef migrations add {PascalCaseName} --project src/<INFRA_PROJ> --startup-project src/<API_PROJ>`.
6. Revisar `Up()`/`Down()` del fichero generado y resumirlos al usuario.

Nombre de la migración: PascalCase, descriptivo, en inglés (@rule:dotnet-naming-style).

## Guardarraíl crítico

Recordar SIEMPRE que las migraciones se aplican solas al arrancar (`MigrateAsync`, ver @rule:dotnet-persistence) — una destructiva se ejecuta en cuanto CUALQUIER entorno levanta el código nuevo. No hay paso manual de `database update` que actúe de red de seguridad.

## @refs

@rule:dotnet-persistence
@skill:feature-scaffolding (invoca este skill tras generar un módulo nuevo)
