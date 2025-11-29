// Global variables
let currentUsers = [];
let currentUserId = null;

// DOM Elements
const usersTableBody = document.getElementById("usersTableBody");
const usersLoader = document.getElementById("usersLoader");
const noUsersMessage = document.getElementById("noUsersMessage");
const roleFilter = document.getElementById("roleFilter");
const statusFilter = document.getElementById("statusFilter");
const searchUser = document.getElementById("searchUser");
const refreshUsers = document.getElementById("refreshUsers");
const exportUsers = document.getElementById("exportUsers");

// Modal elements
const userModalOverlay = document.getElementById("userModalOverlay");
const userModalBody = document.getElementById("userModalBody");
const closeUserModal = document.getElementById("closeUserModal");
const statusModalOverlay = document.getElementById("statusModalOverlay");
const closeStatusModal = document.getElementById("closeStatusModal");
const roleModalOverlay = document.getElementById("roleModalOverlay");
const closeRoleModal = document.getElementById("closeRoleModal");
const updateStatusForm = document.getElementById("updateStatusForm");
const updateRoleForm = document.getElementById("updateRoleForm");
const cancelStatusUpdate = document.getElementById("cancelStatusUpdate");
const cancelRoleUpdate = document.getElementById("cancelRoleUpdate");

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("=== ADMIN USERS PAGE INITIALIZATION ===");

  // Check admin authentication
  await checkAdminAuth();

  // Load initial data
  await loadUsersData();
  await loadUserStats();

  // Setup event listeners
  setupEventListeners();

  console.log("=== ADMIN USERS PAGE READY ===");
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
        <a href="/admin/orders" class="nav-link">📦 Orders</a>
        <a href="/admin/users" class="nav-link active">👥 Users</a>
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
  roleFilter.addEventListener("change", filterUsers);
  statusFilter.addEventListener("change", filterUsers);
  searchUser.addEventListener("input", debounce(filterUsers, 300));

  // Actions
  refreshUsers.addEventListener("click", refreshUsersData);
  exportUsers.addEventListener("click", exportUsersData);

  // Modal controls
  closeUserModal.addEventListener("click", () => hideModal(userModalOverlay));
  closeStatusModal.addEventListener("click", () =>
    hideModal(statusModalOverlay)
  );
  closeRoleModal.addEventListener("click", () => hideModal(roleModalOverlay));
  cancelStatusUpdate.addEventListener("click", () =>
    hideModal(statusModalOverlay)
  );
  cancelRoleUpdate.addEventListener("click", () => hideModal(roleModalOverlay));

  // Form submission
  updateStatusForm.addEventListener("submit", handleStatusUpdate);
  updateRoleForm.addEventListener("submit", handleRoleUpdate);

  // Close modals on overlay click
  userModalOverlay.addEventListener("click", (e) => {
    if (e.target === userModalOverlay) hideModal(userModalOverlay);
  });

  statusModalOverlay.addEventListener("click", (e) => {
    if (e.target === statusModalOverlay) hideModal(statusModalOverlay);
  });

  roleModalOverlay.addEventListener("click", (e) => {
    if (e.target === roleModalOverlay) hideModal(roleModalOverlay);
  });
}

/**
 * Load all users data
 */
async function loadUsersData() {
  try {
    showLoading(true);

    console.log("Loading admin users data...");

    const params = new URLSearchParams();
    if (searchUser.value.trim())
      params.append("search", searchUser.value.trim());
    if (roleFilter.value) params.append("role", roleFilter.value);

    const response = await fetch(`/api/admin/users?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    console.log("Admin users response:", data);

    if (data.success && data.data) {
      currentUsers = data.data.users || [];
      displayUsers(currentUsers);
    } else {
      showError(data.message || "Failed to load users");
      currentUsers = [];
      displayUsers([]);
    }
  } catch (error) {
    console.error("Error loading users:", error);
    showError("Failed to load users. Please try again.");
    currentUsers = [];
    displayUsers([]);
  } finally {
    showLoading(false);
  }
}

/**
 * Load user statistics
 */
async function loadUserStats() {
  try {
    console.log("Loading user statistics...");
    const response = await fetch("/api/admin/user-stats", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    console.log("User stats response:", data);

    if (data.success && data.data) {
      const stats = data.data.stats || {};
      document.getElementById("totalUsersCount").textContent =
        stats.total_users || 0;
      document.getElementById("customersCount").textContent =
        stats.total_customers || 0;
      document.getElementById("adminsCount").textContent =
        stats.total_admins || 0;
      document.getElementById("newUsersCount").textContent =
        stats.new_this_month || 0;
    }
  } catch (error) {
    console.error("Error loading user stats:", error);
  }
}

/**
 * Display users in table
 */
function displayUsers(users) {
  if (!users || users.length === 0) {
    usersTableBody.innerHTML = "";
    noUsersMessage.style.display = "block";
    document.querySelector(".orders-table-wrapper").style.display = "none";
    return;
  }

  noUsersMessage.style.display = "none";
  document.querySelector(".orders-table-wrapper").style.display = "block";

  usersTableBody.innerHTML = users
    .map((user) => {
      const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const roleClass = user.user_role === 1 ? "primary" : "info";
      const roleName = user.user_role === 1 ? "🔑 Admin" : "👤 Customer";
      const statusClass = user.status === "active" ? "success" : "warning";
      const statusIcon = user.status === "active" ? "✅" : "⚠️";

      return `
      <tr class="order-row" data-user-id="${user.customer_id}">
        <td class="order-id">#${user.customer_id}</td>
        <td class="customer-info">
          <div class="customer-name">${user.customer_name || "N/A"}</div>
          <div class="customer-email">Joined ${joinDate}</div>
        </td>
        <td class="user-email">${user.customer_email || "N/A"}</td>
        <td class="user-role">
          <span class="status-badge ${roleClass}">
            ${roleName}
          </span>
        </td>
        <td class="user-location">${user.customer_city || "N/A"}, ${
        user.customer_country || "N/A"
      }</td>
        <td class="user-orders">${user.total_orders || 0} orders</td>
        <td class="user-spent">$${parseFloat(user.total_spent || 0).toFixed(
          2
        )}</td>
        <td class="user-status">
          <span class="status-badge ${statusClass}">
            ${statusIcon} ${user.status}
          </span>
        </td>
        <td class="order-actions">
          <button class="btn-small btn-primary" onclick="viewUserDetails(${
            user.customer_id
          })">
            👁️ View
          </button>
          <button class="btn-small btn-secondary" onclick="updateUserStatus(${
            user.customer_id
          })">
            🔄 Status
          </button>
          <button class="btn-small btn-secondary" onclick="updateUserRole(${
            user.customer_id
          })">
            🔑 Role
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

/**
 * View user details
 */
async function viewUserDetails(userId) {
  try {
    console.log(`Loading details for user ${userId}`);
    showModal(userModalOverlay);

    userModalBody.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading user details...</p>
      </div>
    `;

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();
    console.log("User details response:", data);

    if (data.success && data.data) {
      displayUserDetailsModal(data.data);
    } else {
      userModalBody.innerHTML = `
        <div class="error-message">
          <p>❌ ${data.message || "Failed to load user details"}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading user details:", error);
    userModalBody.innerHTML = `
      <div class="error-message">
        <p>❌ Failed to load user details. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Display user details in modal
 */
function displayUserDetailsModal(userData) {
  const { user, orders, orderStats } = userData;

  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lastOrderDate = orderStats.last_order_date
    ? new Date(orderStats.last_order_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No orders yet";

  const roleName = user.user_role === 1 ? "Admin" : "Customer";
  const roleClass = user.user_role === 1 ? "primary" : "info";

  userModalBody.innerHTML = `
    <div class="order-detail-content">
      <!-- User Summary -->
      <div class="detail-section">
        <h3>👤 User Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">User ID:</span>
            <span class="value">#${user.customer_id}</span>
          </div>
          <div class="detail-item">
            <span class="label">Name:</span>
            <span class="value">${user.customer_name || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Email:</span>
            <span class="value">${user.customer_email || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Contact:</span>
            <span class="value">${user.customer_contact || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Role:</span>
            <span class="value">
              <span class="status-badge ${roleClass}">
                ${user.user_role === 1 ? "🔑" : "👤"} ${roleName}
              </span>
            </span>
          </div>
          <div class="detail-item">
            <span class="label">Status:</span>
            <span class="value">
              <span class="status-badge ${
                user.status === "active" ? "success" : "warning"
              }">
                ${user.status === "active" ? "✅" : "⚠️"} ${user.status}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Location Information -->
      <div class="detail-section">
        <h3>📍 Location Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">City:</span>
            <span class="value">${user.customer_city || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Country:</span>
            <span class="value">${user.customer_country || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Joined:</span>
            <span class="value">${joinDate}</span>
          </div>
          <div class="detail-item">
            <span class="label">Last Order:</span>
            <span class="value">${lastOrderDate}</span>
          </div>
        </div>
      </div>

      <!-- Order Statistics -->
      <div class="detail-section">
        <h3>📊 Order Statistics</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="label">Total Orders:</span>
            <span class="value">${orderStats.total_orders || 0}</span>
          </div>
          <div class="detail-item">
            <span class="label">Total Spent:</span>
            <span class="value total">$${parseFloat(
              orderStats.total_spent || 0
            ).toFixed(2)}</span>
          </div>
          <div class="detail-item">
            <span class="label">Average Order:</span>
            <span class="value">$${parseFloat(
              orderStats.average_order_value || 0
            ).toFixed(2)}</span>
          </div>
          <div class="detail-item">
            <span class="label">Delivered Orders:</span>
            <span class="value">${orderStats.delivered_orders || 0}</span>
          </div>
        </div>
      </div>

      <!-- Recent Orders -->
      ${
        orders && orders.length > 0
          ? `
      <div class="detail-section">
        <h3>📦 Recent Orders (${orders.length})</h3>
        <div class="items-list">
          ${orders
            .map((order) => {
              const orderDate = new Date(order.order_date).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              );
              const statusClass = getStatusClass(order.order_status);
              const statusIcon = getStatusIcon(order.order_status);

              return `
              <div class="order-item">
                <div class="item-details">
                  <h4 class="item-title">Order #${order.order_id}</h4>
                  <p class="item-meta">
                    ${orderDate} • ${order.item_count} items • 
                    <span class="status-badge ${statusClass}">
                      ${statusIcon} ${order.order_status}
                    </span>
                  </p>
                  <div class="item-pricing">
                    <span>$${parseFloat(order.order_total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
      `
          : `
      <div class="detail-section">
        <h3>📦 Order History</h3>
        <div class="empty-state">
          <p>This user has not placed any orders yet.</p>
        </div>
      </div>
      `
      }

      <!-- Action Buttons -->
      <div class="detail-actions">
        <button class="btn-primary" onclick="updateUserStatus(${
          user.customer_id
        })">
          🔄 Update Status
        </button>
        <button class="btn-secondary" onclick="updateUserRole(${
          user.customer_id
        })">
          🔑 Update Role
        </button>
      </div>
    </div>
  `;
}

/**
 * Update user status
 */
function updateUserStatus(userId) {
  currentUserId = userId;

  // Close user details modal if open
  hideModal(userModalOverlay);

  // Show status update modal
  showModal(statusModalOverlay);

  // Reset form
  updateStatusForm.reset();
  document.getElementById("newStatus").focus();
}

/**
 * Update user role
 */
function updateUserRole(userId) {
  currentUserId = userId;

  // Close user details modal if open
  hideModal(userModalOverlay);

  // Show role update modal
  showModal(roleModalOverlay);

  // Reset form
  updateRoleForm.reset();
  document.getElementById("newRole").focus();
}

/**
 * Handle status update form submission
 */
async function handleStatusUpdate(e) {
  e.preventDefault();

  if (!currentUserId) {
    showError("No user selected for update");
    return;
  }

  const newStatus = document.getElementById("newStatus").value;

  try {
    console.log(`Updating user ${currentUserId} status to: ${newStatus}`);

    const response = await fetch(`/api/admin/users/${currentUserId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        status: newStatus,
      }),
    });

    const data = await response.json();
    console.log("Status update response:", data);

    if (data.success) {
      showSuccess(`User #${currentUserId} status updated to ${newStatus}!`);
      hideModal(statusModalOverlay);

      // Refresh users data
      await loadUsersData();
      await loadUserStats();

      currentUserId = null;
    } else {
      showError(data.message || "Failed to update user status");
    }
  } catch (error) {
    console.error("Error updating user status:", error);
    showError("Failed to update user status. Please try again.");
  }
}

/**
 * Handle role update form submission
 */
async function handleRoleUpdate(e) {
  e.preventDefault();

  if (!currentUserId) {
    showError("No user selected for update");
    return;
  }

  const newRole = parseInt(document.getElementById("newRole").value);
  const roleName = newRole === 1 ? "Admin" : "Customer";

  try {
    console.log(`Updating user ${currentUserId} role to: ${newRole}`);

    const response = await fetch(`/api/admin/users/${currentUserId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        role: newRole,
      }),
    });

    const data = await response.json();
    console.log("Role update response:", data);

    if (data.success) {
      showSuccess(`User #${currentUserId} role updated to ${roleName}!`);
      hideModal(roleModalOverlay);

      // Refresh users data
      await loadUsersData();
      await loadUserStats();

      currentUserId = null;
    } else {
      showError(data.message || "Failed to update user role");
    }
  } catch (error) {
    console.error("Error updating user role:", error);
    showError("Failed to update user role. Please try again.");
  }
}

/**
 * Filter users based on role, status and search
 */
function filterUsers() {
  const roleValue = roleFilter.value;
  const statusValue = statusFilter.value.toLowerCase();
  const searchValue = searchUser.value.toLowerCase();

  const filteredUsers = currentUsers.filter((user) => {
    const matchesRole = !roleValue || user.user_role.toString() === roleValue;
    const matchesStatus =
      !statusValue || user.status.toLowerCase() === statusValue;
    const matchesSearch =
      !searchValue ||
      user.customer_id.toString().includes(searchValue) ||
      (user.customer_name &&
        user.customer_name.toLowerCase().includes(searchValue)) ||
      (user.customer_email &&
        user.customer_email.toLowerCase().includes(searchValue)) ||
      (user.customer_contact &&
        user.customer_contact.toLowerCase().includes(searchValue));

    return matchesRole && matchesStatus && matchesSearch;
  });

  displayUsers(filteredUsers);
}

/**
 * Refresh users data
 */
async function refreshUsersData() {
  console.log("Refreshing users data...");
  await loadUsersData();
  await loadUserStats();

  // Reset filters
  roleFilter.value = "";
  statusFilter.value = "";
  searchUser.value = "";

  showSuccess("Users data refreshed!");
}

/**
 * Export users data
 */
function exportUsersData() {
  try {
    const csvContent = generateUsersCSV(currentUsers);
    downloadCSV(csvContent, "users-export.csv");
    showSuccess("Users exported successfully!");
  } catch (error) {
    console.error("Error exporting users:", error);
    showError("Failed to export users.");
  }
}

/**
 * Generate CSV content from users
 */
function generateUsersCSV(users) {
  const headers = [
    "User ID",
    "Name",
    "Email",
    "Role",
    "Status",
    "Location",
    "Total Orders",
    "Total Spent",
    "Join Date",
  ];

  const rows = users.map((user) => [
    user.customer_id,
    user.customer_name || "",
    user.customer_email || "",
    user.user_role === 1 ? "Admin" : "Customer",
    user.status,
    `${user.customer_city || ""}, ${user.customer_country || ""}`.replace(
      ", ",
      ""
    ),
    user.total_orders || 0,
    parseFloat(user.total_spent || 0).toFixed(2),
    new Date(user.created_at).toLocaleDateString(),
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
 * Utility Functions
 */
function showLoading(show) {
  usersLoader.style.display = show ? "flex" : "none";
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
