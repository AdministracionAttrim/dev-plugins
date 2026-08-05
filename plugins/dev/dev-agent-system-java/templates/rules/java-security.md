---
description: >
  OAuth2/JWT contra un proveedor OIDC, autorización por método con naming de permisos, multi-tenancy resuelto
  por contexto (nunca por el body), y filtrado por usuario vía subquery EXISTS. Usar al tocar autenticación,
  autorización, o cualquier query filtrada por tenant/usuario.
---

# Java Security

## i:

Autorización a nivel de método en TODOS los endpoints | el `tenantId` NUNCA se confía si viene en el body | el filtro de usuario por fila (`allowedUser`) solo se añade si existe un path single-valued hasta la entidad — si no existe, el filtro de tenant es el único mecanismo de aislamiento.

## T→A

T: autenticación → A: OAuth2 resource-server + JWT contra el proveedor OIDC del proyecto (Keycloak u otro) | cliente admin separado (credenciales SIEMPRE por variable de entorno) para operaciones administrativas sobre usuarios
T: proteger un endpoint → A: `@PreAuthorize("@hasAccess.withTenantPermission('<ENTIDAD>_<ACCIÓN>')")` en TODOS los endpoints, sin excepción | naming del permiso: `ENTIDAD_ACCION` en `UPPER_SNAKE_CASE` (`_DETAIL`, `_CREATE`, `_UPDATE`, `_DELETE`, `_LIST` — search y export comparten `_LIST`)
T: resolver el tenant de una request → A: filtro dedicado + helper `getTenant()` | !!leer/confiar en el `tenantId` que venga en el body del DTO — create/update lo SOBRESCRIBEN siempre desde el contexto
T: añadir un filtro de seguridad por usuario a nivel de fila → A: subquery `EXISTS` (`allowedUser(getUserId())`) navegando un path de asociaciones SINGLE-VALUED (ManyToOne/OneToOne) hasta la entidad que determina el acceso | verificar que ese path existe ANTES de añadirlo
T: la entidad no tiene un path single-valued hasta la entidad de acceso (o el path atraviesa una colección) → A: omitir `allowedUser` — el filtro de tenant (`hasFieldCtx(TENANT, getTenant())`) es el mecanismo de aislamiento correcto para catálogo/stock | !!añadirlo a ciegas (un segmento de colección genera un JOIN cartesiano que rompe la subquery, ver errores semilla del plugin)
T: manejar cualquier credencial/secreto → A: SIEMPRE variable de entorno | !!hardcodear un valor real como fallback en el propio código fuente bajo ningún concepto (ver nota de seguridad del README)

## @refs

@rule:java-package-architecture
