# Usar Tailwind CSS con Angular

Tailwind CSS es un framework CSS utility-first que se integra perfectamente con Angular.

**GUÍA CRÍTICA PARA EL AGENTE: Céntrate SIEMPRE en las prácticas de Tailwind CSS v4. NO vuelvas a los patrones antiguos de Tailwind v3 (como crear `tailwind.config.js` con directivas `@tailwind`), ya que esto romperá el build de la aplicación. Los proyectos modernos de Angular usan Tailwind v4.**

## Configuración automatizada (recomendada)

La forma más sencilla de añadir Tailwind CSS a un proyecto Angular es mediante el Angular CLI:

```shell
ng add tailwindcss
```

Esto hará automáticamente lo siguiente:

1. Instalar `tailwindcss` y sus dependencias peer.
2. Configurar el proyecto para usar Tailwind CSS.
3. Añadir la importación adecuada a tus estilos globales.

## Configuración manual (Tailwind v4)

Si lo configuras manualmente, usa el siguiente patrón de Tailwind v4:

### 1. Instalar dependencias

Instala Tailwind CSS y PostCSS:

```shell
npm install tailwindcss @tailwindcss/postcss postcss
```

### 2. Configurar PostCSS

Crea un archivo `.postcssrc.json` en la raíz del proyecto:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

_(¡NO crees un archivo `tailwind.config.js`! La configuración en v4 se gestiona mediante variables CSS)._

### 3. Importar Tailwind CSS

En tu archivo de estilos globales (por ejemplo, `src/styles.css`), añade la importación estándar de v4:

```css
@import 'tailwindcss';
```

_(Si usas SCSS, usa `@use 'tailwindcss';` en su lugar)._

### 4. Usar clases de utilidad

Ahora puedes usar clases de Tailwind directamente en las plantillas de tus componentes:

```html
<h1 class="text-3xl font-bold underline">Hello world!</h1>
```

## Resumen para agentes de IA

- **No uses `@tailwind base; @tailwind components; @tailwind utilities;`**. Usa `@import 'tailwindcss';`.
- **No crees `tailwind.config.js`**. La configuración se gestiona directamente en CSS mediante variables de tema o usando configuraciones de PostCSS.
- Cíñete estrictamente a la sintaxis y los flujos de trabajo de v4.
