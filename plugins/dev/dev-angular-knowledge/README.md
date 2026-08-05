# dev-angular-knowledge

Plugin de Claude Code con capacidad completa de desarrollo Angular (v20+/v21+), en español: componentes, DI, signals, forms, routing, HTTP, testing, styling, tooling y creación de proyectos nuevos, más agentes especializados, guardrails de calidad, separación de responsabilidades en formularios complejos y un registro de errores conocidos aportado por el equipo dev de Attrim.

Incluye el bundle oficial de Angular/Google (`angular-developer`, MIT, traducido) junto con skills y agentes propios de Attrim que lo complementan.

## Qué incluye

### Agentes

| Agente | Qué hace |
|---|---|
| `angular-arquitecto` | Diseña y escafola features/componentes/servicios nuevos: decide signals vs. signal forms vs. reactive forms clásicos, estructura de rutas y DI, y genera el esqueleto de código (deja la lógica de negocio con `TODO`). Pregunta y espera confirmación antes de escribir nada. |
| `angular-revisor` | Revisor senior que audita un PR/diff/componente aplicando las skills de componentes, signals, forms, DI, routing y calidad, más el knowledge-log de errores conocidos. Solo analiza, nunca edita código; devuelve un informe priorizado por severidad. |
| `angular-test-writer` | Escribe o mejora tests unitarios/integración (Vitest o Jasmine, TestBed, component harnesses) siguiendo la convención de mocks del proyecto y evitando antipatrones ya registrados (p. ej. mocks de `Router` incompletos). Ejecuta los tests y los corrige si fallan. |
| `angular-migrador` | Migra un patrón Angular concreto y acotado (NgModules→standalone, `@Input`/`@Output`→signals, `Observable`→signals, reactive forms→Signal Forms, `*ngIf`/`*ngFor`→`@if`/`@for`) sin tocar el resto del archivo. Corre tests antes/después para verificar que no rompe nada. |

### Comandos

| Comando | Qué hace |
|---|---|
| `/ng-new-project <nombre y requisitos>` | Crea una app Angular nueva con la CLI, siguiendo la skill `angular-new-app` (comprueba CLI, flags, `--ai-config`, Tailwind opcional). |
| `/ng-new-feature <nombre y requisitos>` | Invoca a `angular-arquitecto` para diseñar y escafolar un componente/feature/servicio nuevo. |
| `/ng-review [alcance opcional]` | Invoca a `angular-revisor` para revisar el diff actual (o el alcance indicado) frente a la rama base. |
| `/ng-test <componente/servicio/ruta>` | Invoca a `angular-test-writer` para generar o mejorar tests de lo indicado. |
| `/ng-migrate <archivo/componente y patrón>` | Invoca a `angular-migrador` para migrar un patrón concreto y acotado. |

### Skills

| Skill | Propósito / cuándo se activa |
|---|---|
| `angular-developer` | Bundle oficial de Angular (Google, MIT) con guía transversal de código y arquitectura: reactividad (signals, `linkedSignal`, `resource`), forms, DI, routing, SSR, accesibilidad ARIA, animaciones, estilos (incluye Tailwind), testing y CLI. Contiene ~30 referencias en `references/`. |
| `angular-new-app` | Crea una app Angular nueva con la CLI (comprobación de CLI, flags recomendados, `--ai-config`, Tailwind). Requiere Node/npm y acceso a internet. |
| `angular-component` | Componentes standalone v20+: inputs/outputs basados en signals, `OnPush`, host bindings, proyección de contenido, lifecycle hooks. |
| `angular-signals` | Estado reactivo con `signal()`, `computed()`, `linkedSignal()`, `effect()`; migración desde `BehaviorSubject`/`Observable`. |
| `angular-di` | Inyección de dependencias con `inject()`, tokens de inyección y configuración de providers (root/componente/ruta). |
| `angular-directives` | Directivas de atributo/host para DOM; deja claro que `@if`/`@for`/`@switch` deben usarse en vez de directivas estructurales custom. |
| `angular-forms` | Signal Forms (v21+, experimental) con binding automático y validación por esquema; referencia también reactive forms clásicos para producción estable. |
| `angular-form-responsibility-separation` | Separación estricta de responsabilidades en formularios reactivos complejos (componente delgado + servicios enfocados) cuando el componente supera ~200 líneas. |
| `angular-http` | Fetching de datos con `resource()`, `httpResource()` y `HttpClient`, interceptores, estados de carga basados en signals. |
| `angular-routing` | Enrutado v20+: lazy loading, guards funcionales, resolvers, parámetros de ruta basados en signals. |
| `angular-testing` | Tests unitarios/integración v21+ con Vitest (recomendado) o Jasmine, TestBed, component harnesses, componentes con signals y `OnPush`. |
| `angular-tooling` | Uso eficaz de la Angular CLI: generación de código, build, test, configuración. |
| `code-quality-guardrails` | Checklist de calidad no negociable (ESLint, Oxlint, code smells estilo Sonar) aplicable a toda creación/refactor/revisión de código. |
| `self-learning-error-prevention` | Captura y aplica aprendizaje técnico de errores reales ya cometidos por el equipo (`references/knowledge-log.md`), para no repetirlos; se activa ante bugs, regresiones o revisiones post-fix. |

## Cómo instalarlo

Este plugin se distribuye a través del marketplace interno `attrim-marketplace` de Claude Code. Desde Claude Code:

1. Añade el marketplace (si aún no lo tienes añadido):
   ```
   /plugin marketplace add attrim-marketplace
   ```
2. Instala el plugin:
   ```
   /plugin install dev-angular-knowledge@attrim-marketplace
   ```

Sigue el flujo estándar de gestión de plugins de Claude Code (`/plugin`) para actualizarlo o desinstalarlo.

## Cómo usarlo

- **Crear un componente nuevo con formulario**: pide en lenguaje natural, por ejemplo *"crea un componente de edición de cliente con un formulario reactivo y ruta propia"*, o invoca directamente:
  ```
  /ng-new-feature editor de cliente con formulario y ruta propia
  ```
  Esto dispara al agente `angular-arquitecto`, que primero inspecciona el proyecto (versión de Angular, standalone/NgModules, tipo de forms en uso), propone el árbol de archivos a crear y espera tu confirmación antes de escribir el esqueleto.

- **Revisar un PR antes de fusionar**: ejecuta
  ```
  /ng-review
  ```
  para que `angular-revisor` audite el `git diff` actual frente a la rama base y devuelva un informe por severidad (Crítico/Alto/Medio/Bajo), citando coincidencias con el `knowledge-log.md` (por ejemplo, un mock de `Router` incompleto ya visto como `LE-0004`).

- **Añadir tests a un servicio existente**: ejecuta
  ```
  /ng-test src/app/features/clientes/clientes.service.ts
  ```
  y `angular-test-writer` detectará si el proyecto usa Vitest o Jasmine, seguirá la convención de mocks (`*.service.mock.ts` con `getProvider()`) y ejecutará los tests antes de darlos por terminados.

- **Migrar un patrón concreto**: por ejemplo, pedir *"migra los inputs por decorador de `UserCardComponent` a signals"* o ejecutar
  ```
  /ng-migrate src/app/shared/ui/user-card/user-card.component.ts de @Input a input()
  ```
  `angular-migrador` migra solo ese patrón, corre los tests existentes (o `ng build` si no hay) antes y después, y avisa si el cambio queda sin red de seguridad automatizada.

- **Crear un proyecto Angular desde cero**: pide *"crea una app Angular nueva llamada portal-clientes con SSR y Tailwind"* o ejecuta
  ```
  /ng-new-project portal-clientes con ssr y tailwind
  ```

## Requisitos previos

- Angular CLI accesible (`ng`/`npx ng`) para las skills `angular-new-app` y `angular-tooling`; si no está instalada globalmente, la skill ofrece instalarla con `npm install -g @angular/cli`.
- Node, npm y acceso a internet para crear proyectos nuevos (requisito declarado explícitamente en `angular-new-app`).
- No requiere configuración de variables de entorno ni placeholders propios del plugin.

## Notas

- **Signal Forms son experimentales** (Angular v21). La skill `angular-forms` y el agente `angular-migrador` lo señalan explícitamente: solo se migra a Signal Forms con confirmación explícita del usuario, y para producción estable se recomienda seguir con reactive forms clásicos.
- **`angular-revisor` nunca edita código**, solo produce el informe de revisión; cualquier corrección la aplica otro agente o el propio desarrollador.
- El **registro de errores conocidos** (`skills/self-learning-error-prevention/references/knowledge-log.md`) ya contiene 7 entradas (`LE-0001` a `LE-0007`) sobre errores reales del equipo dev de Attrim (p. ej. `takeUntilDestroyed` fuera de contexto de inyección, `FormArray` roto por `setControl`, mocks de `Router`/DI incorrectos, inestabilidad de `p-tree` de PrimeNG). Los agentes `angular-revisor` y `angular-migrador` consultan este log activamente; añadir nuevas entradas es decisión explícita del usuario, no de los agentes.
- La skill `angular-developer` es un bundle traducido de material oficial de Angular/Google bajo licencia MIT — sus referencias (`references/*.md`) cubren en detalle temas que las skills más específicas del plugin (signals, forms, DI, routing, etc.) resumen y complementan con las convenciones propias de Attrim.
