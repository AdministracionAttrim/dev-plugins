# dev-superarchitect

Plugin de Claude Code que añade el comando `/superarchitect`: un agente conversacional de arquitectura de software, agnóstico de stack (sirve tanto para frontend como para backend), que te ayuda a decidir **cómo** abordar un desarrollo antes de tocar código.

## Qué incluye

### Comando `/superarchitect`

Argumento: una descripción del desarrollo a abordar o de la duda de implementación que tienes (`argument-hint: <descripcion del desarrollo o duda de implementacion>`).

Herramientas permitidas: `Read`, `Glob`, `Grep`, `WebFetch`, `WebSearch` (no incluye `Edit` ni `Write`). Modelo configurado: `claude-opus-4-8`.

**Qué hace:**

1. **Primero comprueba el contexto del proyecto.** Busca un `CLAUDE.md` (en la raíz del repo o el más específico al directorio de trabajo) que describa el stack, la arquitectura y las convenciones.
   - Si existe y es útil, lo usa como fuente de verdad y evita asumir convenciones de "stacks típicos".
   - Si no existe o no dice nada útil, te lo dice explícitamente, te advierte de que sin ese contexto sus recomendaciones serán genéricas, y te sugiere ejecutar `/init` antes de continuar (si prefieres seguir sin él, respeta tu decisión pero deja constancia de la limitación).
2. **Razona de forma conversacional, no de una sola pasada:**
   - Si tu planteamiento es ambiguo o falta un dato clave (alcance, volumen de datos, integraciones, restricciones de UX, etc.), hace **una sola pregunta de aclaración a la vez** (nunca una lista) y espera tu respuesta antes de seguir.
   - Explora el código existente con `Grep`/`Glob`/`Read` de forma dirigida (para confirmar patrones o convenciones), no como un barrido exploratorio completo del repo.
   - Compara de verdad varias alternativas de estructura (no solo detalles de sintaxis), y **tiene opinión**: recomienda una opción concreta y la defiende, en vez de dejarte toda la decisión a ti salvo que sea genuinamente una cuestión de preferencia de negocio/producto.
3. **Cuando propone una solución**, sigue (sin forzarla en cada mensaje del hilo) esta estructura:
   - **Contexto** — qué ha entendido que se necesita y qué asunciones está haciendo.
   - **Recomendación** — la opción propuesta, explicada con claridad.
   - **Alternativas descartadas** — qué otras opciones consideró y por qué no, en el contexto concreto del proyecto.
   - **Dudas / riesgos abiertos** — preguntas de negocio, ambigüedades o riesgos técnicos (rendimiento, migraciones, compatibilidad) que tú debes sopesar.

**Qué NO hace (límites estrictos):**

- **Nunca escribe ni modifica código de producción**, ni siquiera "solo para ilustrar" — a lo sumo pseudocódigo de 2-3 líneas si es imprescindible para ilustrar una estructura de datos o un flujo.
- **Nunca edita ni crea archivos.** Su única salida es la conversación (no tiene acceso a `Edit`/`Write`).
- Si le pides directamente que implemente algo, te recuerda que su rol es solo de planificación y te sugiere pasar la decisión ya tomada a tu sesión normal de desarrollo (o al agente/subagente de implementación que uses en ese proyecto).

## Cómo instalarlo

Se instala como cualquier plugin del marketplace `attrim-marketplace` de Claude Code:

```
/plugin marketplace add attrim-marketplace
/plugin install dev-superarchitect@attrim-marketplace
```

(o el mecanismo estándar de gestión de plugins de Claude Code, si ya tienes el marketplace añadido).

## Cómo usarlo

Invoca el comando con una descripción del desarrollo o la duda que quieras analizar: `/superarchitect <descripcion>`.

### Ejemplo 1 — Duda de frontend

```
/superarchitect Necesito añadir un selector de idioma en el header de la app Angular, que persista la preferencia del usuario
```

El agente primero busca `CLAUDE.md` para confirmar el stack real (por ejemplo, Angular con signals, gestión de estado concreta, si ya existe i18n configurado). Si detecta ambigüedad —por ejemplo, si no está claro si la preferencia debe persistir solo en el navegador o también en el backend por usuario— te hará una única pregunta de aclaración antes de continuar. Después de explorar el código relevante con `Grep`/`Glob` (p. ej. cómo está montado el módulo de i18n actual), te presentará una recomendación concreta (dónde vive el componente, qué servicio gestiona la preferencia, cómo se persiste) junto con alternativas descartadas y los riesgos abiertos (por ejemplo, sincronización entre pestañas).

### Ejemplo 2 — Duda de backend

```
/superarchitect Quiero exponer un endpoint que exporte informes en PDF de forma asíncrona porque tardan varios segundos en generarse
```

El agente comprobará las convenciones del backend documentadas en `CLAUDE.md` (framework, si ya hay un patrón de trabajos en background o colas). Comparará alternativas de estructura reales —por ejemplo, job en cola con notificación por webhook/polling frente a generación síncrona con streaming— y recomendará una con justificación, dejando como duda abierta aspectos como el tiempo de vida de los ficheros generados o el límite de tamaño aceptable.

### Ejemplo 3 — Duda de diseño general, sin stack definido aún

```
/superarchitect No sé si separar la lógica de facturación en un microservicio propio o dejarla dentro del monolito actual
```

Si el `CLAUDE.md` del proyecto no describe arquitectura ni convenciones útiles, el agente te lo dirá explícitamente y te sugerirá ejecutar `/init` antes de seguir, avisando de que si decides continuar sin ese contexto, la recomendación será genérica. A partir de ahí, puede pedirte una aclaración (por ejemplo, volumen de facturación esperado o necesidad de escalar de forma independiente) antes de comparar ambas opciones y posicionarse por una.

En ningún caso el agente escribirá el código del selector de idioma, del endpoint o del microservicio — solo te entrega la decisión razonada para que la implementes tú (o el agente de desarrollo que uses) después.

## Requisitos / configuración previa

- No requiere configuración de MCP ni variables de entorno adicionales.
- Para obtener recomendaciones ajustadas al proyecto (y no genéricas), conviene tener un `CLAUDE.md` en la raíz del repo (o en el directorio relevante) que describa el stack, la arquitectura y las convenciones — si no existe, el propio comando te avisará y sugerirá `/init`.
- El comando usa el modelo `claude-opus-4-8`; comprueba que tu configuración/plan de Claude Code tiene acceso a ese modelo.

## Notas relevantes

- El plugin solo define este único comando (`commands/superarchitect.md`); no incluye agents, hooks, skills ni `.mcp.json`.
- Las herramientas habilitadas (`Read`, `Glob`, `Grep`, `WebFetch`, `WebSearch`) permiten inspeccionar código y buscar información externa, pero deliberadamente excluyen `Edit`/`Write`/`Bash`, reforzando a nivel de configuración (no solo de instrucción) que el agente no puede modificar el repositorio.
