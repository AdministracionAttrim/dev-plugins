# Testing con Component Harnesses

Los component harnesses son la forma estándar y preferida de interactuar con componentes en las pruebas. Proporcionan una API robusta y centrada en el usuario que hace que las pruebas sean menos frágiles y más fáciles de leer, aislándolas de los cambios en la estructura interna del DOM de un componente.

## ¿Por qué usar harnesses?

- **Robustez:** Las pruebas no se rompen cuando refactorizas el HTML interno o las clases CSS de un componente.
- **Legibilidad:** Las pruebas describen las interacciones desde la perspectiva de un usuario (p. ej., `button.click()`, `slider.getValue()`) en lugar de mediante consultas al DOM (`fixture.nativeElement.querySelector(...)`).
- **Reutilización:** El mismo harness puede usarse tanto en pruebas unitarias como en pruebas E2E.

Angular Material proporciona un test harness para cada componente de su biblioteca.

## Usar un harness en una prueba unitaria

`TestbedHarnessEnvironment` es el punto de entrada para usar harnesses en pruebas unitarias.

### Ejemplo: probar con un `MatButtonHarness`

```ts
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {MatButtonHarness} from '@angular/material/button/testing';
import {MyButtonContainerComponent} from './my-button-container.component';

describe('MyButtonContainerComponent', () => {
  let fixture: ComponentFixture<MyButtonContainerComponent>;
  let loader: HarnessLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    fixture = TestBed.createComponent(MyButtonContainerComponent);
    // Create a harness loader for the component's fixture
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should find a button with specific text', async () => {
    // Load the harness for a MatButton with the text "Submit"
    const submitButton = await loader.getHarness(MatButtonHarness.with({text: 'Submit'}));

    // Use the harness API to interact with the component
    expect(await submitButton.isDisabled()).toBe(false);
    await submitButton.click();

    // ... assertions
  });
});
```

### Conceptos clave

1.  **`HarnessLoader`**: Un objeto usado para buscar y crear instancias de harness. Obtén un loader para el fixture de tu componente con `TestbedHarnessEnvironment.loader(fixture)`.

2.  **`loader.getHarness(HarnessClass)`**: Busca y devuelve de forma asíncrona una instancia de harness para el primer componente que coincida.

3.  **`HarnessClass.with({ ... })`**: Muchos harnesses proporcionan un método estático `with` que devuelve un `HarnessPredicate`. Esto te permite filtrar y encontrar componentes según sus propiedades, como el texto, el selector o el estado disabled. Úsalo siempre para apuntar con precisión al componente que quieres probar.

4.  **API del harness:** Una vez que tienes una instancia de harness, usa sus métodos (p. ej., `.click()`, `.getText()`, `.getValue()`) para interactuar con el componente. Estos métodos gestionan automáticamente la espera de operaciones asíncronas y la detección de cambios.
