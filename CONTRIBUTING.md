# Contribuir con un plugin nuevo

Este marketplace centraliza plugins de Claude Code del equipo de desarrollo (`dev`) de Attrim. Cualquier empleado puede proponer un plugin nuevo siguiendo este proceso.

## 1. Quién puede proponer un plugin

Cualquier empleado, a través de un Pull Request. No hace falta permiso previo para abrir el PR; el proceso de revisión es el control de calidad.

## 2. Convención de nombres

- Slug del plugin (inmutable una vez publicado): `dev-<nombre-descriptivo>`.
  - Ejemplo: `dev-code-review`.
- Nunca reutilices ni renombres un slug ya publicado. Si necesitas cambiar el nombre público, usa el mecanismo `renames` de `marketplace.json` para migrar las instalaciones existentes sin romperlas.

## 3. Estructura mínima de un plugin

```
plugins/dev/<slug>/
├── .claude-plugin/
│   └── plugin.json       # name, version, description, author
├── commands/              # opcional
├── agents/                # opcional
├── skills/
│   └── <nombre-skill>/
│       └── SKILL.md       # frontmatter YAML con name y description
└── hooks/, .mcp.json       # opcional
```

El plugin no puede depender de archivos fuera de su propia carpeta (nada de `../` hacia fuera del plugin), ya que se copia a una caché local al instalarse.

## 4. Alta en `marketplace.json`

Añade una entrada al array `plugins` de `.claude-plugin/marketplace.json` con:

- `name`: el slug del plugin.
- `source`: ruta relativa dentro del repo, ej. `./plugins/dev/dev-code-review`.
- `description`, `category` (`dev`) y `keywords` (2-4 términos de búsqueda).

## 5. Separación de roles

El autor de un plugin **no puede aprobar su propio PR**. Se necesita como mínimo un revisor distinto al autor del plugin.

## 6. Checklist mínima antes de aprobar un PR

- [ ] El `SKILL.md` tiene una `description` clara sobre *qué hace* y *cuándo debe activarse* el skill.
- [ ] Se han probado al menos 2-3 casos: uno donde el skill debe activarse, uno donde no debe hacerlo, y un caso límite.
- [ ] Si el plugin incluye scripts ejecutables o llamadas a APIs externas, se ha revisado qué datos toca y con qué permisos.
- [ ] El plugin no depende de archivos fuera de su propia carpeta.
- [ ] El plugin no contiene datos, credenciales o rutas internas de Attrim que no deban ser públicas.
- [ ] El PR pasa el workflow de validación (`.github/workflows/validate.yml`).

## 7. Versionado

Cada plugin lleva su propio campo `version` semántico (`MAJOR.MINOR.PATCH`) en `plugin.json`. Los cambios incompatibles con instalaciones existentes incrementan el `MAJOR`.
