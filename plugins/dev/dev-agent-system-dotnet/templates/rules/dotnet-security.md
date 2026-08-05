---
description: >
  Autenticación JWT/Keycloak, políticas de autorización por endpoint, y qué nunca debe loguearse o exponerse.
  Usar al tocar autenticación, autorización, controllers con [Authorize], o el middleware de logging.
---

# .NET Security

## Placeholders de este fichero (sustituir por proyecto, ver README del plugin)

`<INTERNAL_ROLE>` rol requerido en el token para el esquema interno. Los nombres de esquema/policy concretos y los valores esperados de `azp` son de configuración del proyecto (ver @rule:dual-port-auth si el proyecto tiene superficie pública+interna).

## i:

JWT Bearer contra Keycloak, con validación CUSTOM de claims en `OnTokenValidated` (audience/issuer no basta) | autorización por policy + atributo explícito en cada endpoint, no política implícita global | nunca leer el claim de usuario a pelo en el controller.

## T→A

T: validar un token → A: validar el claim `azp` contra el valor esperado del esquema | si es un esquema protegido, validar además que `resource_access.<CLIENT>.roles` contenga el rol requerido (`<INTERNAL_ROLE>`) | claves de firma resueltas del JWKS del issuer (`{issuer}/protocol/openid-connect/certs`)
T: proteger un controller/endpoint → A: `[Authorize(Policy = "...")]` + `[EnableCors("...")]` explícitos en cada controller | !!depender de una policy global implícita
T: extraer el usuario para auditoría (POST/PUT) → A: usar el helper único del proyecto (ej. `Utils.GetUserName(User)`, con fallback de claim `name` → `preferred_username` → `Unknown`) | !!leer `User.Claims` directamente en el controller
T: loguear o serializar una request/response → A: nunca token, contraseña ni PII sensible en bodies que pasen por el middleware de logging (persiste el body completo); blanquear el body si el endpoint es de payload grande o sensible
T: construir un DTO de respuesta → A: !!exponer tokens, claims crudos ni `resource_access` en el DTO

## @refs

@rule:dual-port-auth (si el proyecto expone superficie pública + interna con esquemas/puertos distintos)
@rule:request-logging (qué persiste el middleware y por qué hay que blanquear bodies sensibles)
