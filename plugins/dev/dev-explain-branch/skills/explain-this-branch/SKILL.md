---
name: explain-this-branch
description: Genera una descripción en markdown de los cambios de la rama actual frente a develop, orientada al reviewer y lista para pegar en la MR/PR. Opcionalmente, con el flag --azure=<ID>, genera además un resumen técnico (endpoints, DTOs y cambios realizados) y lo publica como comentario en el work item de Azure DevOps correspondiente, previa confirmación del usuario. Invocar con /explain-this-branch [rama-base opcional, default develop] [--azure=<ID>].
---

# Explain This Branch

Genera una descripción en markdown de lo que aporta la rama actual frente a la rama base, orientada al reviewer y lista para copiar y pegar en la descripción de una Merge/Pull Request. El criterio central es: solo entra lo que cambia cómo el reviewer revisa o qué debe vigilar. Se usa formato enriquecido (diagramas, tablas) únicamente cuando comunica más rápido que la prosa.

Opcionalmente, si se indica el flag `--azure=<ID>`, la skill genera además un segundo texto — más técnico, orientado a trazabilidad de la HU — y lo publica como comentario en ese work item de Azure DevOps, siempre mostrándolo antes al usuario para confirmación.

Esta skill **no es una revisión de código**: no hay que evaluar la calidad de los cambios ni proponer correcciones o mejoras.

Es agnóstica de stack: el análisis se basa en `git log`/`git diff`, no en leer código fuente del proyecto. El modo Azure DevOps sí tiene patrones de extracción concretos que hay que adaptar al stack (ver esa sección).

## Cuándo se activa

- El usuario escribe `/explain-this-branch` (con una rama base opcional y/o `--azure=<ID>` como argumentos).
- El usuario pide algo equivalente en lenguaje natural: "explica la rama", "descripción para la MR", "qué se mergea", etc.
- Si además pide publicar/comentar en Azure DevOps o en la HU ("publícalo en la HU 1099", "coméntalo en Azure", "añádelo al work item 1099"), se activa también el modo Azure DevOps descrito más abajo, con el ID de la HU que indique.

## Pasos

1. **Determinar la rama base**: usar la que pase el usuario como argumento; si no pasa ninguna, usar `develop` (o `main`/`master` si el proyecto no usa `develop` — confirmar con el usuario si no es obvio).
2. **Determinar si hay modo Azure DevOps**: si el usuario pasa `--azure=<ID>` o pide explícitamente publicar en una HU/work item con un ID, extraer ese ID numérico. Si pide el modo Azure pero no da ningún ID, preguntar por él antes de continuar — sin ID no hay dónde comentar.
3. **Entender el alcance** con dos comandos git:
    - `git log <base>..HEAD --oneline` — los commits de la rama.
    - `git diff <base>...HEAD --stat` — los ficheros tocados y el volumen del cambio.
4. **Solo si eso no basta** (commits con mensajes crípticos, o intención que no se deduce de los paths y el stat): hacer un `git diff <base>...HEAD -- <rutas-clave>` dirigido a los ficheros concretos que falten por entender. No leer ficheros completos del proyecto ni lanzar subagentes para esto — el log y el stat son suficientes en la gran mayoría de los casos.
5. **Filtrar señal de ruido** aplicando el filtro de valor para el reviewer (sección siguiente), y agrupar lo que quede por módulo o funcionalidad — nunca commit por commit.
6. **Valorar un diagrama** si hay un cambio estructural (split de un servicio, nueva cadena de capas, nuevo flujo entre servicios o integraciones, extracción de clases a una librería compartida) — ver la caja de herramientas de markdown.
7. **Emitir el resultado de la MR** como un bloque de código markdown copiable directamente en el chat. No crear ningún fichero ni hacer ningún commit.
8. **Si hay modo Azure DevOps activo**, continuar con la sección "Modo Azure DevOps" a partir de la información ya recopilada en los pasos 3-4 (no repetir el análisis git desde cero).

Sobre los cambios sin commitear del working tree: por defecto se ignoran y se describen solo los commits. Únicamente se incluyen si el usuario lo pide expresamente, y en ese caso marcándolos como "pendiente de commit".

## Filtro de valor para el reviewer (el núcleo de la skill, aplica a la MR)

Por cada grupo de cambios, hacerse la pregunta de corte: **¿esto cambia CÓMO el reviewer revisa o QUÉ debe vigilar?** Si la respuesta es no, fuera.

**Incluir:**

- Cambios de comportamiento visibles para el consumidor de la API (nuevos endpoints, cambios en el contrato REST/GraphQL: paths, DTOs/tipos, códigos de respuesta, validaciones).
- Migraciones de base de datos y cualquier cambio de esquema.
- Cambios en una librería/paquete compartido entre proyectos (entidades, DTOs, enums, excepciones, tipos) — afectan a otros consumidores del paquete.
- Cambios de arquitectura o de flujo (qué componente/servicio llama a qué ahora, nuevas integraciones externas, nuevas colas/eventos).
- Cambios de seguridad: permisos, guards, filtros de tenant, roles.
- Breaking changes y renombrados que afecten a los imports de otros.
- Decisiones no obvias que el diff no explica por sí solo.
- Zonas de riesgo concretas: dónde mirar primero, qué puede romperse (transacciones, N+1, queries pesadas, renders innecesarios).

**Excluir — sin mencionarlos siquiera, aunque estén en el diff:**

- Documentación interna del proyecto (wiki, knowledge-log, changelogs internos).
- `.claude/*`, `.agents/*`, rules, skills y demás tooling interno del agente.
- Lint, formato, imports reordenados y renames mecánicos sin cambio de lógica.
- Tests y fixtures que solo acompañan al código cambiado (sí se mencionan si cambia QUÉ se testea o si la estrategia de datos de test es una decisión relevante).
- Claves i18n que solo acompañan a un cambio ya descrito.
- "Ajustes menores" genéricos: si no se puede decir qué riesgo cubren, no van.

**Excepción**: si lo excluido es precisamente el objetivo de la rama (una rama de documentación o de tooling), entonces explicarlo es el contenido de la descripción.

## Caja de herramientas de markdown (para la MR)

Cada elemento de formato se tiene que ganar su sitio. El default es prosa con bullets; el formato extra solo se usa si comunica más rápido que el texto.

- **Diagrama `mermaid`** (graph/flowchart): solo ante un split o merge de componentes, un nuevo flujo de datos o una cadena de llamadas entre servicios/integraciones. Mostrar el antes→después o el flujo resultante. Máximo 1 diagrama por MR, con 12 nodos como mucho, y con los nombres reales del código en los nodos — nunca cajas genéricas tipo "Servicio A" o "Componente".
- **Tabla `antes | ahora`**: para renombrados o movimientos masivos con un patrón claro (p. ej. clases movidas a una librería compartida, paquetes reorganizados). Compacta (8 filas como máximo, agrupando por patrón), nunca una fila por archivo.
- **Bloque colapsable `<details><summary>`**: para contexto útil pero secundario, como la lista larga de entidades afectadas o el detalle de una migración.
- **Backticks**: siempre para identificadores, paths, endpoints y APIs.
- **Alerta destacada** (`> [!warning]` en GitHub/GitLab): para el punto crítico que el reviewer no debe pasar por alto (migración irreversible, cambio de contrato que rompe al consumidor, despliegue que requiere paso manual), con el texto en la línea siguiente del blockquote. No usar `**⚠**` ni emojis como marcador (el render es inconsistente entre plataformas). Máximo 1-2 alertas por MR.

Evitar siempre: emojis decorativos, headers anidados a más de 3 niveles, tablas donde una frase basta, y diagramas mermaid para flujos triviales (A llama a B).

**Cuidado con los fences anidados**: si la salida contiene un fence interno (```` ```mermaid ````, ```` ```diff ```` o cualquier otro), el bloque exterior copiable debe abrirse y cerrarse con CUATRO backticks (`````markdown ... `````). Nunca anidar tres backticks dentro de tres backticks — el fence interno cerraría el bloque exterior y rompería el copiado. Antes de emitir, verificar que todo fence abierto tiene su cierre.

## Formato de salida (MR)

````
```markdown
## ¿Qué incluye esta MR?

<2-3 frases: qué problema resuelve la rama y por qué se aborda así>

<diagrama mermaid: solo si hay cambio estructural — ver caja de herramientas>

### Cambios principales

- **<Módulo/Área>**: <qué cambió, para qué sirve, 1-2 líneas>
- ...

### Notas para el reviewer

- <dónde mirar primero | qué puede romperse | decisiones no obvias>
```
````

## Reglas del resultado (MR)

- Entre 100 y 350 palabras de prosa (los diagramas mermaid y las tablas no cuentan para el límite), en el idioma del equipo, con markdown válido para la plataforma usada (GitHub/GitLab soportan mermaid).
- Cero menciones a wiki, knowledge-log o tooling del agente, salvo la excepción del filtro (rama cuyo objetivo es eso).
- No listar los cambios archivo por archivo: agrupar por módulo o feature.
- No copiar los mensajes de commit tal cual: sintetizar la intención del conjunto.
- Omitir detalles triviales (lint, formato, imports) salvo que sean el objetivo de la rama.
- La sección "Notas para el reviewer" solo se incluye si aporta algo. Si quedaría vacía, se omite entera.
- Cada bullet de la descripción debe pasar la pregunta de corte del filtro de valor.

## Estilo y audiencia (MR)

El texto va dirigido a un desarrollador de nivel medio, así que:

- Lenguaje natural, directo y comprensible. Explicar qué hace el cambio y para qué sirve.
- Nada de jerga inflada ("única fuente de verdad", "comportamiento equivalente", "centralizar la serialización") ni tecnicismos innecesarios.
- Si un tecnicismo es imprescindible, acompañarlo de una frase llana la primera vez que aparezca.
- Los identificadores, nombres de clases y APIs se escriben en su forma original (sin traducir ni parafrasear).

---

## Modo Azure DevOps (flag `--azure=<ID>`)

Este modo es aditivo: no sustituye la descripción de la MR, se genera después de ella y usa el mismo análisis git ya hecho. Tiene su propio filtro de contenido, distinto al de la MR, porque la audiencia y el propósito son distintos: aquí el objetivo es dejar trazabilidad técnica en la HU, no guiar una revisión de código.

### Configuración de proyecto (primer uso)

Este modo asume: (a) el proyecto rastrea trabajo en Azure Boards, y (b) existe un script para publicar comentarios vía API (se incluye uno en `scripts/add-work-item-comment.mjs`, ver más abajo). Requiere las variables de entorno `AZURE_ORG`, `AZURE_PROJECT` y `AZURE_PAT` (PAT con permiso de escritura en comentarios de work items) — en `.env.local` o exportadas en el entorno. Si tu equipo no usa Azure DevOps, este modo no aplica: usa solo el modo MR.

### Filtro de contenido del comentario (más técnico que el de la MR)

A diferencia de la MR, aquí SÍ interesa el detalle técnico aunque no cambie el contrato público. Por cada grupo de cambios:

**Incluir siempre que exista:**

- **Endpoints afectados**: método HTTP + ruta de cualquier endpoint nuevo o modificado en los controllers/handlers tocados por la rama. Extraer con `git diff <base>...HEAD` filtrado a los ficheros de controller/handler del stack del proyecto — adaptar el patrón: Java Spring (`'**/*Controller.java'`), .NET (`'**/Controllers/**/*.cs'`), NestJS (`'**/*.controller.ts'`), Express/Fastify (rutas registradas explícitamente, buscar por `router.`/`app.`), etc.
- **DTOs/tipos afectados**: cualquier tipo de request/response nuevo, modificado o eliminado. Indicar cuál de las tres cosas es cada uno. Adaptar el patrón de búsqueda al stack: Java (`'**/dto/**' '**/*Dto.java' '**/*DTO.java' '**/*Request.java' '**/*Response.java'`), .NET (`'**/*Dtos.cs' '**/*Request.cs' '**/*Response.cs'`), TypeScript (`'**/*.dto.ts' '**/dto/**'`) — ajustar a la estructura real de paquetes que aparezca en el `--stat`.
- **Resumen técnico del cambio**: qué se ha corregido o implementado y cómo, a nivel de servicio/clase/query — puede nombrar clases/funciones concretas y decisiones de implementación que en la MR se habrían omitido por ser "obvias para el reviewer del propio equipo", porque quien lee la HU en Azure puede no tener el diff delante.
- Migraciones de base de datos relevantes (mismo criterio que en la MR).

**Excluir igualmente:**

- Lint, formato, imports reordenados, renames mecánicos sin cambio de lógica.
- Documentación interna, tooling del agente (`.claude/*`, `.agents/*`), salvo que sea el objetivo de la rama.
- Mensajes de commit copiados tal cual.

### Pasos del modo Azure DevOps

1. Con la información de `git log`/`git diff` ya obtenida, construir el texto del comentario siguiendo el filtro de contenido anterior y el formato de salida de abajo.
2. **Mostrar el texto exacto que se va a publicar** en un bloque de código en el chat, dejando claro que es una previsualización y pidiendo confirmación explícita antes de publicarlo (p. ej. "¿Confirmas que publique este comentario en la HU #<ID>?"). No publicar nada todavía en este paso.
3. **Esperar la confirmación del usuario.** Si el usuario pide cambios, ajustar el texto y volver a mostrarlo antes de publicar. Solo se publica ante una confirmación explícita (sí, confirma, publícalo, adelante...); un silencio o un mensaje ambiguo no cuenta como confirmación.
4. Comprobar que existen las variables de entorno `AZURE_ORG`, `AZURE_PROJECT` y `AZURE_PAT`. Si falta alguna, avisar al usuario y detenerse — **nunca** usar ni pedir un token hardcodeado en la conversación, ni escribirlo en ningún fichero del repo.
5. Escribir el texto ya confirmado a un fichero temporal en markdown simple, y publicarlo con el script incluido en este skill:

   ```bash
   node scripts/add-work-item-comment.mjs <ID> /tmp/azure-comment-<ID>.md
   ```

   No construir el comentario como un string inline en `curl`/bash: el texto puede contener backticks (identificadores de código) y comillas, y el shell los interpretaría (p. ej. un backtick dentro de comillas dobles se lee como sustitución de comandos). El script hace la conversión de markdown simple (negrita, código inline, listas) a HTML — que es lo que espera la API de comentarios — y usa `JSON.stringify` para escapar el texto de forma segura, sin pasar por el shell.

   Si se quiere verificar el HTML resultante antes de publicar (por encima de la previsualización en markdown ya mostrada al usuario), se puede ejecutar primero con `--dry-run`.

6. Confirmar al usuario que se ha publicado, indicando el ID de la HU y el enlace que devuelve el script. Si la llamada falla, mostrar el error tal cual lo devuelve el script y no reintentar automáticamente.

### Formato de salida (comentario Azure DevOps)

Al usuario se le muestra así, en markdown legible — este es también el contenido exacto que se escribe en el fichero temporal para `scripts/add-work-item-comment.mjs`, que se encarga de convertirlo a HTML antes de publicarlo:

```markdown
**Resumen técnico**

<2-4 frases: qué se ha implementado o corregido y por qué, a nivel técnico>

**Endpoints afectados**

- `<MÉTODO> <ruta>` — <nuevo | modificado | eliminado>
- ...

**DTOs/tipos afectados**

- `<Nombre>` — <nuevo | modificado | eliminado>
- ...

**Otros cambios relevantes**

- <migraciones, cambios de esquema, etc. — solo si aplica>
```

Si alguna sección quedaría vacía (p. ej. no hay DTOs afectados), se omite esa sección entera en vez de dejarla en blanco.

### Reglas del resultado (comentario Azure DevOps)

- Prosa breve: 2-4 frases en el resumen técnico, el resto en listas.
- En el idioma del equipo, salvo identificadores de código (paths, nombres de clase, DTOs), que van en su forma original.
- No se publica nunca sin haber mostrado antes el texto exacto y recibido confirmación explícita.
- No se publica nunca si `AZURE_ORG`/`AZURE_PROJECT`/`AZURE_PAT` no están disponibles.
- No se listan endpoints o DTOs que no aparezcan en el diff real — nada de inventar ni de generalizar ("se han tocado varios DTOs").
- **Nunca hardcodear el PAT ni ningún otro secreto** en el script, en la conversación, ni en ningún fichero del repo — siempre `process.env`.
