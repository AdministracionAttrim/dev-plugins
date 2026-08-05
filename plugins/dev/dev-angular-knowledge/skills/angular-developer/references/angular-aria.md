# Angular Aria

Angular Aria (`@angular/aria`) es una colección de directivas headless y accesibles que implementan patrones WAI-ARIA comunes. Estas directivas gestionan las interacciones de teclado, los atributos ARIA, la gestión del foco y el soporte para lectores de pantalla.

**Como agente de IA, tu papel es proporcionar la estructura HTML y los estilos CSS**, mientras que las directivas se encargan de la lógica de accesibilidad compleja.

## Estilizar componentes headless

Dado que los componentes de Angular Aria son headless, no vienen con estilos por defecto. **Debes** usar CSS para estilizar los distintos estados basándote en los atributos ARIA o las clases estructurales que las directivas aplican automáticamente.

Atributos ARIA comunes a los que apuntar en CSS:

- `[aria-expanded="true"]` / `[aria-expanded="false"]`
- `[aria-selected="true"]`
- `[aria-disabled="true"]`
- `[aria-current="page"]` (para navegación)

---

**CRÍTICO**: antes de usar este paquete, debe instalarse mediante el gestor de paquetes. Confirma que se ha instalado en el proyecto. Usa `npm install @angular/aria` para instalarlo si es necesario.

## 1. Accordion (Acordeón)

Organiza contenido relacionado en secciones expandibles/colapsables.

**Uso:** el Accordion es un componente de diseño pensado para organizar contenido en grupos lógicos que los usuarios pueden expandir de uno en uno para reducir el desplazamiento en páginas con mucho contenido. Úsalo para preguntas frecuentes, formularios largos o revelación progresiva de información, pero evítalo para la navegación principal o escenarios en los que los usuarios deban ver varias secciones de contenido simultáneamente.

**Imports:** `import { AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger } from '@angular/aria/accordion';`

**Directivas:** `ngAccordionGroup`, `ngAccordionTrigger`, `ngAccordionPanel`, `ngAccordionContent` (para carga diferida).

```ts
@Component({
  selector: 'app-cmp',
  imports: [AccordionContent, AccordionGroup, AccordionPanel, AccordionTrigger],
  template: `...`,
  styles: [],
})
export class App {
  protected readonly title = signal('angular-app');
}
```

```html
<div ngAccordionGroup [multiExpandable]="false">
  <div class="accordion-item">
    <button ngAccordionTrigger [panel]="panel1" class="accordion-header">
      Sección 1
      <span class="icon">▼</span>
    </button>
    <div ngAccordionPanel #panel1="ngAccordionPanel" class="accordion-panel">
      <ng-template ngAccordionContent>
        <p>Contenido cargado de forma diferida aquí.</p>
      </ng-template>
    </div>
  </div>
</div>
```

**Estrategia de estilizado:**
Apunta al atributo `[aria-expanded]` en el trigger para rotar iconos, y estiliza la visibilidad del panel.

```css
.accordion-header[aria-expanded='true'] .icon {
  transform: rotate(180deg);
}

/* La directiva del panel gestiona la eliminación del DOM, pero puedes estilizar la transición */
.accordion-panel {
  padding: 1rem;
  border-top: 1px solid #ccc;
}
```

---

## 2. Listbox

Una directiva fundamental para mostrar una lista de opciones. Se usa para listas de selección visibles (no desplegables).

**Uso:** listas seleccionables visibles (selección única o múltiple).

**Imports:** `import {Listbox, Option} from '@angular/aria/listbox';`

**Directivas:** `ngListbox`, `ngOption`.

```ts
@Component({
  selector: 'app-cmp',
  imports: [Listbox, Option],
  template: `...`,
  styles: [],
})
export class App {
  protected readonly title = signal('angular-app');
}
```

```html
<!-- orientación horizontal o vertical -->
<ul ngListbox [(value)]="selectedItems" orientation="horizontal" [multi]="true">
  <li ngOption value="apple" class="option">Manzana</li>
  <li ngOption value="banana" class="option">Plátano</li>
</ul>
```

**Estrategia de estilizado:**
Apunta a `[aria-selected="true"]` para el estado seleccionado y a `:focus-visible` o `[data-active]` para el elemento con foco (Angular Aria usa roving tabindex o activedescendant).

```css
.option {
  padding: 8px;
  cursor: pointer;
}
.option[aria-selected='true'] {
  background: #e0f7fa;
  font-weight: bold;
}
/* Estado de foco gestionado por aria */
.option:focus-visible {
  outline: 2px solid blue;
}
```

---

## 3. Combobox, Select y Multiselect

Estos patrones combinan la directiva `ngCombobox` (aplicada directamente al elemento trigger/combobox) con un popup que contiene un widget `ngListbox`.

- **Combobox (autocompletar)**: se aplica a un elemento `<input ngCombobox>`. Ideal cuando al escribir se filtra la lista.
- **Select**: se aplica a un contenedor enfocable como un elemento `<div ngCombobox>` o `<button ngCombobox>`. Los usuarios seleccionan de una lista de opciones.
- **Multiselect**: un Combobox o Select combinado con un `ngListbox` de selección múltiple.

**Imports:**

```ts
import {Combobox, ComboboxPopup, ComboboxWidget} from '@angular/aria/combobox';
import {Listbox, Option} from '@angular/aria/listbox';
```

**Directivas:** `ngCombobox`, `ngComboboxPopup`, `ngComboboxWidget`, `ngListbox`, `ngOption`.

```html
<!-- Ejemplo 1: autocompletar estándar -->
<div>
  <input
    ngCombobox
    #combobox="ngCombobox"
    [(value)]="searchString"
    [(expanded)]="isExpanded"
    placeholder="Buscar opciones..."
    class="select-trigger"
  />

  <ng-template ngComboboxPopup [combobox]="combobox">
    <ul
      ngComboboxWidget
      ngListbox
      #listbox="ngListbox"
      [(value)]="selectedValue"
      [activeDescendant]="listbox.activeDescendant()"
      class="dropdown-menu"
    >
      <li ngOption value="option1" label="Option 1" class="option">Opción 1</li>
      <li ngOption value="option2" label="Option 2" class="option">Opción 2</li>
    </ul>
  </ng-template>
</div>

<!-- Ejemplo 2: componente Select (aplicado directamente a un div trigger) -->
<div ngCombobox #select="ngCombobox" [(expanded)]="selectExpanded" class="select-trigger">
  <span class="select-text">{{ selectedValue() ?? 'Elige una opción' }}</span>
  <span class="icon">▼</span>
</div>

<ng-template ngComboboxPopup [combobox]="select">
  <ul
    ngComboboxWidget
    ngListbox
    #selectListbox="ngListbox"
    [(value)]="selectedValues"
    [activeDescendant]="selectListbox.activeDescendant()"
    (click)="onCommit()"
    (keydown.enter)="onCommit()"
    class="dropdown-menu"
  >
    <li ngOption value="option1" label="Option 1" class="option">Opción 1</li>
    <li ngOption value="option2" label="Option 2" class="option">Opción 2</li>
  </ul>
</ng-template>
```

**Estrategia de estilizado:**
Estiliza el contenedor del popup para que parezca un desplegable flotando sobre el contenido (a menudo combinado con CDK Overlay).

```css
.select-trigger {
  width: 200px;
  padding: 8px;
  text-align: left;
}
.dropdown-menu {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid #ccc;
  background: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

## 4. Menu y Menubar

Para acciones, comandos y menús contextuales (no para selección en formularios).

**Uso:** el Menubar es un patrón de navegación de alto nivel diseñado para construir barras de comandos de aplicación al estilo escritorio (por ejemplo, Archivo, Editar, Ver) que permanecen persistentes en una interfaz. Se aprovecha mejor para organizar comandos complejos en categorías lógicas de nivel superior con soporte completo de teclado horizontal, pero debe evitarse para listas de acciones independientes simples o diseños mobile-first donde el espacio horizontal es limitado.

**Imports:** `import {MenuBar, Menu, MenuContent, MenuItem, MenuTrigger} from '@angular/aria/menu';`

**Directivas:** `ngMenuBar`, `ngMenu`, `ngMenuItem`, `ngMenuTrigger`, `ngMenuContent`.

```html
<!-- Ejemplo de Menubar -->
<div ngMenuBar class="menubar">
  <div ngMenuItem value="file" [submenu]="fileMenu" class="menubar-item">Archivo</div>
  <div ngMenuItem value="edit" [submenu]="editMenu" class="menubar-item">Editar</div>
</div>

<div ngMenu #fileMenu="ngMenu" class="menu">
  <ng-template ngMenuContent>
    <div ngMenuItem value="new">Nuevo</div>
    <div ngMenuItem value="open">Abrir</div>
  </ng-template>
</div>

<div ngMenu #editMenu="ngMenu" class="menu">
  <ng-template ngMenuContent>
    <div ngMenuItem value="cut">Cortar</div>
    <div ngMenuItem value="copy">Copiar</div>
  </ng-template>
</div>
```

**Estrategia de estilizado:**
Usa flexbox para el menubar. Muestra/oculta los submenús según el estado del trigger.

```css
.menubar {
  display: flex;
  gap: 10px;
  list-style: none;
  padding: 0;
}
.menu {
  background: white;
  border: 1px solid #ccc;
  padding: 5px 0;
}
.menu li {
  padding: 5px 15px;
  cursor: pointer;
}
```

---

## 5. Tabs

Secciones de contenido apiladas donde solo un panel es visible.

**Uso:** el componente Tabs se usa para organizar contenido relacionado en secciones distintas y navegables, permitiendo a los usuarios cambiar entre categorías o vistas sin salir de la página. Es ideal para paneles de configuración, documentación multitema o dashboards, pero debe evitarse para flujos de trabajo secuenciales (steppers) o cuando la navegación implica más de 7-8 secciones.

**Imports:** `import {Tab, Tabs, TabList, TabPanel, TabContent} from '@angular/aria/tabs';`

**Directivas:** `ngTabs`, `ngTabList`, `ngTab`, `ngTabPanel`, `ngTabContent`.

```html
<div ngTabs>
  <ul ngTabList [(selectedTab)]="selectedTabValue" class="tab-list">
    <li ngTab value="profile" class="tab-btn">Perfil</li>
    <li ngTab value="security" class="tab-btn">Seguridad</li>
  </ul>

  <div ngTabPanel value="profile" class="tab-panel">
    <ng-template ngTabContent>Ajustes de perfil</ng-template>
  </div>
  <div ngTabPanel value="security" class="tab-panel">
    <ng-template ngTabContent>Ajustes de seguridad</ng-template>
  </div>
</div>
```

**Estrategia de estilizado:**
Apunta a `[aria-selected="true"]` en los botones de pestaña.

```css
.tab-list {
  display: flex;
  border-bottom: 2px solid #ccc;
  list-style: none;
  padding: 0;
}
.tab-btn {
  padding: 10px 20px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.tab-btn[aria-selected='true'] {
  border-bottom-color: blue;
  font-weight: bold;
}
.tab-panel {
  padding: 20px;
}
```

---

## 6. Toolbar

Agrupa controles relacionados (como formato de texto).

**Uso:** el Toolbar es un componente organizativo diseñado para agrupar controles relacionados usados con frecuencia en un único contenedor lógico. Se usa mejor para mejorar la eficiencia con el teclado (mediante navegación con flechas) y la estructura visual en flujos de trabajo que requieren acciones repetidas, como el formato de texto o los controles de medios.

**Imports:** `import {Toolbar, ToolbarWidget, ToolbarWidgetGroup} from '@angular/aria/toolbar';`

**Directivas:** `ngToolbar`, `ngToolbarWidget`, `ngToolbarWidgetGroup`.

```html
<div ngToolbar class="toolbar">
  <div ngToolbarWidgetGroup [multi]="true" role="group" aria-label="Formatting">
    <button ngToolbarWidget value="bold" class="tool-btn">B</button>
    <button ngToolbarWidget value="italic" class="tool-btn">I</button>
  </div>
</div>
```

**Estrategia de estilizado:**
Apunta a `[aria-pressed="true"]` (para botones de alternancia) o `[aria-checked="true"]` (para grupos de radio) dentro del toolbar.

```css
.toolbar {
  display: flex;
  gap: 5px;
  padding: 8px;
  background: #f5f5f5;
}
.tool-btn {
  padding: 5px 10px;
  border: 1px solid #ccc;
}
.tool-btn[aria-pressed='true'],
.tool-btn[aria-checked='true'] {
  background: #ddd;
}
```

---

## 7. Tree

Muestra datos jerárquicos (sistemas de archivos, navegación anidada).

**Uso:** el componente Tree está diseñado para navegar y mostrar estructuras de datos jerárquicas profundamente anidadas, como sistemas de archivos, organigramas o arquitecturas de sitio complejas. Debe usarse específicamente para relaciones multinivel donde los usuarios necesitan expandir o colapsar ramas, pero debe evitarse para listas planas, tablas de datos o menús de selección simples.

**Imports:** `import {Tree, TreeItem, TreeItemGroup} from '@angular/aria/tree';`

**Directivas:** `ngTree`, `ngTreeItem`, `ngTreeItemGroup`.

```html
<ul ngTree #tree="ngTree" [(value)]="selectedValues" class="tree">
  <li ngTreeItem [parent]="tree" value="documents" #docsItem="ngTreeItem">
    <span class="tree-label">Documentos</span>
    <ul role="group">
      <ng-template ngTreeItemGroup [ownedBy]="docsItem" #docsGroup="ngTreeItemGroup">
        <li ngTreeItem [parent]="docsGroup" value="resume">CV.pdf</li>
        <li ngTreeItem [parent]="docsGroup" value="cover-letter">CartaPresentacion.pdf</li>
      </ng-template>
    </ul>
  </li>
</ul>
```

**Estrategia de estilizado:**
Apunta a `[aria-expanded]` para mostrar/ocultar hijos o rotar iconos de chevron. Usa `padding-left` en los grupos anidados para mostrar la jerarquía.

```css
.tree,
.tree-group {
  list-style: none;
  padding-left: 20px;
}
.tree-label::before {
  content: '▶ ';
  display: inline-block;
  transition: transform 0.2s;
}
li[aria-expanded='true'] > .tree-label::before {
  transform: rotate(90deg);
}
```

## 8. Grid

Una colección interactiva bidimensional de celdas que permite la navegación mediante las flechas del teclado.

**Uso:** tablas de datos, calendarios, hojas de cálculo y patrones de diseño para elementos interactivos.
**Directivas:** `ngGrid`, `ngGridRow`, `ngGridCell`, `ngGridCellWidget`.

```html
<table ngGrid [multi]="true" [enableSelection]="true" class="grid-table">
  <tr ngGridRow>
    <th ngGridCell role="columnheader">Nombre</th>
    <th ngGridCell role="columnheader">Estado</th>
  </tr>
  <tr ngGridRow>
    <td ngGridCell>Proyecto A</td>
    <td ngGridCell [(selected)]="isSelected">
      <button ngGridCellWidget (activated)="onActivate()">Activo</button>
    </td>
  </tr>
</table>
```

**Estrategia de estilizado:**
Apunta a `[aria-selected="true"]` para las celdas seleccionadas y a `:focus-visible` para la celda activa (roving tabindex) o `[aria-activedescendant]` en el contenedor.

```css
.grid-table {
  border-collapse: collapse;
}
[ngGridCell] {
  padding: 8px;
  border: 1px solid #ddd;
}
[ngGridCell][aria-selected='true'] {
  background: #e3f2fd;
}
/* Estado de foco gestionado por roving tabindex */
[ngGridCell]:focus-visible {
  outline: 2px solid #2196f3;
  outline-offset: -2px;
}
```

## 9. Pruebas con Component Harnesses

Angular Aria proporciona Component Harnesses estándar (basados en `@angular/cdk/testing`) para que las pruebas unitarias sean limpias, robustas y estén desacopladas de los detalles estructurales del DOM.

**Imports:**

```ts
import {HarnessLoader} from '@angular/cdk/testing';
import {TestbedHarnessEnvironment} from '@angular/cdk/testing/testbed';
import {AccordionGroupHarness, AccordionHarness} from '@angular/aria/accordion/testing';
import {ListboxHarness, ListboxOptionHarness} from '@angular/aria/listbox/testing';
```

### Ejemplo: probar un Accordion con Harnesses

```ts
describe('MyAccordionComponent', () => {
  let fixture: ComponentFixture<MyAccordionComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    fixture = TestBed.createComponent(MyAccordionComponent);
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('should expand accordion on toggle', async () => {
    // Obtiene el harness por el título de su trigger
    const accordion = await loader.getHarness(AccordionHarness.with({title: 'Section 1'}));

    expect(await accordion.isExpanded()).toBeFalse();

    // Expande el accordion
    await accordion.expand();

    expect(await accordion.isExpanded()).toBeTrue();
  });
});
```

## 10. Integración con Signal Forms

Dado que las directivas de Angular Aria aprovechan las señales `model()` modernas de Angular para gestionar valores interactivos, se integran **de forma inmediata** con los nuevos Signal Forms de Angular (`@angular/forms/signals`).

La directiva `[formField]` detecta automáticamente directivas como `ngCombobox` o `ngListbox` como controles de formulario personalizados porque exponen un modelo `value`.

**Imports:**

```ts
import {form, schema, required} from '@angular/forms/signals';
import {Combobox, ComboboxPopup, ComboboxWidget} from '@angular/aria/combobox';
import {Listbox, Option} from '@angular/aria/listbox';
```

### Ejemplo 1: Combobox de autocompletar dentro de un formulario

Dado un modelo de formulario definido en tu componente:

```ts
protected readonly citySignal = signal({name: '', city: ''});
protected readonly myForm = form(this.citySignal, schema(f => {
  required(f.city);
}));
```

Lo vinculas directamente usando `[formField]`:

```html
<div>
  <label for="city-input">Elige tu ciudad:</label>
  <input
    id="city-input"
    ngCombobox
    #combobox="ngCombobox"
    [formField]="myForm.city"
    [(expanded)]="isExpanded"
    placeholder="Buscar ciudades..."
  />

  <ng-template ngComboboxPopup [combobox]="combobox">
    <ul
      ngComboboxWidget
      ngListbox
      #listbox="ngListbox"
      [(value)]="selectedValue"
      [activeDescendant]="listbox.activeDescendant()"
      class="dropdown-menu"
    >
      <li ngOption value="sfo" label="San Francisco">San Francisco</li>
      <li ngOption value="nyc" label="New York">Nueva York</li>
    </ul>
  </ng-template>
</div>
```

### Ejemplo 2: componente Select dentro de un formulario

Aplica `ngCombobox` directamente a un trigger `div` enfocable y vincúlalo a `[formField]`:

```html
<div>
  <label for="city-select">Elige tu ciudad:</label>
  <div
    id="city-select"
    ngCombobox
    #select="ngCombobox"
    [formField]="myForm.city"
    [(expanded)]="isExpanded"
    class="select-trigger"
  >
    <span class="select-text">{{ myForm.city.value() || 'Elige tu ciudad' }}</span>
    <span class="icon">▼</span>
  </div>

  <ng-template ngComboboxPopup [combobox]="select">
    <ul
      ngComboboxWidget
      ngListbox
      #selectListbox="ngListbox"
      [(value)]="selectedValues"
      [activeDescendant]="selectListbox.activeDescendant()"
      (click)="onCommit()"
      (keydown.enter)="onCommit()"
      class="dropdown-menu"
    >
      <li ngOption value="sfo" label="San Francisco">San Francisco</li>
      <li ngOption value="nyc" label="New York">Nueva York</li>
    </ul>
  </ng-template>
</div>
```

### Ejemplo 3: Listbox independiente (selección múltiple) dentro de un formulario

Puedes vincular un Listbox de selección múltiple directamente a un array del formulario:

```html
<ul ngListbox [formField]="myForm.interests" [multi]="true" class="interest-list">
  <li ngOption value="sports">Deportes</li>
  <li ngOption value="music">Música</li>
  <li ngOption value="tech">Tecnología</li>
</ul>
```

## Reglas generales para agentes

1. **Nunca uses elementos HTML nativos como `<select>`** cuando se te pida implementar estos patrones específicos de Aria. Usa las directivas `ng*`.
2. **Gestiona el CSS manualmente**: recuerda que `Angular Aria` NO proporciona estilos. Debes escribir el CSS, apuntando a los atributos ARIA nativos (`aria-expanded`, `aria-selected`, etc.) que las directivas alternan automáticamente.
3. **Carga diferida**: usa siempre las directivas estructurales proporcionadas (`ngAccordionContent`, `ngTabContent`, `ngMenuContent`, `ngComboboxPopup`, `ngTreeItemGroup`) dentro de `ng-template` para paneles de contenido pesado o grupos anidados, para asegurar que se renderizan de forma diferida.
