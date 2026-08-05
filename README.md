# Attrim dev plugins

Marketplace público de plugins de [Claude Code](https://docs.claude.com/en/docs/claude-code) del equipo de desarrollo de Attrim: skills, comandos, agentes, hooks y configuración MCP.

Documentación de todos los plugins: https://administracionattrim.github.io/dev-plugins

## Instalación

Registra el marketplace en tu Claude Code:

```
/plugin marketplace add AdministracionAttrim/dev-plugins
```

Instala un plugin concreto:

```
/plugin install <nombre-del-plugin>@attrim-dev-skills
```

## Estructura del repo

```
dev-plugins/
├── .claude-plugin/
│   └── marketplace.json      # catálogo de plugins
├── plugins/
│   └── dev/                  # plugins del equipo de desarrollo
├── .github/workflows/
│   └── validate.yml          # valida marketplace.json y plugin.json en cada PR
├── CONTRIBUTING.md
└── README.md
```

## Proponer un plugin nuevo

Cualquier empleado puede proponer un plugin nuevo vía Pull Request. El proceso completo (convención de nombres, checklist de revisión, separación de roles, versionado) está descrito en [CONTRIBUTING.md](./CONTRIBUTING.md).
