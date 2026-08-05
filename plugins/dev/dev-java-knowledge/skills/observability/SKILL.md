---
name: observability
description: Use this skill when adding structured logging with SLF4J and Logback, configuring MDC for correlation IDs, tracking business metrics with Micrometer, adding distributed tracing with Micrometer Tracing and OpenTelemetry, implementing custom health indicators, configuring Actuator endpoints for production, deciding what to log and at which level, or analyzing JSON logs for AI-assisted debugging.
---

# Skill: Observability — Logging, Metrics, Tracing — Spring Boot

## Structured Logging with SLF4J + Logback

Always use SLF4J. Never use `System.out.println` or `e.printStackTrace()`.

```java
@Service
@Slf4j  // Lombok — generates: private static final Logger log = LoggerFactory.getLogger(...)
@RequiredArgsConstructor
public class OrderService {

    public Order create(CreateOrderCommand command) {
        log.info("Creating order for customer {}", command.customerId());

        try {
            var order = Order.create(command.customerId(), command.items());
            var saved = orderRepository.save(order);
            log.info("Order created successfully. orderId={}, customerId={}",
                     saved.getId(), command.customerId());
            return saved;
        } catch (DomainException e) {
            log.warn("Order creation rejected. reason={}, customerId={}",
                     e.getMessage(), command.customerId());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error creating order for customer {}",
                      command.customerId(), e);  // last arg = Throwable → logs stack trace
            throw e;
        }
    }
}
```

**Log levels:**
- `ERROR` — unexpected failures that need immediate attention. Include full stack trace.
- `WARN` — expected business failures, degraded states, retries.
- `INFO` — significant business events (order created, payment processed). One per operation.
- `DEBUG` — detailed flow information for development. Never in production by default.
- `TRACE` — very granular detail. Almost never used.

---

## AI-Friendly Logging

> **Key insight:** JSON logs are better for AI analysis — faster parsing, fewer tokens, direct field access.

```
# Text format - AI must "interpret" the string
2026-01-29 10:15:30 INFO OrderService - Order 12345 created for user-789, total: 99.99

# JSON format - AI extracts fields directly
{"timestamp":"2026-01-29T10:15:30Z","level":"INFO","orderId":12345,"userId":"user-789","total":99.99}
```

| Aspect | Text | JSON |
|--------|------|------|
| Parsing | Regex/interpretation | Direct field access |
| Token usage | Higher (repeated patterns) | Lower (structured) |
| Error extraction | Parse stack trace text | `exception` field |
| Filtering | grep patterns | `jq` queries |

**Key fields for AI debugging:**
- `requestId` (or `traceId`) - group all logs from same request
- `step` - track progress through flow
- `duration_ms` - identify slow operations
- `level` - quick filter for errors

---

## Structured Log Format (JSON)

### Native Structured Logging (Spring Boot 3.4+)

No extra dependencies needed — Spring Boot 3.4+ has built-in support:

```yaml
# application.yml
logging:
  structured:
    format:
      console: logstash    # or "ecs" for Elastic Common Schema

# Supported formats: logstash, ecs, gelf
```

This is simpler than the Logstash Logback Encoder XML setup required on earlier Spring Boot versions (below).

### Profile-Based Switching: JSON vs Human-Readable

```yaml
# application.yml (default - JSON for AI/prod)
spring:
  profiles:
    default: json-logs

---
spring:
  config:
    activate:
      on-profile: json-logs
logging:
  structured:
    format:
      console: logstash

---
spring:
  config:
    activate:
      on-profile: human-logs
# No structured format = human-readable default
logging:
  pattern:
    console: "%d{HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n"
```

**Usage:**
```bash
# Default: JSON (for AI, CI/CD, production)
./mvnw spring-boot:run

# Human-readable when needed
./mvnw spring-boot:run -Dspring.profiles.active=human-logs
```

### Setup for Spring Boot < 3.4 (Logstash Logback Encoder)

**pom.xml:**
```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

**logback-spring.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>

    <!-- JSON (default) -->
    <springProfile name="!human-logs">
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>traceId</includeMdcKeyName>
                <includeMdcKeyName>spanId</includeMdcKeyName>
                <includeMdcKeyName>requestId</includeMdcKeyName>
                <includeMdcKeyName>userId</includeMdcKeyName>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>

    <!-- Human-readable (optional) -->
    <springProfile name="human-logs">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} %-5level [%thread] %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

</configuration>
```

---

## MDC — Correlation IDs

Add request-scoped context to all log lines automatically.

```java
@Component
public class MdcFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        try {
            var requestId = Optional.ofNullable(request.getHeader("X-Request-ID"))
                .orElse(UUID.randomUUID().toString());
            MDC.put("requestId", requestId);
            MDC.put("method", request.getMethod());
            MDC.put("path", request.getRequestURI());
            response.setHeader("X-Request-ID", requestId);
            chain.doFilter(request, response);
        } finally {
            MDC.clear();  // always clear to avoid thread pool contamination
        }
    }
}
```

For authenticated requests, add userId:
```java
MDC.put("userId", authentication.getName());
```

MDC does not auto-propagate to new threads — copy it explicitly for async work:
```java
Map<String, String> context = MDC.getCopyOfContextMap();

CompletableFuture.runAsync(() -> {
    try {
        if (context != null) MDC.setContextMap(context);
        log.info("Async task running");  // Has requestId, userId
    } finally {
        MDC.clear();
    }
});
```

---

## Metrics with Micrometer

```java
@Service @RequiredArgsConstructor
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final OrderRepository orderRepository;

    public Order create(CreateOrderCommand command) {
        return meterRegistry.timer("order.creation",
                "status", "attempted")
            .record(() -> doCreate(command));
    }

    private Order doCreate(CreateOrderCommand command) {
        try {
            var order = Order.create(command.customerId(), command.items());
            var saved = orderRepository.save(order);
            meterRegistry.counter("order.created",
                "type", command.type().name()).increment();
            return saved;
        } catch (Exception e) {
            meterRegistry.counter("order.creation.failed",
                "reason", e.getClass().getSimpleName()).increment();
            throw e;
        }
    }
}
```

**Standard metrics to always track:**
- Request count and latency per endpoint
- Error rate by error type
- Business event counters (orders created, payments processed, emails sent)
- External service call duration and error rate
- Queue depth for async processors

---

## Distributed Tracing with Micrometer Tracing

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry.exporter</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
```

```properties
management.tracing.sampling.probability=1.0  # 1.0 = 100% in dev, lower in prod
management.otlp.tracing.endpoint=http://tempo:4318/v1/traces
```

Spring Boot auto-instruments HTTP requests, DB queries, and messaging. Add custom spans for business operations:

```java
@Service @RequiredArgsConstructor
public class PaymentService {

    private final Tracer tracer;

    public PaymentResult charge(UUID orderId, Money amount) {
        var span = tracer.nextSpan()
            .name("payment.charge")
            .tag("orderId", orderId.toString())
            .tag("amount", amount.toString())
            .start();

        try (var scope = tracer.withSpan(span)) {
            return stripeClient.charge(amount);
        } catch (Exception e) {
            span.tag("error", e.getMessage());
            throw e;
        } finally {
            span.end();
        }
    }
}
```

---

## Health Checks

```java
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentGateway paymentGateway;

    @Override
    public Health health() {
        try {
            paymentGateway.ping();
            return Health.up()
                .withDetail("provider", "stripe")
                .withDetail("status", "reachable")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("provider", "stripe")
                .withException(e)
                .build();
        }
    }
}
```

```properties
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when-authorized
management.endpoint.health.probes.enabled=true  # liveness + readiness for K8s
```

---

## Actuator Endpoints for Production

| Endpoint | Use |
|---|---|
| `/actuator/health` | Load balancer health check |
| `/actuator/health/liveness` | K8s liveness probe |
| `/actuator/health/readiness` | K8s readiness probe |
| `/actuator/metrics` | Prometheus scraping |
| `/actuator/info` | Version, git commit, build info |

---

## What NOT to Log

- Passwords, tokens, API keys — ever
- Full credit card numbers or PAN data
- Personal data beyond what is strictly necessary (PII)
- Request/response bodies by default — only in DEBUG with masking
- Stack traces at WARN level — only at ERROR

---

## Analyzing Logs with jq (AI or Human)

```bash
# Pretty print JSON logs
tail -f app.log | jq .

# Get recent errors
cat app.log | jq 'select(.level == "ERROR")' | tail -20

# Follow a specific request end-to-end
cat app.log | jq 'select(.requestId == "req-abc123")'

# Find slow operations (>1s)
cat app.log | jq 'select(.duration_ms > 1000)'

# Get a compact timeline of steps for one request
cat app.log | jq 'select(.requestId == "abc123") | {time: .timestamp, step: .step, message: .message}'
```

---

## Observability Checklist

```
□ @Slf4j on all services — no System.out.println
□ MDC filter adds requestId to all log lines
□ JSON logging configured for production profile (native Spring Boot 3.4+ or Logstash encoder)
□ Error logs include Throwable (full stack trace)
□ Business events tracked as Micrometer counters
□ Critical operation latency tracked as timers
□ Custom health indicators for external dependencies
□ Tracing propagated across service boundaries
□ No sensitive data in logs
□ Log level DEBUG or lower not active in production by default
```

---

## Related Skills

- `spring-boot` - Actuator endpoint exposure
- `concurrency` - MDC propagation across async boundaries and thread pools
