# Servidor MCP del Angular CLI

El Angular CLI incluye un servidor Model Context Protocol (MCP) que permite a los asistentes de IA (como Cursor, Gemini CLI, JetBrains AI, etc.) interactuar directamente con el Angular CLI. Proporciona herramientas para el análisis de proyectos, migraciones guiadas y la ejecución de builds/tests.

## Herramientas disponibles (por defecto)

Cuando el servidor MCP está habilitado, los agentes de IA tienen acceso a las siguientes herramientas:

| Nombre                       | Descripción                                                                                               |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `ai_tutor`                  | Lanza un tutor de Angular interactivo impulsado por IA.                                                         |
| `get_best_practices`        | Recupera la Guía de Buenas Prácticas de Angular (crucial para componentes standalone, formularios tipados, etc.).        |
| `list_projects`             | Lista todas las aplicaciones y librerías del workspace leyendo `angular.json`.                                  |
| `onpush_zoneless_migration` | Analiza el código y proporciona un plan para migrarlo a la detección de cambios `OnPush` (requisito previo para zoneless). |
| `search_documentation`      | Busca en la documentación oficial en `https://angular.dev`.                                                     |

## Herramientas experimentales

Algunas herramientas deben habilitarse explícitamente usando el flag `--experimental-tool` (o `-E`).

| Nombre                      | Descripción                                                            |
| :-------------------------- | :----------------------------------------------------------------------- |
| `build`                    | Realiza una compilación puntual usando `ng build`.                            |
| `devserver.start`          | Inicia de forma asíncrona un servidor de desarrollo (`ng serve`). Devuelve el control inmediatamente. |
| `devserver.stop`           | Detiene el servidor de desarrollo.                                                     |
| `devserver.wait_for_build` | Devuelve los logs de la compilación más reciente en un servidor de desarrollo en ejecución.    |
| `e2e`                      | Ejecuta pruebas end-to-end.                                                            |
| `test`                     | Ejecuta las pruebas unitarias del proyecto.                                                        |

## Configuración

Para usar el servidor MCP, configura tu entorno anfitrión (IDE o CLI) para ejecutar `npx @angular/cli mcp`.

### Antigravity IDE

Crea un archivo llamado `.antigravity/mcp.json` en la raíz de tu proyecto:

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

### Gemini CLI

Crea `.gemini/settings.json` en la raíz del proyecto:

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

### Cursor

Crea `.cursor/mcp.json` en la raíz del proyecto (o de forma global en `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

### VS Code

Crea `.vscode/mcp.json`:

```json
{
  "servers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

## Opciones de comando

Puedes pasar argumentos al servidor MCP en el array `args` de tu configuración:

- `--read-only`: registra únicamente herramientas que no modifican el proyecto.
- `--local-only`: registra únicamente herramientas que no requieren conexión a internet.
- `--experimental-tool` (`-E`): habilita herramientas experimentales concretas (p. ej., `-E build`, `-E devserver`).

Ejemplo de modo de solo lectura con herramientas experimentales habilitadas:

```json
"args": ["-y", "@angular/cli", "mcp", "--read-only", "-E", "build", "-E", "test"]
```
