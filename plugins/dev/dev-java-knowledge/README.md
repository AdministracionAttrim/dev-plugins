# dev-java-knowledge

Plugin de Claude Code con capacidad completa de desarrollo Java/Spring Boot: lenguaje Java 21/25, clean code, SOLID, patrones de diseño, arquitectura por features, API REST, persistencia JPA, manejo de errores, seguridad, concurrencia, rendimiento, observabilidad y testing. Incluye agentes especializados de revisión, arquitectura, tests y auditoría de seguridad.

## Qué incluye

### Agentes

| Agente | Qué hace |
|---|---|
| `java-reviewer` | Revisor senior de código Java/Spring Boot. Audita un PR, una clase o un diff antes de fusionar; aplica las checklists de code review, SOLID, clean code, seguridad, concurrencia y rendimiento y devuelve un informe priorizado por severidad (Crítico/Alto/Medio/Bajo). Solo analiza, nunca edita código. |
| `java-architect` | Diseña y escafolda un módulo o feature nuevo en un backend Java/Spring Boot: decide organización de paquetes (por capas o por feature), estructura de controller/service/repository/DTO/mapper, manejo de errores y persistencia. A diferencia de un agente puramente conversacional, sí escribe el esqueleto de código tras confirmación del usuario. |
| `java-test-writer` | Escribe o mejora tests JUnit 5 + AssertJ + Mockito + Testcontainers. Decide el tipo de test correcto (unitario, slice o integración), sigue el patrón AAA, y ejecuta los tests antes de darlos por terminados. |
| `java-security-auditor` | Auditoría de seguridad exhaustiva antes de una release: OWASP Top 10, validación de entrada, gestión de secretos, autenticación/autorización, deserialización y dependencias vulnerables. Produce un informe con severidad y remediación concreta. Solo analiza, nunca edita código. |

### Comandos

| Comando | Qué hace |
|---|---|
| `/java-review [alcance]` | Invoca a `java-reviewer` para revisar el diff actual (o el alcance indicado) frente a la rama base. |
| `/java-new-feature <nombre y entidades>` | Invoca a `java-architect` para diseñar y escafoldar un módulo/feature nuevo, respetando las convenciones ya existentes en el proyecto. |
| `/java-test <ruta o funcionalidad>` | Invoca a `java-test-writer` para generar o mejorar los tests de la clase o funcionalidad indicada. |
| `/java-security-audit [alcance]` | Invoca a `java-security-auditor` para una auditoría de seguridad completa, pensada para correr antes de una release. |
| `/java-refactor-solid <ruta de la clase>` | Revisa una clase frente a los principios SOLID y clean code, y propone (sin aplicar) un refactor concreto. |

### Skills (se activan automáticamente según el contexto, sin invocación explícita)

| Skill | Cubre |
|---|---|
| `java-language` | Java 21/25: records, sealed classes, pattern matching, switch expressions, text blocks, `var`, `Optional`, virtual threads, `StructuredTaskScope`. |
| `clean-code` | DRY, KISS, YAGNI, naming, tamaño de métodos, inmutabilidad, guard clauses, Tell Don't Ask. |
| `solid-principles` | Checklist SOLID con ejemplos en Java. |
| `design-patterns` | Strategy, Builder, Factory, Repository, Decorator, Observer, Specification, Command — cuándo aplicar cada uno. |
| `layered-feature-architecture` | Organización de paquetes por feature (controller/service/repository/dto/mapper por dominio); es la arquitectura de referencia del proyecto. |
| `spring-boot` | Spring Boot 4: controllers, services, repositories, DI, `@ConfigurationProperties`, `@RestControllerAdvice`, eventos, `@Async`, Actuator, virtual threads. |
| `api-design` | Diseño de APIs REST: DTOs con records, códigos HTTP, paginación con `Pageable`, Bean Validation, versionado, OpenAPI/Swagger. |
| `persistence` | Entidades JPA, repositorios Spring Data, prevención de N+1 (`JOIN FETCH`/`@EntityGraph`), `LazyInitializationException`, locking optimista, migraciones Flyway/Liquibase. |
| `error-handling` | Jerarquías de excepciones, `GlobalExceptionHandler` con `@RestControllerAdvice`, formato de error consistente, `Result` type, retry con backoff. |
| `security` | OWASP Top 10, Spring Security, JWT, validación de entrada, inyección, XSS/CSRF, seguridad a nivel de método, rate limiting, CORS, secretos, deserialización segura. |
| `concurrency` | Thread safety, race conditions, deadlocks, Virtual Threads, `CompletableFuture`, `@Async`. |
| `performance-smells` | Code smells de rendimiento a nivel de código: streams, colecciones, boxing, regex, creación de objetos (solo detección, no benchmarking). |
| `observability` | Logging estructurado con SLF4J/Logback, MDC para correlation IDs, métricas con Micrometer, tracing distribuido, health indicators, Actuator en producción. |
| `testing` | JUnit 5, Mockito, `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`, Testcontainers, AssertJ, factorías de datos de test. |
| `java-code-review` | Checklist sistemática de revisión: null safety, manejo de excepciones, concurrencia, rendimiento. |

## Cómo instalarlo

Desde Claude Code, instala el plugin `dev-java-knowledge` desde el marketplace interno `attrim-marketplace` (añade el marketplace si no lo tienes ya configurado y busca/instala el plugin por su nombre desde el listado de plugins disponibles).

## Cómo usarlo

- **Revisar un PR antes de fusionar:** ejecuta `/java-review` sin argumentos en una rama con cambios pendientes. El agente `java-reviewer` ejecutará `git diff`/`git status` para acotar el alcance al cambio actual y devolverá un informe en secciones Crítico/Alto/Medio/Bajo/Buenas prácticas, sin modificar ningún archivo.
- **Crear un feature nuevo:** `/java-new-feature Gestión de pedidos con entidades Order y OrderLine`. El agente `java-architect` primero inspecciona el proyecto (`src/main/java`) para detectar si usa organización por capas o por feature, hace una pregunta a la vez para aclarar entidades/relaciones/autenticación, propone el árbol de directorios y espera confirmación antes de generar el esqueleto (controller, service, repository, entidad JPA, DTOs como records, mapper, excepciones de dominio con `TODO`).
- **Escribir tests para una clase:** `/java-test src/main/java/com/attrim/orders/OrderService.java`. El agente `java-test-writer` decide si corresponde un test unitario, un slice (`@WebMvcTest`/`@DataJpaTest`) o una integración con Testcontainers, escribe el test con JUnit 5 + AssertJ siguiendo AAA, lo ejecuta (`mvn test -Dtest=...`) y solo entrega si pasa.
- **Auditoría de seguridad previa a release:** `/java-security-audit` (sin argumentos audita todo el proyecto). El agente `java-security-auditor` recorre OWASP Top 10, secretos, autenticación/JWT, deserialización y dependencias, y entrega un informe con checklist de configuración de producción; no aplica ninguna corrección automáticamente.
- **Pedir revisión SOLID de una clase puntual:** también puedes invocar directamente `/java-refactor-solid src/main/java/com/attrim/billing/InvoiceCalculator.java` para obtener violaciones SOLID/clean code con propuesta de refactor (sin aplicarlo).
- Las skills (`java-language`, `security`, `persistence`, etc.) no necesitan invocación explícita: se activan solas cuando la conversación o el código tocan su área (por ejemplo, pedir "revisa esta query JPA por N+1" activa `persistence` aunque no uses ningún comando).

## Requisitos/configuración previa

- Proyecto Java/Spring Boot (Java 21 o 25) con Maven o Gradle; varios agentes ejecutan comandos de build/test (`mvn test`, `mvn dependency-check:check` o equivalentes Gradle) mediante la herramienta `Bash`, así que el entorno debe tener el proyecto en un estado compilable.
- `java-test-writer` asume disponibilidad de JUnit 5, AssertJ, Mockito y, para tests de integración, Testcontainers (Docker) en el proyecto o los añade si el proyecto ya sigue ese stack.
- No hay `.mcp.json` ni configuración MCP en este plugin — no requiere servidores externos.

## Notas relevantes

- Los cuatro agentes (`java-reviewer`, `java-architect`, `java-test-writer`, `java-security-auditor`) están explícitamente delimitados en responsabilidades: `java-reviewer` y `java-security-auditor` **nunca** editan código, solo producen informes; `java-architect` solo escribe esqueleto (no lógica de negocio) y no escribe tests (delega a `java-test-writer`); `java-security-auditor` remite las correcciones a `java-reviewer` o a la sesión normal en vez de aplicarlas.
- `java-architect` sigue la convención de paquetes ya existente en el proyecto (por capas o por feature) en vez de imponer una preferencia propia; si el proyecto está vacío, recomienda `layered-feature-architecture` para dominios con más de 3-4 entidades relacionadas.
- Según `plugin.json`, este plugin es el resultado de fusionar y deduplicar aportes de los equipos de Boris e Ivan.
- Versión actual del plugin: `1.0.0`.
