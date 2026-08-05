---
name: layered-feature-architecture
description: Use this skill when creating new domain modules, deciding where to place a new class, structuring packages inside a feature, adding controllers, services, repositories, DTOs, mappers or filters, or when reviewing package organization. This is the architecture used by this project.
---

# Skill: Layered-by-Feature Architecture

## Core Concept

Each domain feature is a self-contained package that groups all layers internally: controller, service, repository, entities, DTOs, mappers, and filters. Cross-cutting concerns (config, exception handling) live outside `domain/`.

```
src/main/java/com/company/myapp/
├── Application.java
├── config/                        # Cross-cutting: security, web, redis, feign, openapi, micrometer
├── domain/
│   ├── <feature>/                 # One package per bounded feature
│   │   ├── controller/            # @RestController — HTTP only, no business logic
│   │   ├── service/                # @Service — business logic, transactions
│   │   ├── repository/            # @Repository — JPA + Spring Data
│   │   ├── dao/                    # @Entity classes (JPA entities)
│   │   ├── dto/                    # Request/response DTOs, projections
│   │   ├── mapper/                 # MapStruct mappers (entity ↔ DTO)
│   │   └── filter/                 # FilterDto for dynamic queries
│   └── <anotherFeature>/
└── exception/                     # Global exception handler + custom exceptions
```

## Rules

### Package placement

| Class type | Package | Naming convention |
|---|---|---|
| REST controller | `domain/<feature>/controller/` | `<Feature>Controller` |
| Service | `domain/<feature>/service/` | `<Feature>Service` |
| Repository | `domain/<feature>/repository/` | `<Feature>Repository` |
| JPA entity | `domain/<feature>/dao/` | `<Feature>` (no suffix) |
| Request/response DTO | `domain/<feature>/dto/` | `<Feature>Dto`, `<Feature>FilterDto`, `<Feature>SummaryDto` |
| MapStruct mapper | `domain/<feature>/mapper/` | `<Feature>Mapper` |
| Feign client | `domain/<feature>/repository/` | `<ExternalSystem>ApiService` |

### When a feature is small

If a feature has only an entity and a repository (no controller, no service), flatten it — no sub-packages needed:

```
domain/county/
├── County.java
```

### When a feature grows

If a feature needs sub-strategies or sub-models, nest inside the feature:

```
domain/user/
├── controller/
├── service/
│   └── claim/                     # Strategy implementations
│       ├── ClaimRolesService.java
│       ├── AxisRolesService.java
│       └── SegitturRolesService.java
├── repository/
├── mapper/
└── model/
```

### Layer dependencies (strict top-down)

```
Controller → Service → Repository
```

- Controllers never call repositories directly.
- Services never return `ResponseEntity` or depend on HTTP concepts.
- Repositories never contain business logic.
- Cross-feature calls: `ServiceA` may inject `ServiceB`, never `RepositoryB`.

### Cross-cutting code

| Concern | Location |
|---|---|
| Security (OAuth2, JWT) | `config/SecurityConfig` |
| OpenAPI / Swagger | `config/OpenApi30Config` |
| Web (CORS, converters) | `config/WebConfig` |
| Redis cache | `config/RedisConfig` |
| Feign client config | `config/FeignConfig` |
| Micrometer / metrics | `config/micrometer/` |
| Global exception handler | `exception/GlobalExceptionHandler` |
| Custom exceptions | `exception/` or `exception/<category>/` |

### What NOT to do

- Do not create top-level `controller/`, `service/`, `repository/` packages — always nest inside `domain/<feature>/`.
- Do not place a class in a feature it does not belong to.
- Do not create `util/` or `helper/` packages unless there is no alternative.
- Do not add a `shared/` or `common/` package for one-off reuse — only if 3+ features depend on it.
