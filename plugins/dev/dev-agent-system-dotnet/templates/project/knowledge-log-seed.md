# Knowledge-log seed — dev-agent-system-dotnet

Estos 7 casos son errores reales, verificados y ya generalizados (sin nombres de cliente/entidad/ticket), aportados junto con el preset. **No son ley universal ni entradas definitivas del knowledge-log** — son punto de partida: durante `/agent-system-core:init` (o a mano después), cópialos al formato canónico de `self-learning-error-prevention` de `dev-agent-system-core` (`docs/wiki/knowledge-log.md`, IDs `LE-{INICIALES}-{NNN}` con las iniciales reales del proyecto) y adáptalos si algo no encaja con tu stack concreto.

---

**Fingerprint**: `dotnet-aspnetcore|not-found devuelve 400 en vez de 404|el servicio lanza HttpRequestException con BadRequest para el caso "entidad no encontrada"`
**Root cause**: copy-paste del patrón de error sin ajustar el `HttpStatusCode`; el consumidor no distingue "no existe" de "petición inválida".
**Regla**: "no encontrado" SIEMPRE `HttpStatusCode.NotFound`; `BadRequest` solo para input malformado o regla de negocio violada.

---

**Fingerprint**: `dotnet|crash al parsear un id de sistema externo|Guid.Parse sobre un id que el sistema externo no garantiza como GUID`
**Root cause**: la entidad/DTO tipa el ID externo como `Guid?` y hace `Guid.Parse` del valor devuelto por el provider.
**Regla**: los IDs de sistemas externos se guardan y transportan como `string?` de punta a punta; nunca `Guid.Parse`.

---

**Fingerprint**: `dotnet-di|el mock guard no se ejecuta / regresión de modo mock|el if (_useMock) no es la primera línea del método de servicio`
**Root cause**: se añadió un null-check o un log antes del guard, o se olvidó el guard al añadir un método nuevo.
**Regla**: `if (_useMock) return _mock.X(...)` es la PRIMERA línea de todo método público de servicio; test de mock-path que verifica `repo.Times.Never`.

---

**Fingerprint**: `dotnet-di|el registro de DI que gana no es el esperado|dos AddScoped<> para el mismo tipo, o registro del concreto junto al de la interfaz`
**Root cause**: al registrar un servicio se dejó también el registro viejo; el último gana en silencio.
**Regla**: un único registro por tipo, siempre por interfaz; resolver la interfaz en todos lados (incluido middleware).

---

**Fingerprint**: `dotnet-middleware|el response body sale vacío o mal en el log|se lee el response body antes de await _next(context)`
**Root cause**: orden incorrecto de lectura del stream de respuesta en el middleware de logging.
**Regla**: leer el response body DESPUÉS de `await _next(context)`; reposicionar el stream antes de copiarlo al original.

---

**Fingerprint**: `dotnet-migrations|una migración destructiva se aplica sola en un entorno|las migraciones corren en el arranque vía MigrateAsync`
**Root cause**: se generó una migración con drop de columna/tabla o `NOT NULL` sin default y se desplegó.
**Regla**: detectar cambios destructivos y pedir confirmación ANTES de generar; recordar que no hay paso manual de update.

---

**Fingerprint**: `dotnet-integration|solo se sincroniza uno de N sistemas externos tras crear/editar|se añadió lógica de sync a un provider y no al otro`
**Root cause**: la lógica de sync se toca por un provider olvidando que la entidad se sincroniza contra varios.
**Regla**: Create y Update llaman a TODOS los helpers de sync y actualizan todos los flags/IDs; un sync fallido guarda la entidad con el flag a `false`.

---

**Fingerprint**: `dotnet-integration|productos/entidades de un sistema externo aparecen incompletos|el mapeo lee la entidad externa desde una sola clave cuando el sistema la expone bajo varias`
**Root cause**: el provider devuelve la misma entidad bajo distintas claves (p.ej. producto simple vs. suite) y el mapper solo mira una.
**Regla**: al mapear respuestas de un sistema externo, contemplar todas las claves/formas bajo las que puede venir la entidad, no solo el caso simple.
