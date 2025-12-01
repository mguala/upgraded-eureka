# SCSS Structure

This folder contains the organized SCSS files for the Bazar de Cartulinas project.

## File Organization

The SCSS is organized into logical components for easy maintenance and scalability:

### Core Files
- **main.scss** - Main entry point that imports all partials

### Partials (Imported in main.scss)

1. **_variables.scss**
   - Color palette
   - Spacing values
   - Font families
   - Border radius values
   - Shadow definitions
   - Z-index layers
   - Media breakpoints
   - Transition timings

2. **_global.scss**
   - Global reset styles
   - Body and main element styling

3. **_navbar.scss**
   - Navigation bar styling
   - Cart button and tooltip
   - Navigation links

4. **_header.scss**
   - Header section styling
   - Page title and description

5. **_layout.scss**
   - Main content container
   - Sidebar and content areas
   - Filter button styles

6. **_search.scss**
   - Search bar styling
   - Modal search container
   - Search button styles

7. **_cards.scss**
   - Card grid layout
   - Card table styling
   - Card header and details
   - Card image and metadata
   - Stock status indicators

8. **_buttons.scss**
   - Global button styles
   - Button variants (details, add to cart)
   - Button states (hover, disabled)

9. **_modals.scss**
   - Modal overlay and content
   - Modal close button
   - Filter modal specific styles
   - Filter list styling

10. **_cart.scss**
    - Cart table styling
    - Cart total section
    - Checkout and clear buttons
    - Empty cart message

11. **_card-detail.scss**
    - Card detail modal table
    - Card image display
    - Version selector buttons
    - Foil/Normal indicators

12. **_utilities.scss**
    - Text color utilities
    - Font weight and style utilities
    - Text alignment utilities

13. **_contact.scss**
    - Contact section styling
    - Contact form and fields
    - Contact information grid

14. **_footer.scss**
    - Footer styling

15. **_responsive.scss**
    - Mobile breakpoint styles
    - Responsive layout adjustments
    - Media query styling

## How to Use

### Compiling SCSS to CSS

You can compile these SCSS files to CSS using:

**Option 1: Using npm-scripts with sass**
```bash
npm install -g sass
sass assets/scss/main.scss assets/css/main.css
```

**Option 2: Live watch during development**
```bash
sass --watch assets/scss:assets/css
```

**Option 3: Using VS Code Extensions**
Install "Live Sass Compiler" extension and use the Watch button.

### After Compilation
The compiled `main.css` file should be used in your HTML file:
```html
<link rel="stylesheet" href="assets/css/main.css" />
```

## Variable Reference

### Colors
- **Primary**: `$color-primary` (#2c3e50)
- **Accent**: `$color-accent` (#3498db)
- **Success**: `$color-success` (#4CAF50)
- **Danger**: `$color-danger` (#e74c3c)
- **Gold**: `$color-gold`

### Spacing
- **xs**: $spacing-xs (5px)
- **sm**: $spacing-sm (8px)
- **md**: $spacing-md (10px)
- **lg**: $spacing-lg (15px)
- **xl**: $spacing-xl (20px)
- **xxl**: $spacing-xxl (40px)

### Z-Index Layers
- **navbar**: 900
- **tooltip**: 999
- **modal**: 1000
- **modal-card-detail**: 1001
- **modal-filters**: 1002

## Benefits of SCSS Structure

✓ **Maintainability** - Each component in its own file
✓ **Scalability** - Easy to add new features
✓ **Reusability** - Variables for consistent styling
✓ **DRY** - Avoids duplicate code
✓ **Nesting** - Cleaner selector hierarchy
✓ **Organization** - Clear file naming conventions
