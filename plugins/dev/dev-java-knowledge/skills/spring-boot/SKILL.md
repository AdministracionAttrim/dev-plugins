---
name: spring-boot
description: Use this skill when working with Spring Boot 4, creating controllers, services, or repositories, configuring dependency injection, defining beans, using @ConfigurationProperties, handling exceptions with @RestControllerAdvice, publishing or listening to application events, configuring @Async, setting up Actuator endpoints, or enabling observability and virtual threads in Spring Boot.
---

# Skill: Spring Boot 4

## Project Structure — Two Valid Styles

There are two legitimate ways to organize a Spring Boot project. Do not force one onto a codebase that already committed to the other — pick per project, consistently.

### Style A: By Layer

```
src/main/java/com/example/myapp/
├── MyAppApplication.java          # @SpringBootApplication
├── config/                        # Configuration classes
├── controller/                    # REST controllers
├── service/                       # Business logic
│   └── impl/
├── repository/                    # Data access
├── model/                         # Entities
├── dto/
│   ├── request/
│   └── response/
├── exception/                     # Custom exceptions
└── util/
```

**Use when:** small projects, or microservices with a single, narrow responsibility where a handful of entities never accumulate into distinct domains.

### Style B: By Feature

```
src/main/java/com/company/
├── order/
│   ├── OrderController.java
│   ├── OrderService.java
│   ├── OrderRepository.java
│   ├── Order.java
│   └── dto/
│       ├── CreateOrderRequest.java
│       └── OrderResponse.java
├── user/
│   └── ...
└── shared/
    ├── exception/
    └── config/
```

**Use when:** the domain has many entities with real relationships between them (orders, users, payments, inventory) — grouping by feature keeps everything about one concept in one place and scales better as the codebase grows. Never organize as `controller/`, `service/`, `repository/` at the top level in this style.

For the detailed rules on package placement, when to flatten a small feature, when to nest a growing one, and where cross-cutting code lives, see the `layered-feature-architecture` skill — it is the reference for this style.

---

## Dependency Injection

Always use constructor injection. Use Lombok `@RequiredArgsConstructor` to avoid boilerplate.
```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
}
```

Never use `@Autowired` on fields. Never use setter injection unless required by a framework constraint.

---

## Controller Patterns

### REST Controller Template
```java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(
            @Valid @RequestBody CreateUserRequest request) {
        UserResponse created = userService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(created.getId())
            .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

### Controller Best Practices

| Practice | Example |
|----------|---------|
| Versioned API | `/api/v1/users` |
| Plural nouns | `/users` not `/user` |
| HTTP methods | GET=read, POST=create, PUT=update, DELETE=delete |
| Status codes | 200=OK, 201=Created, 204=NoContent, 404=NotFound |
| Validation | `@Valid` on request body |

See `api-design` for the full REST conventions (status codes, pagination, versioning, OpenAPI).

### ❌ Anti-patterns
```java
// ❌ Business logic in controller
@PostMapping
public User create(@RequestBody User user) {
    user.setCreatedAt(LocalDateTime.now());  // Logic belongs in service
    return userRepository.save(user);         // Direct repo access
}

// ❌ Returning entity directly (exposes internals)
@GetMapping("/{id}")
public User getById(@PathVariable Long id) {
    return userRepository.findById(id).get();
}
```

---

## Service Patterns

### Service Interface + Implementation
```java
// Interface
public interface UserService {
    List<UserResponse> findAll();
    UserResponse findById(Long id);
    UserResponse create(CreateUserRequest request);
    UserResponse update(Long id, UpdateUserRequest request);
    void delete(Long id);
}

// Implementation
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)  // Default read-only
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
            .map(userMapper::toResponse)
            .toList();
    }

    @Override
    public UserResponse findById(Long id) {
        return userRepository.findById(id)
            .map(userMapper::toResponse)
            .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @Override
    @Transactional  // Write transaction
    public UserResponse create(CreateUserRequest request) {
        User user = userMapper.toEntity(request);
        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User", id);
        }
        userRepository.deleteById(id);
    }
}
```

### Service Best Practices

- Interface + Impl for testability
- `@Transactional(readOnly = true)` at class level
- `@Transactional` for write methods
- Throw domain exceptions, not generic ones
- Use mappers (MapStruct) for entity ↔ DTO conversion

---

## Repository Patterns

Extend `JpaRepository` and add derived or `@Query` methods as needed. This skill covers only how repositories fit into the layer structure — for entity design, fetch strategies, N+1 prevention, projections, transactions, and migrations, see `persistence`.

```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
```

---

## DTO Patterns

### Request/Response DTOs
```java
// Request DTO with validation
public record CreateUserRequest(
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100)
    String name,

    @NotBlank
    @Email(message = "Invalid email format")
    String email,

    @NotNull
    @Min(18)
    Integer age
) {}

// Response DTO
public record UserResponse(
    Long id,
    String name,
    String email,
    LocalDateTime createdAt
) {}
```

### MapStruct Mapper
```java
@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User entity);

    List<UserResponse> toResponseList(List<User> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    User toEntity(CreateUserRequest request);
}
```

---

## Configuration

Use typed configuration classes instead of `@Value` scattered across beans. Prefer a `record` bound with `@ConfigurationProperties`:

```java
@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(
    String gatewayUrl,
    Duration timeout,
    int maxRetries
) {}
```
Enable with `@EnableConfigurationProperties(PaymentProperties.class)` or `@ConfigurationPropertiesScan`.

When validation is required on the bound properties, a `@Validated` class-based alternative also works:
```java
@Configuration
@ConfigurationProperties(prefix = "app.jwt")
@Validated
public class JwtProperties {

    @NotBlank
    private String secret;

    @Min(60000)
    private long expiration;

    // getters and setters
}
```

### Profile-Specific Configuration
```
src/main/resources/
├── application.yml           # Common config
├── application-dev.yml       # Development
├── application-test.yml      # Testing
└── application-prod.yml      # Production
```

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate  # Never 'create' in production!
    show-sql: false
```

---

## Exception Handling

Centralize with `@RestControllerAdvice`. Never handle HTTP errors inside service classes.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(EntityNotFoundException ex) {
        return new ErrorResponse(ex.getMessage());
    }
}
```

See `error-handling` for the full exception hierarchy, consistent error response format, and the `Result` type pattern — do not duplicate that here.

---

## Application Events

Use Spring Events for decoupling side effects from core logic.
```java
// Publishing
applicationEventPublisher.publishEvent(new OrderCreatedEvent(order.getId()));

// Listening
@EventListener
@Async
public void onOrderCreated(OrderCreatedEvent event) {
    notificationService.notifyUser(event.orderId());
}
```

---

## Async

Enable with `@EnableAsync`. Use `@Async` only for fire-and-forget side effects. For results, prefer `CompletableFuture` or Structured Concurrency. See `concurrency` for the full list of `@Async` pitfalls (proxy bypass, non-public methods, default executor, SecurityContext propagation).

---

## Actuator & Observability

Always include in production projects:
```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when-authorized
```

See `observability` for structured logging, MDC, Micrometer metrics, distributed tracing, and custom health indicators — this skill only covers exposing the endpoints.

---

## Virtual Threads (Spring Boot 4 default)

Already enabled by default in Spring Boot 4. Do not configure manually unless overriding.
```properties
# Only needed if you need to disable it
spring.threads.virtual.enabled=false
```

---

## Common Annotations Quick Reference

| Annotation | Purpose |
|------------|---------|
| `@RestController` | REST controller (combines @Controller + @ResponseBody) |
| `@Service` | Business logic component |
| `@Repository` | Data access component |
| `@Configuration` | Configuration class |
| `@RequiredArgsConstructor` | Lombok: constructor injection |
| `@Transactional` | Transaction management |
| `@Valid` | Trigger validation |
| `@ConfigurationProperties` | Bind properties to class |
| `@Profile("dev")` | Profile-specific bean |
| `@Scheduled` | Scheduled tasks |

---

## Testing

See the `testing` skill for controller slice tests (`@WebMvcTest`), service unit tests with Mockito, and integration tests with Testcontainers — examples are not duplicated here.

---

## What to Avoid

- `@Autowired` on fields
- Business logic inside `@Controller` or `@RestController`
- Catching exceptions in service layer to return null or empty
- `@Transactional` on private methods (Spring proxy won't intercept)
- `@Transactional` on controller layer
- Returning entities directly from controllers — always use DTOs
