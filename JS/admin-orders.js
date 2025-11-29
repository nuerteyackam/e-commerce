// Global variables
let currentOrders = [];
let currentOrderId = null;

// DOM Elements
const ordersTableBody = document.getElementById("ordersTableBody");
const ordersLoader = document.getElementById("ordersLoader");
const noOrdersMessage = document.getElementById("noOrdersMessage");
const statusFilter = document.getElementById("statusFilter");
const searchOrder = document.getElementById("searchOrder");
const refreshOrders = document.getElementById("refreshOrders");
const exportOrders = document.getElementById("exportOrders");

// Modal elements
const orderModalOverlay = document.getElementById("orderModalOverlay");
const orderModalBody = document.getElementById("orderModalBody");
const closeOrderModal = document.getElementById("closeOrderModal");
const statusModalOverlay = document.getElementById("statusModalOverlay");
const closeStatusModal = document.getElementById("closeStatusModal");
const updateStatusForm = document.getElementById("updateStatusForm");
const cancelStatusUpdate = document.getElementById("cancelStatusUpdate");

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("=== ADMIN ORDERS PAGE INITIALIZATION ===");

  // Check admin authentication
  await checkAdminAuth();

  // Load initial data
  await loadOrdersData();
  await loadOrderStats();

  // Setup event listeners
  setupEventListeners();

  console.log("=== ADMIN ORDERS PAGE READY ===");
});

/**
 * Check if user is authenticated admin
 */
async function checkAdminAuth() {
  try {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      window.location.href = "/pages/login.html";
      return;
    }

    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      window.location.href = "/";
      return;
    }

    // Load user info for navigation
    const userResponse = await getCurrentUser();
    const currentUser = userResponse?.data;

    if (currentUser) {
      // Update navigation
      const topNavElement = document.getElementById("topNavMenu");
      topNavElement.innerHTML = `
        <a href="/admin" class="nav-link">🏠 Dashboard</a>
        <a href="/admin/orders" class="nav-link active">📦 Orders</a>
        <a href="/admin/product" class="nav-link">Products</a>
        <span class="nav-user">Hi, ${
          currentUser.name || currentUser.email
        }</span>
        <button id="nav-logout-btn" class="nav-logout-btn">Logout</button>
      `;

      // Add logout functionality
      document
        .getElementById("nav-logout-btn")
        .addEventListener("click", async () => {
          try {
            await fetch("/logout", {
              method: "POST",
              credentials: "include",
            });

            window.location.href = "/";
          } catch (error) {
            console.error("Logout error:", error);
          }
        });
    }
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "/pages/login.html";
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Filter and search
  statusFilter.addEventListener("change", filterOrders);
  searchOrder.addEventListener("input", debounce(filterOrders, 300));

  // Actions
  refreshOrders.addEventListener("click", refreshOrdersData);
  exportOrders.addEventListener("click", exportOrdersData);

  // Modal controls
  closeOrderModal.addEventListener("click", () => hideModal(orderModalOverlay));
  closeStatusModal.addEventListener("click", () =>
    hideModal(statusModalOverlay)
  );
  cancelStatusUpdate.addEventListener("click", () =>
    hideModal(statusModalOverlay)
  );

  // Form submission
  updateStatusForm.addEventListener("submit", handleStatusUpdate);

  // Close modals on overlay click
  orderModalOverlay.addEventListener("click", (e) => {
    if (e.target === orderModalOverlay) hideModal(orderModalOverlay);
  });

  statusModalOverlay.addEventListener("click", (e) => {
    if (e.target === statusModalOverlay) hideModal(statusModalOverlay);
  });
}

/**
 * Load all orders data
 */
async function loadOrdersData() {
  try {
    showLoading(true);

    console.log("Loading admin orders data...");
    const response = await fetch("/api/admin/orders", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    console.log("Admin orders response:", data);

    if (data.success && data.data) {
      currentOrders = data.data.orders || [];
      displayOrders(currentOrders);
    } else {
      showError(data.message || "Failed to load orders");
      currentOrders = [];
      displayOrders([]);
    }
  } catch (error) {
    console.error("Error loading orders:", error);
    showError("Failed to load orders. Please try again.");
    currentOrders = [];
    displayOrders([]);
  } finally {
    showLoading(false);
  }
}

/**
 * Load order statistics
 */
async function loadOrderStats() {
  try {
    console.log("Loading order statistics...");
    const response = await fetch("/api/admin/order-stats", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    console.log("Order stats response:", data);

    if (data.success && data.data) {
      const stats = data.data.stats || {};
      document.getElementById("pendingCount").textContent = stats.pending || 0;
      document.getElementById("processingCount").textContent =
        stats.processing || 0;
      document.getElementById("shippedCount").textContent = stats.shipped || 0;
      document.getElementById("deliveredCount").textContent =
        stats.delivered || 0;
    }
  } catch (error) {
    console.error("Error loading order stats:", error);
  }
}

/**
 * Display orders in table
 */
function displayOrders(orders) {
  if (!orders || orders.length === 0) {
    ordersTableBody.innerHTML = "";
    noOrdersMessage.style.display = "block";
    document.querySelector(".orders-table-wrapper").style.display = "none";
    return;
  }

  noOrdersMessage.style.display = "none";
  document.querySelector(".orders-table-wrapper").style.display = "block";

  ordersTableBody.innerHTML = orders
    .map((order) => {
      const orderDate = new Date(order.order_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const statusClass = getStatusClass(order.order_status);
      const statusIcon = getStatusIcon(order.order_status);
      const paymentStatus = order.payment_status || "pending";
      const paymentClass = paymentStatus === "paid" ? "success" : "warning";

      return `
      <tr class="order-row" data-order-id="${order.order_id}">
        <td class="order-id">#${order.order_id}</td>
        <td class="customer-info">
          <div class="customer-name">${order.customer_name || "N/A"}</div>
          <div class="customer-email">${order.customer_email || ""}</div>
        </td>
        <td class="order-date">${orderDate}</td>
        <td class="item-count">${order.item_count || 0} items</td>
        <td class="order-total">$${parseFloat(order.order_total || 0).toFixed(
          2
        )}</td>
        <td class="order-status">
          <span class="status-badge ${statusClass}">
            ${statusIcon} ${order.order_status}
          </span>
        </td>
        <td class="payment-status">
          <span class="status-badge ${paymentClass}">
            ${paymentStatus}
          </span>
        </td>
        <td class="order-actions">
          <button class="btn-small btn-primary" onclick="viewOrderDetails(${
            order.order_id
          })">
            👁️ View
          </button>
          <button class="btn-small btn-secondary" onclick="updateOrderStatus(${
            order.order_id
          })">
            🔄 Update
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

/**
 * View order details
 */
async function viewOrderDetails(orderId) {
  try {
    console.log(`Loading details for order ${orderId}`);
    showModal(orderModalOverlay);

    orderModalBody.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading order details...</p>
      </div>
    `;

    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    console.log("Order details response:", data);

    if (data.success && data.data) {
      displayOrderDetailsModal(data.data);
    } else {
      orderModalBody.innerHTML = `
        <div class="error-message">
          <p>❌ ${data.message || "Failed to load order details"}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading order details:", error);
    orderModalBody.innerHTML = `
      <div class="error-message">
        <p>❌ Failed to load order details. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Display order details in modal
 */
function displayOrderDetailsModal(orderData) {
  const { order, items, timeline } = orderData;

  const orderDate = new Date(order.order_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  orderModalBody.innerHTML = `
    <div class="order-detail-content">
      <!-- Order Summary -->
      <div class="detail-section">
        <h3>📋 Order Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Order ID:</span>
            <span class="value">#${order.order_id}</span>
          </div>
          <div class="detail-item">
            <span class="label">Reference:</span>
            <span class="value">${order.order_reference}</span>
          </div>
          <div class="detail-item">
            <span class="label">Date:</span>
            <span class="value">${orderDate}</span>
          </div>
          <div class="detail-item">
            <span class="label">Status:</span>
            <span class="value">
              <span class="status-badge ${getStatusClass(order.order_status)}">
                ${getStatusIcon(order.order_status)} ${order.order_status}
              </span>
            </span>
          </div>
          <div class="detail-item">
            <span class="label">Total:</span>
            <span class="value total">$${parseFloat(order.order_total).toFixed(
              2
            )}</span>
          </div>
        </div>
      </div>

      <!-- Customer Information -->
      <div class="detail-section">
        <h3>👤 Customer Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Name:</span>
            <span class="value">${order.customer_name || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Email:</span>
            <span class="value">${order.customer_email || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Location:</span>
            <span class="value">${order.customer_city || "N/A"}, ${
    order.customer_country || "N/A"
  }</span>
          </div>
        </div>
      </div>

      <!-- Tracking Timeline -->
      ${
        timeline && timeline.length > 0
          ? `
      <div class="detail-section">
        <h3>📍 Order Timeline</h3>
        <div class="admin-timeline">
          ${timeline
            .map(
              (step) => `
            <div class="timeline-step ${step.isCompleted ? "completed" : ""} ${
                step.isCurrent ? "current" : ""
              }">
              <div class="step-icon">${step.icon}</div>
              <div class="step-content">
                <div class="step-label">${step.label}</div>
                <div class="step-time">
                  ${
                    step.timestamp
                      ? new Date(step.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Pending"
                  }
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        ${
          order.tracking_notes
            ? `
        <div class="tracking-notes">
          <strong>📝 Tracking Notes:</strong>
          <p>${order.tracking_notes}</p>
        </div>
        `
            : ""
        }
      </div>
      `
          : ""
      }

      <!-- Order Items -->
      <div class="detail-section">
        <h3>📦 Order Items (${items.length})</h3>
        <div class="items-list">
          ${items
            .map((item) => {
              const itemImages = item.product_image
                ? JSON.parse(item.product_image)
                : [];
              const imageUrl =
                itemImages.length > 0
                  ? `/${itemImages[0]}`
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
                  <h4 class="item-title">${item.product_title}</h4>
                  <p class="item-meta">${item.category || "N/A"} - ${
                item.brand || "N/A"
              }</p>
                  <div class="item-pricing">
                    <span>$${parseFloat(item.price).toFixed(2)} × ${
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

      <!-- Action Buttons -->
      <div class="detail-actions">
        <button class="btn-primary" onclick="updateOrderStatus(${
          order.order_id
        })">
          🔄 Update Status
        </button>
        <button class="btn-secondary" onclick="printOrderDetails(${
          order.order_id
        })">
          🖨️ Print Details
        </button>
      </div>
    </div>
  `;
}

/**
 * Update order status
 */
function updateOrderStatus(orderId) {
  currentOrderId = orderId;

  // Close order details modal if open
  hideModal(orderModalOverlay);

  // Show status update modal
  showModal(statusModalOverlay);

  // Reset form
  updateStatusForm.reset();
  document.getElementById("newStatus").focus();
}

/**
 * Handle status update form submission
 */
async function handleStatusUpdate(e) {
  e.preventDefault();

  if (!currentOrderId) {
    showError("No order selected for update");
    return;
  }

  const newStatus = document.getElementById("newStatus").value;
  const trackingNotes = document.getElementById("trackingNotes").value.trim();

  try {
    console.log(`Updating order ${currentOrderId} status to: ${newStatus}`);

    const response = await fetch(`/api/admin/orders/${currentOrderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        status: newStatus,
        notes: trackingNotes || null,
      }),
    });

    const data = await response.json();
    console.log("Status update response:", data);

    if (data.success) {
      showSuccess(`Order #${currentOrderId} status updated to ${newStatus}!`);
      hideModal(statusModalOverlay);

      // Refresh orders data
      await loadOrdersData();
      await loadOrderStats();

      currentOrderId = null;
    } else {
      showError(data.message || "Failed to update order status");
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    showError("Failed to update order status. Please try again.");
  }
}

/**
 * Filter orders based on status and search
 */
function filterOrders() {
  const statusValue = statusFilter.value.toLowerCase();
  const searchValue = searchOrder.value.toLowerCase();

  const filteredOrders = currentOrders.filter((order) => {
    const matchesStatus =
      !statusValue || order.order_status.toLowerCase() === statusValue;
    const matchesSearch =
      !searchValue ||
      order.order_id.toString().includes(searchValue) ||
      (order.customer_name &&
        order.customer_name.toLowerCase().includes(searchValue)) ||
      (order.customer_email &&
        order.customer_email.toLowerCase().includes(searchValue)) ||
      (order.order_reference &&
        order.order_reference.toLowerCase().includes(searchValue));

    return matchesStatus && matchesSearch;
  });

  displayOrders(filteredOrders);
}

/**
 * Refresh orders data
 */
async function refreshOrdersData() {
  console.log("Refreshing orders data...");
  await loadOrdersData();
  await loadOrderStats();

  // Reset filters
  statusFilter.value = "";
  searchOrder.value = "";

  showSuccess("Orders data refreshed!");
}

/**
 * Export orders data
 */
function exportOrdersData() {
  try {
    const csvContent = generateOrdersCSV(currentOrders);
    downloadCSV(csvContent, "orders-export.csv");
    showSuccess("Orders exported successfully!");
  } catch (error) {
    console.error("Error exporting orders:", error);
    showError("Failed to export orders.");
  }
}

/**
 * Generate CSV content from orders
 */
function generateOrdersCSV(orders) {
  const headers = [
    "Order ID",
    "Customer Name",
    "Customer Email",
    "Date",
    "Status",
    "Total",
    "Items",
  ];
  const rows = orders.map((order) => [
    order.order_id,
    order.customer_name || "",
    order.customer_email || "",
    new Date(order.order_date).toLocaleDateString(),
    order.order_status,
    parseFloat(order.order_total).toFixed(2),
    order.item_count || 0,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
}

/**
 * Download CSV file
 */
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Print order details
 */
function printOrderDetails(orderId) {
  window.print();
}

/**
 * Utility Functions
 */
function showLoading(show) {
  ordersLoader.style.display = show ? "flex" : "none";
}

function showModal(modal) {
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function hideModal(modal) {
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

function showSuccess(message) {
  showMessage(message, "success");
}

function showError(message) {
  showMessage(message, "error");
}

function showMessage(message, type) {
  const messageContainer = document.getElementById("messageContainer");
  const messageEl = document.createElement("div");
  messageEl.className = `message ${type}`;
  messageEl.textContent = message;

  messageContainer.appendChild(messageEl);

  setTimeout(() => {
    messageEl.remove();
  }, 5000);
}

function getStatusClass(status) {
  const statusMap = {
    pending: "warning",
    confirmed: "info",
    processing: "info",
    shipped: "primary",
    delivered: "success",
    cancelled: "error",
  };
  return statusMap[status] || "default";
}

function getStatusIcon(status) {
  const iconMap = {
    pending: "📝",
    confirmed: "✅",
    processing: "⚙️",
    shipped: "📦",
    delivered: "🎉",
    cancelled: "❌",
  };
  return iconMap[status] || "📋";
}

function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
