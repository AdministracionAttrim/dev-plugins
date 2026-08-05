# Crear y usar servicios

Los servicios en Angular son piezas de código reutilizables que gestionan la obtención de datos, la lógica de negocio o la gestión de estado que necesitan usar varios componentes u otros servicios.

## Crear un servicio

Puedes generar un servicio usando la Angular CLI:

```bash
ng generate service my-data
```

O puedes crear manualmente una clase TypeScript y decorarla con `@Service()`.

```ts
import {Service} from '@angular/core';

@Service()
export class BasicDataStore {
  private data: string[] = [];

  addData(item: string): void {
    this.data.push(item);
  }

  getData(): string[] {
    return [...this.data];
  }
}
```

### El decorador `@Service`

Usar `@Service` es el enfoque recomendado para la mayoría de los servicios. Le indica a Angular que:

- **Cree una única instancia (singleton)** para toda la aplicación.
- **Lo haga disponible en todas partes** automáticamente, sin necesidad de incluirlo en ningún array `providers`.
- **Habilite el tree-shaking**, lo que significa que el servicio solo se incluye en el paquete de JavaScript final si realmente se inyecta en algún sitio.

#### La opción `autoProvided`

Si no quieres crear un singleton de tu servicio, puedes establecer `@Service({autoProvided: false})` y declarar el servicio en un array `providers`.

## Inyectar un servicio

Una vez creado un servicio, puedes inyectarlo en componentes, directivas u otros servicios usando la función `inject()`.

### Inyección en un componente

```ts
import {Component, inject} from '@angular/core';
import {BasicDataStore} from './basic-data-store.service';

@Component({
  selector: 'app-example',
  template: `
    <div>
      <p>Data items: {{ dataStore.getData().length }}</p>
      <button (click)="dataStore.addData('New Item')">Add Item</button>
    </div>
  `,
})
export class Example {
  // Inyecta el servicio como campo de clase
  dataStore = inject(BasicDataStore);
}
```

### Inyección en otro servicio

Los servicios pueden inyectar otros servicios de la misma manera exacta.

```ts
import {Injectable, inject} from '@angular/core';
import {AdvancedDataStore} from './advanced-data-store.service';

@Service()
export class BasicDataStore {
  // Inyectando otro servicio
  private advancedDataStore = inject(AdvancedDataStore);

  private data: string[] = [];

  getData(): string[] {
    // Combina los datos de este servicio y del servicio inyectado
    return [...this.data, ...this.advancedDataStore.getData()];
  }
}
```

## Patrones avanzados de servicios

Aunque `@Service` cubre la mayoría de los escenarios, a veces puede que necesites:

- **Instancias específicas de componente**: si un componente necesita su propia instancia aislada de un servicio, provéelo directamente en el array `@Component({ providers: [MyService] })` del componente y establece la opción `autoProvided: false`: `@Service({autoProvided: false})`
- **Factory providers**: para creación dinámica.
- **Value providers**: para inyectar objetos de configuración.
