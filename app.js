// Card database - will be populated from CSV + Scryfall
let cardDatabase = [];

// Shopping cart
let shoppingCart = [];

// Current filters
let currentTypeFilter = "all";
let currentColorFilter = "all";

// Loading state
let isLoading = true;

// Scryfall API base URL
const SCRYFALL_API = "https://api.scryfall.com";

// USD to CLP conversion rate
const USD_TO_CLP = 500;

async function loadCSV(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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

    console.log("CSV loaded successfully:", result.data.length, "rows");
    return result.data;
  } catch (error) {
    console.error("Error cargando CSV:", error);
    return [];
  }
}

async function fetchCardFromScryfall(cardName) {
  try {
    const response = await fetch(
      `${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(cardName)}`
    );

    if (!response.ok) {
      console.error(`No se encontró la carta: ${cardName}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error obteniendo carta ${cardName}:`, error);
    return null;
  }
}

function convertScryfallCard(scryfallCard, csvData) {
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
    const colorMap = {
      W: "white",
      U: "blue",
      B: "black",
      R: "red",
      G: "green",
    };
    color = colorMap[scryfallCard.colors[0]] || "colorless";
  }

  const rarityMap = {
    common: "Común",
    uncommon: "Poco común",
    rare: "Rara",
    mythic: "Mítica rara",
  };

  return {
    id: scryfallCard.id,
    name: scryfallCard.name,
    type: cardType,
    color: color,
    manaCost: scryfallCard.mana_cost || "0",
    power: scryfallCard.power || null,
    toughness: scryfallCard.toughness || null,
    text: scryfallCard.oracle_text || "",
    price: (parseFloat(csvData["Purchase price"]) || 0) * USD_TO_CLP,
    stock: parseInt(csvData["Quantity"]) || 0,
    rarity: rarityMap[scryfallCard.rarity] || scryfallCard.rarity,
    set: scryfallCard.set_name,
    imageUrl: scryfallCard.image_uris ? scryfallCard.image_uris.normal : null,
    scryfallUri: scryfallCard.scryfall_uri,
  };
}

async function loadAllCards() {
  showLoadingMessage();

  const csvData = await loadCSV("cards.csv");

  if (csvData.length === 0) {
    showErrorMessage("No se pudo cargar el archivo CSV");
    return;
  }

  console.log(`Cargando ${csvData.length} cartas desde Scryfall...`);

  const promises = csvData.map(async (row, index) => {
    await new Promise((resolve) => setTimeout(resolve, index * 100));

    const scryfallCard = await fetchCardFromScryfall(row.Name);
    if (scryfallCard) {
      return convertScryfallCard(scryfallCard, row);
    }
    return null;
  });

  const cards = await Promise.all(promises);
  cardDatabase = cards.filter((card) => card !== null);

  console.log(`${cardDatabase.length} cartas cargadas exitosamente`);

  isLoading = false;
  displayCards(cardDatabase);
  updateCartDisplay();
}

function showLoadingMessage() {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = `
    <div class="col-span-full rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center shadow-inner">
      <h2 class="text-xl font-semibold text-white">⏳ Cargando cartas desde Scryfall...</h2>
      <p class="mt-2 text-sm text-slate-400">Por favor espera mientras obtenemos los datos de las cartas.</p>
    </div>
  `;
}

function showErrorMessage(message) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = `
    <div class="col-span-full rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center shadow-inner">
      <h2 class="text-xl font-semibold text-rose-300">❌ Error</h2>
      <p class="mt-2 text-sm text-slate-300">${message}</p>
    </div>
  `;
}

function displayCards(cards) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = "";

  if (cards.length === 0) {
    cardsGrid.innerHTML = `
      <div class="col-span-full rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center shadow-inner">
        <h3 class="text-lg font-semibold text-white">No se encontraron cartas</h3>
      </div>
    `;
    return;
  }

  cards.forEach((card) => {
    const cardElement = createCardElement(card);
    cardsGrid.appendChild(cardElement);
  });
}

function createCardElement(card) {
  const colorEmoji = getColorEmoji(card.color);
  const typeIcon = getTypeIcon(card.type);
  const stockStatus = card.stock > 0 ? `En Stock (${card.stock})` : "Agotado";
  const stockStatusClass = card.stock > 0 ? "text-emerald-400" : "text-rose-400";

  const cardDiv = document.createElement("article");
  cardDiv.className =
    "flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg transition duration-200 hover:-translate-y-1 hover:border-violet-500/70";
  cardDiv.dataset.cardId = card.id;

  cardDiv.innerHTML = `
    ${
      card.imageUrl
        ? `<img src="${card.imageUrl}" alt="${card.name}" class="h-64 w-full object-cover" loading="lazy" />`
        : ""
    }
    <div class="flex flex-1 flex-col gap-3 p-4">
      <h4 class="text-lg font-semibold text-white">${card.name}</h4>
      <p class="text-sm text-slate-300">${colorEmoji} ${card.color.charAt(0).toUpperCase() + card.color.slice(1)} | ${typeIcon} ${card.type.charAt(0).toUpperCase() + card.type.slice(1)}</p>
      <p class="text-lg font-bold text-violet-300">$${Math.round(card.price)} CLP</p>
      <p class="text-sm font-medium ${stockStatusClass}">${stockStatus}</p>
      <div class="mt-auto flex flex-wrap gap-2">
        <button class="inline-flex items-center justify-center rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700" onclick="viewCardDetail('${card.id}')">Ver Detalles</button>
        ${
          card.stock > 0
            ? `<button class="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500" onclick="addToCart('${card.id}')">Agregar al Carrito</button>`
            : '<button class="inline-flex items-center justify-center rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-400" disabled>Agotado</button>'
        }
      </div>
    </div>
  `;

  return cardDiv;
}

function getColorEmoji(color) {
  const emojis = {
    white: "⚪",
    blue: "🔵",
    black: "⚫",
    red: "🔴",
    green: "🟢",
    colorless: "⚪",
  };
  return emojis[color] || "⚪";
}

function getTypeIcon(type) {
  const icons = {
    creature: "🐉",
    instant: "⚡",
    sorcery: "🔮",
    enchantment: "✨",
    artifact: "⚙️",
    planeswalker: "👤",
  };
  return icons[type] || "🃏";
}

function filterCards(type) {
  currentTypeFilter = type;
  updateFilterUI(".js-filter");
  const activeLink = document.querySelector(`.js-filter[data-filter="${type}"]`);
  activeLink?.classList.add("bg-violet-500/20", "text-violet-300", "font-semibold");
  applyFilters();
}

function filterByColor(color) {
  currentColorFilter = color;
  updateFilterUI(".js-color-filter");
  const activeLink = document.querySelector(`.js-color-filter[data-color="${color}"]`);
  activeLink?.classList.add("bg-violet-500/20", "text-violet-300", "font-semibold");
  applyFilters();
}

function updateFilterUI(selector) {
  document.querySelectorAll(selector).forEach((link) => {
    link.classList.remove("bg-violet-500/20", "text-violet-300", "font-semibold");
    link.classList.add("text-slate-300");
  });
}

function applyFilters() {
  let filtered = cardDatabase;

  if (currentTypeFilter !== "all") {
    filtered = filtered.filter((card) => card.type === currentTypeFilter);
  }

  if (currentColorFilter !== "all") {
    filtered = filtered.filter((card) => card.color === currentColorFilter);
  }

  displayCards(filtered);
}

function searchCards() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase();

  if (searchTerm === "") {
    applyFilters();
    return;
  }

  const results = cardDatabase.filter(
    (card) =>
      card.name.toLowerCase().includes(searchTerm) ||
      card.text.toLowerCase().includes(searchTerm) ||
      card.type.toLowerCase().includes(searchTerm) ||
      card.color.toLowerCase().includes(searchTerm)
  );

  displayCards(results);
}

function addToCart(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);

  if (!card || card.stock === 0) {
    alert("¡Lo sentimos, esta carta está agotada!");
    return;
  }

  const existingItem = shoppingCart.find((item) => item.id === cardId);

  if (existingItem) {
    if (existingItem.quantity < card.stock) {
      existingItem.quantity++;
      alert(`¡Se agregó otro ${card.name} al carrito!`);
    } else {
      alert(`¡Lo sentimos, solo hay ${card.stock} en stock!`);
      return;
    }
  } else {
    shoppingCart.push({
      id: card.id,
      name: card.name,
      price: card.price,
      quantity: 1,
    });
    alert(`¡${card.name} agregado al carrito!`);
  }

  updateCartDisplay();
}

function updateCartDisplay() {
  const cartCount = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = shoppingCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  document.getElementById("cart-count").textContent = cartCount;
  document.getElementById("cart-total").textContent = Math.round(cartTotal) + " CLP";
}

function viewCart() {
  const modal = document.getElementById("cart-modal");
  const cartItemsDiv = document.getElementById("cart-items");

  if (shoppingCart.length === 0) {
    cartItemsDiv.innerHTML = '<p class="text-sm text-slate-400">Tu carrito está vacío</p>';
  } else {
    let html = '<div class="space-y-3">';

    shoppingCart.forEach((item) => {
      const subtotal = item.price * item.quantity;
      html += `
        <div class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
          <div class="min-w-0">
            <p class="font-semibold text-white">${item.name}</p>
            <p class="text-sm text-slate-400">$${Math.round(item.price)} CLP c/u</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="rounded-lg border border-slate-700 px-3 py-1 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white" onclick="decreaseQuantity('${item.id}')">-</button>
            <span class="min-w-6 text-center text-sm font-semibold text-slate-100">${item.quantity}</span>
            <button class="rounded-lg border border-slate-700 px-3 py-1 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white" onclick="increaseQuantity('${item.id}')">+</button>
          </div>
          <div class="text-sm font-semibold text-slate-100">$${Math.round(subtotal)} CLP</div>
          <button class="rounded-lg border border-rose-500/40 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10" onclick="removeFromCart('${item.id}')">Eliminar</button>
        </div>
      `;
    });

    html += "</div>";
    cartItemsDiv.innerHTML = html;
  }

  const cartTotal = shoppingCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  document.getElementById("modal-cart-total").textContent = Math.round(cartTotal) + " CLP";

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCart() {
  const modal = document.getElementById("cart-modal");
  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

function increaseQuantity(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);
  const cartItem = shoppingCart.find((item) => item.id === cardId);

  if (cartItem && cartItem.quantity < card.stock) {
    cartItem.quantity++;
    updateCartDisplay();
    viewCart();
  } else {
    alert(`¡Lo sentimos, solo hay ${card.stock} en stock!`);
  }
}

function decreaseQuantity(cardId) {
  const cartItem = shoppingCart.find((item) => item.id === cardId);

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
  shoppingCart = shoppingCart.filter((item) => item.id !== cardId);
  updateCartDisplay();
  viewCart();
}

function clearCart() {
  if (confirm("¿Estás seguro de que quieres vaciar tu carrito?")) {
    shoppingCart = [];
    updateCartDisplay();
    viewCart();
  }
}

function checkout() {
  if (shoppingCart.length === 0) {
    alert("¡Tu carrito está vacío!");
    return;
  }

  const total = shoppingCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const itemCount = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);

  if (
    confirm(
      `¿Finalizar compra de ${itemCount} artículos por $${Math.round(total)} CLP?`
    )
  ) {
    alert(
      "¡Gracias por tu compra! (Esto es una demostración - no se realizó ninguna transacción real)"
    );
    shoppingCart = [];
    updateCartDisplay();
    closeCart();
  }
}

function viewCardDetail(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);

  if (!card) return;

  const modal = document.getElementById("card-detail-modal");
  const content = document.getElementById("card-detail-content");

  const colorEmoji = getColorEmoji(card.color);
  const typeIcon = getTypeIcon(card.type);

  content.innerHTML = `
    <div class="space-y-4">
      <h3 class="text-2xl font-semibold text-white">${card.name}</h3>
      ${
        card.imageUrl
          ? `<img src="${card.imageUrl}" alt="${card.name}" class="w-full rounded-2xl border border-slate-800 object-cover" loading="lazy" />`
          : ""
      }
      <dl class="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <div>
          <dt class="font-semibold text-slate-100">Coste de Maná</dt>
          <dd>${card.manaCost}</dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-100">Tipo</dt>
          <dd>${typeIcon} ${card.type.charAt(0).toUpperCase() + card.type.slice(1)}</dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-100">Color</dt>
          <dd>${colorEmoji} ${card.color.charAt(0).toUpperCase() + card.color.slice(1)}</dd>
        </div>
        ${
          card.power !== null
            ? `
            <div>
              <dt class="font-semibold text-slate-100">Fuerza/Resistencia</dt>
              <dd>${card.power}/${card.toughness}</dd>
            </div>
          `
            : ""
        }
        <div>
          <dt class="font-semibold text-slate-100">Rareza</dt>
          <dd>${card.rarity}</dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-100">Edición</dt>
          <dd>${card.set}</dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="font-semibold text-slate-100">Descripción</dt>
          <dd class="mt-1 italic text-slate-400">${card.text}</dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-100">Precio</dt>
          <dd class="text-violet-300">$${Math.round(card.price)} CLP</dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-100">Stock</dt>
          <dd class="${card.stock > 0 ? "text-emerald-400" : "text-rose-400"}">${card.stock > 0 ? `${card.stock} disponibles` : "Agotado"}</dd>
        </div>
      </dl>
      <div class="flex justify-end">
        ${
          card.stock > 0
            ? `<button class="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white transition hover:bg-violet-500" onclick="addToCart('${card.id}'); closeCardDetail();">Agregar al Carrito</button>`
            : '<button class="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-400" disabled>Agotado</button>'
        }
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCardDetail() {
  const modal = document.getElementById("card-detail-modal");
  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

function initializeEventListeners() {
  document.querySelectorAll(".js-filter").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      filterCards(e.target.dataset.filter);
    });
  });

  document.querySelectorAll(".js-color-filter").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      filterByColor(e.target.dataset.color);
    });
  });

  document.getElementById("search-btn").addEventListener("click", searchCards);
  document.getElementById("search-input").addEventListener("keyup", searchCards);

  document.getElementById("view-cart-btn").addEventListener("click", viewCart);
  document.getElementById("close-cart-btn").addEventListener("click", closeCart);
  document.getElementById("checkout-btn").addEventListener("click", checkout);
  document.getElementById("clear-cart-btn").addEventListener("click", clearCart);

  document.getElementById("close-card-detail-btn").addEventListener("click", closeCardDetail);

  document.addEventListener("click", (event) => {
    const cartModal = document.getElementById("cart-modal");
    const detailModal = document.getElementById("card-detail-modal");

    if (event.target === cartModal) {
      closeCart();
    }
    if (event.target === detailModal) {
      closeCardDetail();
    }
  });
}

window.addEventListener("load", () => {
  initializeEventListeners();
  loadAllCards();
});
