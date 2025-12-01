# Custom Fonts Setup

This document explains the custom font integration in the SCSS files.

## Font Files Located At
`assets/fonts/`

## Fonts Configured

### 1. **Goudy Medieval** (`Goudymedieval.ttf`)
- **Font Family Variable**: `$font-title`
- **Usage**: All titles and headings throughout the document
- **Applied To**:
  - Header `<h1>` tags
  - Modal headers `.modal-header`
  - Contact section `h2` 
  - Filter modal `h2` and `h3`
  - Card detail modal `h2`
  - All heading elements with semantic importance

### 2. **Matrix Bold** (`Matrix Bold.ttf`)
- **Font Family Variable**: `$font-body`
- **Usage**: Body text and content outside of card elements
- **Applied To**:
  - Body text
  - Paragraphs in contact section
  - Navigation and general content
  - Header description paragraphs

### 3. **Beleren 2016** (`Beleren2016-Bold.ttf`)
- **Font Family Variable**: `$font-cards`
- **Usage**: All card-related elements and card details
- **Applied To**:
  - Card names `.card-name`
  - Card set information `.card-set`
  - Card table `.card-table`
  - Card headers `.card-header`
  - Card detail modal `.detail-table`
  - All card metadata

## Variable Definitions

Located in `_variables.scss`:

```scss
// Font Face Definitions
@font-face {
  font-family: 'Goudy Medieval';
  src: url('../fonts/Goudymedieval.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Matrix Bold';
  src: url('../fonts/Matrix\ Bold.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
}

@font-face {
  font-family: 'Beleren 2016';
  src: url('../fonts/Beleren2016-Bold.ttf') format('truetype');
  font-weight: bold;
  font-style: normal;
}

// Font Family Variables
$font-title: 'Goudy Medieval', serif;
$font-body: 'Matrix Bold', sans-serif;
$font-cards: 'Beleren 2016', serif;
```

## Implementation in SCSS Partials

### `_global.scss`
- Body element uses `$font-body` for all main content text

### `_header.scss`
- `h1` tags use `$font-title`
- Paragraph text uses `$font-body`

### `_cards.scss`
- `.card-table` uses `$font-cards`
- `.card-header` uses `$font-cards`
- `.card-name` uses `$font-cards`
- `.card-set` uses `$font-cards`

### `_card-detail.scss`
- `.detail-table` uses `$font-cards`
- `.detail-header h2` uses `$font-title`

### `_modals.scss`
- `.modal-header` uses `$font-title`
- `.filters-modal-content h2` uses `$font-title`
- `.filters-modal-content h3` uses `$font-title`

### `_contact.scss`
- `.contact-section h2` uses `$font-title`
- `.contact-section > .contact-container > p` uses `$font-body`

## Compilation

To compile SCSS to CSS with font support:

```bash
sass assets/scss/main.scss assets/css/main.css
```

Or with watch mode:

```bash
sass --watch assets/scss:assets/css
```

## Font Fallbacks

Each font includes appropriate fallback fonts:
- **Titles**: Goudy Medieval (serif fallback)
- **Body**: Matrix Bold (sans-serif fallback)
- **Cards**: Beleren 2016 (serif fallback)

If custom fonts fail to load, the browser will use the fallback fonts defined in the `$font-*` variables.

## Note

Make sure the font files are properly located in the `assets/fonts/` directory relative to your compiled CSS file path for the fonts to load correctly.
