# 🃏 Pringles Brillantes Store

A Magic: The Gathering card storefront built as a static web app. Browse your collection, filter by card type and color, view detailed card info with artwork, and add cards to a shopping cart — all with live CLP pricing.

## Features

- 🔎 **Instant search** — filter cards by name, text, type, or color
- 🧭 **Category & color filters** — quickly narrow down your inventory
- 🖼️ **Card artwork** — fetched live from the [Scryfall API](https://scryfall.com/docs/api)
- 🌎 **Live CLP pricing** — USD purchase prices converted using a real-time exchange rate from [dolarapi.com](https://cl.dolarapi.com)
- 🛒 **Shopping cart** — add, remove, and adjust quantities with stock validation
- 📋 **Card detail modal** — full card info including mana cost, oracle text, rarity, and set

## Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Markup        | HTML5                                         |
| Styling       | [Tailwind CSS](https://tailwindcss.com) (CDN) |
| Logic         | Vanilla JavaScript (ES2020+)                  |
| CSV Parsing   | [PapaParse](https://www.papaparse.com)        |
| Card Data     | [Scryfall API](https://scryfall.com/docs/api) |
| Exchange Rate | [dolarapi.com](https://cl.dolarapi.com)       |
| Deployment    | GitHub Pages (via GitHub Actions)             |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18+)
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The app will be available at [http://localhost:8080](http://localhost:8080).

### Format code

```bash
npm run format
```

## Inventory Management

The card inventory is defined in [`cards.csv`](./cards.csv). It is exported from [ManaBox](https://manabox.app) and contains the following fields:

| Field            | Description                          |
| ---------------- | ------------------------------------ |
| `Name`           | Card name (used for Scryfall lookup) |
| `Set code`       | Set abbreviation                     |
| `Quantity`       | Number of copies in stock            |
| `Purchase price` | Cost in USD                          |
| `Foil`           | Whether the card is a foil printing  |
| `Condition`      | Card condition (e.g. `near_mint`)    |

To update the inventory, replace `cards.csv` with a new export from ManaBox and push to `main`.
