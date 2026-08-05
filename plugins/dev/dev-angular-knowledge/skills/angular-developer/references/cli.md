# Guía de la Angular CLI para agentes

La Angular CLI (`ng`) es la herramienta principal para gestionar un workspace de Angular. Prefiere siempre los comandos de la CLI frente a la creación manual de archivos o comandos genéricos de `npm` al modificar la estructura del proyecto o añadir dependencias específicas de Angular.

## 1. Gestión de dependencias

**Usa SIEMPRE `ng add` para librerías de Angular** en lugar de `npm install`. `ng add` instala el paquete Y ejecuta esquemas (schematics) de inicialización (por ejemplo, configurando `angular.json`, actualizando providers raíz).

```bash
ng add @angular/material
ng add tailwindcss
ng add @angular/fire
```

Para actualizar la aplicación y sus dependencias (lo que ejecuta automáticamente migraciones de código):

```bash
ng update @angular/core@<latest or specific version> @angular/cli<latest or specific version>
```

## 2. Generar código (`ng generate` o `ng g`)

Usa siempre la CLI para generar código y asegurarte de que cumple con los estándares de Angular y actualiza automáticamente los archivos de configuración necesarios.

| Objetivo     | Comando                | Notas                                                                                             |
| :----------- | :---------------------- | :------------------------------------------------------------------------------------------------- |
| Componente   | `ng g c path/to/name`  | Genera un componente. Usa `--inline-style` (`-s`) o `--inline-template` (`-t`) si se solicita.    |
| Servicio     | `ng g s path/to/name`  | Genera un servicio `@Service`.                                                                     |
| Directiva    | `ng g d path/to/name`  | Genera una directiva.                                                                              |
| Pipe         | `ng g p path/to/name`  | Genera un pipe.                                                                                    |
| Guard        | `ng g g path/to/name`  | Genera un guard de ruta funcional.                                                                 |
| Environments | `ng g environments`    | Crea el andamiaje de `src/environments/` y actualiza `angular.json` con las sustituciones de archivo. |

_Nota: no existe un comando para generar una única definición de ruta. Genera un componente y luego añádelo manualmente al array `Routes` en `app.routes.ts`._

## 3. Servidor de desarrollo y proxy

Inicia el servidor de desarrollo local con reemplazo de módulos en caliente (HMR):

```bash
ng serve
```

### Proxy de la API backend

Para redirigir peticiones a la API durante el desarrollo (por ejemplo, enrutando `/api` a un servidor Node local):

1. Crea `src/proxy.conf.json`:
   ```json
   {
     "/api/**": {"target": "http://localhost:3000", "secure": false}
   }
   ```
2. Actualiza `angular.json` bajo el target `serve`:
   ```json
   "serve": {
     "builder": "@angular/build:dev-server",
     "options": { "proxyConfig": "src/proxy.conf.json" }
   }
   ```

## 4. Compilar la aplicación

Compila la aplicación en un directorio de salida (por defecto: `dist/<project-name>/browser`). El Angular moderno usa el builder `@angular/build:application` (basado en esbuild).

```bash
ng build
```

- `ng build` usa por defecto la configuración de producción, que activa la compilación Ahead-of-Time (AOT), la minificación y el tree-shaking.
- Apunta a configuraciones específicas definidas en `angular.json` usando `--configuration`: `ng build --configuration=staging`.

## 5. Pruebas (Testing)

- **Pruebas unitarias**: ejecuta `ng test` para lanzar las pruebas unitarias mediante el test runner configurado (por ejemplo, Karma o Vitest).
- **Pruebas end-to-end (E2E)**: ejecuta `ng e2e`. Si no hay ningún framework E2E configurado, la CLI te pedirá instalar uno (Cypress, Playwright, Puppeteer, etc.).

## 6. Despliegue

Para desplegar una aplicación, primero debes añadir un builder de despliegue y luego ejecutar el comando de despliegue:

```bash
# Ejemplo para Firebase
ng add @angular/fire
ng deploy
```
