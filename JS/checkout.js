console.log("Loading checkout.js at:", new Date().toISOString());

// Global variables
let orderData = null;
let isProcessingPayment = false;

// DOM elements
let checkoutContainer, orderSummary, paymentBtn, backToCartBtn;
let summaryItems, summaryTotal, summaryItemCount;
let paymentModal, confirmPaymentBtn, cancelPaymentBtn;
let orderConfirmation, orderReference, orderTotal;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Loading checkout page...");

  initializeElements();
  setupEventListeners();
  await processCheckout();

  console.log("Checkout page initialized");
});

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
  try {
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
      showError(data.message || "Failed to process checkout");
    }
  } catch (error) {
    console.error("Error processing checkout:", error);
    showError("Failed to process checkout. Please try again.");
  }
}

// // Display order summary
// function displayOrderSummary() {
//   if (!orderData || !summaryItems) return;

//   const itemsHtml = orderData.items
//     .map((item) => {
//       const productImages = item.product_image
//         ? JSON.parse(item.product_image)
//         : [];
//       const imageUrl =
//         productImages.length > 0
//           ? `/${productImages[0]}`
//           : "/images/no-image.png";
//       const itemTotal = (
//         parseFloat(item.product_price) * parseInt(item.qty)
//       ).toFixed(2);

//       return `
//       <div class="summary-item">
//         <img src="${imageUrl}" alt="${item.product_title}" class="item-image"
//              onerror="this.src='/images/no-image.png'">
//         <div class="item-details">
//           <h4>${item.product_title}</h4>
//           <p>${item.category_name} - ${item.brand_name}</p>
//           <p>$${parseFloat(item.product_price).toFixed(2)} × ${item.qty}</p>
//         </div>
//         <div class="item-total">
//           $${itemTotal}
//         </div>
//       </div>
//     `;
//     })
//     .join("");

//   summaryItems.innerHTML = itemsHtml;

//   if (summaryTotal) summaryTotal.textContent = `$${orderData.total.toFixed(2)}`;
//   if (summaryItemCount) summaryItemCount.textContent = orderData.itemCount;
// }

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
                    <span class="item-price">$${parseFloat(
                      item.product_price
                    ).toFixed(2)}</span>
                    <span class="item-quantity">× ${item.qty}</span>
                    <span class="item-total">= $${itemTotal}</span>
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
            <span>$${orderData.total.toFixed(2)}</span>
          </div>
          <div class="summary-line shipping">
            <span>Shipping:</span>
            <span>Free</span>
          </div>
          <div class="summary-line total">
            <strong>
              <span>Total:</span>
              <span id="summaryTotal">$${orderData.total.toFixed(2)}</span>
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
}

// Show payment modal
function showPaymentModal() {
  if (!paymentModal || !orderData) return;

  document.getElementById(
    "modalOrderTotal"
  ).textContent = `$${orderData.total.toFixed(2)}`;
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
    confirmPaymentBtn.textContent = "Processing...";
    confirmPaymentBtn.disabled = true;
    cancelPaymentBtn.disabled = true;

    const response = await fetch("/process-payment", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: orderData.orderId,
        amount: orderData.total,
      }),
    });

    const data = await response.json();

    if (data.success) {
      hidePaymentModal();
      showOrderConfirmation(data.data);
    } else {
      showPaymentError(data.message || "Payment processing failed");
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    showPaymentError("Payment processing failed. Please try again.");
  } finally {
    isProcessingPayment = false;

    // Reset button state
    confirmPaymentBtn.textContent = "Yes, I've Paid";
    confirmPaymentBtn.disabled = false;
    cancelPaymentBtn.disabled = false;
  }
}

// Show order confirmation
function showOrderConfirmation(paymentData) {
  if (!checkoutContainer) return;

  checkoutContainer.innerHTML = `
    <div class="order-confirmation">
      <div class="success-icon">✅</div>
      <h2>Order Confirmed!</h2>
      <div class="confirmation-details">
        <p><strong>Order Reference:</strong> ${paymentData.orderReference}</p>
        <p><strong>Invoice Number:</strong> ${paymentData.invoiceNo}</p>
        <p><strong>Total Paid:</strong> $${paymentData.amount.toFixed(2)}</p>
        <p><strong>Payment ID:</strong> ${paymentData.paymentId}</p>
      </div>
      <div class="confirmation-message">
        <p>Thank you for your purchase! Your order has been successfully processed.</p>
        <p>You can track your order using the reference number above.</p>
      </div>
      <div class="confirmation-actions">
        <button onclick="window.location.href='/all-products'" class="btn-primary">
          Continue Shopping
        </button>
        <button onclick="window.location.href='/orders'" class="btn-secondary">
          View My Orders
        </button>
      </div>
    </div>
  `;
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
