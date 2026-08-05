---
name: security
description: Java and Spring Boot security checklist covering OWASP Top 10, Spring Security configuration, JWT, input validation, injection prevention, XSS, CSRF, method-level security, rate limiting, CORS, secrets management, secure deserialization, and dependency scanning. Use when implementing authentication or authorization, reviewing code security, or before production releases.
---

# Skill: Security — Java + Spring Boot

Security checklist for Java applications based on OWASP Top 10 and secure coding practices. Works with Spring, Quarkus, Jakarta EE, and plain Java — the Spring Security and JWT sections are Spring-specific.

## When to Use
- Implementing authentication or authorization
- Configuring Spring Security, handling JWT tokens
- Security code review, before production releases
- User asks about "security", "vulnerability", "OWASP"
- Checking for injection vulnerabilities, configuring CORS or rate limiting

---

## OWASP Top 10 Quick Reference

| # | Risk | Java Mitigation |
|---|------|-----------------|
| A01 | Broken Access Control | Role-based checks, deny by default |
| A02 | Cryptographic Failures | Use strong algorithms, no hardcoded secrets |
| A03 | Injection | Parameterized queries, input validation |
| A04 | Insecure Design | Threat modeling, secure defaults |
| A05 | Security Misconfiguration | Disable debug, secure headers |
| A06 | Vulnerable Components | Dependency scanning, updates |
| A07 | Authentication Failures | Strong passwords, MFA, session management |
| A08 | Data Integrity Failures | Verify signatures, secure deserialization |
| A09 | Logging Failures | Log security events, no sensitive data |
| A10 | SSRF | Validate URLs, allowlist domains |

---

## Spring Security Configuration

Always use component-based configuration. Never extend `WebSecurityConfigurerAdapter` (deprecated).

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())                          // disable for stateless APIs
            .sessionManagement(s -> s
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // cost factor 12 minimum
    }
}
```

### JWT — Implementation Rules

```java
@Component
@RequiredArgsConstructor
public class JwtService {

    @Value("${app.security.jwt.secret}")
    private String secret;

    @Value("${app.security.jwt.expiration}")
    private Duration expiration;

    public String generateToken(UserDetails user) {
        return Jwts.builder()
            .subject(user.getUsername())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiration.toMillis()))
            .signWith(getSigningKey(), Jwts.SIG.HS256)
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, UserDetails user) {
        return extractUsername(token).equals(user.getUsername())
            && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }
}
```

**Rules:**
- JWT secret must be at least 256 bits — store in environment variable, never in code or properties files committed to git
- Use short expiration times (15-60 minutes) + refresh tokens
- Always validate signature AND expiration
- Never store sensitive data in the JWT payload — it is Base64-encoded, not encrypted

---

## Input Validation (All Frameworks)

Validate at the boundary with Bean Validation (JSR-380). Never trust user input.

```java
// ✅ GOOD: Validate at boundary
public class CreateUserRequest {

    @NotNull(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be 3-50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers, underscore")
    private String username;

    @NotNull
    @Email(message = "Invalid email format")
    private String email;

    @NotNull
    @Size(min = 8, max = 100)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "Password must contain uppercase, lowercase, and number")
    private String password;

    @Min(value = 0, message = "Age cannot be negative")
    @Max(value = 150, message = "Invalid age")
    private Integer age;
}

// Controller/Resource - trigger validation
public Response createUser(@Valid CreateUserRequest request) {
    // request is already validated
}
```

Or with records, the same idea used across this plugin:
```java
public record CreateUserRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 72)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "Password must contain uppercase, lowercase and number")
    String password
) {}
```

### Custom Validators

```java
// Custom annotation
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = UniqueEmailValidator.class)
public @interface UniqueEmail {
    String message() default "Email already registered";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

@Component @RequiredArgsConstructor
public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {
    private final UserRepository userRepository;

    public boolean isValid(String email, ConstraintValidatorContext ctx) {
        return email != null && !userRepository.existsByEmail(email);
    }
}
```

### Allowlist vs Blocklist

```java
// ❌ BAD: Blocklist (attackers find bypasses)
if (input.contains("<script>")) {
    throw new ValidationException("Invalid input");
}

// ✅ GOOD: Allowlist (only permit known-good)
private static final Pattern SAFE_NAME = Pattern.compile("^[a-zA-Z\\s'-]{1,100}$");

if (!SAFE_NAME.matcher(input).matches()) {
    throw new ValidationException("Invalid name format");
}
```

---

## SQL Injection Prevention

Always use parameterized queries. Never concatenate user input into SQL strings — in any framework.

### JPA/Hibernate

```java
// ✅ GOOD: Parameterized queries
@Query("SELECT u FROM User u WHERE u.contactEmail = :contactEmail")
Optional<User> findByEmail(@Param("contactEmail") String email);

// ✅ GOOD: Criteria API
CriteriaBuilder cb = entityManager.getCriteriaBuilder();
CriteriaQuery<User> query = cb.createQuery(User.class);
Root<User> user = query.from(User.class);
query.where(cb.equal(user.get("contactEmail"), email));  // Safe

// For dynamic queries, use Specification — never string concatenation
// (see the `design-patterns` skill for the full Specification pattern)
public Specification<User> hasEmail(String email) {
    return (root, query, cb) -> cb.equal(root.get("contactEmail"), email);
}

// ❌ BAD: String concatenation
String jpql = "SELECT u FROM User u WHERE u.contactEmail = '" + email + "'";  // VULNERABLE!
```

### Native Queries

```java
// ✅ GOOD: Parameterized native query
@Query(value = "SELECT * FROM users WHERE email = ?1", nativeQuery = true)
User findByEmailNative(String email);

// ❌ BAD: Concatenated native query
@Query(value = "SELECT * FROM users WHERE contactEmail = '" + email + "'", nativeQuery = true)
// NEVER do this
```

### JDBC (Plain Java)

```java
// ✅ GOOD: PreparedStatement
String sql = "SELECT * FROM users WHERE email = ? AND status = ?";
try (PreparedStatement stmt = connection.prepareStatement(sql)) {
    stmt.setString(1, email);
    stmt.setString(2, status);
    ResultSet rs = stmt.executeQuery();
}

// ❌ BAD: Statement with concatenation
String sql = "SELECT * FROM users WHERE email = '" + email + "'";  // VULNERABLE!
Statement stmt = connection.createStatement();
stmt.executeQuery(sql);
```

---

## XSS Prevention

### Output Encoding

```java
// ✅ GOOD: Use templating engine's auto-escaping

// Thymeleaf - auto-escapes by default
<p th:text="${userInput}">...</p>  // Safe

// To display HTML (dangerous, use carefully):
<p th:utext="${trustedHtml}">...</p>  // Only for trusted content!

// ✅ GOOD: Manual encoding when needed
import org.owasp.encoder.Encode;

String safe = Encode.forHtml(userInput);
String safeJs = Encode.forJavaScript(userInput);
String safeUrl = Encode.forUriComponent(userInput);
```

**Maven dependency for OWASP Encoder:**
```xml
<dependency>
    <groupId>org.owasp.encoder</groupId>
    <artifactId>encoder</artifactId>
    <version>1.2.3</version>
</dependency>
```

### Content Security Policy

```java
// Spring Boot
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.headers(headers -> headers
            .contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self'")
            )
        );
        return http.build();
    }
}

// Servlet Filter (works everywhere, framework-agnostic)
@WebFilter("/*")
public class SecurityHeadersFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletResponse response = (HttpServletResponse) res;
        response.setHeader("Content-Security-Policy", "default-src 'self'");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        chain.doFilter(req, res);
    }
}
```

---

## CSRF Protection

### Spring Security

```java
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // For REST APIs with JWT (stateless) - can disable CSRF
            .csrf(csrf -> csrf.disable())

            // For browser apps with sessions - keep CSRF enabled
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            );
        return http.build();
    }
}
```

### Quarkus

```properties
# application.properties
quarkus.http.csrf.enabled=true
quarkus.http.csrf.cookie-name=XSRF-TOKEN
```

---

## Method-Level Security

Use `@PreAuthorize`/`@PostAuthorize` for fine-grained access control at the service layer. Enable with `@EnableMethodSecurity` on the security configuration class.

```java
@Service
public class OrderService {

    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
    public List<Order> findByUser(UUID userId) { ... }

    @PreAuthorize("hasRole('ADMIN')")
    public void delete(UUID id) { ... }

    @PostAuthorize("returnObject.userId == authentication.principal.id")
    public Order findById(UUID id) { ... }
}
```

Never check authorization only at the controller — see also the authorization check example under "Authentication & Authorization" in prior versions of this checklist: enforce it at the service layer so it cannot be bypassed by another entry point.

---

## Rate Limiting

Protect public endpoints from abuse using Bucket4j:

```java
@Component @RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        String ip = request.getRemoteAddr();
        Bucket bucket = buckets.computeIfAbsent(ip, this::newBucket);

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Rate limit exceeded");
        }
    }

    private Bucket newBucket(String ip) {
        return Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build();
    }
}
```

---

## CORS Configuration

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    var config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://yourdomain.com")); // never "*" in production
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
```

---

## Secrets Management

**Never hardcode secrets.** Use environment variables or a secrets manager.

```java
// ❌ BAD: Hardcoded secrets
private static final String API_KEY = "sk-1234567890abcdef";
private static final String DB_PASSWORD = "admin123";

// ✅ GOOD: Environment variables
String apiKey = System.getenv("API_KEY");

// ✅ GOOD: External configuration
@Value("${api.key}")
private String apiKey;
```

```properties
# application.properties — reference env vars, never values
app.security.jwt.secret=${JWT_SECRET}
app.database.password=${DB_PASSWORD}
app.sendgrid.api-key=${SENDGRID_API_KEY}
```

For production, use a dedicated secrets manager:
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-vault-config</artifactId>
</dependency>
```
Or AWS Secrets Manager / Azure Key Vault equivalents.

**What must NEVER be in git:**
```gitignore
.env
*.pem
*.key
*credentials*
*secret*
application-local.yml
```
- Passwords or API keys
- JWT secrets
- Private certificates
- `.env` files with real values

---

## Secure Deserialization

### Avoid Java Serialization

```java
// ❌ DANGEROUS: Java ObjectInputStream
ObjectInputStream ois = new ObjectInputStream(untrustedInput);
Object obj = ois.readObject();  // Remote Code Execution risk!

// ✅ GOOD: Use JSON with Jackson
ObjectMapper mapper = new ObjectMapper();
User user = mapper.readValue(json, User.class);
```

### Jackson Security

```java
// ✅ Configure Jackson safely
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // Prevent unknown properties exploitation
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        // Don't allow class type in JSON (prevents polymorphic gadget attacks)
        mapper.deactivateDefaultTyping();

        return mapper;
    }
}
```

---

## Dependency Security

### OWASP Dependency Check

**Maven:**
```xml
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>9.0.7</version>
    <executions>
        <execution>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>  <!-- Fail on high severity -->
    </configuration>
</plugin>
```

**Run:**
```bash
mvn dependency-check:check
# Report: target/dependency-check-report.html
```

### Keep Dependencies Updated

```bash
# Check for updates
mvn versions:display-dependency-updates

# Update to latest
mvn versions:use-latest-releases
```

---

## Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'` | Prevent XSS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Strict-Transport-Security` | `max-age=31536000` | Force HTTPS |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.headers(headers -> headers
        .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
        .frameOptions(frame -> frame.deny())
        .xssProtection(xss -> xss.enable())
        .httpStrictTransportSecurity(hsts -> hsts
            .includeSubDomains(true)
            .maxAgeInSeconds(31536000))
        .contentTypeOptions(Customizer.withDefaults())
    );
    return http.build();
}
```

---

## Logging Security Events

```java
// ✅ Log security-relevant events
log.info("User login successful", kv("userId", userId), kv("ip", clientIp));
log.warn("Failed login attempt", kv("username", username), kv("ip", clientIp), kv("attempt", attemptCount));
log.warn("Access denied", kv("userId", userId), kv("resource", resourceId), kv("action", action));
log.error("Authentication failure", kv("reason", reason), kv("ip", clientIp));

// ❌ NEVER log sensitive data
log.info("Login: user={}, password={}", username, password);  // NEVER!
log.debug("Request body: {}", requestWithCreditCard);          // NEVER!
```

See `observability` for the full structured-logging setup.

---

## Security Checklist

### Authentication & Tokens
- [ ] Passwords hashed with BCrypt cost factor >= 12 (or Argon2)
- [ ] JWT secret >= 256 bits, stored in env var
- [ ] JWT expiration <= 60 minutes, signature and expiration always validated
- [ ] `@PreAuthorize`/`@PostAuthorize` on sensitive service methods, not just controllers

### Input & Injection
- [ ] All inputs validated with Bean Validation (allowlist patterns preferred)
- [ ] No SQL string concatenation — parameterized queries or Specification only
- [ ] Output encoded for context (HTML, JS, URL)

### Transport & Config
- [ ] CORS configured with explicit allowed origins (not `*`)
- [ ] CSRF protection enabled for browser/session-based apps
- [ ] Rate limiting on public endpoints
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options, nosniff)
- [ ] HTTPS enforced (HSTS)

### Secrets & Data
- [ ] No secrets in code or committed properties files
- [ ] Sensitive data not logged
- [ ] Secure deserialization (no raw Java `ObjectInputStream` on untrusted input)

### Dependencies & Operations
- [ ] No known vulnerabilities (OWASP Dependency Check)
- [ ] Dependencies up to date, unnecessary ones removed
- [ ] Debug/dev features disabled in production
- [ ] Error responses do not expose stack traces or internal details
- [ ] Security events logged (login, access denied, auth failure)

---

## Related Skills

- `java-code-review` - General code review
- `concurrency` - Rate limiting filters and thread-safe shared state
- `persistence` - Specification API and query patterns referenced above
