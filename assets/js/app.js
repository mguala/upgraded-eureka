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
    const response = await fetch("assets/CSV/" + filename);
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

// Fetch card data from Scryfall - exact match with all versions
async function fetchCardFromScryfall(cardName) {
  try {
    // Use exact search
    const response = await fetch(
      `${SCRYFALL_API}/cards/search?q=!${encodeURIComponent(cardName)}&order=set&unique=prints`
    );

    if (!response.ok) {
      console.error(`No se encontró la carta: ${cardName}`);
      return null;
    }

    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data : null;
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

  // Get rarity for image selection
  const rarity = scryfallCard.rarity || "common";

  // Get images for different versions if available
  let normalImageUrl = scryfallCard.image_uris ? scryfallCard.image_uris.normal : null;
  let foilImageUrl = scryfallCard.image_uris ? scryfallCard.image_uris.normal : null;

  // Try to get large image for better quality
  if (scryfallCard.image_uris && scryfallCard.image_uris.large) {
    normalImageUrl = scryfallCard.image_uris.large;
    foilImageUrl = scryfallCard.image_uris.large;
  }

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
    rarityLevel: rarity,
    set: scryfallCard.set_name,
    imageUrl: normalImageUrl,
    normalImageUrl: normalImageUrl,
    foilImageUrl: foilImageUrl,
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

     const scryfallCards = await fetchCardFromScryfall(row.Name);
     if (scryfallCards && Array.isArray(scryfallCards)) {
       return scryfallCards.map(card => convertScryfallCard(card, row));
     }
     return null;
   });

   const cardsArrays = await Promise.all(promises);
   const rawCards = cardsArrays
     .filter((cards) => cards !== null)
     .flat();

   // Consolidate foil/normal versions of the same card and group by set
   cardDatabase = consolidateCardsBySet(rawCards);

   console.log(`${cardDatabase.length} cartas únicas cargadas exitosamente`);

   isLoading = false;
   displayCards(cardDatabase);
   updateCartDisplay();
}

// Consolidate foil and normal versions, group by set, and order by set number
function consolidateCardsBySet(cards) {
    const consolidated = {};
    
    cards.forEach((card) => {
      const key = `${card.name}|${card.set}`;
      
      if (!consolidated[key]) {
        consolidated[key] = {
          ...card,
          foilStock: 0,
          normalStock: 0,
          versions: []
        };
      }
      
      if (card.isForil) {
        consolidated[key].foilStock += card.stock;
      } else {
        consolidated[key].normalStock += card.stock;
      }
      
      consolidated[key].versions.push(card);
    });
    
    // Sort by set code and return
    return Object.values(consolidated).sort((a, b) => {
      // Sort alphabetically by name first, then by set
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      return a.set.localeCompare(b.set);
    });
}

// Show loading message with random GIF
function showLoadingMessage() {
  const cardsGrid = document.getElementById("cards-grid");
  
  const loadingGifs = [
    "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif",
    "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
    "https://media.giphy.com/media/3ohzdKdb7qxVxJWQPe/giphy.gif",
    "https://media.giphy.com/media/l0HlNaQ9ob2Udo369/giphy.gif",
    "https://media.giphy.com/media/3o7TKU8G4PgF2fJ5JS/giphy.gif",
    "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  ];
  
  const randomGif = loadingGifs[Math.floor(Math.random() * loadingGifs.length)];
  
  cardsGrid.innerHTML =
    `<tr><td colspan="3" align="center">
      <img src="${randomGif}" alt="Loading..." style="max-width: 300px; margin: 20px 0; border-radius: 8px;">
      <h2>⏳ Cargando cartas desde Scryfall...</h2>
      <p>Por favor espera mientras obtenemos los datos de las cartas.</p>
    </td></tr>`;
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
    const totalStock = card.foilStock + card.normalStock;
    const stockStatus = totalStock > 0 ? `En Stock (${totalStock})` : "Agotado";
    const stockStatusClass = totalStock > 0 ? "card-stock-in" : "card-stock-out";

   return `
         <table class="card-table">
             <tr class="card-header">
                 <td>
                     <span class="card-name">${card.name}</span>
                     <br>
                     <span class="card-set">${card.set}</span>
                     <br>
                     <span class="card-meta">${colorEmoji} ${
     card.color.charAt(0).toUpperCase() + card.color.slice(1)
   } | ${typeIcon} ${
     card.type.charAt(0).toUpperCase() + card.type.slice(1)
   }</span>
                 </td>
             </tr>
            ${
              card.imageUrl
                ? `<tr>
                <td class="card-image">
                    <img src="${card.imageUrl}" alt="${card.name}" width="200">
                </td>
            </tr>`
                : ""
            }
            <tr>
                <td class="card-details">
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
                    <p class="card-price"><b>Precio: $${Math.round(card.price)} CLP</b></p>
                     <p>
                       ${card.normalStock > 0 ? `<span class="card-stock-normal">Normal: ${card.normalStock}</span>` : ""}
                       ${card.foilStock > 0 ? `<span class="card-stock-foil">✨ Foil: ${card.foilStock}</span>` : ""}
                     </p>
                     <p><span class="card-stock-status ${stockStatusClass}">${stockStatus}</span></p>
                     <button class="btn-details" onclick="viewCardDetail('${
                       card.id
                     }')">Ver Detalles</button>
                     ${
                       totalStock > 0
                         ? `<button class="btn-add-cart" onclick="showFoilSelection('${card.id}')">Agregar al Carrito</button>`
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
                        <button onclick="decreaseQuantity(${index})">-</button>
                        ${item.quantity}
                        <button onclick="increaseQuantity(${index})">+</button>
                    </td>
                    <td>$${Math.round(subtotal)} CLP</td>
                    <td><button onclick="removeFromCart(${index})">Eliminar</button></td>
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

  modal.style.display = "block";
}

// Close cart
function closeCart() {
  document.getElementById("cart-modal").style.display = "none";
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

   modal.style.display = "block";
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
     event.target.classList.add("active");
   }
}

// Close card detail modal
function closeCardDetail() {
  document.getElementById("card-detail-modal").style.display = "none";
}

// Open filters modal
function openFiltersModal() {
  const filtersModal = document.getElementById("filters-modal");
  filtersModal.style.display = "block";
}

// Close filters modal
function closeFiltersModal() {
  const filtersModal = document.getElementById("filters-modal");
  filtersModal.style.display = "none";
}

// Close modals when clicking outside
window.onclick = function (event) {
  const cartModal = document.getElementById("cart-modal");
  const detailModal = document.getElementById("card-detail-modal");
  const filtersModal = document.getElementById("filters-modal");

  if (event.target === cartModal) {
    closeCart();
  }
  if (event.target === detailModal) {
    closeCardDetail();
  }
  if (event.target === filtersModal) {
    closeFiltersModal();
  }
};

// Scroll to contact section
function scrollToContact() {
  const contactSection = document.getElementById("contact-section");
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: "smooth" });
  }
}

// Initialize store when page loads
window.onload = initStore;
