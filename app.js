// Card database - will be populated from CSV + Scryfall
let cardDatabase = [];

// Shopping cart
let shoppingCart = [];

// Current filters
let currentTypeFilter = "all";
let currentColorFilter = "all";
let currentFoilFilter = "all";

// Loading state
let isLoading = true;

// Scryfall API base URL
const SCRYFALL_API = "https://api.scryfall.com";

// USD to CLP conversion rate
const USD_TO_CLP = 500;

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
    price: (parseFloat(csvData["Purchase price"]) || 0) * USD_TO_CLP,
    stock: parseInt(csvData["Quantity"]) || 0,
    rarity: rarityMap[scryfallCard.rarity] || scryfallCard.rarity,
    set: scryfallCard.set_name,
    imageUrl: scryfallCard.image_uris ? scryfallCard.image_uris.normal : null,
    scryfallUri: scryfallCard.scryfall_uri,
    isForil: csvData["Foil"] && csvData["Foil"].toLowerCase() === "foil",
  };
}

// Load all cards from CSV and Scryfall
async function loadAllCards() {
  showLoadingMessage();

  // Load CSV data
  const csvData = await loadCSV("cards.csv");

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
    '<tr><td colspan="3" align="center"><h2>⏳ Cargando cartas desde Scryfall...</h2><p>Por favor espera mientras obtenemos los datos de las cartas.</p></td></tr>';
}

// Show error message
function showErrorMessage(message) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = `<tr><td colspan="3" align="center"><h2>❌ Error</h2><p>${message}</p></td></tr>`;
}

// Initialize the store
function initStore() {
  loadAllCards();
}

// Display cards in a grid
function displayCards(cards) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = "";

  if (cards.length === 0) {
    cardsGrid.innerHTML =
      '<tr><td colspan="3" align="center"><h3>No se encontraron cartas</h3></td></tr>';
    return;
  }

  // Display cards in rows of 3
  for (let i = 0; i < cards.length; i += 3) {
    const row = document.createElement("tr");

    for (let j = 0; j < 3 && i + j < cards.length; j++) {
      const card = cards[i + j];
      const cell = document.createElement("td");
      cell.setAttribute("width", "33%");
      cell.setAttribute("valign", "top");
      cell.innerHTML = createCardHTML(card);
      row.appendChild(cell);
    }

    cardsGrid.appendChild(row);
  }
}

// Create HTML for a single card
function createCardHTML(card) {
  const colorEmoji = getColorEmoji(card.color);
  const typeIcon = getTypeIcon(card.type);
  const stockStatus = card.stock > 0 ? `En Stock (${card.stock})` : "Agotado";
  const stockColor = card.stock > 0 ? "green" : "red";

  return `
        <table width="100%" border="1" cellpadding="10" bgcolor="white">
            <tr bgcolor="#f0f0f0">
                <td>
                    <b>${card.name}</b> ${card.isForil ? '<span style="color: gold; font-weight: bold;">✨ FOIL</span>' : ''}
                    <br>
                    <small>${colorEmoji} ${
    card.color.charAt(0).toUpperCase() + card.color.slice(1)
  } | ${typeIcon} ${
    card.type.charAt(0).toUpperCase() + card.type.slice(1)
  }</small>
                </td>
            </tr>
            ${
              card.imageUrl
                ? `<tr>
                <td align="center">
                    <img src="${card.imageUrl}" alt="${card.name}" width="200" style="border-radius: 10px;">
                </td>
            </tr>`
                : ""
            }
            <tr>
                <td>
                    <p><b>Coste de Maná:</b> ${card.manaCost}</p>
                    ${
                      card.power !== null
                        ? `<p><b>Fuerza/Resistencia:</b> ${card.power}/${card.toughness}</p>`
                        : ""
                    }
                    <p><b>Rareza:</b> ${card.rarity}</p>
                    <p><b>Edición:</b> ${card.set}</p>
                    <p><i>${card.text}</i></p>
                    <hr>
                    <p><b>Precio: $${Math.round(card.price)} CLP</b></p>
                    <p><font color="${stockColor}">${stockStatus}</font></p>
                    <button onclick="viewCardDetail('${
                      card.id
                    }')">Ver Detalles</button>
                    ${
                      card.stock > 0
                        ? `<button onclick="addToCart('${card.id}')">Agregar al Carrito</button>`
                        : "<button disabled>Agotado</button>"
                    }
                </td>
            </tr>
        </table>
    `;
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
  applyFilters();
}

// Filter cards by color
function filterByColor(color) {
   currentColorFilter = color;
   applyFilters();
}

// Filter cards by foil status
function filterByFoil(foilStatus) {
   currentFoilFilter = foilStatus;
   applyFilters();
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

   if (currentFoilFilter === "foil") {
     filtered = filtered.filter((card) => card.isForil);
   } else if (currentFoilFilter === "normal") {
     filtered = filtered.filter((card) => !card.isForil);
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
    let html = '<table width="100%" border="1" cellpadding="5">';
    html +=
      '<tr bgcolor="#e0e0e0"><th>Carta</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th>Acción</th></tr>';

    shoppingCart.forEach((item) => {
      const subtotal = item.price * item.quantity;
      html += `
                <tr>
                    <td>${item.name}</td>
                    <td>$${Math.round(item.price)} CLP</td>
                    <td>
                        <button onclick="decreaseQuantity('${
                          item.id
                        }')">-</button>
                        ${item.quantity}
                        <button onclick="increaseQuantity('${
                          item.id
                        }')">+</button>
                    </td>
                    <td>$${Math.round(subtotal)} CLP</td>
                    <td><button onclick="removeFromCart('${
                      item.id
                    }')">Eliminar</button></td>
                </tr>
            `;
    });

    html += "</table>";
    cartItemsDiv.innerHTML = html;
  }

  const cartTotal = shoppingCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  document.getElementById("modal-cart-total").textContent =
    Math.round(cartTotal) + " CLP";

  modal.style.display = "block";
}

// Close cart
function closeCart() {
  document.getElementById("cart-modal").style.display = "none";
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
        <table width="100%" cellpadding="10">
            <tr bgcolor="#f0f0f0">
                <td colspan="2" align="center">
                    <h2>${card.name}</h2>
                </td>
            </tr>
            ${
              card.imageUrl
                ? `<tr>
                <td colspan="2" align="center">
                    <img src="${card.imageUrl}" alt="${card.name}" width="300" style="border-radius: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                </td>
            </tr>`
                : ""
            }
            <tr>
                <td><b>Coste de Maná:</b></td>
                <td>${card.manaCost}</td>
            </tr>
            <tr>
                <td><b>Tipo:</b></td>
                <td>${typeIcon} ${
    card.type.charAt(0).toUpperCase() + card.type.slice(1)
  }</td>
            </tr>
            <tr>
                <td><b>Color:</b></td>
                <td>${colorEmoji} ${
    card.color.charAt(0).toUpperCase() + card.color.slice(1)
  }</td>
            </tr>
            ${
              card.power !== null
                ? `
            <tr>
                <td><b>Fuerza/Resistencia:</b></td>
                <td>${card.power}/${card.toughness}</td>
            </tr>
            `
                : ""
            }
            <tr>
                <td><b>Rareza:</b></td>
                <td>${card.rarity}</td>
            </tr>
            <tr>
                <td><b>Edición:</b></td>
                <td>${card.set}</td>
            </tr>
            <tr>
                <td colspan="2">
                    <hr>
                    <p><i>${card.text}</i></p>
                    <hr>
                </td>
            </tr>
            <tr>
                <td><b>Precio:</b></td>
                <td><font size="5">$${Math.round(card.price)} CLP</font></td>
            </tr>
            <tr>
                <td><b>Stock:</b></td>
                <td><font color="${card.stock > 0 ? "green" : "red"}">${
    card.stock > 0 ? `${card.stock} disponibles` : "Agotado"
  }</font></td>
            </tr>
            <tr>
                <td colspan="2" align="center">
                    ${
                      card.stock > 0
                        ? `<button onclick="addToCart('${card.id}'); closeCardDetail();">Agregar al Carrito</button>`
                        : "<button disabled>Agotado</button>"
                    }
                </td>
            </tr>
        </table>
    `;

  modal.style.display = "block";
}

// Close card detail modal
function closeCardDetail() {
  document.getElementById("card-detail-modal").style.display = "none";
}

// Close modals when clicking outside
window.onclick = function (event) {
  const cartModal = document.getElementById("cart-modal");
  const detailModal = document.getElementById("card-detail-modal");

  if (event.target === cartModal) {
    closeCart();
  }
  if (event.target === detailModal) {
    closeCardDetail();
  }
};

// Initialize store when page loads
window.onload = initStore;
