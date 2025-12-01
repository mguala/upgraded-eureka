# SMACSS Quick Reference Guide

## Folder Structure at a Glance

```
scss/
├── base/          → Default element styles (h1, p, input, etc.)
├── layout/        → Page structure with l- prefix
├── module/        → Reusable components (button, card, modal)
├── state/         → States with is- prefix (active, disabled)
├── theme/         → Variables only (colors, fonts, spacing)
└── utils/         → Utility classes (helpers)
```

## When to Use Each Category

### 📄 BASE
**Add styling here for:**
- Reset/normalize rules
- Default `<h1>`, `<p>`, `<input>` styling
- Typography base styles
- Form element defaults

**File**: `base/_typography.scss`, `base/_reset.scss`

```scss
h1 { font-size: 2.5rem; }
input { padding: 0.5rem; }
```

### 🏗️ LAYOUT
**Add styling here for:**
- Header, navbar, footer structure
- Container and grid systems
- Page-level layout components

**Prefix**: `l-` (e.g., `.l-header`, `.l-container`)

**File**: `layout/_header.scss`, `layout/_grid.scss`

```scss
.l-container { max-width: 1200px; margin: 0 auto; }
.l-header { padding: 2rem 0; }
```

### 🧩 MODULE
**Add styling here for:**
- Reusable components
- Buttons, cards, modals
- Any element used multiple times

**No prefix** (e.g., `.button`, `.card`)

**File**: `module/_button.scss`, `module/_card.scss`

```scss
.button { padding: 0.5rem 1rem; }
.card { border: 1px solid #ddd; }
```

### ⚡ STATE
**Add styling here for:**
- Active/inactive states
- Disabled/enabled states
- Hidden/visible states
- Expanded/collapsed states

**Prefix**: `is-` (e.g., `.is-active`, `.is-disabled`)

**File**: `state/_active.scss`, `state/_disabled.scss`

```scss
.is-active { background-color: blue; }
.is-disabled { opacity: 0.5; }
```

### 🎨 THEME
**Add here:**
- Color variables
- Font family variables
- Spacing/sizing variables

**Only variables** (no selectors)

**File**: `theme/_colors.scss`, `theme/_spacing.scss`

```scss
$primary-color: #007bff;
$spacing-lg: 1rem;
$font-title: 'Goudy Medieval', serif;
```

### 🛠️ UTILS
**Add utility classes:**
- Text alignment helpers
- Spacing helpers
- Display helpers
- Text color helpers

**File**: `utils/_helpers.scss`

```scss
.text-center { text-align: center; }
.mt-lg { margin-top: 1rem; }
.flex-center { display: flex; justify-content: center; }
```

## How to Add New Styles

### Example 1: New Component (Modal)

1. Create file: `module/_modal.scss`
2. Write styles without prefix:
   ```scss
   .modal {
     background: white;
     border-radius: 8px;
   }
   
   .modal-header {
     padding: 1rem;
     border-bottom: 1px solid #ddd;
   }
   ```
3. Add import to `main-smacss.scss`:
   ```scss
   @import 'module/modal';
   ```

### Example 2: New State (Loading)

1. Create file: `state/_loading.scss`
2. Use `is-` prefix:
   ```scss
   .is-loading {
     opacity: 0.6;
     pointer-events: none;
   }
   ```
3. Add import to `main-smacss.scss`:
   ```scss
   @import 'state/loading';
   ```

### Example 3: New Layout (Sidebar)

1. Create file: `layout/_sidebar.scss`
2. Use `l-` prefix:
   ```scss
   .l-sidebar {
     width: 250px;
     background: #f5f5f5;
   }
   ```
3. Add import to `main-smacss.scss`:
   ```scss
   @import 'layout/sidebar';
   ```

## Common Patterns

### Button Component
```scss
// module/_button.scss
.button {
  padding: 0.5rem 1rem;
  border: none;
  cursor: pointer;
}

.button-primary {
  background: #007bff;
  color: white;
}

// state/_disabled.scss
.button.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**HTML:**
```html
<button class="button button-primary">Click me</button>
<button class="button button-primary is-disabled">Disabled</button>
```

### Card Component
```scss
// module/_card.scss
.card {
  border: 1px solid #ddd;
  border-radius: 8px;
}

.card-body {
  padding: 1rem;
}

// state/_active.scss
.card.is-active {
  border-color: #007bff;
  box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
}
```

**HTML:**
```html
<div class="card">
  <div class="card-body">Content</div>
</div>

<div class="card is-active">
  <div class="card-body">Selected</div>
</div>
```

### Layout Structure
```scss
// layout/_grid.scss
.l-container {
  max-width: 1200px;
  margin: 0 auto;
}

.l-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}
```

**HTML:**
```html
<div class="l-container">
  <div class="l-grid">
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
  </div>
</div>
```

## Useful Mixins

```scss
// Flexbox helpers
@include flex-center();        // Center with flex
@include flex-between();       // Space between
@include flex-column();        // Column direction

// Responsive
@include mobile { }            // Mobile breakpoint
@include tablet { }            // Tablet breakpoint

// Text
@include truncate();           // Ellipsis overflow
@include line-clamp(2);        // Limit to 2 lines

// Styling
@include box-shadow(2);        // Elevation shadow
@include transition();         // Smooth animation
@include button-variant(#007bff);  // Button style
```

## Import Order (DO NOT CHANGE)

```scss
1. @import 'variables';     // Must be first
2. @import 'mixins';        // Uses variables
3. @import 'theme/*';       // Variables for colors/spacing
4. @import 'base/*';        // Uses theme variables
5. @import 'layout/*';      // Uses base styles
6. @import 'module/*';      // Uses layout/base
7. @import 'state/*';       // Modifies modules
8. @import 'utils/*';       // Most specific (last)
```

## CSS Class Naming Cheat Sheet

| Category | Prefix | Example |
|----------|--------|---------|
| **BASE** | None | `h1`, `button`, `input` |
| **LAYOUT** | `l-` | `.l-container`, `.l-header` |
| **MODULE** | None | `.button`, `.card`, `.modal` |
| **STATE** | `is-` | `.is-active`, `.is-disabled` |
| **THEME** | None | `$primary-color`, `$spacing-lg` |
| **UTILS** | Varied | `.text-center`, `.mt-lg` |

## Compile Your SCSS

### One-time compilation
```bash
sass assets/scss/main-smacss.scss assets/css/main.css
```

### Watch for changes
```bash
sass --watch assets/scss:assets/css
```

### Production (minified)
```bash
sass --style=compressed assets/scss/main-smacss.scss assets/css/main.css
```

## HTML Example

```html
<!DOCTYPE html>
<html>
<head>
  <link href="/assets/css/main.css" rel="stylesheet">
</head>
<body>
  <!-- Layout container -->
  <div class="l-container">
    <!-- Module component -->
    <div class="card is-active">
      <!-- Layout sub-component -->
      <div class="card-header">
        <h2>Title</h2>
      </div>
      <div class="card-body">
        <button class="button button-primary">Action</button>
      </div>
    </div>
  </div>
</body>
</html>
```

## File Location Guide

**Need to style a...**

| Element | Go to... |
|---------|----------|
| All `<h1>` tags | `base/_typography.scss` |
| Container/grid | `layout/_grid.scss` |
| Reusable button | `module/_button.scss` |
| Active/hover state | `state/_active.scss` |
| Color palette | `theme/_colors.scss` |
| Text utilities | `utils/_helpers.scss` |

## Tips & Best Practices

1. ✅ **Do**: Use variables from `theme/` for colors and spacing
2. ✅ **Do**: Prefix layout classes with `l-`
3. ✅ **Do**: Prefix state classes with `is-`
4. ✅ **Do**: Keep modules independent
5. ✅ **Do**: Use mixins for common patterns

6. ❌ **Don't**: Mix categories in one file
7. ❌ **Don't**: Change import order in main-smacss.scss
8. ❌ **Don't**: Use magic numbers (use variables)
9. ❌ **Don't**: Create classes for single-use styling
10. ❌ **Don't**: Nest selectors more than 2 levels deep

---

**Quick Start**: Copy the structure, use the prefixes, follow the patterns. That's SMACSS!
