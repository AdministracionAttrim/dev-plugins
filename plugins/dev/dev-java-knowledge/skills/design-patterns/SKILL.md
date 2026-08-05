---
name: design-patterns
description: Use this skill when deciding which design pattern to apply, implementing Strategy, Builder, Factory, Repository, Decorator, Observer, Specification or Command patterns, or when reviewing code to identify which pattern would improve its structure. Do not apply patterns unless the context genuinely fits.
---

# Skill: Design Patterns — Java

## Guiding Principle

**Do not apply patterns unless the context genuinely fits.** A pattern introduced too early is an unnecessary abstraction — see `clean-code`'s "Avoid Premature Abstraction". Each section below states when the pattern earns its complexity, and when a plain method or `if/else` is still the better choice.

---

## Strategy

**When:** multiple interchangeable algorithms for the same operation, selected at runtime, and the set of algorithms is expected to grow.
**When NOT:** only one or two variants that never change — a simple `if/else` is clearer.

This is the same problem solved in `solid-principles` under Open/Closed — see the `DiscountStrategy` example there for a complete walkthrough (interface + multiple implementations + a calculator that depends only on the abstraction). Use that as the reference implementation; the shape is:

```java
public interface DiscountStrategy {
    double calculate(Order order);
    boolean supports(String discountType);
}
// One implementing class per algorithm, injected as a List<DiscountStrategy>
```

---

## Builder

**When:** an object has many optional parameters, or construction requires several steps that should read fluently.
**When NOT:** a class with 2-3 required fields — a constructor or a record is simpler.

```java
public class HttpRequestSpec {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final Duration timeout;

    private HttpRequestSpec(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.headers = Map.copyOf(b.headers);
        this.timeout = b.timeout;
    }

    public static Builder builder(String url) { return new Builder(url); }

    public static class Builder {
        private final String url;
        private String method = "GET";
        private final Map<String, String> headers = new HashMap<>();
        private Duration timeout = Duration.ofSeconds(30);

        private Builder(String url) { this.url = url; }

        public Builder method(String method) { this.method = method; return this; }
        public Builder header(String key, String value) { headers.put(key, value); return this; }
        public Builder timeout(Duration timeout) { this.timeout = timeout; return this; }
        public HttpRequestSpec build() { return new HttpRequestSpec(this); }
    }
}

// Usage
var request = HttpRequestSpec.builder("https://api.example.com/orders")
    .method("POST")
    .header("Authorization", "Bearer " + token)
    .timeout(Duration.ofSeconds(5))
    .build();
```

For simple immutable data carriers, prefer a `record` over a hand-written builder — only reach for Builder when there are several optional fields or a fluent multi-step construction reads better than a telescoping constructor.

---

## Factory

**When:** object creation logic is non-trivial (selecting a concrete type based on input, assembling dependencies) and that logic would otherwise leak into business code.
**When NOT:** a plain `new SomeClass()` is already clear — do not wrap trivial construction in a factory "for consistency".

```java
public interface NotificationSender {
    void send(String recipient, String message);
}

@Component
public class NotificationSenderFactory {
    private final Map<String, NotificationSender> sendersByChannel;

    public NotificationSenderFactory(List<NotificationSender> senders) {
        this.sendersByChannel = senders.stream()
            .collect(Collectors.toMap(s -> s.getClass().getSimpleName(), s -> s));
    }

    public NotificationSender forChannel(String channel) {
        return switch (channel) {
            case "EMAIL" -> sendersByChannel.get("EmailNotificationSender");
            case "SMS"   -> sendersByChannel.get("SmsNotificationSender");
            default -> throw new IllegalArgumentException("Unsupported channel: " + channel);
        };
    }
}
```

In Spring, dependency injection often replaces the classic Factory pattern entirely — injecting a `List<Strategy>` or a `Map<String, Strategy>` (as above) is usually simpler than a dedicated factory class.

---

## Repository

**When:** abstracting persistence access behind a domain-oriented interface so the service layer does not depend on JPA/SQL details.
**When NOT:** re-deriving JPA/Hibernate mechanics here — see the `persistence` skill for entity design, queries, N+1 prevention, and transactions. This section covers only the pattern shape, not JPA specifics.

```java
// Domain-facing abstraction — the service depends on this, not on Spring Data directly
public interface OrderRepository {
    Optional<Order> findById(UUID id);
    Order save(Order order);
}

// Spring Data implements the interface's contract via JpaRepository
public interface JpaOrderRepository extends OrderRepository, JpaRepository<Order, UUID> {
}
```

The pattern's intent: the service layer talks to an abstraction (`OrderRepository`), never to `EntityManager` or a specific database driver — this is Dependency Inversion applied to persistence (see `solid-principles`).

---

## Decorator

**When:** adding behavior to an object dynamically (logging, caching, retry, metrics) without modifying its class or creating a combinatorial explosion of subclasses.
**When NOT:** the added behavior is a fixed, permanent part of the class — just put it in the class.

```java
public interface PaymentGateway {
    PaymentResult charge(UUID orderId, Money amount);
}

// Base implementation
@Component
public class StripePaymentGateway implements PaymentGateway {
    public PaymentResult charge(UUID orderId, Money amount) { /* real call */ return null; }
}

// Decorator adds retry behavior without touching StripePaymentGateway
public class RetryingPaymentGateway implements PaymentGateway {
    private final PaymentGateway delegate;
    private final int maxAttempts;

    public RetryingPaymentGateway(PaymentGateway delegate, int maxAttempts) {
        this.delegate = delegate;
        this.maxAttempts = maxAttempts;
    }

    @Override
    public PaymentResult charge(UUID orderId, Money amount) {
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return delegate.charge(orderId, amount);
            } catch (TransientPaymentException e) {
                if (attempt == maxAttempts) throw e;
            }
        }
        throw new IllegalStateException("unreachable");
    }
}

// Composition at wiring time
PaymentGateway gateway = new RetryingPaymentGateway(new StripePaymentGateway(), 3);
```

---

## Observer

**When:** one action should trigger multiple independent side effects, and the producer should not know about the consumers (decoupling).
**When NOT:** there is exactly one consumer and it's tightly coupled to the action anyway — a direct method call is simpler and easier to trace.

In Spring, Application Events implement this pattern directly — see `spring-boot` for the publish/listen mechanics:

```java
// Publisher has no knowledge of who listens
applicationEventPublisher.publishEvent(new OrderCreatedEvent(order.getId()));

// Multiple independent observers
@EventListener
public void sendConfirmationEmail(OrderCreatedEvent event) { ... }

@EventListener
public void updateAnalytics(OrderCreatedEvent event) { ... }
```

---

## Specification

**When:** building dynamic, composable query filters (search screens with optional criteria) against JPA entities.
**When NOT:** a fixed, small set of query variants — plain derived query methods or `@Query` are simpler (see `persistence`).

```java
public class OrderSpecifications {

    public static Specification<Order> hasStatus(String status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Order> createdAfter(Instant from) {
        return (root, query, cb) -> from == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<Order> forUser(UUID userId) {
        return (root, query, cb) -> userId == null ? null : cb.equal(root.get("user").get("id"), userId);
    }
}

// Compose specifications based on which filter fields are present
Specification<Order> spec = Specification
    .where(OrderSpecifications.hasStatus(filter.status()))
    .and(OrderSpecifications.createdAfter(filter.from()))
    .and(OrderSpecifications.forUser(filter.userId()));

List<Order> results = orderRepository.findAll(spec);
```

The repository must extend `JpaSpecificationExecutor<Order>` to expose `findAll(Specification)`. This is the same building block referenced from `security` (row-level filtering) and `persistence` (dynamic queries) — defined once here.

---

## Command

**When:** encapsulating a request as an object to support queuing, undo/redo, logging of operations, or decoupling the invoker from the concrete action.
**When NOT:** a direct method call already expresses the intent clearly and there's no need to queue, log, or undo it.

```java
public interface Command<T> {
    T execute();
}

public class CreateOrderCommand implements Command<Order> {
    private final CreateOrderRequest request;
    private final OrderRepository orderRepository;

    public CreateOrderCommand(CreateOrderRequest request, OrderRepository orderRepository) {
        this.request = request;
        this.orderRepository = orderRepository;
    }

    @Override
    public Order execute() {
        var order = Order.create(request.userId(), request.items());
        return orderRepository.save(order);
    }
}

// Invoker doesn't know what the command does internally
public class CommandExecutor {
    public <T> T run(Command<T> command) {
        return command.execute();
    }
}
```

A common Java-idiomatic simplification: for stateless one-off actions, a `Supplier<T>` or `Runnable` lambda is often enough and avoids a whole class hierarchy — reserve the full Command object when you need to inspect, queue, log, or undo the request itself.

---

## Related Skills

- `solid-principles` - Open/Closed Principle underpins Strategy; Dependency Inversion underpins Repository
- `clean-code` - When abstraction is premature
- `persistence` - JPA specifics for Repository and Specification
- `spring-boot` - Application Events implementing Observer
