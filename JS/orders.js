console.log("Loading orders.js at:", new Date().toISOString());

// Global variables
let ordersData = [];
let currentPage = 1;
const ordersPerPage = 10;

// DOM elements
let ordersContainer, orderDetailsModal, orderDetailsContent;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Loading orders page...");

  initializeElements();
  setupEventListeners();
  setupCartSyncListeners();
  await updateCartCount();
  await loadOrders();

  console.log("Orders page initialized");
});

// Initialize DOM elements
function initializeElements() {
  ordersContainer = document.getElementById("ordersContainer");
  orderDetailsModal = document.getElementById("orderDetailsModal");
  orderDetailsContent = document.getElementById("orderDetailsContent");
}

// Set up event listeners
function setupEventListeners() {
  // Close modal listeners
  document
    .getElementById("closeOrderModal")
    ?.addEventListener("click", closeOrderModal);

  // Close modal when clicking outside
  orderDetailsModal?.addEventListener("click", (e) => {
    if (e.target === orderDetailsModal) {
      closeOrderModal();
    }
  });

  // Escape key to close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && orderDetailsModal.style.display === "flex") {
      closeOrderModal();
    }
  });
}

// Load orders from server
async function loadOrders() {
  try {
    showLoading("Loading your orders...");

    // Check if user is logged in
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      showLoginRequired();
      return;
    }

    const response = await fetch("/get-orders", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      ordersData = data.data.orders || [];
      displayOrders();
    } else {
      showError(data.message || "Failed to load orders");
    }
  } catch (error) {
    console.error("Error loading orders:", error);
    showError("Failed to load orders. Please try again.");
  }
}

// Display orders list
function displayOrders() {
  if (!ordersContainer) return;

  if (ordersData.length === 0) {
    showNoOrders();
    return;
  }

  // Sort orders by date (newest first)
  const sortedOrders = ordersData.sort(
    (a, b) => new Date(b.order_date) - new Date(a.order_date)
  );

  // Paginate orders
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

  const ordersHtml = `
    <div class="orders-list">
      <div class="orders-header">
        <h2>Order History</h2>
        <div class="orders-count">
          <span>${ordersData.length} order${
    ordersData.length !== 1 ? "s" : ""
  } total</span>
        </div>
      </div>

      <div class="orders-grid">
        ${paginatedOrders.map((order) => createOrderCard(order)).join("")}
      </div>

      ${createPagination()}
    </div>
  `;

  ordersContainer.innerHTML = ordersHtml;
  setupOrderEventListeners();
}

// Create order card HTML
function createOrderCard(order) {
  // Only show date, no time
  const orderDateTime = new Date(order.order_date);
  const orderDate = orderDateTime.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const statusClass = getStatusClass(order.order_status);
  const statusIcon = getStatusIcon(order.order_status);

  return `
    <div class="order-card" data-order-id="${order.order_id}">
      <div class="order-card-header">
        <div class="order-reference">
          <span class="order-ref-label">Order #</span>
          <span class="order-ref-value">${order.order_reference}</span>
        </div>
        <div class="order-status ${statusClass}">
          ${statusIcon} ${order.order_status}
        </div>
      </div>

      <div class="order-card-body">
        <div class="order-info">
          <div class="order-date">
            <span class="info-label">📅 Date:</span>
            <span class="info-value">${orderDate}</span>
          </div>
          <div class="order-total">
            <span class="info-label">💰 Total:</span>
            <span class="info-value">₵${parseFloat(order.order_total).toFixed(
              2
            )}</span>
          </div>
          ${
            order.invoice_no
              ? `
          <div class="order-invoice">
            <span class="info-label">📄 Invoice:</span>
            <span class="info-value">${order.invoice_no}</span>
          </div>
          `
              : ""
          }
        </div>

        <div class="order-actions">
          <button class="btn-secondary view-details-btn" data-order-id="${
            order.order_id
          }">
            👁️ View Details
          </button>
          ${
            order.order_status === "pending"
              ? `
          <button class="btn-primary reorder-btn" data-order-id="${order.order_id}">
            🔄 Reorder
          </button>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

// Get status CSS class
function getStatusClass(status) {
  const statusMap = {
    pending: "status-pending",
    confirmed: "status-confirmed",
    processing: "status-processing",
    shipped: "status-shipped",
    delivered: "status-delivered",
    cancelled: "status-cancelled",
  };
  return statusMap[status?.toLowerCase()] || "status-unknown";
}

// Get status icon
function getStatusIcon(status) {
  const iconMap = {
    pending: "⏳",
    confirmed: "✅",
    processing: "⚙️",
    shipped: "🚚",
    delivered: "📦",
    cancelled: "❌",
  };
  return iconMap[status?.toLowerCase()] || "❓";
}

// Setup event listeners for order cards
function setupOrderEventListeners() {
  // View details buttons
  document.querySelectorAll(".view-details-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const orderId = e.target.dataset.orderId;
      await showOrderDetails(orderId);
    });
  });

  // Reorder buttons
  document.querySelectorAll(".reorder-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const orderId = e.target.dataset.orderId;
      await reorderItems(orderId);
    });
  });
}

// Show order details in modal
async function showOrderDetails(orderId) {
  try {
    showModalLoading();

    const response = await fetch(`/get-order-details/${orderId}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      displayOrderDetails(data.data);
      orderDetailsModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    } else {
      showMessage("error", data.message || "Failed to load order details");
    }
  } catch (error) {
    console.error("Error loading order details:", error);
    showMessage("error", "Failed to load order details. Please try again.");
  }
}

// Display order details in modal
function displayOrderDetails(orderData) {
  const { order, items } = orderData;

  // Only show date, no time in modal
  const orderDateTime = new Date(order.order_date);
  const orderDate = orderDateTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusClass = getStatusClass(order.order_status);
  const statusIcon = getStatusIcon(order.order_status);

  const detailsHtml = `
    <div class="order-details">
      <div class="order-summary">
        <div class="summary-row">
          <span class="label">Order Reference:</span>
          <span class="value">${order.order_reference}</span>
        </div>
        <div class="summary-row">
          <span class="label">Date:</span>
          <span class="value">${orderDate}</span>
        </div>
        <div class="summary-row">
          <span class="label">Status:</span>
          <span class="value order-status ${statusClass}">
            ${statusIcon} ${order.order_status}
          </span>
        </div>
        <div class="summary-row">
          <span class="label">Total:</span>
          <span class="value total">₵${parseFloat(order.order_total).toFixed(
            2
          )}</span>
        </div>
        ${
          order.invoice_no
            ? `
        <div class="summary-row">
          <span class="label">Invoice:</span>
          <span class="value">${order.invoice_no}</span>
        </div>
        `
            : ""
        }
      </div>

      ${
        orderData.timeline && orderData.timeline.length > 0
          ? `
      <div class="order-tracking">
        <h4>📍 Order Tracking</h4>
        <div class="tracking-timeline">
          ${orderData.timeline
            .map(
              (step) => `
            <div class="timeline-step ${step.isCompleted ? "completed" : ""} ${
                step.isCurrent ? "current" : ""
              }">
              <div class="step-icon">${step.icon}</div>
              <div class="step-content">
                <div class="step-label">${step.label}</div>
                ${
                  step.timestamp
                    ? `<div class="step-time">${new Date(
                        step.timestamp
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</div>`
                    : '<div class="step-time">Pending</div>'
                }
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        ${
          orderData.order.tracking_notes
            ? `
        <div class="tracking-notes">
          <strong>📝 Tracking Notes:</strong>
          <p>${orderData.order.tracking_notes}</p>
        </div>
        `
            : ""
        }
      </div>
      `
          : ""
      }

      <div class="order-items">
        <h4>📦 Order Items (${items.length})</h4>
        <div class="items-list">
          ${items
            .map((item) => {
              const productImages = item.product_image
                ? JSON.parse(item.product_image)
                : [];
              const imageUrl =
                productImages.length > 0
                  ? `/${productImages[0]}`
                  : "/images/no-image.png";
              const itemTotal = (
                parseFloat(item.price) * parseInt(item.qty)
              ).toFixed(2);

              return `
              <div class="order-item">
                <div class="item-image">
                  <img src="${imageUrl}" alt="${item.product_title}" 
                       onerror="this.src='/images/no-image.png'">
                </div>
                <div class="item-details">
                  <h5 class="item-title">${item.product_title}</h5>
                  <p class="item-meta">${item.category_name} - ${
                item.brand_name
              }</p>
                  <div class="item-pricing">
                    <span>₵${parseFloat(item.price).toFixed(2)} × ${
                item.qty
              } = $${itemTotal}</span>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    </div>
  `;

  orderDetailsContent.innerHTML = detailsHtml;
}

// Close order details modal
function closeOrderModal() {
  if (orderDetailsModal) {
    orderDetailsModal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}

// Show modal loading state
function showModalLoading() {
  if (orderDetailsContent) {
    orderDetailsContent.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Loading order details...</p>
      </div>
    `;
  }
}

// Reorder items (add to cart)
async function reorderItems(orderId) {
  try {
    const response = await fetch(`/get-order-details/${orderId}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      const { items } = data.data;
      let addedItems = 0;

      for (const item of items) {
        try {
          const addResponse = await fetch("/add-to-cart", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: item.product_id,
              quantity: item.qty,
            }),
          });

          const addData = await addResponse.json();
          if (addData.success) {
            addedItems++;
          }
        } catch (error) {
          console.error(
            `Error adding item ${item.product_title} to cart:`,
            error
          );
        }
      }

      if (addedItems > 0) {
        showMessage("success", `${addedItems} item(s) added to cart!`);

        // Update cart count immediately
        await updateCartCount();
        triggerCartUpdate();
      } else {
        showMessage("error", "No items could be added to cart");
      }
    } else {
      showMessage("error", data.message || "Failed to reorder items");
    }
  } catch (error) {
    console.error("Error reordering items:", error);
    showMessage("error", "Failed to reorder items. Please try again.");
  }
}

// Create pagination HTML
function createPagination() {
  const totalPages = Math.ceil(ordersData.length / ordersPerPage);

  if (totalPages <= 1) return "";

  let paginationHtml = '<div class="pagination">';

  // Previous button
  if (currentPage > 1) {
    paginationHtml += `<button class="page-btn" onclick="changePage(${
      currentPage - 1
    })">« Previous</button>`;
  }

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      paginationHtml += `<button class="page-btn active">${i}</button>`;
    } else {
      paginationHtml += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
    }
  }

  // Next button
  if (currentPage < totalPages) {
    paginationHtml += `<button class="page-btn" onclick="changePage(${
      currentPage + 1
    })">Next »</button>`;
  }

  paginationHtml += "</div>";
  return paginationHtml;
}

// Change page
function changePage(page) {
  currentPage = page;
  displayOrders();
}

// Show loading state
function showLoading(message = "Loading...") {
  if (ordersContainer) {
    ordersContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }
}

// Show login required
function showLoginRequired() {
  if (ordersContainer) {
    ordersContainer.innerHTML = `
      <div class="login-required">
        <div class="login-icon">🔐</div>
        <h3>Login Required</h3>
        <p>You need to be logged in to view your orders.</p>
        <div class="login-actions">
          <a href="/pages/login.html" class="btn-primary">Login</a>
          <a href="/pages/register.html" class="btn-secondary">Create Account</a>
        </div>
      </div>
    `;
  }
}

// Show no orders
function showNoOrders() {
  if (ordersContainer) {
    ordersContainer.innerHTML = `
      <div class="no-orders">
        <div class="no-orders-icon">📦</div>
        <h3>No Orders Yet</h3>
        <p>You haven't placed any orders yet. Start shopping to see your order history here!</p>
        <div class="no-orders-actions">
          <a href="/all-products" class="btn-primary">Start Shopping</a>
          <a href="/" class="btn-secondary">Browse Categories</a>
        </div>
      </div>
    `;
  }
}

// Show error state
function showError(message) {
  if (ordersContainer) {
    ordersContainer.innerHTML = `
      <div class="error-message">
        <div class="error-icon">❌</div>
        <h3>Error</h3>
        <p>${message}</p>
        <div class="error-actions">
          <button onclick="loadOrders()" class="btn-primary">Try Again</button>
          <a href="/" class="btn-secondary">Go Home</a>
        </div>
      </div>
    `;
  }
}

// Show message
function showMessage(type, message) {
  const messageEl = document.createElement("div");
  messageEl.className = `page-message ${type}`;
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

// Update cart count display using existing get-cart endpoint
async function updateCartCount() {
  try {
    const response = await fetch("/get-cart", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      const totalItems =
        data.data.items?.reduce((sum, item) => sum + parseInt(item.qty), 0) ||
        0;
      updateCartCountDisplay(totalItems);
    } else {
      // Cart is empty or user not logged in
      updateCartCountDisplay(0);
    }
  } catch (error) {
    console.error("Error updating cart count:", error);
    updateCartCountDisplay(0);
  }
}

// Update cart count in navigation
function updateCartCountDisplay(count = 0) {
  const cartCountElements = document.querySelectorAll(".cart-count");
  cartCountElements.forEach((element) => {
    if (element) {
      element.textContent = count;
    }
  });

  // Also update the specific nav cart count
  const navCartCount = document.getElementById("nav-cart-count");
  if (navCartCount) {
    navCartCount.textContent = count;
  }
}

// Trigger cart updated event for cross-page sync
function triggerCartUpdate() {
  // Trigger local event
  document.dispatchEvent(new CustomEvent("cartUpdated"));

  // Trigger storage event for other tabs
  localStorage.setItem("cartUpdated", Date.now().toString());
  setTimeout(() => localStorage.removeItem("cartUpdated"), 100);
}

// Setup cart sync listeners
function setupCartSyncListeners() {
  // Listen for storage events (cross-tab updates)
  window.addEventListener("storage", (e) => {
    if (e.key === "cartUpdated") {
      updateCartCount();
    }
  });

  // Listen for custom cart update events
  document.addEventListener("cartUpdated", () => {
    updateCartCount();
  });
}
