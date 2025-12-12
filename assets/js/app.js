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
const USD_2_CLP = 750;

// Load CSV file using PapaParse
async function loadCSV(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();

    // Use PapaParse to properly handle quoted fields and commas
    const result = Papa.parse(csvText, {
      header: true, // Treat the first row as headers
      dynamicTyping: true, // Attempt to convert values to appropriate types
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Trim header names
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

// Fetch card data from Scryfall
async function fetchCardFromScryfall(cardName) {
  try {
    // Use fuzzy search to handle slight name variations
    const response = await fetch(
      `${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(cardName)}`
    );

    if (!response.ok) {
      console.error(`No se encontró la carta: ${cardName}`);
      return null;
    }

    const card = await response.json();
    return card;
  } catch (error) {
    console.error(`Error obteniendo carta ${cardName}:`, error);
    return null;
  }
}

// Convert Scryfall card to our format
function convertScryfallCard(scryfallCard, csvData) {
  // Get card type (simplified)
  let cardType = "other";
  const typeLine = scryfallCard.type_line.toLowerCase();

  if (typeLine.includes("creature")) cardType = "creature";
  else if (typeLine.includes("instant")) cardType = "instant";
  else if (typeLine.includes("sorcery")) cardType = "sorcery";
  else if (typeLine.includes("enchantment")) cardType = "enchantment";
  else if (typeLine.includes("artifact")) cardType = "artifact";
  else if (typeLine.includes("planeswalker")) cardType = "planeswalker";
  else if (typeLine.includes("land")) cardType = "land";

  // Get primary color
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

  // Translate rarity
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
    // Map CSV columns: "Purchase price" and "Quantity", convert USD to CLP
    price: (parseFloat(csvData["Purchase price"]) || 0) * USD_2_CLP,
    stock: parseInt(csvData["Quantity"]) || 0,
    rarity: rarityMap[scryfallCard.rarity] || scryfallCard.rarity,
    set: scryfallCard.set_name,
    imageUrl: scryfallCard.image_uris ? scryfallCard.image_uris.normal : null,
    scryfallUri: scryfallCard.scryfall_uri,
  };
}

// Load all cards from CSV and Scryfall
async function loadAllCards() {
  showLoadingMessage();

  // Load CSV data
  const csvData = await loadCSV("assets/cards.csv");

  if (csvData.length === 0) {
    showErrorMessage("No se pudo cargar el archivo CSV");
    return;
  }

  console.log(`Cargando ${csvData.length} cartas desde Scryfall...`);

  // Fetch each card from Scryfall
  const promises = csvData.map(async (row, index) => {
    // Add delay to respect Scryfall rate limits (10 requests per second)
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

// Show loading message
function showLoadingMessage() {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML =
    '<div class="loading"><h2>⏳ Cargando cartas desde Scryfall...</h2><p>Por favor espera mientras obtenemos los datos de las cartas.</p></div>';
}

// Show error message
function showErrorMessage(message) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = `<div class="error"><h2>❌ Error</h2><p>${message}</p></div>`;
}



// Display cards in a grid
function displayCards(cards) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = "";

  if (cards.length === 0) {
    cardsGrid.innerHTML =
      '<div class="no-results"><h3>No se encontraron cartas</h3></div>';
    return;
  }

  cards.forEach((card) => {
    const cardElement = createCardElement(card);
    cardsGrid.appendChild(cardElement);
  });
}

// Create card element
function createCardElement(card) {
  const colorEmoji = getColorEmoji(card.color);
  const typeIcon = getTypeIcon(card.type);
  const stockStatus = card.stock > 0 ? `En Stock (${card.stock})` : "Agotado";
  const stockStatusClass = card.stock > 0 ? "in-stock" : "out-of-stock";

  const cardDiv = document.createElement("article");
  cardDiv.className = `m-card card-type--${card.color}`;
  cardDiv.dataset.cardId = card.id;

  cardDiv.innerHTML = `
    ${
      card.imageUrl
        ? `<img src="${card.imageUrl}" alt="${card.name}" class="m-card__image" loading="lazy" />`
        : ""
    }
    <h4 class="m-card__name">${card.name}</h4>
    <p class="m-card__type">${colorEmoji} ${card.color.charAt(0).toUpperCase() + card.color.slice(1)} | ${typeIcon} ${card.type.charAt(0).toUpperCase() + card.type.slice(1)}</p>
    <p class="m-card__price">$${Math.round(card.price)} CLP</p>
    <p class="m-card__stock ${stockStatusClass}">${stockStatus}</p>
    <div class="m-card__actions">
      <button class="m-button m-card__button" onclick="viewCardDetail('${card.id}')">Ver Detalles</button>
      ${
        card.stock > 0
          ? `<button class="m-button m-card__button" onclick="addToCart('${card.id}')">Agregar al Carrito</button>`
          : "<button class=\"m-button\" disabled>Agotado</button>"
      }
    </div>
  `;

  return cardDiv;
}

// Get color emoji
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

// Get type icon
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

// Filter cards by type
function filterCards(type) {
  currentTypeFilter = type;
  updateFilterUI(".js-filter");
  applyFilters();
}

// Filter cards by color
function filterByColor(color) {
  currentColorFilter = color;
  updateFilterUI(".js-color-filter");
  applyFilters();
}

// Update filter UI to show active filter
function updateFilterUI(selector) {
  document.querySelectorAll(selector).forEach((link) => {
    link.classList.remove("is-active");
  });
}

// Apply all active filters
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

// Search cards
function searchCards() {
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();

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

// Add card to cart
function addToCart(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);

  if (!card || card.stock === 0) {
    alert("¡Lo sentimos, esta carta está agotada!");
    return;
  }

  // Check if card is already in cart
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

// Update cart display
function updateCartDisplay() {
  const cartCount = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = shoppingCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  document.getElementById("cart-count").textContent = cartCount;
  document.getElementById("cart-total").textContent =
    Math.round(cartTotal) + " CLP";
}

// View cart
function viewCart() {
  const modal = document.getElementById("cart-modal");
  const cartItemsDiv = document.getElementById("cart-items");

  if (shoppingCart.length === 0) {
    cartItemsDiv.innerHTML = "<p><i>Tu carrito está vacío</i></p>";
  } else {
    let html = '<table width="100%" border="1" cellpadding="5" class="cart-table">';
    html +=
      '<thead><tr><th>Carta</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th>Acción</th></tr></thead><tbody>';

    shoppingCart.forEach((item) => {
      const subtotal = item.price * item.quantity;
      html += `
                <tr>
                    <td>${item.name}</td>
                    <td>$${Math.round(item.price)} CLP</td>
                    <td>
                        <button class="m-button" onclick="decreaseQuantity('${
                          item.id
                        }')">-</button>
                        ${item.quantity}
                        <button class="m-button" onclick="increaseQuantity('${
                          item.id
                        }')">+</button>
                    </td>
                    <td>$${Math.round(subtotal)} CLP</td>
                    <td><button class="m-button" onclick="removeFromCart('${
                      item.id
                    }')">Eliminar</button></td>
                </tr>
            `;
    });

    html += "</tbody></table>";
    cartItemsDiv.innerHTML = html;
  }

  const cartTotal = shoppingCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  document.getElementById("modal-cart-total").textContent =
    Math.round(cartTotal) + " CLP";

  modal.classList.remove("is-hidden");
  modal.classList.add("is-visible");
}

// Close cart
function closeCart() {
  const modal = document.getElementById("cart-modal");
  modal.classList.remove("is-visible");
  modal.classList.add("is-hidden");
}

// Increase quantity
function increaseQuantity(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);
  const cartItem = shoppingCart.find((item) => item.id === cardId);

  if (cartItem && cartItem.quantity < card.stock) {
    cartItem.quantity++;
    updateCartDisplay();
    viewCart(); // Refresh cart view
  } else {
    alert(`¡Lo sentimos, solo hay ${card.stock} en stock!`);
  }
}

// Decrease quantity
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
    viewCart(); // Refresh cart view
  }
}

// Remove from cart
function removeFromCart(cardId) {
  shoppingCart = shoppingCart.filter((item) => item.id !== cardId);
  updateCartDisplay();
  viewCart(); // Refresh cart view
}

// Clear cart
function clearCart() {
  if (confirm("¿Estás seguro de que quieres vaciar tu carrito?")) {
    shoppingCart = [];
    updateCartDisplay();
    viewCart(); // Refresh cart view
  }
}

// Checkout
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
      `¿Finalizar compra de ${itemCount} artículos por $${Math.round(
        total
      )} CLP?`
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

// View card details
function viewCardDetail(cardId) {
  const card = cardDatabase.find((c) => c.id === cardId);

  if (!card) return;

  const modal = document.getElementById("card-detail-modal");
  const content = document.getElementById("card-detail-content");

  const colorEmoji = getColorEmoji(card.color);
  const typeIcon = getTypeIcon(card.type);

  content.innerHTML = `
    <h2>${card.name}</h2>
    ${
      card.imageUrl
        ? `<img src="${card.imageUrl}" alt="${card.name}" class="card-detail-image" loading="lazy" />`
        : ""
    }
    <dl class="card-detail-info">
      <dt>Coste de Maná:</dt>
      <dd>${card.manaCost}</dd>
      
      <dt>Tipo:</dt>
      <dd>${typeIcon} ${card.type.charAt(0).toUpperCase() + card.type.slice(1)}</dd>
      
      <dt>Color:</dt>
      <dd>${colorEmoji} ${card.color.charAt(0).toUpperCase() + card.color.slice(1)}</dd>
      
      ${
        card.power !== null
          ? `
      <dt>Fuerza/Resistencia:</dt>
      <dd>${card.power}/${card.toughness}</dd>
      `
          : ""
      }
      
      <dt>Rareza:</dt>
      <dd>${card.rarity}</dd>
      
      <dt>Edición:</dt>
      <dd>${card.set}</dd>
      
      <dt>Descripción:</dt>
      <dd><i>${card.text}</i></dd>
      
      <dt>Precio:</dt>
      <dd class="price">$${Math.round(card.price)} CLP</dd>
      
      <dt>Stock:</dt>
      <dd class="${card.stock > 0 ? "in-stock" : "out-of-stock"}">
        ${card.stock > 0 ? `${card.stock} disponibles` : "Agotado"}
      </dd>
    </dl>
    <div class="card-detail-actions">
      ${
        card.stock > 0
          ? `<button class="m-button" onclick="addToCart('${card.id}'); closeCardDetail();">Agregar al Carrito</button>`
          : "<button class=\"m-button\" disabled>Agotado</button>"
      }
    </div>
  `;

  modal.classList.remove("is-hidden");
  modal.classList.add("is-visible");
}

// Close card detail modal
function closeCardDetail() {
  const modal = document.getElementById("card-detail-modal");
  modal.classList.remove("is-visible");
  modal.classList.add("is-hidden");
}

// Event listeners initialization
function initializeEventListeners() {
  // Filter links
  document.querySelectorAll(".js-filter").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      filterCards(e.target.dataset.filter);
    });
  });

  // Color filter links
  document.querySelectorAll(".js-color-filter").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      filterByColor(e.target.dataset.color);
    });
  });

  // Search button
  document.getElementById("search-btn").addEventListener("click", searchCards);
  document.getElementById("search-input").addEventListener("keyup", searchCards);

  // Cart button
  document.getElementById("view-cart-btn").addEventListener("click", viewCart);
  document.getElementById("close-cart-btn").addEventListener("click", closeCart);
  document.getElementById("checkout-btn").addEventListener("click", checkout);
  document.getElementById("clear-cart-btn").addEventListener("click", clearCart);

  // Card detail modal
  document.getElementById("close-card-detail-btn").addEventListener("click", closeCardDetail);

  // Close modals when clicking outside
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

// Initialize store when page loads
window.addEventListener("load", () => {
  initializeEventListeners();
  loadAllCards();
});
