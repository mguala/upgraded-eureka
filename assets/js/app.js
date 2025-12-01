// Card database - will be populated from CSV only
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
const USD_TO_CLP = 980;

// Load CSV file using PapaParse
async function loadCSV(filename) {
  try {
    const response = await fetch("assets/CSV/" + filename);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();

    // Use PapaParse to properly handle quoted fields and commas
    const result = Papa.parse(csvText, {
      header: true, // Treat the first row as headers
      dynamicTyping: false, // Keep as strings to preserve data
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

// Fetch card data from Scryfall - exact match to get image and details
async function fetchCardFromScryfall(cardName) {
  try {
    // Use exact search
    const response = await fetch(
      `${SCRYFALL_API}/cards/search?q=!"${encodeURIComponent(cardName)}"&order=set&unique=prints`
    );

    if (!response.ok) {
      console.warn(`No se encontró la carta en Scryfall: ${cardName}`);
      return null;
    }

    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error(`Error obteniendo carta ${cardName}:`, error);
    return null;
  }
}

// Convert Scryfall card + CSV data to our format
function convertCardData(scryfallCard, csvRow) {
  // If no Scryfall data, use CSV data as fallback
  if (!scryfallCard) {
    return {
      id: csvRow["Scryfall ID"] || csvRow.Name,
      name: csvRow.Name,
      type: "other",
      color: "colorless",
      manaCost: "0",
      power: null,
      toughness: null,
      text: "",
      price: (parseFloat(csvRow["Purchase price"]) || 0) * USD_TO_CLP,
      stock: parseInt(csvRow.Quantity) || 0,
      rarity: csvRow.Rarity || "common",
      rarityLevel: csvRow.Rarity || "common",
      set: csvRow["Set name"],
      imageUrl: null,
      normalImageUrl: null,
      foilImageUrl: null,
      scryfallUri: null,
      isForil: csvRow.Foil && csvRow.Foil.toLowerCase() === "foil",
      foilStock: csvRow.Foil && csvRow.Foil.toLowerCase() === "foil" ? parseInt(csvRow.Quantity) || 0 : 0,
      normalStock: csvRow.Foil && csvRow.Foil.toLowerCase() === "normal" ? parseInt(csvRow.Quantity) || 0 : 0,
    };
  }

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

  // Get image URL
  let imageUrl = scryfallCard.image_uris ? scryfallCard.image_uris.large : null;

  const isFoil = csvRow.Foil && csvRow.Foil.toLowerCase() === "foil";
  const quantity = parseInt(csvRow.Quantity) || 0;

  return {
    id: scryfallCard.id,
    name: scryfallCard.name,
    type: cardType,
    color: color,
    manaCost: scryfallCard.mana_cost || "0",
    power: scryfallCard.power || null,
    toughness: scryfallCard.toughness || null,
    text: scryfallCard.oracle_text || "",
    price: (parseFloat(csvRow["Purchase price"]) || 0) * USD_TO_CLP,
    stock: quantity,
    rarity: rarityMap[scryfallCard.rarity] || scryfallCard.rarity,
    rarityLevel: scryfallCard.rarity || "common",
    set: scryfallCard.set_name,
    imageUrl: imageUrl,
    normalImageUrl: imageUrl,
    foilImageUrl: imageUrl,
    scryfallUri: scryfallCard.scryfall_uri,
    isForil: isFoil,
    foilStock: isFoil ? quantity : 0,
    normalStock: !isFoil ? quantity : 0,
  };
}

// Load all cards from CSV and enrich with Scryfall data
async function loadAllCards() {
  showLoadingMessage();

  // Load CSV data
  const csvData = await loadCSV("cards.csv");

  if (csvData.length === 0) {
    showErrorMessage("No se pudo cargar el archivo CSV");
    return;
  }

  console.log(`Cargando ${csvData.length} cartas desde CSV + Scryfall...`);

  // Process each CSV row
  const promises = csvData.map(async (row, index) => {
    // Add delay to respect Scryfall rate limits (10 requests per second)
    await new Promise((resolve) => setTimeout(resolve, index * 100));

    // Fetch card details from Scryfall
    const scryfallCard = await fetchCardFromScryfall(row.Name);
    return convertCardData(scryfallCard, row);
  });

  const cards = await Promise.all(promises);

  // Group by card name + foil status to consolidate duplicates from CSV
  const consolidated = {};
  cards.forEach((card) => {
    const key = `${card.name}|${card.isForil ? 'foil' : 'normal'}`;
    
    if (!consolidated[key]) {
      consolidated[key] = { ...card };
    } else {
      // Add to existing quantity
      consolidated[key].stock += card.stock;
      if (card.isForil) {
        consolidated[key].foilStock += card.stock;
      } else {
        consolidated[key].normalStock += card.stock;
      }
    }
  });

  cardDatabase = Object.values(consolidated).sort((a, b) => a.name.localeCompare(b.name));

  console.log(`${cardDatabase.length} cartas únicas cargadas exitosamente`);

  isLoading = false;
  displayCards(cardDatabase);
  updateCartDisplay();
}

// Get GIF based on search term or filter
function getContextualGif(searchTerm = "") {
  const gifMap = {
    creature: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif", // dragons
    instant: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif", // lightning
    sorcery: "https://media.giphy.com/media/3ohzdKdb7qxVxJWQPe/giphy.gif", // magic spell
    enchantment: "https://media.giphy.com/media/l0HlNaQ9ob2Udo369/giphy.gif", // mystical
    artifact: "https://media.giphy.com/media/3o7TKU8G4PgF2fJ5JS/giphy.gif", // gear/mechanical
    planeswalker: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", // sparkles
    white: "https://media.giphy.com/media/xT9IgEx8SbQ0teblYA/giphy.gif", // light
    blue: "https://media.giphy.com/media/3o7TKQFbKwrK0gI0M8/giphy.gif", // water
    black: "https://media.giphy.com/media/3o7TK9R7eULWV8VJOo/giphy.gif", // dark
    red: "https://media.giphy.com/media/3o7TKMdt5LoJYxL8gE/giphy.gif", // fire
    green: "https://media.giphy.com/media/l0HlQwEt4UqKT5yg0/giphy.gif", // nature
    foil: "https://media.giphy.com/media/3o7TL3pjR5Qq04yy5O/giphy.gif", // sparkles
  };

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    for (const [key, gif] of Object.entries(gifMap)) {
      if (term.includes(key)) return gif;
    }
  }
  
  // Default Magic/card GIFs
  const defaultGifs = [
    "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif",
    "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    "https://media.giphy.com/media/3o7TKQFbKwrK0gI0M8/giphy.gif",
  ];
  
  return defaultGifs[Math.floor(Math.random() * defaultGifs.length)];
}

// Show loading message with contextual GIF
function showLoadingMessage(searchTerm = "") {
  const cardsGrid = document.getElementById("cards-grid");
  const gif = getContextualGif(searchTerm);
  
  cardsGrid.innerHTML =
    `<div class="col-12 text-center py-5">
      <img src="${gif}" alt="Loading..." style="max-width: 300px; margin: 20px 0; border-radius: 8px;">
      <h2>⏳ Cargando cartas desde tu inventario...</h2>
      <p>Por favor espera mientras obtenemos los datos de las cartas.</p>
    </div>`;
}

// Show error message
function showErrorMessage(message) {
  const cardsGrid = document.getElementById("cards-grid");
  cardsGrid.innerHTML = `<div class="col-12 text-center py-5 alert alert-danger"><h2>❌ Error</h2><p>${message}</p></div>`;
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
      '<div class="col-12 text-center py-5"><h3>No se encontraron cartas</h3></div>';
    return;
  }

  // Display cards using Bootstrap
  cards.forEach(card => {
    const cardElement = document.createElement("div");
    cardElement.className = "col-12 col-sm-6 col-lg-4 col-xl-3";
    cardElement.innerHTML = createCardHTML(card);
    cardsGrid.appendChild(cardElement);
  });
}

// Create HTML for a single card
function createCardHTML(card) {
    const colorEmoji = getColorEmoji(card.color);
    const typeIcon = getTypeIcon(card.type);
    const totalStock = card.foilStock + card.normalStock;
    const stockStatus = totalStock > 0 ? `En Stock (${totalStock})` : "Agotado";
    const stockStatusClass = totalStock > 0 ? "card-stock-in" : "card-stock-out";

   return `
    <div class="card-table card h-100">
        <div class="card-header">
            <h5 class="card-name">${card.name}</h5>
            <small class="card-set">${card.set}</small>
            <small class="card-meta">${colorEmoji} ${card.color.charAt(0).toUpperCase() + card.color.slice(1)} | ${typeIcon}</small>
        </div>
        ${card.imageUrl ? `<div class="card-image text-center"><img src="${card.imageUrl}" alt="${card.name}" loading="lazy" style="max-height: 150px; width: auto;"></div>` : ""}
        <div class="card-body card-details">
            <small><b>Maná:</b> ${card.manaCost}</small><br>
            ${card.power !== null ? `<small><b>P/R:</b> ${card.power}/${card.toughness}</small><br>` : ""}
            <small><b>Rareza:</b> ${card.rarity}</small><br>
            <small><b>Edición:</b> ${card.set}</small><br>
            <small class="text-muted"><i>${card.text.substring(0, 80)}${card.text.length > 80 ? '...' : ''}</i></small>
            <hr>
            <p class="card-price mb-2">$${Math.round(card.price)} CLP</p>
            <small>
                ${card.normalStock > 0 ? `<span class="card-stock-normal">Normal: ${card.normalStock}</span> ` : ""}
                ${card.foilStock > 0 ? `<span class="card-stock-foil">✨ Foil: ${card.foilStock}</span>` : ""}
            </small>
            <br>
            <span class="badge ${stockStatusClass} mt-2 mb-2">${stockStatus}</span>
            <div class="d-grid gap-2 mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="viewCardDetail('${card.id}')">Ver Detalles</button>
                ${totalStock > 0 ? `<button class="btn btn-sm btn-success" onclick="showFoilSelection('${card.id}')">Agregar</button>` : "<button class=\"btn btn-sm btn-secondary\" disabled>Agotado</button>"}
            </div>
        </div>
    </div>
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
  applyFilters(type);
}

// Filter cards by color
function filterByColor(color) {
   currentColorFilter = color;
   applyFilters(color);
}

// Filter cards by foil status
function filterByFoil(foilStatus) {
   currentFoilFilter = foilStatus;
   applyFilters(foilStatus);
}

// Apply all active filters
function applyFilters(filterTerm = "") {
   showLoadingMessage(filterTerm);
   
   // Simulate brief loading for visual feedback
   setTimeout(() => {
     let filtered = cardDatabase;

     if (currentTypeFilter !== "all") {
       filtered = filtered.filter((card) => card.type === currentTypeFilter);
     }

     if (currentColorFilter !== "all") {
       filtered = filtered.filter((card) => card.color === currentColorFilter);
     }

     if (currentFoilFilter === "foil") {
       filtered = filtered.filter((card) => card.foilStock > 0);
     } else if (currentFoilFilter === "normal") {
       filtered = filtered.filter((card) => card.normalStock > 0);
     }

     displayCards(filtered);
   }, 500);
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

  showLoadingMessage(searchTerm);
  
  // Simulate brief loading for visual feedback
  setTimeout(() => {
    const results = cardDatabase.filter(
      (card) =>
        card.name.toLowerCase().includes(searchTerm) ||
        card.text.toLowerCase().includes(searchTerm) ||
        card.type.toLowerCase().includes(searchTerm) ||
        card.color.toLowerCase().includes(searchTerm)
    );

    displayCards(results);
  }, 500);
}

// Show foil selection dialog
function showFoilSelection(cardId) {
   const card = cardDatabase.find((c) => c.id === cardId);
   
   if (!card) return;
   
   const totalStock = card.foilStock + card.normalStock;
   
   if (totalStock === 0) {
     alert("¡Lo sentimos, esta carta está agotada!");
     return;
   }
   
   let options = "";
   if (card.normalStock > 0) {
     options += `<option value="normal">Normal (${card.normalStock} disponibles)</option>`;
   }
   if (card.foilStock > 0) {
     options += `<option value="foil">✨ Foil (${card.foilStock} disponibles)</option>`;
   }
   
   const selection = prompt(
     `¿Qué versión de ${card.name} deseas?\n\n${card.normalStock > 0 ? `Normal: ${card.normalStock}\n` : ""}${card.foilStock > 0 ? `✨ Foil: ${card.foilStock}` : ""}`,
     card.foilStock > 0 ? "foil" : "normal"
   );
   
   if (selection === "foil" || selection === "normal") {
     addToCart(cardId, selection === "foil");
   }
}

// Add card to cart
function addToCart(cardId, isForil = false) {
   const card = cardDatabase.find((c) => c.id === cardId);
   const availableStock = isForil ? card.foilStock : card.normalStock;

   if (!card || availableStock === 0) {
     alert("¡Lo sentimos, esta versión de la carta está agotada!");
     return;
   }

   // Check if card is already in cart (with same foil status)
   const existingItem = shoppingCart.find((item) => item.id === cardId && item.isForil === isForil);

   if (existingItem) {
     if (existingItem.quantity < availableStock) {
       existingItem.quantity++;
       alert(`¡Se agregó otro ${card.name} ${isForil ? "(✨ Foil)" : "(Normal)"} al carrito!`);
     } else {
       alert(`¡Lo sentimos, solo hay ${availableStock} en stock!`);
       return;
     }
   } else {
     shoppingCart.push({
       id: card.id,
       name: card.name,
       price: card.price,
       quantity: 1,
       isForil: isForil,
     });
     alert(`¡${card.name} ${isForil ? "(✨ Foil)" : "(Normal)"} agregado al carrito!`);
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

  // Update navbar cart display
  document.getElementById("nav-cart-count").textContent = cartCount;
  document.getElementById("nav-cart-total").textContent = Math.round(cartTotal) + " CLP";
  document.getElementById("nav-cart-items").textContent = cartCount;
}

// View cart
function viewCart() {
   const modal = document.getElementById("cart-modal");
   const cartItemsDiv = document.getElementById("cart-items");

   if (shoppingCart.length === 0) {
     cartItemsDiv.innerHTML = '<p class="cart-empty">Tu carrito está vacío</p>';
   } else {
     let html = '<table class="cart-items-table"><thead>';
     html +=
       '<tr><th>Carta</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th>Acción</th></tr></thead><tbody>';

     shoppingCart.forEach((item, index) => {
       const subtotal = item.price * item.quantity;
       html += `
                 <tr>
                     <td>${item.name} ${item.isForil ? '<span class="cart-badge-foil">✨ Foil</span>' : ""}</td>
                     <td>$${Math.round(item.price)} CLP</td>
                     <td>
                         <button data-decrease="${index}">-</button>
                         ${item.quantity}
                         <button data-increase="${index}">+</button>
                     </td>
                     <td>$${Math.round(subtotal)} CLP</td>
                     <td><button data-remove="${index}">Eliminar</button></td>
                 </tr>
             `;
     });

     html += "</tbody></table>";
     cartItemsDiv.innerHTML = html;
     
     // Attach event listeners to dynamically created buttons
     cartItemsDiv.querySelectorAll('[data-decrease]').forEach(btn => {
       btn.addEventListener('click', () => decreaseQuantity(parseInt(btn.dataset.decrease)));
     });
     cartItemsDiv.querySelectorAll('[data-increase]').forEach(btn => {
       btn.addEventListener('click', () => increaseQuantity(parseInt(btn.dataset.increase)));
     });
     cartItemsDiv.querySelectorAll('[data-remove]').forEach(btn => {
       btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.remove)));
     });
   }

   const cartTotal = shoppingCart.reduce(
     (sum, item) => sum + item.price * item.quantity,
     0
   );
   document.getElementById("modal-cart-total").textContent =
     Math.round(cartTotal) + " CLP";

   modal.showModal();
}

// Close cart
function closeCart() {
   document.getElementById("cart-modal").close();
}

// Increase quantity
function increaseQuantity(index) {
   const cartItem = shoppingCart[index];
   const card = cardDatabase.find((c) => c.id === cartItem.id);
   const availableStock = cartItem.isForil ? card.foilStock : card.normalStock;

   if (cartItem && cartItem.quantity < availableStock) {
     cartItem.quantity++;
     updateCartDisplay();
     viewCart(); // Refresh cart view
   } else {
     alert(`¡Lo sentimos, solo hay ${availableStock} en stock!`);
   }
}

// Decrease quantity
function decreaseQuantity(index) {
   const cartItem = shoppingCart[index];

   if (cartItem) {
     if (cartItem.quantity > 1) {
       cartItem.quantity--;
     } else {
       removeFromCart(index);
       return;
     }
     updateCartDisplay();
     viewCart(); // Refresh cart view
   }
}

// Remove from cart
function removeFromCart(index) {
   shoppingCart.splice(index, 1);
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

// Track selected foil version in detail modal
let selectedFoilInDetail = false;

// View card details
function viewCardDetail(cardId) {
   const card = cardDatabase.find((c) => c.id === cardId);

   if (!card) return;

   const modal = document.getElementById("card-detail-modal");
   const content = document.getElementById("card-detail-content");

   const colorEmoji = getColorEmoji(card.color);
   const typeIcon = getTypeIcon(card.type);

   // Default to foil if available, otherwise normal
   selectedFoilInDetail = card.foilStock > 0 ? true : false;

   const displayImageUrl = selectedFoilInDetail ? card.foilImageUrl : card.normalImageUrl;

   content.innerHTML = `
        <table class="detail-table">
            <tr>
                <td colspan="2" class="detail-header">
                    <h2>${card.name}</h2>
                </td>
            </tr>
            ${
              displayImageUrl
                ? `<tr>
                <td colspan="2" class="detail-image">
                    <img id="detail-card-image" src="${displayImageUrl}" alt="${card.name}" width="300">
                    ${selectedFoilInDetail && card.foilStock > 0 ? '<div class="foil-indicator">✨ Versión Foil</div>' : '<div class="normal-indicator">Normal</div>'}
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
                <td colspan="2" class="detail-description">
                    <p><i>${card.text}</i></p>
                </td>
            </tr>
            <tr>
                <td><b>Precio:</b></td>
                <td class="detail-price">$${Math.round(card.price)} CLP</td>
            </tr>
            <tr>
                <td><b>Stock:</b></td>
                <td class="detail-stock">
                  ${card.normalStock > 0 ? `<span class="card-stock-normal">Normal: ${card.normalStock}</span> ` : ""}
                  ${card.foilStock > 0 ? `<span class="card-stock-foil">✨ Foil: ${card.foilStock}</span>` : ""}
                </td>
            </tr>
            <tr>
                <td colspan="2" class="detail-version-selector">
                  <div class="version-buttons">
                    ${card.normalStock > 0 ? `<button class="btn-version ${!selectedFoilInDetail ? 'active' : ''}" onclick="selectVersionInDetail(false, '${card.id}')">Normal</button>` : ""}
                    ${card.foilStock > 0 ? `<button class="btn-version ${selectedFoilInDetail ? 'active' : ''}" onclick="selectVersionInDetail(true, '${card.id}')">✨ Foil</button>` : ""}
                  </div>
                </td>
            </tr>
            <tr>
                <td colspan="2" class="detail-actions">
                    ${
                      (card.foilStock + card.normalStock) > 0
                        ? `<button class="btn-add-cart" onclick="addToCart('${card.id}', ${selectedFoilInDetail}); closeCardDetail();">Agregar al Carrito</button>`
                        : "<button disabled>Agotado</button>"
                    }
                </td>
            </tr>
        </table>
    `;

   modal.showModal();
}

// Select foil or normal version in detail modal
function selectVersionInDetail(isFoil, cardId) {
  selectedFoilInDetail = isFoil;
  const card = cardDatabase.find((c) => c.id === cardId);
  
  if (card && card.imageUrl) {
    // Update the image
    const detailImage = document.getElementById("detail-card-image");
    const foilIndicator = document.querySelector(".foil-indicator, .normal-indicator");
    
    if (detailImage) {
      const newImageUrl = isFoil ? card.foilImageUrl : card.normalImageUrl;
      detailImage.src = newImageUrl;
    }
    
    // Update indicator
    if (foilIndicator) {
      if (isFoil && card.foilStock > 0) {
        foilIndicator.className = "foil-indicator";
        foilIndicator.textContent = "✨ Versión Foil";
      } else {
        foilIndicator.className = "normal-indicator";
        foilIndicator.textContent = "Normal";
      }
    }
    
    // Update active button
    const buttons = document.querySelectorAll(".btn-version");
    buttons.forEach(btn => {
      btn.classList.remove("active");
    });
    if (event.target) event.target.classList.add("active");
  }
}

// Close card detail modal
function closeCardDetail() {
  document.getElementById("card-detail-modal").close();
}

// Open filters modal
function openFiltersModal() {
   const filtersModal = document.getElementById("filters-modal");
   filtersModal.showModal();
}

// Close filters modal
function closeFiltersModal() {
   const filtersModal = document.getElementById("filters-modal");
   filtersModal.close();
}

// Scroll to contact section
function scrollToContact() {
  const contactSection = document.getElementById("contact-section");
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: "smooth" });
  }
}

// Event listeners setup
function setupEventListeners() {
  // Navigation
  document.getElementById('home-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    location.reload();
  });

  // Cart button
  document.getElementById('nav-cart-btn')?.addEventListener('click', viewCart);

  // Filters modal
  document.getElementById('open-filters-btn')?.addEventListener('click', openFiltersModal);
  document.getElementById('close-filters-btn')?.addEventListener('click', closeFiltersModal);
  document.getElementById('search-btn')?.addEventListener('click', searchCards);
  
  // Search input enter key
  document.getElementById('search-input')?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') searchCards();
  });

  // Filter links - categories
  document.querySelectorAll('[data-filter]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      filterCards(e.target.dataset.filter);
      closeFiltersModal();
    });
  });

  // Filter links - colors
  document.querySelectorAll('[data-color]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      filterByColor(e.target.dataset.color);
      closeFiltersModal();
    });
  });

  // Filter links - foil
  document.querySelectorAll('[data-foil]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      filterByFoil(e.target.dataset.foil);
      closeFiltersModal();
    });
  });

  // Cart modal
  document.getElementById('close-cart-btn')?.addEventListener('click', closeCart);
  document.getElementById('checkout-btn')?.addEventListener('click', checkout);
  document.getElementById('clear-cart-btn')?.addEventListener('click', clearCart);

  // Card detail modal
  document.getElementById('close-detail-btn')?.addEventListener('click', closeCardDetail);

  // Contact form
  document.getElementById('contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleContactForm();
  });

  // Dialog backdrop clicks to close
  document.getElementById('cart-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cart-modal') closeCart();
  });
  
  document.getElementById('card-detail-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'card-detail-modal') closeCardDetail();
  });
  
  document.getElementById('filters-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'filters-modal') closeFiltersModal();
  });
}

// Handle contact form submission
function handleContactForm() {
  const form = document.getElementById('contact-form');
  const formData = new FormData(form);
  
  // Simple validation
  if (!formData.get('name') || !formData.get('email') || !formData.get('message')) {
    alert('Por favor completa todos los campos');
    return;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.get('email'))) {
    alert('Por favor ingresa un email válido');
    return;
  }
  
  alert('¡Gracias por tu mensaje! Nos pondremos en contacto pronto.');
  form.reset();
}

// Initialize store when page loads
window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initStore();
});
