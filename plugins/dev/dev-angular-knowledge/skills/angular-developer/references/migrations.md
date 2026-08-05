# Migraciones automáticas y modernización de código

Cuando se te encargue refactorizar o modernizar una base de código existente, prefiere siempre usar los schematics automatizados oficiales disponibles en `@angular/core` en lugar de la sustitución manual de texto.

## Descubrir migraciones

Para ver todos los schematics disponibles para la versión instalada del framework core, ejecuta:
`ng generate @angular/core: --help`

## Schematics de migración habituales

Usa los siguientes comandos para aplicar actualizaciones de sintaxis concretas. Puedes acotar estos comandos a un proyecto o directorio específico usando los flags `--project <name>` o `--path <dir>`.

| Funcionalidad a modernizar  | Comando a ejecutar                                          |
| :-------------------------- | :---------------------------------------------------------- |
| **Flujo de control integrado (Built-in Control Flow)** | `ng generate @angular/core:control-flow`                    |
| **Inputs basados en signals**   | `ng generate @angular/core:signal-input-migration`          |
| **Signal queries**        | `ng generate @angular/core:signal-queries-migration`        |
| **Outputs funcionales**    | `ng generate @angular/core:output-migration`                |
| **Función `inject()`**   | `ng generate @angular/core:inject`                          |
| **Etiquetas autocierre**     | `ng generate @angular/core:self-closing-tag`                |
| **Standalone**            | `ng generate @angular/core:standalone` (ver flujo de trabajo más abajo) |

## Flujo de trabajo especializado: migración a Standalone

La migración a Standalone es una refactorización interactiva de varios pasos. **DEBES** realizarla en tres etapas discretas, verificando que la aplicación compila y funciona correctamente después de completar cada etapa:

1. **Fase 1**: ejecuta `ng generate @angular/core:standalone` y selecciona la opción **Convert all components, directives, and pipes to standalone** (convertir todos los componentes, directivas y pipes a standalone).
2. **Fase 2**: verifica la compilación con `ng build`. Ejecuta el comando de nuevo y selecciona **Remove unnecessary NgModule classes** (eliminar clases NgModule innecesarias).
3. **Fase 3**: verifica la compilación con `ng build`. Ejecuta la pasada final y selecciona **Bootstrap the project using standalone APIs** (arrancar el proyecto usando APIs standalone).
