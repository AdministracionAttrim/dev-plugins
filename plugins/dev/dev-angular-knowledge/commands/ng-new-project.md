---
description: Crea una aplicacion Angular nueva con la Angular CLI, siguiendo la skill oficial angular-new-app (comprobacion de CLI, flags recomendados, configuracion de IA, Tailwind opcional).
argument-hint: <nombre de la app y requisitos opcionales (routing, SSR, estilos, tailwind...)>
allowed-tools: Bash, Read, Write, Glob
---

Crea una aplicacion Angular nueva para: $ARGUMENTS

Sigue la skill `angular-new-app` de este plugin: comprueba primero que la Angular CLI esta disponible (`ng version` o `where ng`/`which ng`), pregunta o deduce el nombre de la app y los flags relevantes (`--style`, `--routing`, `--ssr`, `--prefix`, `--skip-tests` solo si se pide explicitamente), y usa `--ai-config=agents` salvo que el entorno indique otra herramienta de IA. No arranques la aplicacion hasta que se haya construido algo de funcionalidad -- antes de eso, usa `npx ng build` para comprobar que compila.
