# Knowledge-log seed — dev-agent-system-java

Estos 4 casos son errores reales, verificados y ya generalizados (sin nombres de cliente/proyecto), aportados junto con el preset. **No son ley universal ni entradas definitivas del knowledge-log** — son punto de partida: durante `/agent-system-core:init` (o a mano después), cópialos al formato canónico de `self-learning-error-prevention` de `dev-agent-system-core` (`docs/wiki/knowledge-log.md`, IDs `LE-{INICIALES}-{NNN}` con las iniciales reales del proyecto) y adáptalos si algo no encaja con tu stack concreto.

---

**Fingerprint**: `Java/Hibernate|snapshot de auditoría con asociación id-only serializada a null|Hibernate no reemplaza un objeto ManyToOne enviado solo con su id por la fila real del contexto de persistencia`
**Root cause**: el mapper crea una referencia "solo-id" para la relación; una relectura posterior por id devuelve el mismo objeto desde la caché de primer nivel, no la fila completa de BD.
**Regla**: antes de serializar un snapshot que incluya esa asociación, forzar flush + limpiar el contexto de persistencia + releer por repositorio dentro de la misma transacción. Nunca usar un `refresh()` de la entidad como alternativa: en bases de datos embebidas de test puede marcar la transacción como rollback-only y el commit del proxy transaccional revienta fuera de cualquier try/catch del método.

---

**Fingerprint**: `Maven multi-repo|"cannot find symbol" masivo tras editar una librería compartida|un build online resuelve el SNAPSHOT contra el repositorio remoto en vez de respetar el recién instalado localmente`
**Root cause**: la resolución de dependencias SNAPSHOT de Maven no prioriza el artefacto local sobre el remoto salvo que se fuerce el modo offline.
**Regla**: tras tocar la librería compartida, reinstalarla localmente y compilar el proyecto consumidor en modo offline.

---

**Fingerprint**: `JPA Specification|filtro de seguridad por subquery EXISTS devuelve vacío o rompe con JOIN cartesiano|el path de navegación usado en la subquery atraviesa una colección en vez de una asociación de un solo valor`
**Root cause**: el resolutor de paths hace un JOIN por cada segmento del path; un segmento que es una colección multiplica filas dentro de la subquery de seguridad.
**Regla**: antes de añadir un filtro de seguridad basado en un path de asociaciones, confirmar que existe un camino completo de asociaciones de un solo valor hasta la entidad objetivo. Si no existe, omitir ese filtro y apoyarse solo en el filtro de aislamiento por tenant.

---

**Fingerprint**: `ficheros de propiedades en encoding legacy|caracteres corruptos en mensajes tras una edición automatizada|la herramienta de edición no garantiza escritura byte-exacta sobre un fichero en un encoding distinto de UTF-8`
**Root cause**: herramientas de edición/diff basadas en texto pueden normalizar encoding o line-endings al escribir, corrompiendo silenciosamente un carácter no-ASCII.
**Regla**: en ficheros de mensajes con encoding legacy, escribir cualquier carácter no-ASCII como escape unicode explícito, nunca el carácter crudo; verificar el resultado con una lectura a nivel de bytes tras editar, no solo visualmente.
