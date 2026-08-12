// Card database - populated from CSV + Scryfall bulk lookup
let cardDatabase = [];

// Shopping cart
let shoppingCart = [];

// Current filters
let currentTypeFilter = "all";
let currentColorFilter = "all";

// Loading state
let isLoading = true;
let currentSearchTerm = "";

// Scryfall API
const SCRYFALL_API = "https://api.scryfall.com";
// Scryfall collection endpoint accepts up to 75 identifiers per request
const SCRYFALL_BATCH_SIZE = 75;

const DOLAR_API_URL = "https://cl.dolarapi.com/v1/cotizaciones/usd";

let usdToClp = 1000;

/* ─── Toast Notifications ─── */

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-alert ${type}`;

  const icon = type === "success" ? "✨" : "❌";
  toast.innerHTML = `
    <span class="text-base shrink-0">${icon}</span>
    <span class="flex-1 text-xs sm:text-sm font-semibold">${message}</span>
    <button class="text-slate-400 hover:text-white font-bold ml-2 text-xs shrink-0 transition" aria-label="Cerrar">✕</button>
  `;

  toast.querySelector("button").addEventListener("click", () => {
    toast.classList.remove("active");
    setTimeout(() => toast.remove(), 350);
  });

  container.appendChild(toast);
  setTimeout(() => toast.classList.add("active"), 10);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.remove("active");
      setTimeout(() => toast.remove(), 350);
    }
  }, 3500);
}

/* ─── Exchange Rate ─── */

function parseExchangeRate(data) {
  const candidates = [
    data?.valor,
    data?.precio,
    data?.cotizacion,
    data?.price,
    data?.valor_cotizacion,
    data?.promedio,
    data?.cotizaciones?.[0]?.valor,
    data?.cotizaciones?.[0]?.precio,
    data?.cotizaciones?.[0]?.cotizacion,
    data?.usd?.valor,
    data?.usd?.precio,
    data?.usd?.cotizacion,
    data?.data?.valor,
    data?.data?.precio,
    data?.data?.cotizacion,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate) &&
      candidate > 0
    ) {
      return candidate;
    }
    if (typeof candidate === "string") {
      const parsed = parseFloat(candidate);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  if (Array.isArray(data) && data.length > 0) {
    for (const item of data) {
      const nestedRate = parseExchangeRate(item);
      if (nestedRate) return nestedRate;
    }
  }

  return null;
}

async function loadExchangeRate() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(DOLAR_API_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const rate = parseExchangeRate(data);
    if (rate) {
      usdToClp = rate;
    } else {
      throw new Error("No se encontró un valor válido en la respuesta");
    }
  } catch (error) {
    console.error("Error obteniendo el valor del dólar:", error);
    usdToClp = 1000;
  } finally {
    updateExchangeRateDisplay(usdToClp);
    clearTimeout(timeoutId);
  }

  return usdToClp;
}

function updateExchangeRateDisplay(rate) {
  const formatted = `$${Math.round(rate).toLocaleString("es-CL")}`;
  const el = document.getElementById("exchange-rate");
  if (el) el.textContent = formatted;
  const elMobile = document.getElementById("exchange-rate-mobile");
  if (elMobile) elMobile.textContent = formatted;
}

/* ─── CSV Loading ─── */

async function loadCSV(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();

    const result = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      console.error("CSV parsing errors:", result.errors);
    }

    console.log("CSV loaded:", result.data.length, "rows");
    return result.data;
  } catch (error) {
    console.error("Error cargando CSV:", error);
    return [];
  }
}

/* ─── Scryfall Batch Fetch (POST /cards/collection) ─── */
// Uses the collection endpoint to fetch up to 75 cards per request.
// This means ~100 unique cards = 2 API calls instead of 192 individual ones.

async function fetchCardsBatch(scryfallIds) {
  const identifiers = scryfallIds.map((id) => ({ id }));

  try {
    const response = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers }),
    });

    if (!response.ok) {
      console.error(`Scryfall collection error: HTTP ${response.status}`);
      return {};
    }

    const data = await response.json();

    if (data.not_found && data.not_found.length > 0) {
      console.warn(
        `Scryfall: ${data.not_found.length} cards not found`,
        data.not_found,
      );
    }

    // Index results by card ID for fast lookup
    const cardMap = {};
    for (const card of data.data || []) {
      cardMap[card.id] = card;
    }
    return cardMap;
  } catch (error) {
    console.error("Error fetching Scryfall batch:", error);
    return {};
  }
}

/* ─── Card Data Conversion ─── */

function convertScryfallCard(scryfallCard, csvRow, exchangeRate) {
  let cardType = "other";
  const typeLine = scryfallCard.type_line.toLowerCase();

  if (typeLine.includes("creature")) cardType = "creature";
  else if (typeLine.includes("instant")) cardType = "instant";
  else if (typeLine.includes("sorcery")) cardType = "sorcery";
  else if (typeLine.includes("enchantment")) cardType = "enchantment";
  else if (typeLine.includes("artifact")) cardType = "artifact";
  else if (typeLine.includes("planeswalker")) cardType = "planeswalker";
  else if (typeLine.includes("land")) cardType = "land";

  let color = "colorless";
  if (scryfallCard.colors && scryfallCard.colors.length > 0) {
    const colorMap = { W: "white", U: "blue", B: "black", R: "red", G: "green" };
    color = colorMap[scryfallCard.colors[0]] || "colorless";
  }

  const rarityMap = {
    common: "Común",
    uncommon: "Poco Común",
    rare: "Rara",
    mythic: "Mítica",
  };

  const isFoil = csvRow["Foil"] === "foil";
  const uniqueKey = scryfallCard.id + (isFoil ? "-foil" : "-normal");

  return {
    id: uniqueKey,
    scryfallId: scryfallCard.id,
    name: scryfallCard.name,
    type: cardType,
    color: color,
    manaCost: scryfallCard.mana_cost || "",
    power: scryfallCard.power !== undefined ? scryfallCard.power : null,
    toughness: scryfallCard.toughness !== undefined ? scryfallCard.toughness : null,
    text: scryfallCard.oracle_text || "",
    price: (parseFloat(csvRow["Purchase price"]) || 0) * exchangeRate,
    stock: parseInt(csvRow["Quantity"]) || 0,
    rarity: rarityMap[scryfallCard.rarity] || scryfallCard.rarity,
    set: scryfallCard.set_name,
    setCode: csvRow["Set code"] || scryfallCard.set,
    imageUrl: scryfallCard.image_uris ? scryfallCard.image_uris.normal : null,
    scryfallUri: scryfallCard.scryfall_uri,
    foil: isFoil,
    condition: csvRow["Condition"] || "near_mint",
  };
}

/* ─── Main Loading Pipeline ─── */

async function loadAllCards() {
  showLoadingState("Conectando con Scryfall...", 0);

  // Step 1: Start exchange rate + CSV fetch in parallel
  const [exchangeRate, csvData] = await Promise.all([
    loadExchangeRate(),
    loadCSV("cards.csv"),
  ]);

  if (csvData.length === 0) {
    showErrorMessage("No se pudo cargar el archivo de inventario (cards.csv)");
    return;
  }

  showLoadingState(`Procesando ${csvData.length} registros...`, 10);

  // Step 2: Group CSV rows by Scryfall ID + Foil to merge duplicates
  // and collect unique Scryfall IDs for batch fetching
  const productMap = new Map(); // key: "scryfallId-foil|normal" → merged CSV data
  const uniqueScryfallIds = new Set();

  for (const row of csvData) {
    const sid = row["Scryfall ID"];
    if (!sid) continue;

    uniqueScryfallIds.add(sid);

    const isFoil = row["Foil"] === "foil";
    const productKey = sid + (isFoil ? "-foil" : "-normal");

    if (productMap.has(productKey)) {
      // Same card+foil combo: sum quantities, keep highest price
      const existing = productMap.get(productKey);
      existing["Quantity"] =
        (parseInt(existing["Quantity"]) || 0) +
        (parseInt(row["Quantity"]) || 0);
      const existingPrice = parseFloat(existing["Purchase price"]) || 0;
      const newPrice = parseFloat(row["Purchase price"]) || 0;
      if (newPrice > existingPrice) {
        existing["Purchase price"] = row["Purchase price"];
      }
    } else {
      productMap.set(productKey, { ...row });
    }
  }

  const uniqueIds = [...uniqueScryfallIds];
  const totalBatches = Math.ceil(uniqueIds.length / SCRYFALL_BATCH_SIZE);

  console.log(
    `${uniqueIds.length} unique Scryfall IDs → ${totalBatches} batch call(s)`,
  );

  showLoadingState(
    `Obteniendo datos de ${uniqueIds.length} cartas (${totalBatches} solicitud${totalBatches > 1 ? "es" : ""})...`,
    20,
  );

  // Step 3: Fetch in batches of 75 using POST /cards/collection
  const allScryfallCards = {};
  for (let i = 0; i < totalBatches; i++) {
    const batchIds = uniqueIds.slice(
      i * SCRYFALL_BATCH_SIZE,
      (i + 1) * SCRYFALL_BATCH_SIZE,
    );

    const progress = 20 + Math.round(((i + 1) / totalBatches) * 60);
    showLoadingState(
      `Descargando lote ${i + 1} de ${totalBatches}...`,
      progress,
    );

    const batchResult = await fetchCardsBatch(batchIds);
    Object.assign(allScryfallCards, batchResult);

    // Small pause between batches to be polite to Scryfall
    if (i < totalBatches - 1) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  showLoadingState("Armando tu catálogo...", 90);

  // Step 4: Build the card database from merged CSV + Scryfall data
  cardDatabase = [];
  for (const [productKey, csvRow] of productMap) {
    const sid = csvRow["Scryfall ID"];
    const scryfallCard = allScryfallCards[sid];
    if (!scryfallCard) continue;

    cardDatabase.push(convertScryfallCard(scryfallCard, csvRow, exchangeRate));
  }

  console.log(`${cardDatabase.length} products built from ${csvData.length} CSV rows`);

  isLoading = false;
  displayCards(cardDatabase);
  updateCartDisplay();
}

/* ─── Loading & Error UI States ─── */

function showLoadingState(message, progressPercent) {
  const cardsGrid = document.getElementById("cards-grid");

  // Build a loading indicator + skeleton cards
  let html = `
    <div class="col-span-full rounded-2xl vault-panel border border-slate-800/60 p-5 space-y-3 shadow-lg">
      <div class="flex items-center gap-3">
        <div class="h-5 w-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin shrink-0"></div>
        <p class="text-sm font-semibold text-slate-300">${message}</p>
      </div>
      <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
        <div class="h-full rounded-full bg-gradient-to-r from-violet-600 to-amber-500 transition-all duration-500 ease-out" style="width: ${progressPercent}%"></div>
      </div>
    </div>
  `;

  // Skeleton cards
  for (let i = 0; i < 8; i++) {
    html += `
      <article class="flex flex-col overflow-hidden rounded-2xl border border-slate-800/40 p-3 space-y-3 skeleton-glow" style="min-height: 280px;">
        <div class="h-36 w-full rounded-xl bg-slate-950/50"></div>
        <div class="space-y-2 flex-1">
          <div class="h-4 w-3/4 rounded bg-slate-950/50"></div>
          <div class="h-3 w-1/2 rounded bg-slate-950/50"></div>
          <div class="h-4 w-1/3 rounded bg-slate-950/50"></div>
        </div>
        <div class="flex gap-2 pt-1">
          <div class="h-9 w-16 rounded-lg bg-slate-950/50"></div>
          <div class="h-9 flex-1 rounded-lg bg-slate-950/50"></div>
        </div>
      </article>
    `;
  }

  cardsGrid.innerHTML = html;

  const summaryEl = document.getElementById("results-summary");
  if (summaryEl) summaryEl.textContent = message;
}

function showErrorMessage(message) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = `
    <div class="col-span-full rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center shadow-inner">
      <h2 class="text-lg font-semibold text-rose-300">Error</h2>
      <p class="mt-2 text-sm text-slate-400">${message}</p>
    </div>
  `;
  updateResultsSummary([]);
}

/* ─── Card Display ─── */

function displayCards(cards) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = "";

  if (cards.length === 0) {
    cardsGrid.innerHTML = `
      <div class="col-span-full rounded-2xl border border-slate-800/60 bg-slate-900/10 p-10 text-center">
        <h3 class="text-base font-serif font-bold text-slate-300">No se encontraron cartas</h3>
        <p class="mt-1.5 text-sm text-slate-500">Intenta modificando los filtros o tu término de búsqueda.</p>
      </div>
    `;
    updateResultsSummary([]);
    return;
  }

  cards.forEach((card) => {
    cardsGrid.appendChild(createCardElement(card));
  });

  updateResultsSummary(cards);
}

function updateResultsSummary(cards) {
  const el = document.getElementById("results-summary");
  if (!el) return;

  const typeLabel =
    currentTypeFilter === "all" ? "Todas" : getTypeLabel(currentTypeFilter);
  const colorLabel =
    currentColorFilter === "all" ? "Todos" : getColorLabel(currentColorFilter);
  const searchLabel = currentSearchTerm ? ` · "${currentSearchTerm}"` : "";

  el.textContent = `${cards.length} cartas • ${typeLabel} • ${colorLabel}${searchLabel}`;
}

/* ─── Mana Cost Parser ─── */

function parseManaCost(manaCost) {
  if (!manaCost) return "";
  const regex = /\{([^}]+)\}/g;
  let match;
  let html = "";

  while ((match = regex.exec(manaCost)) !== null) {
    const s = match[1].toUpperCase();
    if (s === "W") html += `<span class="mtg-mana mana-w">W</span>`;
    else if (s === "U") html += `<span class="mtg-mana mana-u">U</span>`;
    else if (s === "B") html += `<span class="mtg-mana mana-b">B</span>`;
    else if (s === "R") html += `<span class="mtg-mana mana-r">R</span>`;
    else if (s === "G") html += `<span class="mtg-mana mana-g">G</span>`;
    else if (s === "C") html += `<span class="mtg-mana mana-c">C</span>`;
    else if (s === "X") html += `<span class="mtg-mana mana-x">X</span>`;
    else html += `<span class="mtg-mana mana-num">${s}</span>`;
  }
  return html;
}

/* ─── Card Element Builder ─── */

function createCardElement(card) {
  const rarityClass = `rarity-${(card.rarity || "common").toLowerCase().replace(/\s+/g, "")}`;
  const isFoil = card.foil;
  const foilBadge = isFoil ? `<span class="foil-label-badge">Foil</span>` : "";

  const conditionMap = {
    near_mint: "NM",
    lightly_played: "LP",
    moderately_played: "MP",
    heavily_played: "HP",
    damaged: "DMG",
    mint: "MT",
  };
  const conditionText = conditionMap[card.condition] || card.condition;
  const manaCostHtml = parseManaCost(card.manaCost);

  const el = document.createElement("article");
  el.className = `flex flex-col overflow-hidden rounded-2xl premium-card ${isFoil ? "foil-shimmer" : ""} shadow-lg group`;
  el.dataset.cardId = card.id;

  el.innerHTML = `
    <div class="relative overflow-hidden bg-slate-950 aspect-[5/4] shrink-0 border-b border-slate-900/60">
      ${
        card.imageUrl
          ? `<img src="${card.imageUrl}" alt="${card.name}" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />`
          : `<div class="h-full w-full flex items-center justify-center text-slate-600 bg-slate-950 font-serif text-xs">Sin Imagen</div>`
      }
      <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
        ${foilBadge}
        <span class="rarity-badge ${rarityClass}">${card.rarity}</span>
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
      <div class="flex items-start justify-between gap-1.5 min-w-0">
        <h4 class="font-serif text-xs sm:text-sm font-bold text-white leading-tight group-hover:text-amber-400 transition duration-300 truncate" title="${card.name}">
          ${card.name}
        </h4>
        <div class="flex shrink-0 items-center scale-90 origin-right">
          ${manaCostHtml}
        </div>
      </div>

      <div class="flex flex-wrap gap-1 text-xxs text-slate-500 font-semibold uppercase tracking-wider">
        <span class="rounded bg-slate-900/60 border border-slate-800/80 px-1.5 py-0.5">${getTypeLabel(card.type)}</span>
        <span class="rounded bg-slate-900/60 border border-slate-800/80 px-1.5 py-0.5">${card.setCode}</span>
        <span class="rounded bg-slate-900/60 border border-slate-800/80 px-1.5 py-0.5">${conditionText}</span>
      </div>

      <div class="flex items-baseline justify-between mt-auto pt-1.5 border-t border-slate-900/30">
        <span class="text-sm sm:text-base font-black text-amber-400 font-mono">$${Math.round(card.price).toLocaleString("es-CL")}</span>
        <span class="text-xxs font-semibold ${card.stock > 0 ? "text-emerald-500" : "text-rose-400"}">${card.stock > 0 ? `${card.stock} disp.` : "Agotado"}</span>
      </div>

      <div class="flex gap-1.5 pt-1">
        <button class="rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900 px-2.5 py-2 text-xxs font-bold text-slate-300 transition" onclick="viewCardDetail('${card.id}')">Ver</button>
        ${
          card.stock > 0
            ? `<button class="flex-1 btn-gold rounded-lg py-2 text-xxs font-bold transition shadow" onclick="addToCart('${card.id}')">Agregar</button>`
            : '<button class="flex-1 rounded-lg bg-slate-900/40 border border-slate-800/50 py-2 text-xxs font-semibold text-slate-600 cursor-not-allowed" disabled>Agotado</button>'
        }
      </div>
    </div>
  `;

  return el;
}

/* ─── Label Helpers ─── */

function getTypeLabel(type) {
  const types = {
    creature: "Criatura",
    instant: "Instantáneo",
    sorcery: "Conjuro",
    enchantment: "Encantamiento",
    artifact: "Artefacto",
    planeswalker: "Planeswalker",
    land: "Tierra",
    other: "Otro",
  };
  return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function getColorLabel(color) {
  const colors = {
    white: "Blanco",
    blue: "Azul",
    black: "Negro",
    red: "Rojo",
    green: "Verde",
    colorless: "Incoloro",
  };
  return colors[color] || color.charAt(0).toUpperCase() + color.slice(1);
}

/* ─── Filters ─── */

function filterCards(type) {
  currentTypeFilter = type;
  updateFilterUI(".js-filter");
  document
    .querySelector(`.js-filter[data-filter="${type}"]`)
    ?.classList.add("bg-violet-500/20", "text-white", "font-bold");
  applyFilters();
}

function filterByColor(color) {
  currentColorFilter = color;
  updateFilterUI(".js-color-filter");
  document
    .querySelector(`.js-color-filter[data-color="${color}"]`)
    ?.classList.add("bg-violet-500/20", "text-white", "font-bold");
  applyFilters();
}

function updateFilterUI(selector) {
  document.querySelectorAll(selector).forEach((link) => {
    link.classList.remove("bg-violet-500/20", "text-white", "font-bold");
    link.classList.add("text-slate-400");
  });
}

function getFilteredCards() {
  let filtered = cardDatabase;
  if (currentTypeFilter !== "all") {
    filtered = filtered.filter((c) => c.type === currentTypeFilter);
  }
  if (currentColorFilter !== "all") {
    filtered = filtered.filter((c) => c.color === currentColorFilter);
  }
  return filtered;
}

function applyFilters() {
  const filtered = getFilteredCards();
  const results = currentSearchTerm
    ? filtered.filter((card) => {
        const s = currentSearchTerm.toLowerCase();
        return (
          card.name.toLowerCase().includes(s) ||
          card.text.toLowerCase().includes(s) ||
          card.type.toLowerCase().includes(s) ||
          card.color.toLowerCase().includes(s) ||
          card.set.toLowerCase().includes(s)
        );
      })
    : filtered;

  displayCards(results);
}

function clearFilters() {
  currentTypeFilter = "all";
  currentColorFilter = "all";
  currentSearchTerm = "";

  // Clear both search inputs
  const desktopInput = document.getElementById("search-input");
  const mobileInput = document.getElementById("search-input-mobile");
  if (desktopInput) desktopInput.value = "";
  if (mobileInput) mobileInput.value = "";

  updateFilterUI(".js-filter");
  updateFilterUI(".js-color-filter");
  document
    .querySelector('.js-filter[data-filter="all"]')
    ?.classList.add("bg-violet-500/20", "text-white", "font-bold");
  document
    .querySelector('.js-color-filter[data-color="all"]')
    ?.classList.add("bg-violet-500/20", "text-white", "font-bold");
  displayCards(getFilteredCards());

  // Close mobile filters drawer after clearing
  closeMobileFilters();
}

function searchCards() {
  const desktopInput = document.getElementById("search-input");
  const mobileInput = document.getElementById("search-input-mobile");

  // Sync both inputs
  const desktopVal = desktopInput ? desktopInput.value.trim() : "";
  const mobileVal = mobileInput ? mobileInput.value.trim() : "";

  // Use whichever was most recently changed
  currentSearchTerm = (desktopVal || mobileVal).toLowerCase();

  // Keep inputs in sync
  if (desktopInput && mobileInput) {
    if (desktopVal && !mobileVal) mobileInput.value = desktopVal;
    if (mobileVal && !desktopVal) desktopInput.value = mobileVal;
  }

  applyFilters();
}

/* ─── Shopping Cart ─── */

function addToCart(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);
  if (!card || card.stock === 0) {
    showToast("Esta carta está agotada.", "error");
    return;
  }

  const existingItem = shoppingCart.find((item) => item.id === cardId);
  if (existingItem) {
    if (existingItem.quantity < card.stock) {
      existingItem.quantity++;
      showToast(`+1 "${card.name}" al carrito.`);
    } else {
      showToast(`Solo hay ${card.stock} en stock.`, "error");
      return;
    }
  } else {
    shoppingCart.push({
      id: card.id,
      name: card.name,
      price: card.price,
      quantity: 1,
      foil: card.foil,
    });
    showToast(`"${card.name}" agregado al carrito.`);
  }

  updateCartDisplay();
}

function updateCartDisplay() {
  const cartCount = shoppingCart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = shoppingCart.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );
  const formatted = Math.round(cartTotal).toLocaleString("es-CL") + " CLP";

  const navCount = document.getElementById("cart-count");
  if (navCount) navCount.textContent = cartCount;
}

function viewCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  const cartItemsDiv = document.getElementById("cart-items");
  if (!drawer || !overlay || !cartItemsDiv) return;

  if (shoppingCart.length === 0) {
    cartItemsDiv.innerHTML = `
      <div class="flex flex-col items-center justify-center h-48 text-center space-y-2">
        <span class="text-3xl text-slate-700">🛒</span>
        <p class="text-sm font-semibold text-slate-400">Tu carrito está vacío</p>
        <p class="text-xs text-slate-500">Agrega cartas desde la tienda.</p>
      </div>
    `;
  } else {
    let html = '<div class="space-y-2.5">';
    shoppingCart.forEach((item) => {
      const subtotal = item.price * item.quantity;
      const foilBadge = item.foil
        ? `<span class="foil-label-badge ml-1">Foil</span>`
        : "";

      html += `
        <div class="vault-panel rounded-xl p-3.5 border border-slate-800/80 space-y-2.5 hover:border-slate-700 transition">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <p class="font-bold text-white text-sm leading-tight flex items-center flex-wrap gap-1">${item.name}${foilBadge}</p>
              <p class="text-xxs text-slate-500 mt-0.5 font-mono">$${Math.round(item.price).toLocaleString("es-CL")} CLP c/u</p>
            </div>
            <button class="text-rose-400 hover:text-rose-300 text-xxs font-semibold p-1 hover:bg-rose-500/10 rounded-lg transition shrink-0" onclick="removeFromCart('${item.id}')">Eliminar</button>
          </div>
          <div class="flex items-center justify-between gap-3 pt-1 border-t border-slate-900/40">
            <div class="flex items-center gap-1 bg-slate-950/70 rounded-lg border border-slate-900 p-0.5">
              <button class="rounded px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-900 hover:text-white transition" onclick="decreaseQuantity('${item.id}')">−</button>
              <span class="min-w-5 text-center text-xs font-mono font-bold text-slate-200">${item.quantity}</span>
              <button class="rounded px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-900 hover:text-white transition" onclick="increaseQuantity('${item.id}')">+</button>
            </div>
            <span class="text-sm font-bold text-slate-200 font-mono">$${Math.round(subtotal).toLocaleString("es-CL")}</span>
          </div>
        </div>
      `;
    });
    html += "</div>";
    cartItemsDiv.innerHTML = html;
  }

  const cartTotal = shoppingCart.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );
  document.getElementById("modal-cart-total").textContent =
    Math.round(cartTotal).toLocaleString("es-CL") + " CLP";

  drawer.classList.add("active");
  overlay.classList.add("active");
}

function closeCart() {
  const drawer = document.getElementById("cart-drawer");
  const overlay = document.getElementById("cart-overlay");
  if (drawer) drawer.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
}

function increaseQuantity(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);
  const cartItem = shoppingCart.find((i) => i.id === cardId);
  if (cartItem && card && cartItem.quantity < card.stock) {
    cartItem.quantity++;
    updateCartDisplay();
    viewCart();
  } else {
    showToast(`Solo hay ${card ? card.stock : 0} en stock.`, "error");
  }
}

function decreaseQuantity(cardId) {
  const cartItem = shoppingCart.find((i) => i.id === cardId);
  if (cartItem) {
    if (cartItem.quantity > 1) {
      cartItem.quantity--;
    } else {
      removeFromCart(cardId);
      return;
    }
    updateCartDisplay();
    viewCart();
  }
}

function removeFromCart(cardId) {
  shoppingCart = shoppingCart.filter((i) => i.id !== cardId);
  updateCartDisplay();
  viewCart();
  showToast("Artículo eliminado del carrito.");
}

function clearCart() {
  if (confirm("¿Vaciar tu carrito?")) {
    shoppingCart = [];
    updateCartDisplay();
    viewCart();
    showToast("Carrito vaciado.");
  }
}

function checkout() {
  if (shoppingCart.length === 0) {
    showToast("Tu carrito está vacío.", "error");
    return;
  }
  const total = shoppingCart.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );
  const count = shoppingCart.reduce((sum, i) => sum + i.quantity, 0);
  if (
    confirm(
      `¿Finalizar compra de ${count} artículos por $${Math.round(total).toLocaleString("es-CL")} CLP?`,
    )
  ) {
    showToast("¡Compra finalizada! (Demostración)");
    shoppingCart = [];
    updateCartDisplay();
    closeCart();
  }
}

/* ─── Card Detail Modal ─── */

function viewCardDetail(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);
  if (!card) return;

  const modal = document.getElementById("card-detail-modal");
  const content = document.getElementById("card-detail-content");
  const rarityClass = `rarity-${(card.rarity || "common").toLowerCase().replace(/\s+/g, "")}`;
  const foilBadge = card.foil
    ? `<span class="foil-label-badge text-xxs px-2 py-0.5 shadow-sm">Foil</span>`
    : "";
  const manaCostHtml = parseManaCost(card.manaCost);

  const conditionMap = {
    near_mint: "Near Mint",
    lightly_played: "Lightly Played",
    moderately_played: "Moderately Played",
    heavily_played: "Heavily Played",
    damaged: "Damaged",
    mint: "Mint",
  };
  const conditionText = conditionMap[card.condition] || card.condition;

  content.innerHTML = `
    <div class="grid gap-5 sm:grid-cols-2">
      <div class="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 ${card.foil ? "foil-shimmer" : ""} shadow-xl" style="aspect-ratio: 5/7;">
        ${
          card.imageUrl
            ? `<img src="${card.imageUrl}" alt="${card.name}" class="w-full h-full object-cover" loading="lazy" />`
            : `<div class="h-full w-full flex items-center justify-center font-serif text-sm text-slate-500">Sin Imagen</div>`
        }
        <div class="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          ${foilBadge}
          <span class="rarity-badge ${rarityClass}">${card.rarity}</span>
        </div>
      </div>

      <div class="flex flex-col justify-between space-y-3">
        <div class="space-y-3">
          <div>
            <div class="flex items-start justify-between gap-3">
              <h3 class="font-serif text-xl sm:text-2xl font-black text-white tracking-wide leading-tight">${card.name}</h3>
              <div class="flex shrink-0 items-center mt-1">${manaCostHtml}</div>
            </div>
            <p class="text-sm font-semibold text-violet-400 mt-1">${getTypeLabel(card.type)}</p>
          </div>

          <div class="h-px bg-slate-800/80"></div>

          <div class="bg-slate-950/60 border border-slate-900 rounded-xl p-3 space-y-1">
            <span class="block text-xxs uppercase tracking-widest text-slate-500 font-bold">Oracle Text</span>
            <p class="text-sm text-slate-300 italic leading-relaxed whitespace-pre-wrap">${card.text || "Sin texto."}</p>
          </div>

          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5">
              <span class="block text-xxs uppercase tracking-widest text-slate-500 font-bold mb-0.5">Edición</span>
              <span class="font-bold text-slate-200 text-xs">${card.set}</span>
            </div>
            <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5">
              <span class="block text-xxs uppercase tracking-widest text-slate-500 font-bold mb-0.5">Condición</span>
              <span class="font-bold text-slate-200 text-xs">${conditionText}</span>
            </div>
          </div>

          ${
            card.power !== null
              ? `
            <div class="bg-slate-950/40 border border-slate-900 rounded-xl p-2.5">
              <span class="block text-xxs uppercase tracking-widest text-slate-500 font-bold mb-0.5">P/T</span>
              <span class="font-bold text-slate-200 font-mono text-base">${card.power}/${card.toughness}</span>
            </div>
          `
              : ""
          }
        </div>

        <div class="pt-3 border-t border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="block text-xxs uppercase tracking-widest text-slate-500 font-bold">Precio</span>
              <span class="text-xl font-black text-amber-400 font-mono">$${Math.round(card.price).toLocaleString("es-CL")} CLP</span>
            </div>
            <div class="text-right">
              <span class="block text-xxs uppercase tracking-widest text-slate-500 font-bold">Stock</span>
              <span class="text-sm font-bold ${card.stock > 0 ? "text-emerald-400" : "text-rose-400"}">${card.stock > 0 ? `${card.stock} unid.` : "Agotado"}</span>
            </div>
          </div>
          ${
            card.stock > 0
              ? `<button class="w-full btn-gold rounded-xl py-3 text-sm font-bold transition shadow-lg" onclick="addToCart('${card.id}'); closeCardDetail();">Agregar al Carrito</button>`
              : '<button class="w-full rounded-xl bg-slate-900 border border-slate-800 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed" disabled>Agotado</button>'
          }
        </div>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCardDetail() {
  const modal = document.getElementById("card-detail-modal");
  if (modal) {
    modal.classList.remove("flex");
    modal.classList.add("hidden");
  }
}

/* ─── Mobile Filters Drawer ─── */

function openMobileFilters() {
  const sidebar = document.getElementById("filters-sidebar");
  const overlay = document.getElementById("filter-overlay");
  if (sidebar) sidebar.classList.add("active");
  if (overlay) overlay.classList.add("active");
}

function closeMobileFilters() {
  const sidebar = document.getElementById("filters-sidebar");
  const overlay = document.getElementById("filter-overlay");
  if (sidebar) sidebar.classList.remove("active");
  if (overlay) overlay.classList.remove("active");
}

/* ─── Event Listeners ─── */

function initializeEventListeners() {
  // Set default active filter styles
  updateFilterUI(".js-filter");
  updateFilterUI(".js-color-filter");
  document
    .querySelector('.js-filter[data-filter="all"]')
    ?.classList.add("bg-violet-500/20", "text-white", "font-bold");
  document
    .querySelector('.js-color-filter[data-color="all"]')
    ?.classList.add("bg-violet-500/20", "text-white", "font-bold");

  // Category filters
  document.querySelectorAll(".js-filter").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      filterCards(e.currentTarget.dataset.filter);
      closeMobileFilters();
    });
  });

  // Color filters
  document.querySelectorAll(".js-color-filter").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      filterByColor(e.currentTarget.dataset.color);
      closeMobileFilters();
    });
  });

  // Desktop search
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  if (searchBtn) searchBtn.addEventListener("click", searchCards);
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      // Sync to mobile input
      const mobileInput = document.getElementById("search-input-mobile");
      if (mobileInput) mobileInput.value = searchInput.value;
      searchCards();
    });
  }

  // Mobile search
  const searchBtnMobile = document.getElementById("search-btn-mobile");
  const searchInputMobile = document.getElementById("search-input-mobile");
  if (searchBtnMobile) searchBtnMobile.addEventListener("click", searchCards);
  if (searchInputMobile) {
    searchInputMobile.addEventListener("keyup", (e) => {
      // Sync to desktop input
      const desktopInput = document.getElementById("search-input");
      if (desktopInput) desktopInput.value = searchInputMobile.value;
      searchCards();
    });
  }

  // Clear filters
  const clearBtn = document.getElementById("clear-filters-btn");
  if (clearBtn) clearBtn.addEventListener("click", clearFilters);

  // Cart
  document.getElementById("view-cart-btn")?.addEventListener("click", viewCart);
  document.getElementById("close-cart-btn")?.addEventListener("click", closeCart);
  document.getElementById("checkout-btn")?.addEventListener("click", checkout);
  document.getElementById("clear-cart-btn")?.addEventListener("click", clearCart);

  // Card detail
  document
    .getElementById("close-card-detail-btn")
    ?.addEventListener("click", closeCardDetail);

  // Mobile filter toggle
  document
    .getElementById("mobile-filter-toggle")
    ?.addEventListener("click", openMobileFilters);
  document
    .getElementById("close-filters-btn")
    ?.addEventListener("click", closeMobileFilters);

  // Overlay clicks to close
  document.addEventListener("click", (event) => {
    if (event.target === document.getElementById("cart-overlay")) closeCart();
    if (event.target === document.getElementById("card-detail-modal"))
      closeCardDetail();
    if (event.target === document.getElementById("filter-overlay"))
      closeMobileFilters();
  });
}

window.addEventListener("load", () => {
  initializeEventListeners();
  loadAllCards();
});
