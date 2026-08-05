# agent-system-dotnet — Preset .NET / ASP.NET Core

Preset de stack para `dev-agent-system-core`. No hace nada por sí solo: `/agent-system-core:init` detecta este plugin y copia su contenido al proyecto como base editable.

## Qué aporta

| Contenido | Destino en el proyecto | Rol |
|---|---|---|
| `templates/rules/*.md` | `.claude/rules/` | Reglas always-on: arquitectura de capas+módulos, manejo de errores, validación, seguridad JWT/Keycloak, persistencia EF Core, naming/estilo, guardarraíles de calidad |
| `templates/rules-on-demand/*.md` | `.claude/rules-on-demand/` | Reglas bajo demanda: dual-port-auth, provider-sync, mock-mode, request-logging, provider-retry |
| `templates/project/knowledge-log-seed.md` | copiar manualmente a `docs/wiki/knowledge-log.md` (o ingerir vía wiki) | 7 errores aprendidos semilla, ya generalizados |
| `skills/` | (viven en el plugin) | feature-scaffolding, add-endpoint, module-audit, create-migration, pre-commit-validate, pr-description, commit-message, run-tests-here, env-check, hu-refinement |

No hay `.mcp.json` ni `templates/scripts/` — el proyecto de referencia no tenía scripts propios ni MCP servers maduros para este stack (ver "Propuestas no implementadas" más abajo).

## Cómo usarlo

Una vez instalado (tras `/agent-system-core:init` y sustituir los placeholders), las skills se invocan como comandos dentro de una sesión de Claude Code. Ejemplos reales de flujo completo:

- **Crear un módulo nuevo de punta a punta** (`feature-scaffolding` → `create-migration` → `pre-commit-validate`):
  ```
  /new-module Invoice "number:string amount:decimal issuedAt:DateTime" --public --sync-a
  /create-migration AddInvoice
  /validate
  ```
  El primer comando genera entity, DTOs, service+mock, controller(s) y registros DI del módulo `Invoice` (con controller público además del interno, y sincronización con el provider A); el segundo genera la migración EF Core correspondiente (con el guardarraíl de detección de cambios destructivos); el tercero da el veredicto `READY TO COMMIT | BLOCKED` antes de cerrar la tarea.

- **Añadir un endpoint a un recurso ya existente**:
  ```
  /add-endpoint InvoiceController "marcar una factura como pagada"
  ```
  Añade el método al servicio (con mock guard y XML docs), el endpoint al controller con la paridad Public/Internal que corresponda, y los tests happy-path/mock-path/not-found.

- **Auditar consistencia antes de una PR grande**:
  ```
  /sync-check Invoice
  ```
  o sin argumento (`/sync-check`) para auditar todo el backend: revisa paridad Public/Internal, completitud de provider-sync, DI sin duplicados, tests y mock guards, y reporta findings `[ERROR]/[WARNING]/[OK]` por fichero:línea sin modificar nada.

- **Generar una migración suelta tras cambiar una entidad a mano**:
  ```
  /migrate RenameInvoiceStatus
  ```

## Configuración antes del primer uso (obligatorio)

Este preset viene de un proyecto ASP.NET Core real, con lo específico de ese proyecto **ya parametrizado por quien lo aportó** con los siguientes placeholders. Sustitúyelos por los valores reales de tu proyecto en cuanto instales el preset (recomendado: anotarlos en `.claude/agent-system.config.json`, sección `canonicalExamples` o una entrada propia, para no repetirlos cada sesión):

| Placeholder | Qué es | Dónde aparece |
|---|---|---|
| `<ROOT_NS>` | Raíz de namespace del proyecto (ej. `Company.Product`) | `dotnet-core-architecture.md` |
| `<API_PROJ>` | Proyecto host (API) | `dotnet-core-architecture.md`, `create-migration` |
| `<CORE_PROJ>` / `<INFRA_PROJ>` | Proyectos de capa Core / Infrastructure | `dotnet-core-architecture.md`, `dotnet-persistence.md`, `create-migration` |
| `<PROVIDER_A>` / `<PROVIDER_B>` | Sistemas externos con los que se sincroniza (si los hay) | `provider-sync.md` |
| `<PUBLIC_AZP>` / `<INTERNAL_AZP>` | Valores esperados del claim `azp` por esquema JWT | `dotnet-security.md`, `dual-port-auth.md` |
| `<INTERNAL_ROLE>` | Rol requerido en el token del esquema interno | `dotnet-security.md`, `dual-port-auth.md` |
| `<PORT_PUBLIC>` / `<PORT_INTERNAL>` | Puertos de escucha (si el proyecto separa tráfico público/interno) | `dual-port-auth.md` |
| `<COPYRIGHT_HOLDER>` | Titular de la cabecera de copyright | `dotnet-naming-style.md` |

Si tu proyecto **no** tiene alguno de estos patrones (p. ej. no separa tráfico por puertos, o no sincroniza con sistemas externos), simplemente ignora o elimina la regla `rules-on-demand` correspondiente (`dual-port-auth`, `provider-sync`, `provider-retry`) — no fuerces el patrón donde no aplica.

## Configuración que el init debe aplicar

`rules.alwaysOn`: dotnet-core-architecture, dotnet-error-handling, dotnet-validation, dotnet-security, dotnet-persistence, dotnet-naming-style, code-quality-guardrails.
`rules.onDemand`: dual-port-auth, provider-sync, mock-mode, request-logging, provider-retry (según apliquen al proyecto).

Comandos de proyecto observados en el origen (confirmar contra el proyecto real):
- Build: `dotnet build` · Test: `dotnet test` (una clase: `dotnet test --filter "ClassName={Clase}Tests"`) · Restore: `dotnet restore`.
- **No hay `dotnet format` configurado** en el proyecto de referencia — la calidad se controlaba con SonarQube en CI. No asumas un comando de lint/format local que no exista; confírmalo con el equipo antes de rellenar `hooks.postEdit`.
- Migraciones: **no** hay `dotnet ef database update` manual — se aplican solas al arrancar (`MigrateAsync`). Ver guardarraíl crítico en `dotnet-persistence.md` y en `@skill:create-migration`.

## Errores aprendidos semilla

`templates/project/knowledge-log-seed.md` trae 7 casos reales ya generalizados (formato Fingerprint/Root cause/Regla) para sembrar el knowledge-log del proyecto vía el skill `self-learning-error-prevention` de `dev-agent-system-core`. Son punto de partida, no entradas definitivas — conviértelas al formato canónico `LE-{INICIALES}-{NNN}` del proyecto real al incorporarlas.

## Propuestas no implementadas (§5/§6 del spec original)

El material de origen documentaba dos ideas que **no llegaron a implementarse como código**, y este preset no las inventa:

- **`swagger-contract-diff`** — un script que compare el OpenAPI generado contra el último publicado y marque cambios de DTO como *breaking* (análogo al `check-models-from-swagger.ts` del preset Angular, pero mirado desde el backend). Tendría sentido si tu proyecto expone OpenAPI/Swagger como contrato.
- **MCP servers**: no había ninguno maduro identificado para EF Core, NuGet o Azure DevOps en el momento de curar este preset. Si conoces uno oficial, añádelo a un `.mcp.json` propio del plugin.

Si tu equipo quiere desarrollar cualquiera de las dos, es un plugin/mejora nueva sobre este preset, no algo que instalar hoy.

## Notas

- Las reglas y skills copiados son de un proyecto real: **cada proyecto debe adaptarlos** a su realidad tras el init (nombres de esquema, providers, si aplica dual-port, etc.).
- Varios guardarraíles de este preset (400 vs 404, `Guid.Parse` sobre IDs externos, mock guard fuera de sitio, DI duplicado, orden de lectura del body en logging) provienen de bugs reales detectados en producción — no son teoría, son la razón de ser del preset.
- Las mejoras generalizables se suben como PR a este preset.
