# Pringles Brillantes — Store Redesign Roadmap

## 1. Who Is This For?

Before touching code, let's nail down the actors and what they need.

### Buyer (Primary User)
| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| B1 | As a buyer, I want to **browse cards quickly** so I can find what I want without waiting. | Page loads card grid in < 3s. Skeleton placeholders visible immediately. |
| B2 | As a buyer, I want to **see one listing per card** with a variant selector (foil / normal / condition) so I'm not scrolling past duplicates. | Cards grouped by Scryfall ID. Dropdown or pill toggle switches variant. Price, stock, and foil badge update on selection. |
| B3 | As a buyer, I want to **filter by type and color** to narrow results. | Sidebar filters on desktop; slide-out drawer on mobile. Active filter visually indicated. |
| B4 | As a buyer, I want to **search by name or text** with instant results. | Live search as-you-type. Works on both desktop nav and mobile search bar. |
| B5 | As a buyer, I want to **see prices in CLP** with the current exchange rate. | USD→CLP conversion using dolarapi. Fallback to 1000 if API fails. Rate shown in nav. |
| B6 | As a buyer, I want to **add items to a cart**, adjust quantities, and see a total. | Slide-out cart drawer. Quantity ±1 buttons. Stock validation. Toast on add. |
| B7 | As a buyer, I want to **view card details** (oracle text, P/T, set, condition) before buying. | Detail modal with card image, full oracle text, stats, "Add to Cart" CTA. |

### Store Owner (You)
| # | User Story | Acceptance Criteria |
|---|-----------|-------------------|
| O1 | As the owner, I want **zero API rate-limit risk** when loading the catalog. | Use `POST /cards/collection` (75 IDs/batch). ~100 unique IDs = 2 API calls total. |
| O2 | As the owner, I want the **inventory driven by my CSV export** from ManaBox. | CSV is the source of truth: prices, quantities, foil status, condition. Scryfall provides artwork + metadata only. |
| O3 | As the owner, I want the **site to look professional and trustworthy**, not flashy or AI-generated. | Sober, neutral palette. No rainbow gradients. Clean typography. See Design System below. |
| O4 | As the owner, I want **zero-maintenance deploys** via GitHub Pages. | Static site, no build step needed. |

---

## 2. Design System

> [!IMPORTANT]
> The current gold-gradient + violet + serif Cinzel theme feels over-designed and "AI flashy." The goal is a **sober, utilitarian e-commerce look** — think CardMarket or a clean Shopify store, not a fantasy showcase.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#111111` | Page background |
| `--bg-card` | `#1a1a1a` | Card surfaces, panels |
| `--bg-elevated` | `#222222` | Hover states, modals, drawer |
| `--bg-input` | `#161616` | Input fields |
| `--border` | `#2a2a2a` | Default borders |
| `--border-hover` | `#3a3a3a` | Hover borders |
| `--text-primary` | `#e5e5e5` | Main text |
| `--text-secondary` | `#999999` | Labels, descriptions |
| `--text-muted` | `#666666` | Metadata, placeholders |
| `--accent` | `#6366f1` | Primary buttons, active filters, links (indigo-500) |
| `--accent-hover` | `#818cf8` | Hover on accent (indigo-400) |
| `--price` | `#f0f0f0` | Price text (just white, no gold) |
| `--stock-ok` | `#22c55e` | In-stock indicator |
| `--stock-out` | `#ef4444` | Out-of-stock indicator |

> [!NOTE]
> The palette is intentionally **near-monochrome**. The only color pop is the indigo accent for interactive elements. Rarity badges and mana symbols keep their traditional MTG colors since those are expected by the audience.

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Body / UI | `Inter` (Google Fonts) | 400, 500, 600, 700 | 14px base |
| Card names | `Inter` | 600 | 14px |
| Prices | `JetBrains Mono` or `monospace` fallback | 700 | 16px |
| Section headers | `Inter` | 700, uppercase, tracked | 11px |
| Badges | `Inter` | 700, uppercase | 10px |

> No serif fonts. No decorative typefaces. Just one clean sans-serif + monospace for prices.

### Spacing & Radius

- Card border-radius: `12px`
- Button border-radius: `8px`
- Badge border-radius: `4px`
- Card gap in grid: `16px`
- Card padding: `12px`

### Animations

- **Allowed**: 150ms transitions on hover (border color, background, scale). Drawer slide (300ms).
- **Not allowed**: Shimmer gradients, floating particles, rainbow animations, 3D transforms.
- **Foil indicator**: A simple `✦ FOIL` text badge with a subtle border — no animated gradient.

---

## 3. Card Variant Grouping (B2)

This is the biggest UX change. Currently each CSV row is a separate card in the grid. Instead:

### Data Model

```
Group by Scryfall ID → one "product" per card
  └── variants: [
        { foil: false, condition: "near_mint", qty: 9, price: 0.35 },
        { foil: true,  condition: "near_mint", qty: 2, price: 0.49 }
      ]
```

### Card UI

```
┌─────────────────────────────┐
│  [card image]               │
│  ┌─ POCO COMÚN ─┐           │
│  └───────────────┘           │
├─────────────────────────────┤
│  Beamsaw Prospector          │
│  Criatura · EOE · {1}{R}     │
│                              │
│  ┌─────────┐ ┌────────────┐ │
│  │ Normal ▾│ │ Near Mint ▾│ │  ← variant selectors
│  └─────────┘ └────────────┘ │
│                              │
│  $350 CLP        9 disp.    │
│                              │
│  [Ver]  [══ Agregar ══]     │
└─────────────────────────────┘
```

- **Variant selector**: Simple `<select>` dropdown or pill-style toggle.  
  Options: `Normal` / `Foil ✦`  
  When switched, price, stock, and foil badge update.
- If only one variant exists, no selector is shown.
- The "Add to Cart" action adds the **currently selected variant**.

---

## 4. Implementation Phases

### Phase 1 — Design System Foundation
- [ ] Replace `style.css` with the sober token-based system above
- [ ] Swap fonts to Inter + monospace
- [ ] Remove all gold gradients, Cinzel, and rainbow animations
- [ ] Establish base component styles: buttons, inputs, badges, panels

### Phase 2 — Card Variant Grouping
- [ ] Rewrite CSV → product pipeline in `app.js` to group by Scryfall ID
- [ ] Build variant data model (array of `{ foil, condition, qty, price }`)
- [ ] Update `createCardElement()` to render variant selector
- [ ] Wire selector changes to update displayed price/stock/foil badge
- [ ] Update `addToCart()` to track which variant is selected

### Phase 3 — Responsive Store Layout
- [ ] Clean up `index.html` layout with the new design tokens
- [ ] Ensure 2-col grid on mobile, 3-col on md, 4-col on xl
- [ ] Mobile filter drawer (already partially built)
- [ ] Search in nav (desktop) + below nav (mobile)

### Phase 4 — Cart & Checkout Polish
- [ ] Cart drawer with variant info (name + "Foil" / "Normal" label)
- [ ] Toast notifications (keep, but restyle to sober palette)
- [ ] Detail modal cleanup with new design tokens

### Phase 5 — Final QA
- [ ] Run Prettier formatting
- [ ] Browser test at mobile (375px), tablet (768px), and desktop (1280px)
- [ ] Verify Scryfall batch API calls (should be ≤ 2 requests)
- [ ] Verify all filters, search, cart flow work end-to-end

---

## Open Questions

> [!IMPORTANT]
> **Color palette**: Are you okay with the near-monochrome dark + indigo accent, or do you want a different accent color? (e.g., teal, emerald, warm gray)

> [!IMPORTANT]
> **Variant selector style**: Do you prefer a **dropdown** (`<select>`) or **pill toggle buttons** (e.g., `[Normal] [Foil ✦]`) on each card?

> [!IMPORTANT]
> **Condition grouping**: Some cards have the same name + foil status but different conditions (e.g., near_mint vs mint). Should those be **separate variants** in the selector, or collapsed into one (summing stock)?

> [!IMPORTANT]
> **Card image aspect ratio**: The current Scryfall `normal` images are 488×680 (standard MTG ratio ~5:7). On a 4-column grid the images get quite tall. Options:
> - **A)** Crop to ~4:3 (show art area, cut off bottom text frame)
> - **B)** Show full card image at natural ratio (taller cards, fewer visible per screen)
> - **C)** Show just the art crop from Scryfall (`art_crop` image URI — no card frame)
