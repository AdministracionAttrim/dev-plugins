---
name: env-check
description: >
  Verifica que el entorno local .NET está listo (SDK, dotnet-ef, restore, build, existencia de config). Nunca
  lee contenido de ficheros de configuración con secretos. Invocar con: /env-check. Usar en máquina nueva o
  tras cambios de sistema operativo.
---

# Env Check (.NET)

FP: `/env-check`

## T→A

T: invoked →
1. `dotnet --version` → exige la major version esperada del proyecto.
2. `dotnet ef --version` → si falta, sugerir `dotnet tool install --global dotnet-ef`.
3. `dotnet restore`.
4. `dotnet build`.
5. Comprobar que existe `appsettings.Development.json` — **SOLO comprobar existencia** (`test -f`), NUNCA leer su contenido.

## Guardarraíl duro

!!leer el contenido de `appsettings*.json` bajo ninguna circunstancia — contiene secretos (connection strings, claves). La única operación permitida sobre estos ficheros es comprobar que existen.
