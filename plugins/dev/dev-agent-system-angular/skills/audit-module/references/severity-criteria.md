# Severity Criteria + Verification Depth

i: El score debe reflejar PROFUNDIDAD DE VERIFICACIÓN, no solo penalizaciones estáticas. feat-meter puntuó 80/100 "~95% completo" con 2 críticos vivos y verificación dinámica NO ejecutada → falsa confianza. Un pase estático limpio ≠ módulo sólido.

## Severidad (una por bug)

| Sev | Tag | Criterio |
|-----|-----|----------|
| Critical | 🔴 | Permisos rotos (ruta sin guard / botón siempre mal) \| corrupción de datos (staging delete dirección incorrecta, id de plantilla como instancia) \| navegación rota (onRequestSuccess ausente) \| 500/crash runtime \| duplicación de FormArray |
| High | 🟠 | Requisito HU ausente/incorrecto (required ausente, required DONDE HU=opcional, validador rango ausente) \| filtro/orden de columna roto (silenciado/400/500) \| form muestra estado erróneo en inactivo \| entidad carga pero no guarda \| cascada FormArray no limpia/no actualiza \| baja sin avisar dependientes |
| Medium | 🟡 | Mismatch UX/Figma (columna, orden, label, capitalización) \| pre-filtro por defecto incorrecto \| i18n gap (key falta en es/en) \| label de error incorrecto \| confirmación/toast ausente \| filtro no persiste |
| Low | 🟢 | Dead code (método/import sin uso, callers==0 en TODOS incl. *.spec.ts) \| desviación UX menor fuera de HU \| violación de estilo |

## Verification Depth  (NUEVO — gate de honestidad)

i: Declarar `verification_depth` en el frontmatter del reporte. Determina el TECHO de lo que la auditoría puede afirmar.

| Depth | Significado | Techo de afirmación |
|-------|-------------|---------------------|
| `static` | Solo análisis de código + probes razonadas. Server NO levantado. | !!declarar "% completo" ni "sólido". Frase obligatoria: "⚠️ Verificación dinámica NO ejecutada — score es techo OPTIMISTA; filtros/orden/cascadas NO confirmados en runtime." |
| `smoke` | Server activo + revisión Playwright MCP manual (sin spec corrido). | Puede afirmar que las pantallas cargan y los datos se pueblan. Filtros/orden confirmados solo si se probaron en el smoke. |
| `runtime` | Spec E2E EJECUTADO (resultados parseados). | Puede afirmar comportamiento verificado en los flujos cubiertos por tests que pasaron. |

G:SC1 T: depth==static → A: !!"módulo completo al X%" en la conclusión | usar "pendiente verificación dinámica"
G:SC2 T: probe `[runtime]` no ejecutada (server off) → A: marcar el item como "NO VERIFICADO", !!✅
G:SC3 bugs corregidos DURANTE la sesión !!inflan el titular del score — reportar score PRE-fix como métrica del estado que llegó a la auditoría

## Audit Score (0–100)

```
score = max(0, 100 - (critical × 15) - (high × 8) - (medium × 3) - (low × 1))
penalización por depth:  static → score_efectivo = min(score, 70)   (techo, no puede "aprobar" sin runtime)
                          smoke  → min(score, 85)
                          runtime → score (sin techo)
```

i: El techo por depth evita que un pase estático limpio lea como "excelente". Un módulo solo alcanza >85 si su comportamiento se verificó en runtime.

Incluir al pie del reporte:

```
Audit Score (PRE-fix): XX/100  ·  depth: static|smoke|runtime  ·  techo aplicado: YY
(🔴 N · 🟠 N · 🟡 N · 🟢 N)
⚠️ {frase de honestidad según depth}
```

@: [@file:.claude/skills/audit-module/references/behavioral-probes.md]
