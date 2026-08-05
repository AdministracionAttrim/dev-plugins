---
name: java-language
description: Use this skill when writing Java 21 or 25 code, using records, sealed classes, pattern matching, switch expressions, text blocks, var, Optional, virtual threads, or StructuredTaskScope. Also use when discussing Java naming conventions or deciding which Java language feature to apply.
---

# Skill: Java 21 / 25

## Language Features — When to Use Each

### Records
Use for DTOs, value objects, and immutable data carriers.
```java
public record UserId(UUID value) {}
public record CreateUserRequest(String name, String email) {}
```
Do NOT use records for entities with mutable state or JPA `@Entity`.

### Sealed Classes + Pattern Matching
Use for closed domain hierarchies where all subtypes are known.
```java
public sealed interface PaymentResult
    permits PaymentResult.Success, PaymentResult.Failure {}

public record Success(String transactionId) implements PaymentResult {}
public record Failure(String reason) implements PaymentResult {}
```
Then exhaustive switch with no default needed:
```java
String message = switch (result) {
    case Success s -> "Paid: " + s.transactionId();
    case Failure f -> "Failed: " + f.reason();
};
```

### Switch Expressions
Replace if-else chains and old switch statements.
```java
// Good
String label = switch (status) {
    case ACTIVE   -> "Active";
    case INACTIVE -> "Inactive";
    case PENDING  -> "Pending";
};
```

### Text Blocks
Use for multiline SQL, JSON, or XML literals — never for short strings.
```java
String sql = """
        SELECT u.id, u.contactEmail
        FROM users u
        WHERE u.status = :status
        ORDER BY u.created_at DESC
        """;
```

### `var`
Use only when the type is unambiguous from the right-hand side.
```java
var users = userRepository.findAll();       // OK — return type is clear
var x = process();                          // NOT OK — unclear type
```

### `Optional<T>`
Use as return type when absence is a valid business state. Never pass as parameter.
```java
Optional<User> findByEmail(String email);   // Good
void process(Optional<User> user);          // Never do this
```

### Virtual Threads (Java 21+)
Prefer virtual threads for I/O-bound workloads. In Spring Boot 4, enabled by default.
```java
// In application.properties — already default in Spring Boot 4
spring.threads.virtual.enabled=true
```

### Structured Concurrency (Java 21+ preview / 25 stable)
Use `StructuredTaskScope` for parallel subtasks that must complete together.
```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var user    = scope.fork(() -> userService.findById(id));
    var account = scope.fork(() -> accountService.findByUserId(id));
    scope.join().throwIfFailed();
    return new UserProfile(user.get(), account.get());
}
```

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Class | PascalCase | `OrderService` |
| Interface | PascalCase, no `I` prefix | `PaymentGateway` |
| Method | camelCase, verb | `findActiveOrders()` |
| Constant | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Package | lowercase, no hyphens | `com.company.order.domain` |
| Record | PascalCase noun | `CreateOrderRequest` |

## What to Avoid

- `null` returns — use `Optional<T>`
- Raw types — always parameterize generics
- Checked exceptions for business logic — use unchecked
- `instanceof` without pattern variable — use pattern matching
- Magic numbers — extract to named constants
- Mutable static state
