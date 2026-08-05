---
name: angular-developer
description: Genera código Angular y ofrece orientación arquitectónica. Se activa al crear proyectos, componentes o servicios, o para buenas prácticas sobre reactividad (signals, linkedSignal, resource), formularios, inyección de dependencias, enrutamiento, SSR, accesibilidad (ARIA), animaciones, estilos (estilos de componentes, Tailwind CSS), testing o herramientas del CLI.
license: MIT
metadata:
  author: Copyright 2026 Google LLC
  version: '1.0'
---

# Directrices para desarrolladores de Angular

1. Analiza siempre la versión de Angular del proyecto antes de dar recomendaciones, ya que las buenas prácticas y las funcionalidades disponibles pueden variar significativamente entre versiones. Si creas un proyecto nuevo con el Angular CLI, no especifiques una versión a menos que el usuario lo pida.

2. Al generar código, sigue la guía de estilo de Angular y las buenas prácticas de mantenibilidad y rendimiento. Usa el Angular CLI para generar componentes, servicios, directivas, pipes y rutas, garantizando así la coherencia.

3. Una vez que termines de generar código, ejecuta `ng build` para asegurarte de que no hay errores de compilación. Si hay errores, analiza los mensajes de error y corrígelos antes de continuar. No te saltes este paso, ya que es fundamental para garantizar que el código generado es correcto y funcional.

## Creación de nuevos proyectos

Si el usuario no proporciona directrices, estas son algunas reglas por defecto a seguir al crear un nuevo proyecto Angular:

1. Usa la última versión estable de Angular a menos que el usuario indique lo contrario.
2. Usa Signal Forms para la gestión de formularios en proyectos nuevos (disponible en Angular v21 y versiones posteriores) [Más información](references/signal-forms.md).

**Reglas de ejecución para `ng new`:**
Cuando se te pida crear un nuevo proyecto Angular, debes determinar el comando de ejecución correcto siguiendo estos pasos estrictos:

**Paso 1: Comprueba si el usuario ha indicado una versión explícita.**

- **SI** el usuario solicita una versión específica (p. ej., Angular 15), evita las instalaciones locales y usa estrictamente `npx`.
- **Comando:** `npx @angular/cli@<requested_version> new <project-name>`

**Paso 2: Comprueba si existe una instalación de Angular.**

- **SI** no se solicita una versión específica, ejecuta `ng version` en la terminal para comprobar si el Angular CLI ya está instalado en el sistema.
- **SI** el comando se ejecuta correctamente y devuelve una versión instalada, usa directamente la instalación local/global.
- **Comando:** `ng new <project-name>`

**Paso 3: Recurre a la última versión.**

- **SI** no se solicita una versión específica Y el comando `ng version` falla (lo que indica que no existe ninguna instalación de Angular), debes usar `npx` para obtener la última versión.
- **Comando:** `npx @angular/cli@latest new <project-name>`

## Componentes

Al trabajar con componentes de Angular, consulta las siguientes referencias según la tarea:

- **Fundamentos**: Anatomía, metadatos, conceptos básicos y control de flujo en plantillas (@if, @for, @switch). Lee [components.md](references/components.md)
- **Inputs**: Inputs basados en signals, transformaciones e inputs de modelo. Lee [inputs.md](references/inputs.md)
- **Outputs**: Outputs basados en signals y buenas prácticas para eventos personalizados. Lee [outputs.md](references/outputs.md)
- **Elementos host**: Bindings de host e inyección de atributos. Lee [host-elements.md](references/host-elements.md)

Si necesitas documentación más detallada que no encuentres en las referencias anteriores, consulta la documentación en `https://angular.dev/guide/components`.

## Reactividad y gestión de datos

Al gestionar el estado y la reactividad de datos, usa Angular Signals y consulta las siguientes referencias:

- **Visión general de signals**: Conceptos básicos de signals (`signal`, `computed`), contextos reactivos y `untracked`. Lee [signals-overview.md](references/signals-overview.md)
- **Estado dependiente (`linkedSignal`)**: Creación de estado escribible vinculado a signals de origen. Lee [linked-signal.md](references/linked-signal.md)
- **Reactividad asíncrona (`resource`)**: Obtención de datos asíncronos directamente en estado de signal. Lee [resource.md](references/resource.md)
- **Efectos secundarios (`effect`)**: Logging, manipulación del DOM con librerías de terceros (`afterRenderEffect`), y cuándo NO usar efectos. Lee [effects.md](references/effects.md)

## Formularios

En la mayoría de los casos para aplicaciones nuevas, **se prefieren los signal forms**. Al tomar una decisión sobre formularios, analiza el proyecto y ten en cuenta las siguientes directrices:

- Si la aplicación usa v21 o posterior y se trata de un formulario nuevo, **se prefieren los signal forms**.
- Para aplicaciones más antiguas o al trabajar con formularios existentes, usa el tipo de formulario que corresponda a la estrategia de formularios actual de la aplicación.

- **Signal Forms**: Usa signals para la gestión del estado del formulario. Lee [signal-forms.md](references/signal-forms.md)
- **Formularios basados en plantillas**: Úsalos para formularios sencillos. Lee [template-driven-forms.md](references/template-driven-forms.md)
- **Formularios reactivos**: Úsalos para formularios complejos. Lee [reactive-forms.md](references/reactive-forms.md)

## Inyección de dependencias

Al implementar la inyección de dependencias en Angular, sigue estas directrices:

- **Fundamentos**: Visión general de la inyección de dependencias, los servicios y la función `inject()`. Lee [di-fundamentals.md](references/di-fundamentals.md)
- **Creación y uso de servicios**: Creación de servicios, la opción `providedIn: 'root'`, e inyección en componentes u otros servicios. Lee [creating-services.md](references/creating-services.md)
- **Definición de proveedores de dependencias**: Provisión automática frente a manual, `InjectionToken`, `useClass`, `useValue`, `useFactory` y ámbitos. Lee [defining-providers.md](references/defining-providers.md)
- **Contexto de inyección**: Dónde está permitido `inject()`, `runInInjectionContext` y `assertInInjectionContext`. Lee [injection-context.md](references/injection-context.md)
- **Inyectores jerárquicos**: `EnvironmentInjector` frente a `ElementInjector`, reglas de resolución, modificadores (`optional`, `skipSelf`) y `providers` frente a `viewProviders`. Lee [hierarchical-injectors.md](references/hierarchical-injectors.md)

## Angular Aria

Al construir componentes personalizados accesibles para cualquiera de los siguientes patrones: Accordion, Listbox, Combobox, Menu, Tabs, Toolbar, Tree, Grid, consulta la siguiente referencia:

- **Componentes de Angular Aria**: Construcción de componentes headless y accesibles (Accordion, Listbox, Combobox, Menu, Tabs, Toolbar, Tree, Grid) y estilizado de atributos ARIA. Lee [angular-aria.md](references/angular-aria.md)

## Enrutamiento

Al implementar la navegación en Angular, consulta las siguientes referencias:

- **Definir rutas**: Rutas de URL, segmentos estáticos frente a dinámicos, comodines y redirecciones. Lee [define-routes.md](references/define-routes.md)
- **Estrategias de carga de rutas**: Carga eager frente a lazy, y carga sensible al contexto. Lee [loading-strategies.md](references/loading-strategies.md)
- **Mostrar rutas con outlets**: Uso de `<router-outlet>`, outlets anidados y outlets con nombre. Lee [show-routes-with-outlets.md](references/show-routes-with-outlets.md)
- **Navegar a rutas**: Navegación declarativa con `RouterLink` y navegación programática con `Router`. Lee [navigate-to-routes.md](references/navigate-to-routes.md)
- **Controlar el acceso a rutas con guards**: Implementación de `CanActivate`, `CanMatch` y otros guards para seguridad. Lee [route-guards.md](references/route-guards.md)
- **Resolvers de datos**: Precarga de datos antes de la activación de la ruta con `ResolveFn`. Lee [data-resolvers.md](references/data-resolvers.md)
- **Ciclo de vida y eventos del router**: Orden cronológico de los eventos de navegación y depuración. Lee [router-lifecycle.md](references/router-lifecycle.md)
- **Estrategias de renderizado**: CSR, SSG (prerenderizado) y SSR con hidratación. Lee [rendering-strategies.md](references/rendering-strategies.md)
- **Animaciones de transición de rutas**: Habilitación y personalización de la View Transitions API. Lee [route-animations.md](references/route-animations.md)

Si necesitas documentación más detallada o más contexto, visita la [guía oficial de enrutamiento de Angular](https://angular.dev/guide/routing).

## Estilos y animaciones

Al implementar estilos y animaciones en Angular, consulta las siguientes referencias:

- **Uso de Tailwind CSS con Angular**: Integración de Tailwind CSS en proyectos Angular. Lee [tailwind-css.md](references/tailwind-css.md)
- **Animaciones de Angular**: Uso de CSS nativo (recomendado) o el DSL heredado para efectos dinámicos. Lee [angular-animations.md](references/angular-animations.md)
- **Estilizado de componentes**: Buenas prácticas para estilos de componentes y encapsulación. Lee [component-styling.md](references/component-styling.md)

## Testing

Al escribir o actualizar tests, consulta las siguientes referencias según la tarea:

- **Fundamentos**: Buenas prácticas para pruebas unitarias (Vitest), patrones asíncronos y `TestBed`. Lee [testing-fundamentals.md](references/testing-fundamentals.md)
- **Component Harnesses**: Patrones estándar para una interacción robusta con componentes. Lee [component-harnesses.md](references/component-harnesses.md)
- **Testing del router**: Uso de `RouterTestingHarness` para pruebas de navegación fiables. Lee [router-testing.md](references/router-testing.md)
- **Testing end-to-end (E2E)**: Configuración y ejecución de pruebas E2E. Lee [e2e-testing.md](references/e2e-testing.md)

## Herramientas

Al trabajar con las herramientas de Angular, consulta las siguientes referencias:

- **Angular CLI**: Creación de aplicaciones, generación de código (componentes, rutas, servicios), servido y compilación. Lee [cli.md](references/cli.md)
- **Modernización de código**: Refactorización automática a estándares modernos mediante migraciones. Lee [migrations.md](references/migrations.md)
- **Servidor MCP de Angular**: Herramientas disponibles, configuración y funcionalidades experimentales. Lee [mcp.md](references/mcp.md)
- **Configuración de entornos**: Estrategias de configuración en tiempo de compilación y en tiempo de ejecución. Lee [environment-configuration.md](references/environment-configuration.md)
