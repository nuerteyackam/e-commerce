console.log("Loading cart.js at:", new Date().toISOString());

// Global variables
let cartItems = [];
let cartTotal = 0;
let cartCount = 0;

// DOM elements
let cartContainer, cartSummary, clearCartBtn, checkoutBtn;
let cartSubtotal, cartTotalElement, cartItemCount, navCartCount;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Loading cart page...");

  initializeElements();
  setupEventListeners();
  await loadCart();

  console.log("Cart page initialized");
});

// Initialize DOM elements
function initializeElements() {
  cartContainer = document.getElementById("cartContainer");
  cartSummary = document.getElementById("cartSummary");
  clearCartBtn = document.getElementById("clearCartBtn");
  checkoutBtn = document.getElementById("checkoutBtn");
  cartSubtotal = document.getElementById("cartSubtotal");
  cartTotalElement = document.getElementById("cartTotal");
  cartItemCount = document.getElementById("cartItemCount");
  navCartCount = document.getElementById("nav-cart-count");
}

// Set up event listeners
function setupEventListeners() {
  clearCartBtn?.addEventListener("click", handleClearCart);
  checkoutBtn?.addEventListener("click", handleCheckout);
}

// Load cart items
async function loadCart() {
  try {
    showLoading();

    const response = await fetch("/get-cart", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      cartItems = data.data.items || [];
      cartTotal = data.data.totals.totalAmount || 0;
      cartCount = data.data.cartCount || 0;

      displayCart();
      updateCartSummary();
      updateNavCartCount();
    } else {
      showError(data.message || "Failed to load cart");
    }
  } catch (error) {
    console.error("Error loading cart:", error);
    showError("Failed to load cart. Please try again.");
  }
}

// Display cart items
function displayCart() {
  if (!cartContainer) return;

  if (cartItems.length === 0) {
    cartContainer.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Add some products to get started!</p>
                <a href="/all-products" class="btn-view">Browse Products</a>
            </div>
        `;
    cartSummary.style.display = "none";
    clearCartBtn.style.display = "none";
    return;
  }

  const cartHtml = `
        <div class="cart-items">
            ${cartItems.map(createCartItemHtml).join("")}
        </div>
    `;

  cartContainer.innerHTML = cartHtml;
  cartSummary.style.display = "block";
  clearCartBtn.style.display = "block";
}

// Create cart item HTML
function createCartItemHtml(item) {
  const productImages = item.product_image
    ? JSON.parse(item.product_image)
    : [];
  const imageUrl =
    productImages.length > 0 ? `/${productImages[0]}` : "/images/no-image.png";
  const itemTotal = (
    parseFloat(item.product_price) * parseInt(item.qty)
  ).toFixed(2);

  return `
        <div class="cart-item" data-product-id="${item.product_id}">
            <div class="item-image">
                <img src="${imageUrl}" alt="${item.product_title}" 
                     onerror="this.src='/images/no-image.png'">
            </div>
            <div class="item-details">
                <h4 class="item-title">${item.product_title}</h4>
                <p class="item-category">${item.category_name}</p>
                <p class="item-brand">${item.brand_name}</p>
                <p class="item-price">$${parseFloat(item.product_price).toFixed(
                  2
                )} each</p>
                <p class="item-stock">Stock: ${item.stock_qty}</p>
            </div>
            <div class="item-quantity">
                <label>Quantity:</label>
                <div class="quantity-controls">
                    <button class="qty-btn minus" onclick="updateQuantity(${
                      item.product_id
                    }, ${item.qty - 1})">
                        -
                    </button>
                    <input type="number" class="qty-input" value="${
                      item.qty
                    }" min="1" max="${item.stock_qty}" 
                           onchange="updateQuantity(${
                             item.product_id
                           }, this.value)">
                    <button class="qty-btn plus" onclick="updateQuantity(${
                      item.product_id
                    }, ${item.qty + 1})" 
                            ${item.qty >= item.stock_qty ? "disabled" : ""}>
                        +
                    </button>
                </div>
            </div>
            <div class="item-total">
                <span class="total-price">$${itemTotal}</span>
                <button class="remove-btn" onclick="removeFromCart(${
                  item.product_id
                })">
                    Remove
                </button>
            </div>
        </div>
    `;
}

// Update cart summary
function updateCartSummary() {
  if (cartSubtotal) cartSubtotal.textContent = `$${cartTotal.toFixed(2)}`;
  if (cartTotalElement)
    cartTotalElement.textContent = `$${cartTotal.toFixed(2)}`;
  if (cartItemCount) cartItemCount.textContent = cartItems.length;
}

// Update navigation cart count
function updateNavCartCount() {
  if (navCartCount) navCartCount.textContent = cartCount;
}

// Update item quantity
async function updateQuantity(productId, newQuantity) {
  try {
    const quantity = parseInt(newQuantity);

    if (quantity < 1) {
      await removeFromCart(productId);
      return;
    }

    const response = await fetch("/update-quantity", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        productId: productId,
        quantity: quantity,
      }),
    });

    const data = await response.json();

    if (data.success) {
      cartItems = data.data.cartItems || [];
      cartTotal = data.data.cartTotal || 0;
      cartCount = data.data.cartCount || 0;

      displayCart();
      updateCartSummary();
      updateNavCartCount();
      showMessage("success", "Cart updated successfully");
    } else {
      showMessage("error", data.message || "Failed to update cart");
    }
  } catch (error) {
    console.error("Error updating quantity:", error);
    showMessage("error", "Failed to update cart");
  }
}

// Remove item from cart
async function removeFromCart(productId) {
  try {
    const response = await fetch(`/remove-from-cart/${productId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      await loadCart(); // Reload cart
      showMessage("success", "Item removed from cart");
    } else {
      showMessage("error", data.message || "Failed to remove item");
    }
  } catch (error) {
    console.error("Error removing item:", error);
    showMessage("error", "Failed to remove item");
  }
}

// Clear entire cart
async function handleClearCart() {
  if (!confirm("Are you sure you want to clear your entire cart?")) {
    return;
  }

  try {
    const response = await fetch("/empty-cart", {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      await loadCart(); // Reload cart
      showMessage("success", "Cart cleared successfully");
    } else {
      showMessage("error", data.message || "Failed to clear cart");
    }
  } catch (error) {
    console.error("Error clearing cart:", error);
    showMessage("error", "Failed to clear cart");
  }
}

// Handle checkout
function handleCheckout() {
  if (cartItems.length === 0) {
    showMessage("error", "Your cart is empty");
    return;
  }

  // Redirect to checkout page
  window.location.href = "/checkout";
}

// Show loading state
function showLoading() {
  if (cartContainer) {
    cartContainer.innerHTML = `
            <div class="loading">
                <p>Loading cart...</p>
            </div>
        `;
  }
}

// Show error state
function showError(message) {
  if (cartContainer) {
    cartContainer.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="loadCart()" class="btn-view">Try Again</button>
            </div>
        `;
  }
}

// Show message
function showMessage(type, message) {
  const messageEl = document.createElement("div");
  messageEl.className = `cart-message ${type}`;
  messageEl.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

  document.body.appendChild(messageEl);

  setTimeout(() => {
    if (messageEl.parentElement) {
      messageEl.remove();
    }
  }, 4000);
}
