---
name: testing
description: Use this skill when writing unit tests with JUnit 5 and Mockito, controller slice tests with @WebMvcTest, repository slice tests with @DataJpaTest, integration tests with @SpringBootTest, using Testcontainers for real database tests, writing assertions with AssertJ, creating test data factories, using @Nested or parameterized tests, or deciding which type of test to write for a given scenario.
---

# Skill: Testing — Java 21 + Spring Boot (JUnit 5 + AssertJ)

## Test Types and When to Use Each

| Type | Tool | When |
|---|---|---|
| Unit | JUnit 5 + Mockito | Business logic, domain rules, pure functions |
| Slice | `@WebMvcTest`, `@DataJpaTest` | Controller layer or repository layer in isolation |
| Integration | `@SpringBootTest` (+ Testcontainers) | Full application context, real DB, external config |
| Contract | Spring Cloud Contract / Pact | API contracts between services |

Write unit tests first. Add integration tests for critical paths. Do not test getters/setters.

---

## Unit Tests

```java
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void should_throw_when_order_not_found() {
        var id = UUID.randomUUID();
        when(orderRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.findById(id))
            .isInstanceOf(EntityNotFoundException.class)
            .hasMessageContaining(id.toString());
    }
}
```

Naming convention: `should_{expected_behavior}_when_{condition}`. The `@DisplayName`-driven natural-language style below is also an accepted alternative — pick one per project and stay consistent:

```java
@Test
@DisplayName("Should throw exception when plugin descriptor is invalid")
void invalidPluginDescriptor() { }
```

---

## AssertJ Power Features

Prefer AssertJ over plain JUnit assertions — always use `assertThat`, never `assertEquals`/`assertTrue`.

```java
// ❌ Avoid: less readable, worse failure messages
assertEquals(PluginState.STARTED, plugin.getState());
assertTrue(plugins.size() == 3);

// ✅ Prefer: fluent, descriptive
assertThat(plugin.getState())
    .as("Plugin should be started after initialization")
    .isEqualTo(PluginState.STARTED);
```

### Collection assertions
```java
assertThat(plugins)
    .isNotEmpty()
    .hasSize(2)
    .doesNotContainNull();

// Advanced filtering and extraction
assertThat(plugins)
    .filteredOn(p -> p.getState() == PluginState.STARTED)
    .extracting(Plugin::getId)
    .containsExactlyInAnyOrder("plugin-a", "plugin-b");

assertThat(list).containsExactly(item1, item2, item3);
assertThat(list).allMatch(p -> p.getVersion() != null, "All plugins have version");
```

### Exception assertions
```java
assertThatThrownBy(() -> loader.load(invalidPath))
    .isInstanceOf(PluginException.class)
    .hasMessageContaining("Invalid plugin descriptor");

assertThatThrownBy(() -> manager.startPlugin("missing-plugin"))
    .isInstanceOf(PluginException.class)
    .hasMessageContaining("Plugin not found")
    .hasCauseInstanceOf(IllegalArgumentException.class);

// With assertThatExceptionOfType (more readable)
assertThatExceptionOfType(PluginException.class)
    .isThrownBy(() -> loader.load(invalidPath))
    .withMessageContaining("Invalid")
    .withMessageMatching("Invalid .* descriptor");

assertThatNoException().isThrownBy(() -> code());
```

### Object assertions
```java
// Method references (type-safe)
assertThat(plugin)
    .extracting(Plugin::getId, Plugin::getVersion, Plugin::getState)
    .containsExactly("my-plugin", "1.0", PluginState.STARTED);

// Field by field comparison
assertThat(actualPlugin)
    .usingRecursiveComparison()
    .ignoringFields("timestamp", "id")
    .isEqualTo(expectedPlugin);
```

### Soft assertions (multiple checks)
```java
@Test
void shouldHaveValidPluginDescriptor() {
    SoftAssertions softly = new SoftAssertions();

    softly.assertThat(descriptor.getId())
        .as("Plugin ID")
        .isNotBlank()
        .matches("[a-z0-9-]+");

    softly.assertThat(descriptor.getVersion())
        .as("Plugin version")
        .matches("\\d+\\.\\d+\\.\\d+");

    softly.assertAll(); // All assertions evaluated, even if some fail
}
```

### String assertions
```java
assertThat(errorMessage)
    .startsWith("Error:")
    .contains("plugin", "failed")
    .doesNotContain("success")
    .matches("Error: .* failed")
    .hasLineCount(3);
```

### Quick Reference

```java
// ===== Basic =====
assertThat(value).isEqualTo(expected);
assertThat(value).isNotNull();
assertThat(number).isPositive().isGreaterThan(5);

// ===== Collections =====
assertThat(list).hasSize(3);
assertThat(list).containsExactlyInAnyOrder(item2, item1, item3);

// ===== Strings =====
assertThat(str).isNotBlank().startsWith("prefix").matches("regex\\d+");

// ===== Exceptions =====
assertThatThrownBy(() -> code())
    .isInstanceOf(PluginException.class)
    .hasMessageContaining("error");
```

---

## Test Structure (AAA Pattern)

Always use Arrange-Act-Assert:

```java
@Test
@DisplayName("Should load plugin from valid directory")
void shouldLoadPluginFromValidDirectory() {
    // Arrange - Setup test data and dependencies
    Path pluginDir = Paths.get("test-plugins/valid-plugin");
    PluginLoader loader = new DefaultPluginLoader();

    // Act - Execute the behavior being tested
    Plugin plugin = loader.load(pluginDir);

    // Assert - Verify results
    assertThat(plugin)
        .isNotNull()
        .extracting(Plugin::getId, Plugin::getVersion)
        .containsExactly("test-plugin", "1.0.0");
}
```

---

## Controller Slice Tests (`@WebMvcTest`)

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void should_return_404_when_order_not_found() throws Exception {
        var id = UUID.randomUUID();
        when(orderService.findById(id)).thenThrow(new EntityNotFoundException("Not found"));

        mockMvc.perform(get("/api/v1/orders/{id}", id))
            .andExpect(status().isNotFound());
    }
}
```

---

## Repository Slice Tests (`@DataJpaTest`)

```java
@DataJpaTest
class OrderRepositoryTest {

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void should_find_orders_by_status() {
        var order = new Order(UUID.randomUUID(), "PENDING");
        orderRepository.save(order);

        var result = orderRepository.findByStatus("PENDING");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo("PENDING");
    }
}
```

Use `@DataJpaTest` with an in-memory H2 database for fast repository tests. For tests requiring the real DB dialect, use Testcontainers.

---

## Integration Tests with Testcontainers

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withDatabaseName("testdb");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void shouldCreateOrder() throws Exception {
        // ... perform request against RANDOM_PORT, assert persisted state
    }
}
```

---

## Test Data — Factories and Fixtures

Use factory methods or builders for test data — never raw constructors with many args scattered across tests.

```java
class OrderTestFactory {
    public static Order pendingOrder() {
        return new Order(UUID.randomUUID(), UUID.randomUUID(), "PENDING");
    }
    public static Order paidOrder() {
        return new Order(UUID.randomUUID(), UUID.randomUUID(), "PAID");
    }
}
```

For stateful setup/teardown across multiple tests, use `@BeforeEach`/`@AfterEach`:

```java
@BeforeEach
void setUp() throws IOException {
    pluginDir = Files.createTempDirectory("test-plugins");
    PluginConfig config = PluginConfig.builder()
        .pluginDirectory(pluginDir)
        .enableValidation(true)
        .build();
    pluginManager = new DefaultPluginManager(config);
}

@AfterEach
void tearDown() throws IOException {
    if (pluginManager != null) {
        pluginManager.stopAll();
    }
    if (pluginDir != null) {
        FileUtils.deleteDirectory(pluginDir.toFile());
    }
}
```

---

## Test Organization with `@Nested`

```java
@DisplayName("PluginManager")
class PluginManagerTest {

    private PluginManager manager;

    @BeforeEach
    void setUp() {
        manager = new DefaultPluginManager();
    }

    @Nested
    @DisplayName("when starting plugins")
    class WhenStartingPlugins {

        @Test
        @DisplayName("should start all plugins in dependency order")
        void shouldStartInDependencyOrder() { }

        @Test
        @DisplayName("should fail if circular dependency detected")
        void shouldFailOnCircularDependency() { }
    }

    @Nested
    @DisplayName("when stopping plugins")
    class WhenStoppingPlugins {

        @Test
        @DisplayName("should stop plugins in reverse dependency order")
        void shouldStopInReverseOrder() { }
    }
}
```

---

## Parameterized Tests

```java
@ParameterizedTest
@ValueSource(strings = {"1.0.0", "2.1.3", "10.0.0-SNAPSHOT"})
@DisplayName("Should accept valid semantic versions")
void shouldAcceptValidVersions(String version) {
    assertThat(VersionParser.parse(version))
        .isNotNull()
        .hasFieldOrPropertyWithValue("valid", true);
}

@ParameterizedTest
@CsvSource({
    "plugin-a, 1.0, STARTED",
    "plugin-b, 2.0, STOPPED",
    "plugin-c, 1.5, DISABLED"
})
void shouldLoadPluginWithState(String id, String version, PluginState expectedState) {
    Plugin plugin = createPlugin(id, version);
    assertThat(plugin.getState()).isEqualTo(expectedState);
}

@ParameterizedTest
@MethodSource("invalidPluginDescriptors")
void shouldRejectInvalidDescriptors(PluginDescriptor descriptor, String expectedError) {
    assertThatThrownBy(() -> validator.validate(descriptor))
        .hasMessageContaining(expectedError);
}

static Stream<Arguments> invalidPluginDescriptors() {
    return Stream.of(
        Arguments.of(descriptorWithoutId(), "Missing plugin ID"),
        Arguments.of(descriptorWithInvalidVersion(), "Invalid version format")
    );
}
```

---

## Mocking with Mockito

```java
@ExtendWith(MockitoExtension.class)
class PluginManagerTest {

    @Mock
    private PluginRepository repository;

    @Mock
    private PluginValidator validator;

    @InjectMocks
    private DefaultPluginManager manager;

    @Test
    void shouldLoadPluginsFromRepository() {
        List<PluginDescriptor> descriptors = List.of(createDescriptor("plugin1"));
        when(repository.findAll()).thenReturn(descriptors);

        List<Plugin> plugins = manager.loadAll();

        assertThat(plugins).hasSize(1);
        verify(repository).findAll();
        verify(validator, times(1)).validate(any(PluginDescriptor.class));
    }
}
```

Mock your own abstractions, not third-party libraries you don't own.

---

## Testing Async Operations

```java
@Test
@DisplayName("Should complete async plugin loading")
void shouldCompleteAsyncLoading() {
    CompletableFuture<Plugin> future = manager.loadAsync(pluginPath);

    assertThat(future)
        .succeedsWithin(Duration.ofSeconds(5))
        .satisfies(plugin -> {
            assertThat(plugin.getState()).isEqualTo(PluginState.STARTED);
            assertThat(plugin.getId()).isNotBlank();
        });
}
```

Avoid `Thread.sleep()` in tests — use `succeedsWithin` (AssertJ) or Awaitility for async assertions instead.

---

## Code Coverage Guidelines

- **Aim for**: 80%+ line coverage on core logic
- **Focus on**: business logic, complex algorithms, edge cases, error handling, integration points
- **Skip**: trivial getters/setters, POJOs, generated code

### Maven / JaCoCo

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.11</version>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
</plugin>
```

```bash
mvn clean test jacoco:report
open target/site/jacoco/index.html
mvn verify   # Fails if below configured threshold
```

---

## Anti-patterns

❌ **Avoid**:
```java
// Generic test names
@Test void test1() { }

// Testing implementation details instead of behavior
assertThat(plugin.internalState.flag).isTrue();  // Couples to internals

// Brittle assertions with timestamps or hardcoded IDs
assertThat(message).isEqualTo("Error at 2024-01-26 10:30:15");

// Multiple unrelated assertions mixing concerns
@Test void testEverything() {
    assertThat(plugin.getId()).isNotNull();
    assertThat(manager.getCount()).isEqualTo(5);
    assertThat(config.isEnabled()).isTrue();
}

// Swallowing exception details
@Test void shouldFail() {
    try {
        loader.load(invalidPath);
        fail("Should have thrown exception");
    } catch (Exception e) {
        // Swallowed
    }
}
```

Also avoid:
- `@SpringBootTest` for tests that only need a slice — it loads the full context and is slow
- Tests with no assertions
- Tests that depend on execution order
- Hardcoded IDs or timestamps — use `UUID.randomUUID()` and `Instant.now()`

---

## Best Practices Summary

1. **Use AssertJ** for all assertions
2. **Follow AAA pattern** (Arrange-Act-Assert)
3. **Descriptive names** — `should_x_when_y` or `@DisplayName`
4. **One concept** per test
5. **Test behavior**, not implementation
6. **Extract helpers/factories** for common setup
7. **Use @Nested** for logical grouping
8. **Parameterize** similar tests
9. **Soft assertions** for multiple related checks
10. **Coverage** on business logic, not boilerplate — pick the right test type (unit/slice/integration) for what you're verifying

---

## Related Skills

- `spring-boot` - Controller/service structure exercised by these tests
- `persistence` - Entity and repository behavior covered by `@DataJpaTest`
- `concurrency` - Testing async and concurrent code paths
