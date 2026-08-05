---
name: error-handling
description: Use this skill when defining custom exception hierarchies, implementing a GlobalExceptionHandler with @RestControllerAdvice, designing consistent error response formats, using the Result type for explicit error handling, adding retry logic with exponential backoff, or deciding how to propagate and handle errors across layers.
---

# Skill: Error Handling — Java 21 + Spring Boot

## Exception Hierarchy

Define a clear hierarchy of business exceptions.

```java
// Base unchecked exception for the application
public class AppException extends RuntimeException {
    private final String errorCode;

    public AppException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public AppException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}

// Domain exceptions — business rule violations
public class DomainException extends AppException {
    public DomainException(String message) {
        super(message, "DOMAIN_VIOLATION");
    }
}

// Resource not found
public class ResourceNotFoundException extends AppException {
    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " not found with id: " + id, "RESOURCE_NOT_FOUND");
    }
}

// Conflict (duplicate, state violation)
public class ConflictException extends AppException {
    public ConflictException(String message) {
        super(message, "CONFLICT");
    }
}

// External service failures
public class ExternalServiceException extends AppException {
    public ExternalServiceException(String service, String message, Throwable cause) {
        super("External service [" + service + "] failed: " + message,
              "EXTERNAL_SERVICE_ERROR", cause);
    }
}

// Authorization violations
public class AccessDeniedException extends AppException {
    public AccessDeniedException(String resource) {
        super("Access denied to: " + resource, "ACCESS_DENIED");
    }
}
```

---

## Global Exception Handler

Single place to translate exceptions to HTTP responses.

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new FieldError(e.getField(), e.getDefaultMessage()))
            .toList();
        return ErrorResponse.validation(errors);
    }

    // Business rule violations
    @ExceptionHandler(DomainException.class)
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public ErrorResponse handleDomain(DomainException ex) {
        return ErrorResponse.of(ex.getMessage(), ex.getErrorCode());
    }

    // Resource not found
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return ErrorResponse.of(ex.getMessage(), ex.getErrorCode());
    }

    // Conflict
    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleConflict(ConflictException ex) {
        return ErrorResponse.of(ex.getMessage(), ex.getErrorCode());
    }

    // External service errors
    @ExceptionHandler(ExternalServiceException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public ErrorResponse handleExternalService(ExternalServiceException ex) {
        log.error("External service failure", ex);
        return ErrorResponse.of("External service unavailable", ex.getErrorCode());
    }

    // Access denied
    @ExceptionHandler({AccessDeniedException.class,
                       org.springframework.security.access.AccessDeniedException.class})
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ErrorResponse handleAccessDenied(Exception ex) {
        return ErrorResponse.of("Access denied", "ACCESS_DENIED");
    }

    // Catch-all — never expose internal details
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return ErrorResponse.of("An unexpected error occurred", "INTERNAL_ERROR");
    }
}
```

---

## Error Response Format

Consistent across all endpoints.

```java
public record ErrorResponse(
    String message,
    String code,
    Instant timestamp,
    List<FieldError> fieldErrors
) {
    public static ErrorResponse of(String message, String code) {
        return new ErrorResponse(message, code, Instant.now(), List.of());
    }

    public static ErrorResponse validation(List<FieldError> errors) {
        return new ErrorResponse(
            "Validation failed", "VALIDATION_ERROR", Instant.now(), errors
        );
    }
}

public record FieldError(String field, String message) {}
```

Example response:
```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-15T10:30:00Z",
  "fieldErrors": [
    { "field": "contactEmail", "message": "must be a valid contactEmail address" },
    { "field": "name", "message": "must not be blank" }
  ]
}
```

---

## Result Type for Explicit Error Handling

For operations where failure is a valid business outcome (not an exception).

```java
public sealed interface Result<T> permits Result.Success, Result.Failure {

    record Success<T>(T value) implements Result<T> {}
    record Failure<T>(String reason, String code) implements Result<T> {}

    static <T> Result<T> success(T value) { return new Success<>(value); }
    static <T> Result<T> failure(String reason, String code) {
        return new Failure<>(reason, code);
    }

    default boolean isSuccess() { return this instanceof Success; }

    default T getOrThrow() {
        return switch (this) {
            case Success<T> s -> s.value();
            case Failure<T> f -> throw new AppException(f.reason(), f.code());
        };
    }
}

// Usage in service
public Result<Order> createOrder(CreateOrderCommand command) {
    if (!inventoryService.hasStock(command.items())) {
        return Result.failure("Insufficient stock", "STOCK_UNAVAILABLE");
    }
    var order = Order.create(command.customerId(), command.items());
    return Result.success(orderRepository.save(order));
}

// Usage in controller
public ResponseEntity<?> create(@RequestBody @Valid CreateOrderRequest request) {
    return switch (orderService.createOrder(request.toCommand())) {
        case Result.Success<Order> s ->
            ResponseEntity.created(locationOf(s.value())).body(OrderResponse.from(s.value()));
        case Result.Failure<Order> f ->
            ResponseEntity.unprocessableEntity()
                         .body(ErrorResponse.of(f.reason(), f.code()));
    };
}
```

---

## Retry with Exponential Backoff

For transient failures in external calls.

```java
@Service @RequiredArgsConstructor
public class ResilientPaymentService {

    private final PaymentGateway paymentGateway;

    private static final int MAX_ATTEMPTS = 3;
    private static final Duration INITIAL_DELAY = Duration.ofMillis(500);

    public PaymentResult chargeWithRetry(UUID orderId, Money amount, PaymentMethod method) {
        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return paymentGateway.charge(orderId, amount, method);
            } catch (TransientPaymentException e) {
                lastException = e;
                log.warn("Payment attempt {} failed, retrying...", attempt);
                if (attempt < MAX_ATTEMPTS) {
                    sleep(INITIAL_DELAY.multipliedBy((long) Math.pow(2, attempt - 1)));
                }
            }
        }
        throw new ExternalServiceException("payment-gateway",
            "Failed after " + MAX_ATTEMPTS + " attempts", lastException);
    }
}
```

Or with Spring Retry:
```java
@Retryable(
    retryFor = TransientPaymentException.class,
    maxAttempts = 3,
    backoff = @Backoff(delay = 500, multiplier = 2)
)
public PaymentResult charge(UUID orderId, Money amount, PaymentMethod method) {
    return paymentGateway.charge(orderId, amount, method);
}

@Recover
public PaymentResult recoverCharge(TransientPaymentException ex, UUID orderId, ...) {
    log.error("Payment failed after all retries for order {}", orderId, ex);
    throw new ExternalServiceException("payment-gateway", ex.getMessage(), ex);
}
```

---

## Rules

- Never catch `Exception` in service classes to swallow it — let it propagate
- Never return `null` on error — throw or return `Result.Failure`
- Never expose stack traces or internal details in error responses
- Log unexpected errors at `ERROR` level with full stack trace
- Log expected business errors at `WARN` or `INFO` level — no stack trace needed
- Always include an `errorCode` in the response for programmatic handling by clients
- Checked exceptions only for truly recoverable infrastructure operations — everything else unchecked
