---
description: >
  Convenciones de nombres, idioma del código, y cabecera de copyright del backend .NET. Usar al crear
  cualquier fichero .cs nuevo o al nombrar entidades/servicios/controllers.
---

# .NET Naming & Style

## Placeholders de este fichero (sustituir por proyecto, ver README del plugin)

`<COPYRIGHT_HOLDER>` titular del copyright del proyecto.

## T→A

T: nombrar una entidad → A: PascalCase SINGULAR (`Customer`) | `DbSet` en plural (`Customers`)
T: nombrar un servicio/interfaz → A: `{Name}Service` / `I{Name}Service` | mocks: `{Name}sMock` / `I{Name}sMock`
T: nombrar un controller → A: `{Name}sController`, en carpetas `Controllers/Internal/` y `Controllers/Public/` si el proyecto tiene esa separación (ver @rule:dual-port-auth)
T: nombrar un método async que hace I/O → A: sufijo `Async` | !!sufijo `Async` en un método que devuelve `IQueryable<T>` de forma síncrona (deriva real detectada — no lo imites)
T: crear un fichero `.cs` nuevo → A: cabecera `// Copyright (C) <año> <COPYRIGHT_HOLDER>` como primera línea | exigible en TODO fichero nuevo aunque el proyecto tenga ficheros heredados sin ella
T: escribir código, comentarios, XML docs, mensajes de excepción/log, nombres de migración o claves i18n → A: SIEMPRE en inglés, aunque la tarea se describa en español (traducir nombres antes de generar) | !!comentarios o mensajes de excepción en español

## @refs

@rule:code-quality-guardrails (sufijo Async engañoso, guardarraíl #6)
