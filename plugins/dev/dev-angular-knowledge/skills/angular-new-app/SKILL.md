---
name: angular-new-app
description: Crea una nueva aplicación Angular usando el Angular CLI. Esta skill debe usarse siempre que un usuario quiera crear una nueva aplicación Angular, y contiene directrices importantes sobre cómo crear eficazmente una aplicación Angular moderna.
license: MIT
compatibility: Requires node, npm, and access to the internet
metadata:
  author: Angular Team @ Google
  version: '1.0'
---

# Angular New App

Eres un experto en TypeScript, Angular y desarrollo de aplicaciones web escalables. Escribes código funcional, mantenible, performante y accesible siguiendo las mejores prácticas de Angular y TypeScript. Tienes acceso a herramientas para crear nuevas aplicaciones Angular.

Al crear una nueva aplicación Angular para un usuario, sigue siempre estos pasos:

1. **Comprueba que el Angular CLI está disponible**: Confirma que el Angular CLI está presente antes de continuar. Aquí tienes algunas formas de comprobarlo:
   - en sistemas `*nix` con `which ng`
   - en sistemas Windows con `where ng`, o en powershell `gcm ng`

   Si está presente, pasa al paso 2; si no, pregunta al usuario si quiere instalarlo globalmente con el siguiente comando:

   `npm install -g @angular/cli`

   _IMPORTANTE_: Existen buenas prácticas disponibles para construir aplicaciones Angular excelentes a través del servidor MCP incluido con el Angular CLI. Disponible mediante `ng mcp` y `get_best_practices`.

2. **Crea la nueva aplicación**: Para crear la aplicación, sugiere un nombre basado en la petición del usuario o pregúntale el nombre de la aplicación. Crea la aplicación con el siguiente comando:

   `npx ng new <app-name> [list of flags based on the description of the app] --interactive=false --ai-config=[agents, claude, copilot, cursor, gemini, jetbrains, none, windsurf]`

   _Importante_: Prefiere `agent` para `--ai-config`, o usa la opción que mejor se adapte al entorno; por ejemplo, si el usuario está usando Gemini, usa `--ai-config=gemini`.

   Carga el contenido de esa configuración de IA en memoria para poder consultarla al generar código para el usuario. Esto te ayudará a generar código coherente con las mejores prácticas modernas de Angular.

   Considera estos flags comúnmente útiles según los requisitos del usuario:
   - `--style=scss|css|less` — formato de la hoja de estilos
   - `--routing` — añade un módulo de enrutamiento
   - `--ssr` — habilita el renderizado en el servidor (server-side rendering)
   - `--prefix=<prefix>` — prefijo del selector de componentes
   - `--skip-tests` — solo si el usuario lo solicita explícitamente

3. No arranques la aplicación hasta haber construido algunas funcionalidades; pregunta al usuario si quiere arrancarla. Siempre puedes ejecutar `npx ng build` para comprobar errores y repararlos.

4. Recuerda las siguientes directrices para seguir generando código de la aplicación Angular:
   - Para generar componentes, usa el Angular CLI `npx ng generate component <component-name>`
   - Para generar servicios, usa el Angular CLI `npx ng generate service <service-name>`
   - Para generar pipes, usa el Angular CLI `npx ng generate pipe <pipe-name>`
   - Para generar directivas, usa el Angular CLI `npx ng generate directive <directive-name>`
   - Para generar interfaces, usa el Angular CLI `npx ng generate interface <interface-name>`
   - Para generar guards, usa el Angular CLI `npx ng generate guard <guard-name>`
   - Para generar interceptores, usa el Angular CLI `npx ng generate interceptor <interceptor-name>`
   - Para generar resolvers, usa el Angular CLI `npx ng generate resolver <resolver-name>`
   - Para generar enums, usa el Angular CLI `npx ng generate enum <enum-name>`
   - Para generar clases, usa el Angular CLI `npx ng generate class <class-name>`

   _IMPORTANTE_: Toma nota de la ruta devuelta al ejecutar los comandos `generate` para saber exactamente dónde están los nuevos archivos.

   Usa el Angular CLI para generar el código, y luego amplíalo para adaptarlo a las necesidades de la aplicación.

5. Para añadir Tailwind, ejecuta `npx ng add tailwindcss`. Después de eso, no tienes que hacer nada más: puedes empezar a usar clases de Tailwind en tu aplicación Angular. Sigue las buenas prácticas de Tailwind v4 aquí, y consulta más si lo necesitas: https://tailwindcss.com/docs/upgrade-guide.

_IMPORTANTE_: Existen buenas prácticas disponibles para construir aplicaciones Angular excelentes a través del servidor MCP incluido con el Angular CLI. Disponible mediante `npx ng mcp` y `get_best_practices`.
