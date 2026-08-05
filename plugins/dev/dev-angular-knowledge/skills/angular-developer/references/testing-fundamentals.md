# Fundamentos de testing

Esta guía cubre los principios y prácticas fundamentales para escribir pruebas unitarias en este repositorio, que usa Vitest como test runner.

## Filosofía principal: Zoneless y Async-First

Este proyecto sigue un enfoque de testing moderno y zoneless. Los cambios de estado programan actualizaciones de forma asíncrona, y las pruebas deben tenerlo en cuenta.

**NO** uses `fixture.detectChanges()` para disparar actualizaciones manualmente.
**SIEMPRE** usa el patrón "Act, Wait, Assert" (actuar, esperar, verificar):

1.  **Act (actuar):** Actualiza el estado o realiza una acción (p. ej., establecer un input del componente, hacer clic en un botón).
2.  **Wait (esperar):** Usa `await fixture.whenStable()` para permitir que el framework procese la actualización programada y renderice los cambios.
3.  **Assert (verificar):** Comprueba el resultado.

### Ejemplo de estructura básica de una prueba

```ts
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MyComponent} from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let h1: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    // Create the component fixture
    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    h1 = fixture.nativeElement.querySelector('h1');
  });

  it('should display the default title', async () => {
    // ACT: (Implicit) Component is created with default state.
    // WAIT for initial data binding.
    await fixture.whenStable();
    // ASSERT the initial state.
    expect(h1.textContent).toContain('Default Title');
  });

  it('should display a different title after a change', async () => {
    // ACT: Change the component's title property.
    component.title.set('New Test Title');

    // WAIT for the asynchronous update to complete.
    await fixture.whenStable();

    // ASSERT the DOM has been updated.
    expect(h1.textContent).toContain('New Test Title');
  });
});
```

## TestBed y ComponentFixture

- **`TestBed`**: La utilidad principal para crear un módulo de Angular específico para pruebas. Usa `TestBed.configureTestingModule({...})` en tu `beforeEach` para declarar componentes, proveer servicios y configurar los imports necesarios para tu prueba.
- **`ComponentFixture`**: Un handle sobre la instancia del componente creado y su entorno.
  - `fixture.componentInstance`: Accede a la instancia de la clase del componente.
  - `fixture.nativeElement`: Accede al elemento raíz del DOM del componente.
  - `fixture.debugElement`: Un wrapper específico de Angular alrededor de `nativeElement` que ofrece formas más seguras y agnósticas de la plataforma para consultar el DOM (p. ej., `debugElement.query(By.css('p'))`).
