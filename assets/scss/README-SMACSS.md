# SMACSS Architecture Overview

This SCSS structure follows **SMACSS** (Scalable and Modular Architecture for CSS) principles.

## Folder Structure

```
scss/
├── _variables.scss          # Global SCSS variables
├── _mixins.scss             # Reusable mixins and functions
├── _responsive.scss         # Media queries
├── main-smacss.scss         # Main entry point (import order)
├── base/                    # BASE - Default styles
│   ├── _reset.scss
│   ├── _typography.scss
│   └── _forms.scss
├── layout/                  # LAYOUT - Page structure (l- prefix)
│   ├── _header.scss
│   ├── _navigation.scss
│   ├── _footer.scss
│   └── _grid.scss
├── module/                  # MODULE - Reusable components
│   ├── _button.scss
│   ├── _card.scss
│   └── _modal.scss
├── state/                   # STATE - Element states (is- prefix)
│   ├── _active.scss
│   ├── _disabled.scss
│   └── _hidden.scss
└── theme/                   # THEME - Visual configuration
    ├── _colors.scss
    ├── _typography.scss
    └── _spacing.scss
```

## SMACSS Categories Explained

### 1. BASE
- Default element styles (no classes)
- Reset/normalize rules
- Typography, forms, tables
- **File**: `base/`

### 2. LAYOUT
- Page structure and major sections
- **Prefix**: `l-`
- Examples: `.l-container`, `.l-header`, `.l-footer`, `.l-grid`
- **File**: `layout/`

### 3. MODULE
- Reusable components
- **No prefix** (or project-specific prefix)
- Examples: `.button`, `.card`, `.modal`, `.navbar`
- **File**: `module/`

### 4. STATE
- Changes to elements based on user interaction
- **Prefix**: `is-`
- Examples: `.is-active`, `.is-disabled`, `.is-hidden`, `.is-expanded`
- **File**: `state/`

### 5. THEME
- Visual configuration (colors, typography, spacing)
- **Variables only** (no selectors)
- Examples: `$primary-color`, `$spacing-lg`, `$font-title`
- **File**: `theme/`

## Import Order (Critical for Specificity)

```scss
// 1. Configuration
@import 'variables';
@import 'mixins';

// 2. THEME (variables)
@import 'theme/colors';
@import 'theme/typography';
@import 'theme/spacing';

// 3. BASE (least specific)
@import 'base/reset';
@import 'base/typography';
@import 'base/forms';

// 4. LAYOUT
@import 'layout/header';
@import 'layout/navigation';
@import 'layout/footer';
@import 'layout/grid';

// 5. MODULE
@import 'module/button';
@import 'module/card';
@import 'module/modal';

// 6. STATE
@import 'state/active';
@import 'state/disabled';
@import 'state/hidden';

// 7. UTILS (most specific)
@import 'utils/helpers';

// 8. RESPONSIVE
@import 'responsive';
```

## Naming Conventions

| Category | Prefix | Example |
|----------|--------|---------|
| **Base** | None | `body`, `h1`, `p` |
| **Layout** | `l-` | `.l-container`, `.l-header` |
| **Module** | None | `.button`, `.card` |
| **State** | `is-` | `.is-active`, `.is-disabled` |
| **Theme** | None (vars) | `$primary-color` |
| **Utils** | Varied | `.text-center`, `.mt-lg` |

## Adding New Components

### New Button Variant
```scss
// File: module/_button.scss

.button-new-style {
  background-color: $accent-color;
  color: white;
  
  &:hover {
    background-color: darken($accent-color, 10%);
  }
}
```

### New State
```scss
// File: state/_new-state.scss
// Then add @import to main-smacss.scss

.is-new-state {
  // styles
}
```

### New Layout Component
```scss
// File: layout/_sidebar.scss
// Then add @import to main-smacss.scss

.l-sidebar {
  // layout styles with l- prefix
}
```

## Compilation

Compile SCSS to CSS:
```bash
sass assets/scss/main-smacss.scss assets/css/main.css
```

Watch for changes:
```bash
sass --watch assets/scss:assets/css
```

Minify for production:
```bash
sass --style=compressed assets/scss/main-smacss.scss assets/css/main.css
```

## Best Practices

1. **Single Responsibility**: Each file has one purpose
2. **Low Specificity**: Avoid deeply nested selectors
3. **Modular**: Components don't depend on each other
4. **Reusable**: Use mixins and variables extensively
5. **Organized**: Clear folder structure and naming
6. **Scalable**: Easy to add new components without side effects

## Comparison with Other Methodologies

| Aspect | SMACSS | BEM | Utilities |
|--------|--------|-----|-----------|
| Flexibility | High | Medium | Low |
| Specificity | Low | Low | Medium |
| Learning Curve | Medium | Low | High |
| Team Adoption | Easy | Easy | Hard |
| CSS Size | Medium | Medium | Small |

## Resources

- [Official SMACSS Guide](https://smacss.com/)
- [Naming Convention Details](https://smacss.com/book/categorizing)
- [Scalable CSS](https://smacss.com/book/scalable-css)

---

**Last Updated**: December 2025  
**SCSS Version**: Dart Sass 1.x+
