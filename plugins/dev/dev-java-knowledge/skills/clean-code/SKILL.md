---
name: clean-code
description: Clean Code principles (DRY, KISS, YAGNI), naming conventions, function design, immutability, guard clauses, and refactoring. Use when user says "clean this code", "refactor", "improve readability", when naming classes/methods/variables, sizing methods and reducing complexity, avoiding magic numbers, deciding when to add comments, applying the Tell Don't Ask principle, or reviewing code for clean code violations.
---

# Clean Code Skill — Java Backend

Write readable, maintainable code following Clean Code principles.

## When to Use
- User says "clean this code" / "refactor" / "improve readability"
- Naming classes, methods, variables or constants
- Sizing methods and reducing complexity
- Code review focusing on maintainability

---

## Core Principles

| Principle | Meaning | Violation Sign |
|-----------|---------|----------------|
| **DRY** | Don't Repeat Yourself | Copy-pasted code blocks |
| **KISS** | Keep It Simple, Stupid | Over-engineered solutions |
| **YAGNI** | You Aren't Gonna Need It | Features "just in case" |

---

## DRY - Don't Repeat Yourself

> "Every piece of knowledge must have a single, unambiguous representation in the system."

### Violation

```java
// ❌ BAD: Same validation logic repeated
public class UserController {

    public void createUser(UserRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ValidationException("Email is required");
        }
        if (!request.getEmail().contains("@")) {
            throw new ValidationException("Invalid email format");
        }
        // ... create user
    }

    public void updateUser(UserRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new ValidationException("Email is required");
        }
        if (!request.getEmail().contains("@")) {
            throw new ValidationException("Invalid email format");
        }
        // ... update user
    }
}
```

### Refactored

```java
// ✅ GOOD: Single source of truth
public class EmailValidator {

    public void validate(String email) {
        if (email == null || email.isBlank()) {
            throw new ValidationException("Email is required");
        }
        if (!email.contains("@")) {
            throw new ValidationException("Invalid email format");
        }
    }
}

public class UserController {
    private final EmailValidator emailValidator;

    public void createUser(UserRequest request) {
        emailValidator.validate(request.getEmail());
        // ... create user
    }

    public void updateUser(UserRequest request) {
        emailValidator.validate(request.getEmail());
        // ... update user
    }
}
```

### DRY Exceptions

Not all duplication is bad. Avoid premature abstraction:

```java
// These look similar but serve different purposes - OK to duplicate
public BigDecimal calculateShippingCost(Order order) {
    return order.getWeight().multiply(SHIPPING_RATE);
}

public BigDecimal calculateInsuranceCost(Order order) {
    return order.getValue().multiply(INSURANCE_RATE);
}
// Don't force these into one method - they'll evolve differently
```

---

## KISS - Keep It Simple

> "The simplest solution is usually the best."

### Violation

```java
// ❌ BAD: Over-engineered for simple task
public class StringUtils {

    public boolean isEmpty(String str) {
        return Optional.ofNullable(str)
            .map(String::trim)
            .map(String::isEmpty)
            .orElseGet(() -> Boolean.TRUE);
    }
}
```

### Refactored

```java
// ✅ GOOD: Simple and clear
public class StringUtils {

    public boolean isEmpty(String str) {
        return str == null || str.trim().isEmpty();
    }

    // Or use existing library
    // return StringUtils.isBlank(str);  // Apache Commons
    // return str == null || str.isBlank();  // Java 11+
}
```

### KISS Checklist

- Can a junior developer understand this in 30 seconds?
- Is there a simpler way using standard libraries?
- Am I adding complexity for edge cases that may never happen?

---

## YAGNI - You Aren't Gonna Need It

> "Don't add functionality until it's necessary."

### Violation

```java
// ❌ BAD: Building for hypothetical future
public interface Repository<T, ID> {
    T findById(ID id);
    List<T> findAll();
    List<T> findAll(Pageable pageable);
    List<T> findAll(Sort sort);
    List<T> findAllById(Iterable<ID> ids);
    T save(T entity);
    List<T> saveAll(Iterable<T> entities);
    void delete(T entity);
    void deleteById(ID id);
    void deleteAll(Iterable<T> entities);
    void deleteAll();
    boolean existsById(ID id);
    long count();
    // ... 20 more methods "just in case"
}

// Current usage: only findById and save
```

### Refactored

```java
// ✅ GOOD: Only what's needed now
public interface UserRepository {
    Optional<User> findById(Long id);
    User save(User user);
}

// Add methods when actually needed, not before
```

### YAGNI Signs

- "We might need this later"
- "Let's make it configurable just in case"
- "What if we need to support X in the future?"
- Abstract classes with one implementation

---

## Naming

Names must reveal intent. If a name needs a comment to explain it, rename it.

```java
// Wrong
int d;                          // elapsed time in days
List<int[]> theList;
boolean flag;
void process();
Map<UUID, List<Object>> data;

// Right
int elapsedDays;
List<Order> pendingOrders;
boolean isEmailVerified;
void shipOrder(UUID orderId);
Map<UUID, List<OrderItem>> itemsByOrderId;
```

**Methods:** verb + object. `findActiveOrders()`, `cancelOrder()`, `calculateDiscount()`.
**Booleans:** `is`, `has`, `can`, `should`. `isActive()`, `hasPermission()`, `canRefund()`.
**Classes:** nouns, specific responsibility. `OrderService`, `PaymentGateway`, `EmailNotification`. Avoid vague dumping-ground names: `Manager`, `Helper`, `Utils`, `Data`, `Info`.

### Naming Conventions Table

| Element | Convention | Example |
|---------|------------|---------|
| Class | PascalCase, noun | `OrderService` |
| Interface | PascalCase, adjective or noun | `Comparable`, `PaymentGateway` |
| Method | camelCase, verb | `calculateTotal()` |
| Variable | camelCase, noun | `customerEmail` |
| Boolean | `is`/`has`/`can`/`should` prefix | `isActive`, `hasPermission` |
| Constant | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| Package | lowercase | `com.example.orders` |

---

## Method Size and Complexity

- Target: fewer than 20 lines per method
- One abstraction level per method — do not mix high-level orchestration with low-level detail
- Maximum cyclomatic complexity: 5 (count if/else/switch/while branches)

```java
// Wrong — multiple abstraction levels, too long
public OrderResponse createOrder(CreateOrderRequest request) {
    if (request.items().isEmpty()) throw new DomainException("...");
    if (request.customerId() == null) throw new DomainException("...");

    var customer = customerRepo.findById(request.customerId())
        .orElseThrow(() -> new ResourceNotFoundException("Customer", request.customerId()));

    var totalAmount = BigDecimal.ZERO;
    for (var item : request.items()) {
        var product = productRepo.findById(item.productId()).orElseThrow();
        if (!product.isInStock(item.quantity())) throw new DomainException("...");
        totalAmount = totalAmount.add(product.price().multiply(new BigDecimal(item.quantity())));
    }
    // ... 30 more lines
}

// Right — each method does one thing at one level of abstraction
public OrderResponse createOrder(CreateOrderRequest request) {
    validateRequest(request);
    var customer = findCustomer(request.customerId());
    var items = resolveOrderItems(request.items());
    var order = Order.create(customer.getId(), items);
    var saved = orderRepository.save(order);
    eventPublisher.publishEvent(new OrderCreatedEvent(saved.getId()));
    return OrderResponse.from(saved);
}

private Customer findCustomer(UUID id) {
    return customerRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Customer", id));
}

private List<OrderItem> resolveOrderItems(List<OrderItemRequest> requests) {
    return requests.stream()
        .map(this::resolveItem)
        .toList();
}
```

### Single Level of Abstraction

```java
// ❌ BAD: Mixed abstraction levels
public void processOrder(Order order) {
    validateOrder(order);  // High level

    // Low level mixed in
    BigDecimal total = BigDecimal.ZERO;
    for (OrderItem item : order.getItems()) {
        total = total.add(item.getPrice().multiply(
            BigDecimal.valueOf(item.getQuantity())));
    }

    sendEmail(order);  // High level again
}

// ✅ GOOD: Consistent abstraction level
public void processOrder(Order order) {
    validateOrder(order);
    calculateTotal(order);
    sendConfirmation(order);
}
```

### Avoid Flag Arguments

```java
// ❌ BAD: Boolean flag changes behavior
public void sendMessage(String message, boolean isUrgent) {
    if (isUrgent) {
        // send immediately
    } else {
        // queue for later
    }
}

// ✅ GOOD: Separate methods
public void sendUrgentMessage(String message) {
    // send immediately
}

public void queueMessage(String message) {
    // queue for later
}
```

---

## Parameters

- Maximum 3 parameters per method
- If more are needed, introduce a parameter object (record)

```java
// Wrong — 6 parameters, easy to confuse order
public void createUser(String name, String email, String phone,
                       String role, boolean active, UUID tenantId) {}

// Right — parameter object groups related data
public record CreateUserCommand(
    String name, String email, String phone,
    String role, boolean active, UUID tenantId
) {}

public void createUser(CreateUserCommand command) {}
```

---

## No Magic Numbers or Strings

```java
// Wrong
if (user.getAge() >= 18) { }
if (order.getTotal() > 100) { }
Thread.sleep(86400000);

// Right
private static final int ADULT_AGE = 18;
private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("100");
private static final long ONE_DAY_MS = TimeUnit.DAYS.toMillis(1);

if (user.getAge() >= ADULT_AGE) { }
if (order.getTotal().compareTo(FREE_SHIPPING_THRESHOLD) > 0) { }
Thread.sleep(ONE_DAY_MS);
```

---

## Comments — Only the Why, Never the What

```java
// Wrong — comment explains what the code already says
// Iterate over orders and check status
for (var order : orders) {
    if (order.getStatus().equals("PENDING")) { ... }
}

// Wrong — obvious noise comments
// Set the user's name
user.setName(name);

// Wrong — outdated comment (worse than no comment)
// Returns the user's contactEmail
public String getName() { return name; }

// Right — comment explains WHY, not what
// Stripe requires amounts in the smallest currency unit (cents for EUR/USD)
var amountInCents = amount.multiply(BigDecimal.valueOf(100)).longValue();

// Right — explains a non-obvious business rule
// Per GDPR Article 17, we anonymize rather than delete to preserve order history
public void anonymizeUser(UUID userId) { ... }

// Right — retry rationale documented
// Retry with exponential backoff to avoid overwhelming the server
// during high load periods (see incident #1234)
for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
    Thread.sleep((long) Math.pow(2, attempt) * 1000);
    // ...
}
```

**Never leave commented-out code.** If it is not used, delete it — git has history.

### Let Code Speak

```java
// ❌ BAD: Comment explaining bad code
// Check if the user is an admin or has special permission
// and the action is allowed for their role
if ((user.getRole() == 1 || user.getRole() == 2) &&
    (action == 3 || action == 4 || action == 7)) {
    // ...
}

// ✅ GOOD: Self-documenting code
if (user.hasAdminPrivileges() && action.isAllowedFor(user.getRole())) {
    // ...
}
```

---

## Immutability by Default

```java
// Wrong — mutable everywhere
public class Order {
    public String status;          // public mutable field
    public List<OrderItem> items;  // mutable list
}

// Right — immutable by default
public class Order {
    private final UUID id;
    private OrderStatus status;    // only what must change is mutable
    private final List<OrderItem> items;

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);  // defensive copy
    }
}

// For simple value objects — use records (immutable by design)
public record Money(BigDecimal amount, Currency currency) {
    public Money add(Money other) {
        if (!this.currency.equals(other.currency)) throw new IllegalArgumentException("...");
        return new Money(this.amount.add(other.amount), this.currency);
    }
}
```

---

## Avoid Premature Abstraction

Do not create abstractions until you have at least two concrete implementations.

```java
// Wrong — unnecessary abstraction with one implementation
public interface OrderCreator { Order create(CreateOrderCommand cmd); }
public class DefaultOrderCreator implements OrderCreator { ... }

// Right — simple service until a second implementation is needed
@Service
public class OrderService {
    public Order create(CreateOrderCommand cmd) { ... }
}
```

**The rule:** duplication is cheaper than the wrong abstraction. Wait until the pattern is clear.

---

## Guard Clauses Over Nested Conditionals

```java
// Wrong — deeply nested, hard to follow (4 levels)
public void processOrder(Order order) {
    if (order != null) {
        if (order.isActive()) {
            if (order.hasItems()) {
                if (paymentService.isAvailable()) {
                    // actual logic buried at level 4
                }
            }
        }
    }
}

// Right — guard clauses, fail fast, happy path at the end
public void processOrder(Order order) {
    Objects.requireNonNull(order, "order must not be null");
    if (!order.isActive()) throw new DomainException("Order is not active");
    if (!order.hasItems()) throw new DomainException("Order has no items");
    if (!paymentService.isAvailable()) throw new ExternalServiceException("payment", "unavailable", null);

    // happy path — clear and unindented
    processPayment(order);
    updateInventory(order);
    sendConfirmation(order);
}
```

---

## Tell, Don't Ask

Objects should do things, not expose their state for others to decide.

```java
// Wrong — asking for state to make decisions outside the object
if (order.getStatus().equals("PENDING") && order.getItems().size() > 0) {
    order.setStatus("CONFIRMED");
}

// Right — the object decides, validates, and transitions its own state
order.confirm();  // Order.confirm() validates internally and transitions status
```

---

## Common Code Smells

| Smell | Description | Refactoring |
|-------|-------------|-------------|
| **Long Method** | Method > 20 lines | Extract Method |
| **Long Parameter List** | > 3 parameters | Parameter Object |
| **Duplicate Code** | Same code in multiple places | Extract Method/Class |
| **Dead Code** | Unused code | Delete it |
| **Magic Numbers** | Unexplained literals | Named Constants |
| **God Class** | Class doing too much | Extract Class |
| **Feature Envy** | Method uses another class's data | Move Method |
| **Primitive Obsession** | Primitives instead of objects | Value Objects |

### Primitive Obsession

```java
// ❌ BAD: Primitives everywhere
public void createUser(String email, String phone, String zipCode) {
    // No validation, easy to mix up parameters
}

createUser("12345", "john@email.com", "555-1234");  // Wrong order, compiles!

// ✅ GOOD: Value objects
public record Email(String value) {
    public Email {
        if (!value.contains("@")) {
            throw new IllegalArgumentException("Invalid email");
        }
    }
}

public record PhoneNumber(String value) {
    // validation
}

public void createUser(Email email, PhoneNumber phone, ZipCode zipCode) {
    // Type-safe, self-validating
}
```

---

## Refactoring Quick Reference

| From | To | Technique |
|------|-----|-----------|
| Long method | Short methods | Extract Method |
| Duplicate code | Single method | Extract Method |
| Complex conditional | Polymorphism | Replace Conditional with Polymorphism |
| Many parameters | Object | Introduce Parameter Object |
| Temp variables | Query method | Replace Temp with Query |
| Comments explaining code | Self-documenting code | Rename, Extract |
| Nested conditionals | Early return | Guard Clauses |

---

## Clean Code Checklist

```
□ Names reveal intent — no abbreviations, no generic names (data, info, manager)
□ Methods under 20 lines — one abstraction level each
□ Max 3 parameters per method — use command/request objects if more needed
□ No magic numbers or strings — named constants for all literals
□ No duplicated code (DRY) — but no premature abstraction either
□ No commented-out code
□ Comments explain WHY, not WHAT
□ Final fields by default — mutable only when necessary
□ Guard clauses at the top — happy path unindented at the end
□ Objects expose behavior, not state (Tell, Don't Ask)
□ No abstraction until there are at least two concrete implementations
□ Is there dead/unused code?
```

---

## Related Skills

- `solid-principles` - Design principles for class structure
- `design-patterns` - Common solutions to recurring problems
- `java-code-review` - Comprehensive review checklist
