# Pruebas con RouterTestingHarness

Al probar componentes que implican enrutamiento, es crucial **no simular (mock) el Router ni los servicios relacionados**. En su lugar, usa `RouterTestingHarness`, que ofrece una forma robusta y fiable de probar la lógica de enrutamiento en un entorno que refleja fielmente una aplicación real.

Usar el harness garantiza que estás probando la configuración real del router, los guards y los resolvers, lo que da lugar a pruebas más significativas.

## Configuración para probar el router

`RouterTestingHarness` es la herramienta principal para probar escenarios de enrutamiento. También necesitas proporcionar tus rutas de prueba mediante la función `provideRouter` en la configuración de tu `TestBed`.

### Ejemplo de configuración

```ts
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {Dashboard} from './dashboard.component';
import {HeroDetail} from './hero-detail.component';

describe('Dashboard Component Routing', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // 1. Configura el TestBed con las rutas de prueba
    TestBed.configureTestingModule({
      providers: [
        // Usa provideRouter con tus rutas específicas de prueba
        provideRouter([
          {path: '', component: Dashboard},
          {path: 'heroes/:id', component: HeroDetail},
        ]),
      ],
    });

    // 2. Crea el RouterTestingHarness
    harness = await RouterTestingHarness.create();
  });
});
```

### Conceptos clave

1.  **`provideRouter([...])`**: proporciona una configuración de enrutamiento específica para las pruebas. Debe incluir las rutas necesarias para que el componente bajo prueba funcione correctamente.
2.  **`RouterTestingHarness.create()`**: crea e inicializa el harness de forma asíncrona y realiza una navegación inicial a la URL raíz (`/`).

## Escribir pruebas de router

Una vez creado el harness, puedes usarlo para dirigir la navegación y hacer aserciones sobre el estado del router y los componentes activados.

### Ejemplo: probar la navegación

```ts
it('should navigate to a hero detail when a hero is selected', async () => {
  // 1. Navega al componente inicial y obtén su instancia
  const dashboard = await harness.navigateByUrl('/', Dashboard);

  // Supongamos que el dashboard tiene un método para seleccionar un héroe
  const heroToSelect = {id: 42, name: 'Test Hero'};
  dashboard.selectHero(heroToSelect);

  // Espera a la estabilidad tras la acción que dispara la navegación
  await harness.fixture.whenStable();

  // 2. Verifica la URL
  expect(harness.router.url).toEqual('/heroes/42');

  // 3. Obtén el componente activado tras la navegación
  const heroDetail = await harness.getHarness(HeroDetail);

  // 4. Verifica el estado del nuevo componente
  expect(await heroDetail.componentInstance.hero.name).toBe('Test Hero');
});

it('should get the activated component directly', async () => {
  // Navega y obtén la instancia del componente en un solo paso
  const dashboardInstance = await harness.navigateByUrl('/', Dashboard);

  expect(dashboardInstance).toBeInstanceOf(Dashboard);
});
```

### Buenas prácticas

- **Navega con el harness:** usa siempre `harness.navigateByUrl()` para simular la navegación. Este método devuelve una promesa que se resuelve con la instancia del componente activado.
- **Accede al estado del router:** usa `harness.router` para acceder a la instancia real del router y verificar su estado (p. ej., `harness.router.url`).
- **Obtén los componentes activados:** usa `harness.getHarness(ComponentType)` para obtener una instancia del harness de un componente para el componente enrutado actualmente activado, o `harness.routeDebugElement` para obtener el `DebugElement`.
- **Espera a la estabilidad:** después de realizar una acción que provoca navegación, siempre haz `await harness.fixture.whenStable()` para asegurarte de que el enrutamiento ha terminado antes de hacer las aserciones.
