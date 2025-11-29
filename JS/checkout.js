console.log("Loading checkout.js at:", new Date().toISOString());

// Global variables
let orderData = null;
let isProcessingPayment = false;
let hasProcessedCheckout = false;

// DOM elements
let checkoutContainer, orderSummary, paymentBtn, backToCartBtn;
let summaryItems, summaryTotal, summaryItemCount;
let paymentModal, confirmPaymentBtn, cancelPaymentBtn;
let orderConfirmation, orderReference, orderTotal;

// Initialize when DOM is loaded

document.addEventListener("DOMContentLoaded", async () => {
  console.log("=== CHECKOUT.JS DOM LOADED ===");
  console.log("Current URL:", window.location.href);
  console.log("Current pathname:", window.location.pathname);
  console.log("===============================");

  // Check if this is a paystack callback
  if (window.location.pathname === "/paystack-callback") {
    console.log(
      "This is a Paystack callback - skipping normal checkout process"
    );

    return;
  }

  console.log("Loading normal checkout page...");

  initializeElements();
  setupEventListeners();
  await processCheckout();

  // Update cart count after checkout is processed
  await updateCheckoutCartCount();

  console.log("Checkout page initialized");
});

async function updateCheckoutCartCount() {
  try {
    console.log("🔍 Fetching cart data...");
    const response = await fetch("/get-cart", {
      credentials: "include",
    });
    const data = await response.json();

    console.log("Full cart API response:", data);
    console.log("Cart success:", data.success);
    console.log("Cart data:", data.data);
    console.log("Cart count:", data.data?.cartCount);
    console.log("Items array:", data.data?.items);

    if (data.success) {
      const cartCount = data.data?.cartCount || 0;
      const cartCountEl = document.getElementById("nav-cart-count");
      if (cartCountEl) {
        cartCountEl.textContent = cartCount;
        console.log("Updated cart count to:", cartCount);
      }
    } else {
      console.log("Cart fetch failed:", data);
      const cartCountEl = document.getElementById("nav-cart-count");
      if (cartCountEl) {
        cartCountEl.textContent = "0";
      }
    }
  } catch (error) {
    console.error("Error updating cart count on checkout:", error);
    const cartCountEl = document.getElementById("nav-cart-count");
    if (cartCountEl) {
      cartCountEl.textContent = "0";
    }
  }
}

// Initialize DOM elements
function initializeElements() {
  checkoutContainer = document.getElementById("checkoutContainer");
  orderSummary = document.getElementById("orderSummary");
  paymentBtn = document.getElementById("paymentBtn");
  backToCartBtn = document.getElementById("backToCartBtn");

  summaryItems = document.getElementById("summaryItems");
  summaryTotal = document.getElementById("summaryTotal");
  summaryItemCount = document.getElementById("summaryItemCount");

  paymentModal = document.getElementById("paymentModal");
  confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
  cancelPaymentBtn = document.getElementById("cancelPaymentBtn");

  orderConfirmation = document.getElementById("orderConfirmation");
  orderReference = document.getElementById("orderReference");
  orderTotal = document.getElementById("orderTotal");
}

// Set up event listeners
function setupEventListeners() {
  paymentBtn?.addEventListener("click", showPaymentModal);
  backToCartBtn?.addEventListener(
    "click",
    () => (window.location.href = "/cart")
  );

  confirmPaymentBtn?.addEventListener("click", processPayment);
  cancelPaymentBtn?.addEventListener("click", hidePaymentModal);

  // Close modal when clicking outside
  paymentModal?.addEventListener("click", (e) => {
    if (e.target === paymentModal) {
      hidePaymentModal();
    }
  });
}

// Process checkout - create order from cart
async function processCheckout() {
  // Prevent multiple calls
  if (hasProcessedCheckout) {
    console.log("Checkout already processed, skipping...");
    return;
  }

  try {
    console.log("Running processCheckout for the first time...");
    hasProcessedCheckout = true; // Set flag immediately

    showLoading("Processing your order...");

    const response = await fetch("/process-checkout", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      orderData = data.data;
      showCheckoutForm();

      if (data.data.priceUpdated) {
        showMessage("info", "Some prices have been updated to current values");
      }
    } else {
      // If checkout fails, reset the flag so user can try again
      hasProcessedCheckout = false;
      showError(data.message || "Failed to process checkout");
    }
  } catch (error) {
    // If checkout fails, reset the flag so user can try again
    hasProcessedCheckout = false;
    console.error("Error processing checkout:", error);
    showError("Failed to process checkout. Please try again.");
  }
}

// Show checkout form
function showCheckoutForm() {
  if (!checkoutContainer) return;

  checkoutContainer.innerHTML = `
    <div class="checkout-form">
      <h2>Order Summary</h2>
      <div class="order-summary-section">
        <div class="summary-items" id="summaryItems">
          ${orderData.items
            .map((item) => {
              const productImages = item.product_image
                ? JSON.parse(item.product_image)
                : [];
              const imageUrl =
                productImages.length > 0
                  ? `/${productImages[0]}`
                  : "/images/no-image.png";
              const itemTotal = (
                parseFloat(item.product_price) * parseInt(item.qty)
              ).toFixed(2);

              return `
              <div class="summary-item">
                <div class="item-image-container">
                  <img src="${imageUrl}" alt="${
                item.product_title
              }" class="item-image"
                       onerror="this.src='/images/no-image.png'">
                </div>
                <div class="item-details">
                  <h4 class="item-title">${item.product_title}</h4>
                  <p class="item-meta">${item.category_name} - ${
                item.brand_name
              }</p>
                  <div class="item-pricing">
                    <span class="item-price">₵${parseFloat(
                      item.product_price
                    ).toFixed(2)}</span>
                    <span class="item-quantity">× ${item.qty}</span>
                    <span class="item-total">= ₵${itemTotal}</span>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
        
        <div class="summary-totals">
          <div class="summary-line">
            <span>Items (${orderData.itemCount}):</span>
            <span>₵${orderData.total.toFixed(2)}</span>
          </div>
          <div class="summary-line shipping">
            <span>Shipping:</span>
            <span>Free</span>
          </div>
          <div class="summary-line total">
            <strong>
              <span>Total:</span>
              <span id="summaryTotal">₵${orderData.total.toFixed(2)}</span>
            </strong>
          </div>
        </div>
      </div>
      
      <div class="checkout-actions">
        <button id="backToCartBtn" class="btn-secondary">← Back to Cart</button>
        <button id="paymentBtn" class="btn-primary">Proceed to Payment 💳</button>
      </div>
    </div>
  `;

  // Re-initialize elements and event listeners
  initializeElements();
  setupEventListeners();

  // Update cart count after form is shown
  updateCheckoutCartCount();
}

// Show payment modal
function showPaymentModal() {
  if (!paymentModal || !orderData) return;

  document.getElementById(
    "modalOrderTotal"
  ).textContent = `₵${orderData.total.toFixed(2)}`;
  document.getElementById("modalOrderRef").textContent =
    orderData.orderReference;

  paymentModal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

// Hide payment modal
function hidePaymentModal() {
  if (!paymentModal) return;

  paymentModal.style.display = "none";
  document.body.style.overflow = "auto";
}

// Process payment
async function processPayment() {
  if (isProcessingPayment || !orderData) return;

  try {
    isProcessingPayment = true;

    // Update button state
    confirmPaymentBtn.textContent = "Initializing...";
    confirmPaymentBtn.disabled = true;
    cancelPaymentBtn.disabled = true;

    // Get customer email
    const customerEmail = await getCustomerEmail();
    if (!customerEmail) {
      showPaymentError("Email is required for payment");
      return;
    }

    const response = await fetch("/paystack-init-transaction", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: orderData.orderId,
        amount: orderData.total,
        email: customerEmail,
        orderReference: orderData.orderReference,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Redirect to Paystack checkout
      window.location.href = data.data.authorization_url;
    } else {
      showPaymentError(data.message || "Payment processing failed");
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    showPaymentError("Payment processing failed. Please try again.");
  } finally {
    isProcessingPayment = false;

    // Reset button state
    confirmPaymentBtn.textContent = "💳 Pay Now";
    confirmPaymentBtn.disabled = false;
    cancelPaymentBtn.disabled = false;
  }
}

async function getCustomerEmail() {
  try {
    // Try to get from logged in user first
    const userResponse = await fetch("/login/me", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      if (userData.success && userData.data.email) {
        return userData.data.email;
      }
    }
    // If no user email, prompt for it
    const email = prompt("Please enter your email address for payment:");

    if (email && validateEmail(email)) {
      return email;
    } else {
      alert("Please enter a valid email address");
      return null;
    }
  } catch (error) {
    console.error("Error getting customer email:", error);
    return null;
  }
}

// Validate email format
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Show payment error
function showPaymentError(message) {
  if (!paymentModal) return;

  const errorDiv = document.createElement("div");
  errorDiv.className = "payment-error";
  errorDiv.innerHTML = `
    <div class="error-message">
      <p>${message}</p>
      <button onclick="this.parentElement.parentElement.remove()" class="btn-secondary">
        Try Again
      </button>
    </div>
  `;

  paymentModal.querySelector(".modal-content").appendChild(errorDiv);

  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 5000);
}

// Show loading state
function showLoading(message = "Loading...") {
  if (checkoutContainer) {
    checkoutContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }
}

// Show error state
function showError(message) {
  if (checkoutContainer) {
    checkoutContainer.innerHTML = `
      <div class="error-message">
        <h3>Error</h3>
        <p>${message}</p>
        <div class="error-actions">
          <button onclick="window.location.href='/cart'" class="btn-secondary">
            Back to Cart
          </button>
          <button onclick="location.reload()" class="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
}

// Show message
function showMessage(type, message) {
  const messageEl = document.createElement("div");
  messageEl.className = `checkout-message ${type}`;
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

// Force cart count refresh with delay as backup
setTimeout(async () => {
  await updateCheckoutCartCount();
}, 1000);
