# Plan de Diseño y Planificación - Página Web "Upgraded Eureka"

## 1. Organización de la Estructura

### 1.1 Estructura de Directorios

```
upgraded-eureka/
├── index.html                 # Página principal
├── assets/
│   ├── scss/
│   │   ├── main.scss         # Archivo principal (importa todos los módulos)
│   │   ├── _variables.scss   # Variables globales (colores, tipografía, espaciado)
│   │   ├── _mixins.scss      # Mixins reutilizables
│   │   ├── _functions.scss   # Funciones SCSS
│   │   ├── base/
│   │   │   ├── _reset.scss        # Reset/Normalize CSS
│   │   │   ├── _typography.scss   # Estilos de texto y fuentes
│   │   │   ├── _forms.scss        # Estilos de formularios
│   │   │   └── _tables.scss       # Estilos de tablas
│   │   ├── layout/
│   │   │   ├── _header.scss       # Estructura del encabezado
│   │   │   ├── _footer.scss       # Estructura del pie de página
│   │   │   ├── _navigation.scss   # Estructura de navegación
│   │   │   └── _grid.scss         # Sistema de grid/layout
│   │   ├── module/
│   │   │   ├── _buttons.scss      # Módulo de botones
│   │   │   ├── _cards.scss        # Módulo de tarjetas
│   │   │   ├── _modals.scss       # Módulo de modales
│   │   │   ├── _alerts.scss       # Módulo de alertas
│   │   │   └── _menu.scss         # Módulo de menús
│   │   ├── state/
│   │   │   ├── _active.scss       # Estados activos
│   │   │   ├── _disabled.scss     # Estados deshabilitados
│   │   │   ├── _hidden.scss       # Estados ocultos
│   │   │   └── _expanded.scss     # Estados expandidos
│   │   ├── theme/
│   │   │   ├── _colors.scss       # Paleta de colores
│   │   │   ├── _typography.scss   # Fuentes y variantes
│   │   │   └── _spacing.scss      # Escala de espaciado
│   │   └── utils/
│   │       ├── _helpers.scss      # Clases auxiliares
│   │       └── _utilities.scss    # Utilidades generales
│   ├── css/
│   │   └── main.css          # CSS compilado (generado automáticamente)
│   ├── js/
│   │   ├── main.js           # JavaScript principal
│   │   └── modules/
│   │       └── [módulos específicos]
│   ├── fonts/
│   │   └── [fuentes personalizadas]
│   └── images/
│       ├── icons/
│       ├── hero/
│       └── content/
├── README.md
├── .gitignore
└── package.json              # Configuración de npm (para preprocesador)
```

### 1.2 Estructura HTML Semántica

```html
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upgraded Eureka</title>
    <link rel="stylesheet" href="assets/css/main.css">
  </head>
  <body>
    <header>
      <nav></nav>
    </header>
    <main>
      <section></section>
      <article></article>
    </main>
    <aside></aside>
    <footer></footer>
    <script src="assets/js/main.js"></script>
  </body>
</html>
```

---

## 2. Metodología de Organización CSS: SMACSS (Scalable and Modular Architecture for CSS)

### 2.1 Por qué elegir SMACSS

**Razones principales:**

1. **Categorización clara**: Organiza CSS en 5 categorías lógicas y predecibles
2. **Escalabilidad**: Estructura que crece con el proyecto sin degradación
3. **Mantenibilidad**: Reduce la cascada y conflictos de especificidad
4. **Modularidad**: Módulos independientes y reutilizables
5. **Flexibilidad**: Menos restrictiva que BEM, más adaptable a diferentes proyectos
6. **Bajo acoplamiento**: Los estilos no se afectan mutuamente
7. **Base sólida**: Perfecto para proyectos que evolucionan con el tiempo

### 2.2 Estructura SMACSS: Las 5 Categorías

**SMACSS divide los estilos en:**

```
1. Base          → Estilos predeterminados, reset
2. Layout        → Estructura principal de la página
3. Module        → Componentes reutilizables
4. State         → Estados específicos de elementos
5. Theme         → Temas visuales (colores, tipografía)
```

### 2.3 Ejemplos de Estructura

#### Base (Estilos globales sin clases)

```scss
// assets/scss/base/_reset.scss
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: $font-family-base;
  font-size: $font-size-base;
  line-height: $line-height-base;
  color: $text-color;
}

h1, h2, h3, h4, h5, h6 {
  margin-bottom: 1rem;
  line-height: 1.2;
  font-weight: bold;
}

a {
  color: $primary-color;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}
```

#### Layout (Estructura de página con prefijo 'l-')

```scss
// assets/scss/layout/_grid.scss
.l-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.l-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
}

.l-grid__col {
  grid-column: span 1;
}

.l-grid__col--4 {
  grid-column: span 4;
}

.l-grid__col--6 {
  grid-column: span 6;
}

// assets/scss/layout/_header.scss
.l-header {
  background-color: $bg-primary;
  padding: 1.5rem 0;
  position: sticky;
  top: 0;
}

.l-footer {
  background-color: $bg-secondary;
  padding: 3rem 0;
  margin-top: 5rem;
}
```

#### Module (Componentes reutilizables)

```scss
// assets/scss/module/_button.scss
.button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

// Variantes de módulo
.button-primary {
  background-color: $primary-color;
  color: white;
}

.button-secondary {
  background-color: $secondary-color;
  color: white;
}

.button-large {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

// assets/scss/module/_card.scss
.card {
  border: 1px solid $border-color;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: white;
}

.card-header {
  padding: 1.5rem;
  background-color: $gray-100;
  border-bottom: 1px solid $border-color;
}

.card-body {
  padding: 1.5rem;
}

.card-footer {
  padding: 1rem 1.5rem;
  background-color: $gray-100;
  border-top: 1px solid $border-color;
}
```

#### State (Estados con prefijo 'is-')

```scss
// assets/scss/state/_active.scss
.is-active {
  background-color: $primary-color;
  color: white;
}

.is-selected {
  border: 2px solid $primary-color;
}

// assets/scss/state/_disabled.scss
.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button:disabled,
.button.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

// assets/scss/state/_hidden.scss
.is-hidden {
  display: none;
}

.is-invisible {
  visibility: hidden;
}

// assets/scss/state/_expanded.scss
.is-expanded {
  max-height: 100%;
  overflow: visible;
}

.is-collapsed {
  max-height: 0;
  overflow: hidden;
}
```

#### Theme (Variables visuales)

```scss
// assets/scss/theme/_colors.scss
// Colores de marca
$primary-color: #007bff;
$secondary-color: #6c757d;
$success-color: #28a745;
$warning-color: #ffc107;
$danger-color: #dc3545;

// Escala de grises
$white: #ffffff;
$gray-100: #f8f9fa;
$gray-900: #212529;
$black: #000000;

// assets/scss/theme/_typography.scss
$font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
$font-family-heading: "MatrixBold", sans-serif;

$font-size-base: 1rem;
$h1-font-size: 2.5rem;
$h2-font-size: 2rem;

// assets/scss/theme/_spacing.scss
$spacing-unit: 1rem;
$spacing-xs: $spacing-unit * 0.25;
$spacing-sm: $spacing-unit * 0.5;
$spacing-md: $spacing-unit;
$spacing-lg: $spacing-unit * 1.5;
$spacing-xl: $spacing-unit * 2;
```

### 2.4 Convenciones de Nombres SMACSS

| Categoría | Prefijo | Ejemplo |
|---|---|---|
| **Base** | Ninguno | `body`, `h1`, `a` |
| **Layout** | `l-` | `.l-container`, `.l-header`, `.l-grid` |
| **Module** | Ninguno | `.button`, `.card`, `.modal` |
| **State** | `is-` | `.is-active`, `.is-disabled`, `.is-hidden` |
| **Theme** | Variables | `$primary-color`, `$spacing-unit` |

### 2.5 Comparación: SMACSS vs BEM vs Utilities-First

| Aspecto | SMACSS | BEM | Tailwind |
|---|---|---|---|
| **Estructura** | 5 categorías | 1 patrón | Utilities |
| **Curva aprendizaje** | Media | Baja | Alta |
| **Flexibilidad** | Alta | Media | Baja |
| **CSS personalizado** | Completo | Completo | Limitado |
| **Escalabilidad** | Excelente | Buena | Media |
| **Mantenibilidad** | Alta | Alta | Media |
| **Reutilización** | Módulos | Bloques | Clases |

---

## 3. Preprocesador: SCSS (Sass)

### 3.1 Por qué elegir SCSS

**Razones principales:**

1. **Anidación (Nesting)**: Reduce redundancia y mejora legibilidad
   ```scss
   .nav {
     display: flex;
     &__item { padding: 1rem; }
     &__link { color: #333; }
   }
   ```

2. **Variables**: Centraliza colores, tamaños y valores repetidos
   ```scss
   $primary-color: #007bff;
   $border-radius: 0.5rem;
   $spacing-unit: 1rem;
   ```

3. **Mixins**: Reutiliza bloques de CSS completos
   ```scss
   @mixin flex-center {
     display: flex;
     justify-content: center;
     align-items: center;
   }
   ```

4. **Funciones**: Cálculos automáticos
   ```scss
   @function spacing($multiplier) {
     @return $spacing-unit * $multiplier;
   }
   ```

5. **Imports/Modularización**: Divide CSS en archivos lógicos sin afectar performance
   ```scss
   @import 'variables';
   @import 'base/typography';
   @import 'components/buttons';
   ```

6. **Heredencia de selectores (@extend)**: Reutiliza estilos
   ```scss
   .btn--primary {
     @extend .btn;
     background-color: $primary-color;
   }
   ```

7. **Operaciones matemáticas**: Cálculos en CSS
   ```scss
   width: 100% - $sidebar-width;
   padding: $spacing-unit * 2;
   ```

### 3.2 Compilación SCSS a CSS

**Proceso:**
1. Los archivos `.scss` se escriben con características avanzadas
2. Un compilador SCSS (como Node-Sass o Dart Sass) convierte el código a CSS estándar
3. Se genera un archivo `main.css` minificado para producción
4. El navegador solo lee CSS estándar

**Configuración típica:**
```json
// package.json
{
  "scripts": {
    "sass": "sass assets/scss:assets/css",
    "sass:watch": "sass --watch assets/scss:assets/css",
    "build": "sass --style=compressed assets/scss:assets/css"
  },
  "devDependencies": {
    "sass": "^1.x.x"
  }
}
```

### 3.3 Comparación: SCSS vs CSS vs LESS

| Característica | CSS | SCSS | LESS |
|---|---|---|---|
| **Sintaxis** | Estándar | Superset de CSS | Parecida a SCSS |
| **Anidación** | ❌ | ✅ | ✅ |
| **Variables** | ❌ | ✅ | ✅ |
| **Mixins** | ❌ | ✅ | ✅ |
| **Funciones** | ❌ | ✅ | ✅ |
| **Comunidad** | - | 🏆 Mayor | Menor |
| **Industria** | Estándar | Estándar | En declive |
| **Compilación** | No requiere | Requiere | Requiere |

---

## 4. Flujo de Trabajo Completo

### 4.1 Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar compilación automática (watch mode)
npm run sass:watch

# 3. Editar archivos .scss en assets/scss/
# 4. Automáticamente se compilan a assets/css/main.css
# 5. Refrescar navegador para ver cambios
```

### 4.2 Producción

```bash
# Compilar con compresión
npm run build

# Resultado: assets/css/main.css minificado y optimizado
```

### 4.3 Versionado Git

```
.gitignore debe contener:
node_modules/
assets/css/main.css      # No versionamos CSS compilado
.sass-cache/
```

---

## 5. Ejemplo Práctico: Estructura de un Módulo

### 5.1 Archivo: `assets/scss/module/_button.scss`

```scss
// Variables locales para botones
$button-padding-y: 0.75rem;
$button-padding-x: 1.5rem;
$button-border-radius: 0.375rem;
$button-transition: all 0.3s ease;

// Base del módulo
.button {
  display: inline-block;
  padding: $button-padding-y $button-padding-x;
  border-radius: $button-border-radius;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  border: 2px solid transparent;
  transition: $button-transition;
  text-decoration: none;
  
  // Hover state (manejado en state/_hover.scss o aquí)
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
  
  &:active {
    transform: translateY(0);
  }
}

// Variantes de color (siguiendo SMACSS)
.button-primary {
  background-color: $primary-color;
  color: white;
  
  &:hover {
    background-color: darken($primary-color, 10%);
  }
}

.button-secondary {
  background-color: $secondary-color;
  color: white;
  
  &:hover {
    background-color: darken($secondary-color, 10%);
  }
}

.button-success {
  background-color: $success-color;
  color: white;
}

// Variantes de tamaño
.button-large {
  padding: $button-padding-y * 1.5 $button-padding-x * 1.5;
  font-size: 1.125rem;
}

.button-small {
  padding: $button-padding-y * 0.75 $button-padding-x * 0.75;
  font-size: 0.875rem;
}

// Variante outline
.button-outline {
  background-color: transparent;
  border-color: $primary-color;
  color: $primary-color;
  
  &:hover {
    background-color: $primary-color;
    color: white;
  }
}

// Variante block (ancho completo)
.button-block {
  display: block;
  width: 100%;
}
```

### 5.2 Archivo: `assets/scss/state/_disabled.scss`

```scss
// Estados deshabilitados para cualquier elemento interactivo
.button.is-disabled,
.button:disabled,
input:disabled,
textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### 5.3 Archivo: `assets/scss/module/_card.scss`

```scss
// Módulo card - componente reutilizable
.card {
  border: 1px solid $border-color;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: white;
  transition: all 0.3s ease;
}

// Sub-componentes del card
.card-header {
  padding: $spacing-lg;
  background-color: $gray-100;
  border-bottom: 1px solid $border-color;
  font-weight: bold;
}

.card-body {
  padding: $spacing-lg;
}

.card-footer {
  padding: $spacing-md $spacing-lg;
  background-color: $gray-100;
  border-top: 1px solid $border-color;
}

// Variante destacada
.card-featured {
  border-color: $primary-color;
  box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
}

// Variante compacta
.card-compact {
  .card-header,
  .card-body,
  .card-footer {
    padding: $spacing-sm;
  }
}
```

### 5.4 Cómo SMACSS mantiene orden

En SMACSS, los estilos están organizados de forma que:

- **Base** define lo fundamental (sin clases)
- **Layout** estructura la página (prefijo `l-`)
- **Module** crea componentes independientes (sin prefijo, nombre descriptivo)
- **State** modifica comportamiento (prefijo `is-`)
- **Theme** centraliza visualización (variables SCSS)

Esto mantiene baja especificidad y evita conflictos.

---

## 6. Gestión de Colores y Tipografía

### 6.1 Archivo: `assets/scss/utils/_colors.scss`

```scss
// Paleta de colores primaria
$primary-color: #007bff;
$secondary-color: #6c757d;
$success-color: #28a745;
$warning-color: #ffc107;
$danger-color: #dc3545;
$info-color: #17a2b8;

// Escala de grises
$white: #ffffff;
$gray-100: #f8f9fa;
$gray-200: #e9ecef;
$gray-300: #dee2e6;
$gray-400: #ced4da;
$gray-500: #adb5bd;
$gray-600: #6c757d;
$gray-700: #495057;
$gray-800: #343a40;
$gray-900: #212529;
$black: #000000;

// Espacios de color para uso
$text-color: $gray-900;
$bg-color: $white;
$border-color: $gray-300;
$shadow-color: rgba(0, 0, 0, 0.1);
```

### 6.2 Archivo: `assets/scss/base/_typography.scss`

```scss
// Importar fuentes
@font-face {
  font-family: "MatrixBold";
  src: url('/assets/fonts/MatrixBold.woff2') format('woff2'),
       url('/assets/fonts/MatrixBold.woff') format('woff');
  font-weight: bold;
  font-style: normal;
}

// Variables tipográficas
$font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
$font-family-heading: "MatrixBold", sans-serif;
$font-family-mono: 'Courier New', monospace;

$font-size-base: 1rem;
$line-height-base: 1.5;

// Escalas de tamaño
$h1-font-size: 2.5rem;
$h2-font-size: 2rem;
$h3-font-size: 1.75rem;
$h4-font-size: 1.5rem;
$h5-font-size: 1.25rem;
$h6-font-size: 1rem;

// Aplicar estilos
body {
  font-family: $font-family-base;
  font-size: $font-size-base;
  line-height: $line-height-base;
  color: $text-color;
}

h1, h2, h3, h4, h5, h6 {
  font-family: $font-family-heading;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 1rem;
}

h1 { font-size: $h1-font-size; }
h2 { font-size: $h2-font-size; }
h3 { font-size: $h3-font-size; }
h4 { font-size: $h4-font-size; }
h5 { font-size: $h5-font-size; }
h6 { font-size: $h6-font-size; }
```

---

## 7. Mixins Reutilizables

### 7.1 Archivo: `assets/scss/_mixins.scss`

```scss
// Flexbox
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// Grid responsive
@mixin grid-responsive($cols) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax($cols, 1fr));
  gap: 2rem;
}

// Media queries
@mixin tablet {
  @media (max-width: 768px) {
    @content;
  }
}

@mixin mobile {
  @media (max-width: 480px) {
    @content;
  }
}

// Truncar texto
@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Sombra
@mixin box-shadow($elevation: 1) {
  @if $elevation == 1 {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  } @else if $elevation == 2 {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  } @else if $elevation == 3 {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
}

// Transición
@mixin transition($property: all, $duration: 0.3s, $timing: ease) {
  transition: $property $duration $timing;
}
```

---

## 8. Archivo Principal: `assets/scss/main.scss` (Orden SMACSS)

```scss
// 1. Configuración y utilidades
@import 'variables';
@import 'mixins';
@import 'functions';

// 2. THEME - Paleta de colores y tipografía
@import 'theme/colors';
@import 'theme/typography';
@import 'theme/spacing';

// 3. BASE - Estilos globales predeterminados
@import 'base/reset';
@import 'base/typography';
@import 'base/forms';
@import 'base/tables';

// 4. LAYOUT - Estructura de la página
@import 'layout/header';
@import 'layout/navigation';
@import 'layout/grid';
@import 'layout/footer';

// 5. MODULE - Componentes reutilizables
@import 'module/button';
@import 'module/card';
@import 'module/modal';
@import 'module/alerts';
@import 'module/menu';

// 6. STATE - Estados específicos
@import 'state/active';
@import 'state/disabled';
@import 'state/hidden';
@import 'state/expanded';

// 7. UTILS - Clases auxiliares (último para máxima especificidad)
@import 'utils/helpers';
@import 'utils/utilities';
```

**Nota importante del orden SMACSS:**
- Se importa de menos a más específico
- BASE no tiene clases (solo selectores globales)
- LAYOUT y MODULE tienen especificidad media
- STATE tiene prefijo `is-` para identificar cambios de comportamiento
- THEME centraliza valores reutilizables

---

## 9. Checklist de Implementación SMACSS

- [ ] Crear estructura de carpetas (base, layout, module, state, theme, utils)
- [ ] Configurar npm con script de compilación SCSS
- [ ] Crear archivo `.gitignore` con `assets/css/`
- [ ] Crear carpeta `theme/` con `_colors.scss`, `_typography.scss`, `_spacing.scss`
- [ ] Crear carpeta `base/` con reset y estilos globales
- [ ] Crear carpeta `layout/` con estilos de estructura (prefijo `l-`)
- [ ] Crear carpeta `module/` con componentes reutilizables
- [ ] Crear carpeta `state/` con estados (prefijo `is-`)
- [ ] Crear archivo `_mixins.scss` con funciones reutilizables
- [ ] Crear archivo `_variables.scss` con variables SCSS globales
- [ ] Escribir HTML semántico con clases SMACSS
- [ ] Compilar SCSS a CSS
- [ ] Verificar en navegador
- [ ] Minificar CSS para producción
- [ ] Documentar convenciones en README.md

---

## 10. Ventajas Finales de Esta Estructura

| Aspecto | Ventaja |
|---|---|
| **Mantenibilidad** | Código organizado y fácil de encontrar |
| **Escalabilidad** | Agregar nuevas páginas/componentes es sencillo |
| **Reutilización** | Componentes BEM se reutilizan sin duplicación |
| **Performance** | Un único archivo CSS compilado y minificado |
| **Colaboración** | Convenciones claras para trabajo en equipo |
| **Actualizaciones** | Cambiar colores/espacios es centralizado |
| **Debugging** | Nombres de clases describen su propósito |
| **Responsive** | Mixins para media queries organizados |

---

**Autor**: Estudiante de Bootcamp Frontend  
**Fecha**: Diciembre 2025  
**Estado**: Plan de referencia para desarrollo
