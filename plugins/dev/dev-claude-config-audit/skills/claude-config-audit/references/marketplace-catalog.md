# Catálogo de plugins — attrim-marketplace

**Foto fija tomada: 2026-07-21.** Este repo es privado (sin URL pública para fetch en vivo), así que este catálogo es una copia estática que hay que refrescar a mano cada vez que se cure/publique un plugin nuevo — si esta fecha es antigua, adviértelo en el informe. Fuente: `.claude-plugin/marketplace.json`.

| Plugin | Categoría | Keywords | Cuándo sugerirlo |
|---|---|---|---|
| `dev-angular-knowledge` | dev | angular, frontend, signals, typescript | Proyecto detectado como Angular (componentes, DI, signals, forms, routing, HTTP, testing, styling) y sin skills/agentes de Angular ya presentes. |
| `dev-java-knowledge` | dev | java, spring boot, backend, jpa, testing, seguridad | Proyecto detectado como Java/Spring Boot y sin skills/agentes de Java ya presentes. |
| `dev-agent-system-core` | dev | agents, self-learning, workflow, wiki | El proyecto no tiene ningún sistema de agentes multi-rol ni auto-aprendizaje (no hay `agent-system.config.json`, ni hooks de lint automático, ni knowledge-log) y parece lo bastante grande/activo para beneficiarse de uno. |
| `dev-agent-system-angular` | dev | angular, primeng, ngrx, tailwind | Ya usa (o va a usar) `dev-agent-system-core` y el stack detectado es Angular/PrimeNG/NgRx. |
| `dev-agent-system-dotnet` | dev | dotnet, aspnetcore, efcore, csharp | Ya usa (o va a usar) `dev-agent-system-core` y el stack detectado es .NET/ASP.NET Core. |
| `dev-explain-branch` | dev | git, merge-request, code-review, azure-devops | El proyecto no tiene ninguna forma de generar descripciones de MR/PR automáticamente y el equipo abre PRs con frecuencia. |
| `dev-mapbox-integration` | dev | mapbox, angular, maps, geo | El proyecto usa Mapbox GL JS (dependencia `mapbox-gl` en package.json) y no hay skill/agente de mapas ya presente. |
| `dev-dynamic-memory` | dev | memoria, contexto, sesiones, productividad | El proyecto no tiene ningún sistema de memoria entre sesiones (nada en `.claude/memory/` o equivalente) y parece un proyecto de trabajo continuado en el tiempo. |
| `dev-superarchitect` | dev | arquitectura, planificacion, diseno, adr | El proyecto no tiene ningún agente/comando de planificación de arquitectura previo a codificar. |
| `dev-statusline` | dev | statusline, cli, productividad, settings | La configuración no tiene una statusline personalizada (relevante solo si el usuario pregunta por productividad/DX, no es un hallazgo de seguridad/estructura). |
| `sost-generador-cdm-dataie` | sost | sostenibilidad, esg, informes, cuadro de mando, dataie | Solo si el proyecto/uso detectado es de consultoría de sostenibilidad (ESG) — no aplica a proyectos de desarrollo software. |

No sugerir `dev-claude-config-audit` (este propio plugin) como recomendación — sería circular.
