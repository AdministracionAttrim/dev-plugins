---
name: api-design
description: Use this skill when designing or implementing REST APIs, writing controllers, defining request and response DTOs with records, choosing HTTP status codes, implementing pagination with Pageable, validating request bodies with Bean Validation, versioning APIs, configuring OpenAPI or Swagger documentation, or structuring error responses.
---

# Skill: API Design — REST with Spring Boot

## Controller Structure

Controllers handle HTTP only: routing, request parsing, response mapping.
No business logic. No repository calls.

```java
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @RequestBody @Valid CreateOrderRequest request) {
        var order = orderService.create(request);
        var location = URI.create("/api/v1/orders/" + order.id());
        return ResponseEntity.created(location).body(order);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        orderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

## DTOs

Use records for request and response objects. Validate requests with Bean Validation.
```java
public record CreateOrderRequest(
    @NotNull UUID userId,
    @NotEmpty List<@Valid OrderItemRequest> items
) {}

public record OrderItemRequest(
    @NotNull UUID productId,
    @Positive int quantity
) {}

public record OrderResponse(
    UUID id,
    String status,
    List<OrderItemResponse> items,
    Instant createdAt
) {}
```

Never expose `@Entity` objects as API responses.

## HTTP Status Codes

| Scenario | Status |
|---|---|
| Successful GET / PUT | 200 OK |
| Successful POST (created resource) | 201 Created + Location header |
| Successful DELETE / action with no body | 204 No Content |
| Validation error | 400 Bad Request |
| Unauthenticated | 401 Unauthorized |
| Authenticated but forbidden | 403 Forbidden |
| Resource not found | 404 Not Found |
| Conflict (duplicate, etc.) | 409 Conflict |
| Unhandled server error | 500 Internal Server Error |

## Error Response Format

Consistent error body across all endpoints:
```java
public record ErrorResponse(
    String message,
    String code,
    Instant timestamp
) {
    public static ErrorResponse of(String message, String code) {
        return new ErrorResponse(message, code, Instant.now());
    }
}
```

## Pagination

Use `Pageable` for list endpoints that can return large datasets.
```java
@GetMapping
public ResponseEntity<Page<OrderResponse>> findAll(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
        Pageable pageable) {
    return ResponseEntity.ok(orderService.findAll(pageable));
}
```

## Versioning

Version via URL path prefix (`/api/v1/`). Do not version via headers or query params.
When breaking changes are needed, create a new version package — do not modify existing.

## Validation

Activate with `@Valid` on `@RequestBody`. Handle `MethodArgumentNotValidException` in `GlobalExceptionHandler`.
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
@ResponseStatus(HttpStatus.BAD_REQUEST)
public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ErrorResponse.of(message, "VALIDATION_ERROR");
}
```

## OpenAPI / Swagger

Include SpringDoc for automatic API documentation:
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.x</version>
</dependency>
```

Annotate controllers with `@Tag` and endpoints with `@Operation` only when the generated name is not clear enough.

## What to Avoid

- Business logic in controllers
- Returning entities from controllers
- `200 OK` for resource creation (use `201 Created`)
- Swallowing exceptions and returning empty 200 responses
- `@RequestMapping` without HTTP method — always use `@GetMapping`, `@PostMapping`, etc.
