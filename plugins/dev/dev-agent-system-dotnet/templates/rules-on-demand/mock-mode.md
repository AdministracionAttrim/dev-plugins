---
description: >
  Patrón de modo mock por servicio, activable por config, para desarrollar/testear sin dependencias externas
  levantadas. Cargar SOLO al crear o editar cualquier servicio de módulo.
---

# Mock Mode (on-demand)

Trigger: crear/editar cualquier servicio de módulo.

Trivial de adoptar en cualquier proyecto del stack aunque el ejemplo de referencia venga de uno concreto.

## T→A

T: crear un servicio nuevo → A: flag `UseMock` leído en el constructor: `_useMock = configuration.GetValue("UseMock", true);`
T: implementar cualquier método público del servicio → A: PRIMERA línea: `if (_useMock) return _mock.Metodo(...);` delegando en `I{Name}sMock` | !!poner el guard después de un null-check o de un log (ver @rule:code-quality-guardrails G:002)
T: crear el mock del servicio → A: `{Name}sMock` devuelve 2-3 items hardcodeados plausibles
T: escribir tests del servicio → A: cubrir AMBAS ramas (mock y no-mock) — ver @skill:module-audit y @skill:feature-scaffolding

## @refs

@rule:code-quality-guardrails (G:002, el guardarraíl de mock guard más violado en review)
@skill:feature-scaffolding (genera el mock guard como parte del scaffolding)
