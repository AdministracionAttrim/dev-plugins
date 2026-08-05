---
name: persistence
description: Use this skill when designing JPA entities, writing Spring Data repositories, defining JPQL or native queries, using projections, managing transactions with @Transactional, preventing N+1 queries with JOIN FETCH or @EntityGraph, fixing LazyInitializationException, using optimistic locking, writing Flyway or Liquibase migrations, or configuring Hibernate and datasource properties.
---

# Skill: Persistence — JPA, Hibernate, Spring Data

## Entity Design

```java
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
```

Rules:
- Always use `FetchType.LAZY` on relationships — never `EAGER`
- Use `UUID` as primary key for distributed-safe IDs
- Use `Instant` for timestamps, never `Date` or `LocalDateTime` without timezone awareness
- Prefer `@Column(nullable = false)` to express constraints at schema level

### equals() and hashCode() for Entities

Use a stable business key (`@NaturalId`), not the generated ID, so equality survives before/after persistence.

```java
@Entity
public class Book {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NaturalId  // Hibernate annotation for business key
    @Column(unique = true, nullable = false)
    private String isbn;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Book book)) return false;
        return isbn != null && isbn.equals(book.isbn);
    }

    @Override
    public int hashCode() {
        return Objects.hash(isbn);  // Use business key, not generated ID
    }
}
```

---

## Repository Pattern

Extend `JpaRepository`. Add custom queries with `@Query` using JPQL or native SQL.

```java
public interface OrderRepository extends JpaRepository<Order, UUID> {

    List<Order> findByStatus(String status);

    Optional<User> findByEmail(String email);

    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.status = :status")
    List<Order> findByUserAndStatus(@Param("userId") UUID userId,
                                    @Param("status") String status);

    @Query(value = """
            SELECT * FROM orders
            WHERE created_at >= :from
            ORDER BY created_at DESC
            """, nativeQuery = true)
    List<Order> findRecentOrders(@Param("from") Instant from);

    // existsBy is more efficient than findBy for existence checks
    boolean existsByEmail(String email);
}
```

Never write `EntityManager` queries directly unless `JpaRepository` cannot express the query.

---

## N+1 Problem

> The #1 JPA performance killer

### The Problem

```java
// ❌ BAD: N+1 queries
@Entity
public class Author {
    @Id private Long id;
    private String name;

    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
    private List<Book> books;
}

// This innocent code...
List<Author> authors = authorRepository.findAll();  // 1 query
for (Author author : authors) {
    System.out.println(author.getBooks().size());   // N queries!
}
// Result: 1 + N queries (if 100 authors = 101 queries)
```

### Solution 1: JOIN FETCH (JPQL)

```java
// ✅ GOOD: Single query with JOIN FETCH
public interface AuthorRepository extends JpaRepository<Author, Long> {

    @Query("SELECT a FROM Author a JOIN FETCH a.books")
    List<Author> findAllWithBooks();
}

// Usage - single query
List<Author> authors = authorRepository.findAllWithBooks();
```

### Solution 2: @EntityGraph

```java
// ✅ GOOD: EntityGraph for declarative fetching
public interface AuthorRepository extends JpaRepository<Author, Long> {

    @EntityGraph(attributePaths = {"books"})
    List<Author> findAll();

    // Or with named graph
    @EntityGraph(value = "Author.withBooks")
    List<Author> findAllWithBooks();
}

// Define named graph on entity
@Entity
@NamedEntityGraph(
    name = "Author.withBooks",
    attributeNodes = @NamedAttributeNode("books")
)
public class Author {
    // ...
}
```

### Solution 3: Batch Fetching

```java
// ✅ GOOD: Batch fetching (Hibernate-specific)
@Entity
public class Author {

    @OneToMany(mappedBy = "author")
    @BatchSize(size = 25)  // Fetch 25 at a time
    private List<Book> books;
}

// Or globally in application.properties
spring.jpa.properties.hibernate.default_batch_fetch_size=25
```

### Detecting N+1

```yaml
# Enable SQL logging to detect N+1
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

---

## Lazy Loading

### FetchType Basics

```java
@Entity
public class Order {

    // LAZY: Load only when accessed (default for collections)
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items;

    // EAGER: Always load immediately (default for @ManyToOne, @OneToOne)
    @ManyToOne(fetch = FetchType.EAGER)  // ⚠️ Usually bad
    private Customer customer;
}
```

### Best Practice: Default to LAZY

```java
// ✅ GOOD: Always use LAZY, fetch when needed
@Entity
public class Order {

    @ManyToOne(fetch = FetchType.LAZY)  // Override EAGER default
    private Customer customer;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items;
}
```

### LazyInitializationException

```java
// ❌ BAD: Accessing lazy field outside transaction
@Service
public class OrderService {

    public Order getOrder(Long id) {
        return orderRepository.findById(id).orElseThrow();
    }
}

// In controller (no transaction)
Order order = orderService.getOrder(1L);
order.getItems().size();  // 💥 LazyInitializationException!
```

### Solutions for LazyInitializationException

**Solution 1: JOIN FETCH in query**
```java
// ✅ Fetch needed associations in query
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")
Optional<Order> findByIdWithItems(@Param("id") Long id);
```

**Solution 2: @Transactional on service method**
```java
// ✅ Keep transaction open while accessing
@Service
public class OrderService {

    @Transactional(readOnly = true)
    public OrderDTO getOrderWithItems(Long id) {
        Order order = orderRepository.findById(id).orElseThrow();
        // Access within transaction
        int itemCount = order.getItems().size();
        return new OrderDTO(order, itemCount);
    }
}
```

**Solution 3: DTO Projection (recommended)**
```java
// ✅ BEST: Return only what you need
public interface OrderSummary {
    Long getId();
    String getStatus();
    int getItemCount();
}

@Query("SELECT o.id as id, o.status as status, SIZE(o.items) as itemCount " +
       "FROM Order o WHERE o.id = :id")
Optional<OrderSummary> findOrderSummary(@Param("id") Long id);
```

**Solution 4: Open Session in View (not recommended)**
```yaml
# Keeps session open during view rendering
# ⚠️ Can mask N+1 problems, use with caution
spring:
  jpa:
    open-in-view: true  # Default is true
```

---

## Projections

Use interface or record projections to avoid loading full entities when only a subset of fields is needed.

```java
// Interface-based projection
public interface OrderSummary {
    UUID getId();
    String getStatus();
    Instant getCreatedAt();
}

List<OrderSummary> findByUserId(UUID userId);

@Query("SELECT o.id as id, o.customer.name as customerName, o.total as total " +
       "FROM Order o WHERE o.status = :status")
List<OrderSummary> findOrderSummaries(@Param("status") OrderStatus status);
```

Or with records (Spring Data 3.2+ — class-based projections via query constructor expressions):
```java
public record OrderDTO(UUID id, String status, Instant createdAt) {}

@Query("SELECT new com.example.dto.OrderDTO(o.id, o.status, o.createdAt) " +
       "FROM Order o WHERE o.status = :status")
List<OrderDTO> findOrderDTOs(@Param("status") OrderStatus status);
```

---

## Transactions

`@Transactional` lives on the **service** layer, never on controllers or repositories.

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    // Read-only: optimized, no dirty checking
    @Transactional(readOnly = true)
    public List<OrderSummary> findByUser(UUID userId) {
        return orderRepository.findByUserId(userId);
    }

    // Write: full transaction with dirty checking
    @Transactional
    public Order create(CreateOrderRequest request) {
        var order = new Order(request.userId(), request.items());
        return orderRepository.save(order);
    }

    // Explicit rollback
    @Transactional(rollbackFor = Exception.class)
    public void processPayment(Long orderId) throws PaymentException {
        // Rolls back on any exception, not just RuntimeException
    }
}
```

Keep transactions as short as possible — do not call external services inside a transaction.

### Transaction Propagation

```java
@Service
public class OrderService {

    @Autowired
    private PaymentService paymentService;

    @Transactional
    public void placeOrder(Order order) {
        orderRepository.save(order);

        // REQUIRED (default): Uses existing or creates new
        paymentService.processPayment(order);

        // If paymentService throws, entire order is rolled back
    }
}

@Service
public class PaymentService {

    // REQUIRES_NEW: Always creates new transaction
    // If this fails, order can still be saved
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processPayment(Order order) {
        // Independent transaction
    }
}
```

### The Auto-Invocation Mistake

```java
// ❌ BAD: Calling @Transactional method from same class
@Service
public class OrderService {

    public void processOrder(Long id) {
        updateOrder(id);  // @Transactional is IGNORED! Bypasses the Spring proxy.
    }

    @Transactional
    public void updateOrder(Long id) {
        // Transaction not started because called internally
    }
}

// ✅ GOOD: Inject self or use separate service
@Service
public class OrderService {

    @Autowired
    private OrderService self;  // Or use separate service

    public void processOrder(Long id) {
        self.updateOrder(id);  // Now transaction works
    }

    @Transactional
    public void updateOrder(Long id) {
        // Transaction properly started
    }
}
```

---

## Entity Relationships

### OneToMany / ManyToOne

```java
// ✅ GOOD: Bidirectional with proper mapping
@Entity
public class Author {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Book> books = new ArrayList<>();

    // Helper methods for bidirectional sync
    public void addBook(Book book) {
        books.add(book);
        book.setAuthor(this);
    }

    public void removeBook(Book book) {
        books.remove(book);
        book.setAuthor(null);
    }
}

@Entity
public class Book {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private Author author;
}
```

### ManyToMany

```java
// ✅ GOOD: ManyToMany with Set (not List) to avoid duplicates
@Entity
public class Student {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "student_course",
        joinColumns = @JoinColumn(name = "student_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    private Set<Course> courses = new HashSet<>();

    public void addCourse(Course course) {
        courses.add(course);
        course.getStudents().add(this);
    }

    public void removeCourse(Course course) {
        courses.remove(course);
        course.getStudents().remove(this);
    }
}

@Entity
public class Course {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToMany(mappedBy = "courses")
    private Set<Student> students = new HashSet<>();
}
```

---

## Optimistic Locking

### Prevent Lost Updates

```java
// ✅ GOOD: Use @Version for optimistic locking
@Entity
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;

    private OrderStatus status;
    private BigDecimal total;
}

// When two users update same order:
// User 1: loads order (version=1), modifies, saves → version becomes 2
// User 2: loads order (version=1), modifies, saves → OptimisticLockException!
```

### Handling OptimisticLockException

```java
@Service
public class OrderService {

    @Transactional
    public Order updateOrder(Long id, UpdateOrderRequest request) {
        try {
            Order order = orderRepository.findById(id).orElseThrow();
            order.setStatus(request.getStatus());
            return orderRepository.save(order);
        } catch (OptimisticLockException e) {
            throw new ConcurrentModificationException(
                "Order was modified by another user. Please refresh and try again."
            );
        }
    }

    // Or with retry
    @Retryable(value = OptimisticLockException.class, maxAttempts = 3)
    @Transactional
    public Order updateOrderWithRetry(Long id, UpdateOrderRequest request) {
        Order order = orderRepository.findById(id).orElseThrow();
        order.setStatus(request.getStatus());
        return orderRepository.save(order);
    }
}
```

---

## Migrations

Always use Flyway or Liquibase — never `spring.jpa.hibernate.ddl-auto=update` in production.

```properties
spring.flyway.enabled=true
spring.jpa.hibernate.ddl-auto=validate
```

Migration file naming: `V{version}__{description}.sql`
```
db/migration/
├── V1__create_users_table.sql
├── V2__create_orders_table.sql
└── V3__add_order_status_index.sql
```

Run with `spring.jpa.show-sql=true` during development to spot N+1 issues early.

---

## Common Mistakes

### 1. Cascade Misuse

```java
// ❌ BAD: CascadeType.ALL on @ManyToOne
@Entity
public class Book {
    @ManyToOne(cascade = CascadeType.ALL)  // Dangerous!
    private Author author;
}
// Deleting a book could delete the author!

// ✅ GOOD: Cascade only from parent to child
@Entity
public class Author {
    @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Book> books;
}
```

### 2. Missing Index

```java
// ❌ BAD: Frequent queries on non-indexed column
@Query("SELECT o FROM Order o WHERE o.customerEmail = :email")
List<Order> findByCustomerEmail(@Param("email") String email);

// ✅ GOOD: Add index
@Entity
@Table(indexes = @Index(name = "idx_order_customer_email", columnList = "customerEmail"))
public class Order {
    private String customerEmail;
}
```

### 3. toString() with Lazy Fields

```java
// ❌ BAD: toString includes lazy collection
@Entity
public class Author {
    @OneToMany(mappedBy = "author", fetch = FetchType.LAZY)
    private List<Book> books;

    @Override
    public String toString() {
        return "Author{id=" + id + ", books=" + books + "}";  // Triggers lazy load!
    }
}

// ✅ GOOD: Exclude lazy fields from toString
@Override
public String toString() {
    return "Author{id=" + id + ", name='" + name + "'}";
}
```

---

## Performance Checklist

When reviewing JPA code, check:

- [ ] No N+1 queries (use JOIN FETCH or @EntityGraph)
- [ ] LAZY fetch by default (especially @ManyToOne)
- [ ] Pagination for large result sets
- [ ] DTO/interface projections for read-only queries
- [ ] Bulk operations (`@Modifying`) for batch updates/deletes instead of loading entities one by one
- [ ] @Version for entities with concurrent access
- [ ] Indexes on frequently queried columns
- [ ] No lazy fields in toString()
- [ ] Read-only transactions where applicable
- [ ] Migrations managed with Flyway/Liquibase, not `ddl-auto=update`

## What to Avoid

- `FetchType.EAGER` on any relationship
- `spring.jpa.hibernate.ddl-auto=update` or `create-drop` in production
- Returning `@Entity` objects directly from controllers
- Transactions on private methods, or relying on internal (same-class) calls to trigger `@Transactional`
- `Optional.get()` without `isPresent()` check — use `orElseThrow()`
- Large `@Lob` fields on eagerly-loaded entities

---

## Related Skills

- `spring-boot` - Controller/service layering around repositories
- `java-code-review` - General code review checklist
- `clean-code` - Code quality principles
