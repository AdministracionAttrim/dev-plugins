# Pruebas de extremo a extremo (E2E)

> [!IMPORTANT]
> Usa las pautas de configuración de este archivo solo si no hay ya un framework de pruebas E2E configurado en el workspace, o si el usuario ha pedido explícitamente cambiar o configurar las pruebas E2E.

## Configurar y ejecutar pruebas E2E

Añade frameworks E2E compatibles al proyecto usando `ng add`:

- **Playwright:**
  ```shell
  ng add playwright-ng-schematics
  ```
- **Cypress:**
  ```shell
  ng add @cypress/schematic
  ```
- **Nightwatch:**
  ```shell
  ng add @nightwatch/schematics
  ```
- **WebdriverIO:**
  ```shell
  ng add @wdio/schematics
  ```
- **Puppeteer:**
  ```shell
  ng add @puppeteer/ng-schematics
  ```

Ejecuta las pruebas E2E:

```shell
ng e2e [project] [options]
```

## Herramientas de pruebas personalizadas y empresariales

Para ejecutores personalizados de nivel empresarial (p. ej., Katalon Studio, TestCafe, Selenium), define los comandos de ejecución en los scripts de `package.json`.
