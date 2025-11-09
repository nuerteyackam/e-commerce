console.log("Loading customer products.js at:", new Date().toISOString());

// Global variables
let currentPage = 1;
let currentLimit = 12;
let currentFilters = {
  search: "",
  category: "",
  brand: "",
};
let currentSort = "newest";
let allCategories = [];
let allBrands = [];

// DOM elements
let productsGrid, productsCount, pagination, paginationInfo;
let categoryFilter, brandFilter, searchInput, searchBtn, clearBtn;
let prevBtn, nextBtn, sortSelect;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Loading customer products page...");

  // Get DOM elements
  initializeElements();

  // Set up event listeners
  setupEventListeners();

  // Load initial data
  await loadInitialData();

  // Load products
  await loadProducts();

  // Load cart count
  await loadCartCount();

  console.log("Customer products page initialized");
});

// Initialize DOM elements
function initializeElements() {
  productsGrid = document.getElementById("productsGrid");
  productsCount = document.getElementById("productsCount");
  pagination = document.getElementById("pagination");
  paginationInfo = document.getElementById("paginationInfo");

  categoryFilter = document.getElementById("categoryFilter");
  brandFilter = document.getElementById("brandFilter");
  searchInput = document.getElementById("searchInput");
  searchBtn = document.getElementById("searchBtn");
  clearBtn = document.getElementById("clearBtn");

  prevBtn = document.getElementById("prevBtn");
  nextBtn = document.getElementById("nextBtn");
  sortSelect = document.getElementById("sortSelect");
}

// Set up event listeners
function setupEventListeners() {
  // Search functionality
  searchBtn?.addEventListener("click", handleSearch);
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });
  clearBtn?.addEventListener("click", handleClear);

  // Filter changes
  categoryFilter?.addEventListener("change", handleCategoryFilter);
  brandFilter?.addEventListener("change", handleBrandFilter);

  // Sorting
  sortSelect?.addEventListener("change", handleSort);

  // Pagination
  prevBtn?.addEventListener("click", () => changePage(currentPage - 1));
  nextBtn?.addEventListener("click", () => changePage(currentPage + 1));
}

// Load categories and brands for filters
async function loadInitialData() {
  try {
    console.log("Loading categories and brands...");

    // Load categories
    const categoriesResponse = await fetch("/fetch-categories");
    const categoriesData = await categoriesResponse.json();

    if (categoriesData.success && categoriesData.categories) {
      allCategories = categoriesData.categories;
      populateCategoryFilter();
    }

    // Load brands
    const brandsResponse = await fetch("/fetch-brands");
    const brandsData = await brandsResponse.json();

    if (brandsData.success && brandsData.brands) {
      allBrands = brandsData.brands;
      populateBrandFilter();
    }

    console.log("Categories and brands loaded");
  } catch (error) {
    console.error("Error loading initial data:", error);
  }
}

// Populate category filter dropdown
function populateCategoryFilter() {
  if (!categoryFilter) return;

  categoryFilter.innerHTML = '<option value="">All Categories</option>';

  allCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.cat_id;
    option.textContent = category.cat_name;
    categoryFilter.appendChild(option);
  });
}

// Populate brand filter dropdown
function populateBrandFilter() {
  if (!brandFilter) return;

  brandFilter.innerHTML = '<option value="">All Brands</option>';

  allBrands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand.brand_id;
    option.textContent = brand.brand_name;
    brandFilter.appendChild(option);
  });
}

// Load and display products
async function loadProducts() {
  try {
    console.log("Loading products...", currentFilters);

    // Show loading
    showLoading();

    // Build API URL based on current filters
    const apiUrl = buildApiUrl();
    console.log("API URL:", apiUrl);

    const response = await fetch(apiUrl);
    const data = await response.json();

    console.log("Products data:", data);

    if (data.success) {
      displayProducts(data.products);
      updateProductsCount(data.total, data.page, data.limit);
      updatePagination(data.page, data.totalPages, data.total);
    } else {
      showError(data.message || "Failed to load products");
    }
  } catch (error) {
    console.error("Error loading products:", error);
    showError("Failed to load products. Please try again.");
  }
}

// Build API URL based on current filters
function buildApiUrl() {
  const params = new URLSearchParams();
  params.append("page", currentPage);
  params.append("limit", currentLimit);

  // Determine which API endpoint to use
  let baseUrl = "/api/products";

  if (currentFilters.search && currentFilters.search.trim()) {
    if (currentFilters.category || currentFilters.brand) {
      // Use advanced search if we have search + filters
      baseUrl += "/advanced-search";
      params.append("q", currentFilters.search.trim());
      if (currentFilters.category)
        params.append("category", currentFilters.category);
      if (currentFilters.brand) params.append("brand", currentFilters.brand);
    } else {
      // Use simple search
      baseUrl += "/search";
      params.append("q", currentFilters.search.trim());
    }
  } else if (currentFilters.category) {
    // Filter by category only
    baseUrl += `/category/${currentFilters.category}`;
  } else if (currentFilters.brand) {
    // Filter by brand only
    baseUrl += `/brand/${currentFilters.brand}`;
  }
  // If no filters, use base URL (all products)

  return `${baseUrl}?${params.toString()}`;
}

// Display products in grid
function displayProducts(products) {
  if (!productsGrid) return;

  if (!products || products.length === 0) {
    productsGrid.innerHTML = `
            <div class="no-products">
                <h3>No products found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
    return;
  }

  // Sort products if needed
  const sortedProducts = sortProducts(products);

  const productsHtml = sortedProducts
    .map((product) => createProductCard(product))
    .join("");
  productsGrid.innerHTML = productsHtml;
}

// Create individual product card HTML
function createProductCard(product) {
  const stockStatus = getStockStatus(product.product_qty);
  const stockClass = stockStatus.class;
  const stockText = stockStatus.text;
  const stockBadge = stockStatus.badge;

  // Get first image or fallback
  const productImages = product.product_images || [];
  const imageUrl =
    productImages.length > 0 ? `/${productImages[0]}` : "/images/no-image.png";

  return `
        <div class="product-card customer">
            <div class="product-image-container">
                <img src="${imageUrl}" alt="${
    product.product_title
  }" class="product-image"
                     onerror="this.src='/images/no-image.png'">
                ${
                  stockBadge
                    ? `<div class="product-badge ${stockClass}">${stockBadge}</div>`
                    : ""
                }
            </div>
            <div class="product-info">
                <div class="product-category">${product.cat_name}</div>
                <div class="product-title">${product.product_title}</div>
                <div class="product-brand">${product.brand_name}</div>
                <div class="product-price">$${parseFloat(
                  product.product_price
                ).toFixed(2)}</div>
                <div class="product-stock ${stockClass}">${stockText}</div>
                <div class="product-actions">
                    <a href="/product/${
                      product.product_id
                    }" class="btn-view">View Details</a>
                    <button class="btn-cart" 
                            ${product.product_qty === 0 ? "disabled" : ""}
                            onclick="addToCart(${product.product_id})">
                        ${
                          product.product_qty === 0
                            ? "Out of Stock"
                            : "Add to Cart"
                        }
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get stock status information
function getStockStatus(quantity) {
  if (quantity === 0) {
    return {
      class: "out-of-stock",
      text: "Out of Stock",
      badge: "Out of Stock",
    };
  } else if (quantity < 5) {
    return {
      class: "low-stock",
      text: `Only ${quantity} left`,
      badge: "Low Stock",
    };
  } else {
    return {
      class: "in-stock",
      text: `In Stock (${quantity})`,
      badge: null,
    };
  }
}

// Sort products based on current sort option
function sortProducts(products) {
  const sorted = [...products];

  switch (currentSort) {
    case "price_asc":
      return sorted.sort(
        (a, b) => parseFloat(a.product_price) - parseFloat(b.product_price)
      );
    case "price_desc":
      return sorted.sort(
        (a, b) => parseFloat(b.product_price) - parseFloat(a.product_price)
      );
    case "name_asc":
      return sorted.sort((a, b) =>
        a.product_title.localeCompare(b.product_title)
      );
    case "name_desc":
      return sorted.sort((a, b) =>
        b.product_title.localeCompare(a.product_title)
      );
    case "newest":
    default:
      return sorted.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
  }
}

// Update products count display
function updateProductsCount(total, page, limit) {
  if (!productsCount) return;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (total === 0) {
    productsCount.textContent = "No products found";
  } else {
    productsCount.textContent = `Showing ${start}-${end} of ${total} products`;
  }
}

// Update pagination controls
function updatePagination(page, totalPages, total) {
  if (!pagination || !paginationInfo) return;

  if (totalPages <= 1) {
    pagination.style.display = "none";
    return;
  }

  pagination.style.display = "flex";

  // Update pagination info
  paginationInfo.textContent = `Page ${page} of ${totalPages}`;

  // Update button states
  if (prevBtn) {
    prevBtn.disabled = page <= 1;
  }
  if (nextBtn) {
    nextBtn.disabled = page >= totalPages;
  }
}

// Handle search
function handleSearch() {
  const query = searchInput?.value.trim() || "";
  currentFilters.search = query;
  currentPage = 1;
  loadProducts();
}

// Handle clear filters
function handleClear() {
  // Reset filters
  currentFilters = {
    search: "",
    category: "",
    brand: "",
  };
  currentPage = 1;

  // Reset UI
  if (searchInput) searchInput.value = "";
  if (categoryFilter) categoryFilter.value = "";
  if (brandFilter) brandFilter.value = "";
  if (sortSelect) sortSelect.value = "newest";
  currentSort = "newest";

  loadProducts();
}

// Handle category filter change
function handleCategoryFilter() {
  currentFilters.category = categoryFilter?.value || "";
  currentPage = 1;
  loadProducts();
}

// Handle brand filter change
function handleBrandFilter() {
  currentFilters.brand = brandFilter?.value || "";
  currentPage = 1;
  loadProducts();
}

// Handle sort change
function handleSort() {
  currentSort = sortSelect?.value || "newest";
  loadProducts();
}

// Change page
function changePage(newPage) {
  currentPage = newPage;
  loadProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Show loading state
function showLoading() {
  if (productsGrid) {
    productsGrid.innerHTML = `
            <div class="loading">
                <p>Loading products...</p>
            </div>
        `;
  }
}

// Show error state
function showError(message) {
  if (productsGrid) {
    productsGrid.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="loadProducts()" class="btn-view">Try Again</button>
            </div>
        `;
  }
}

// Add product to cart
async function addToCart(productId) {
  try {
    console.log("Adding product to cart:", productId);

    const response = await fetch("/add-to-cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        productId: productId,
        quantity: 1,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Show success message
      showCartMessage("success", "Item added to cart!");

      // Update cart count in navigation (if you have one)
      updateCartCount(data.cartCount);

      console.log("Item added to cart successfully");
    } else {
      // Show error message
      showCartMessage("error", data.message || "Failed to add item to cart");
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    showCartMessage("error", "Failed to add item to cart. Please try again.");
  }
}

// Load cart count on page load
async function loadCartCount() {
  try {
    const response = await fetch("/get-cart/count", {
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      updateCartCount(data.data.totalQuantity);
    }
  } catch (error) {
    console.error("Error loading cart count:", error);
  }
}

// Helper function to update cart count in navigation
function updateCartCount(count) {
  const cartCountElements = document.querySelectorAll(
    ".cart-count, #cart-count, .nav-cart-count"
  );
  cartCountElements.forEach((element) => {
    element.textContent = count || 0;
  });
}

// Helper function to show cart messages
function showCartMessage(type, message) {
  // Create message element
  const messageEl = document.createElement("div");
  messageEl.className = `cart-message ${type}`;
  messageEl.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;

  document.body.appendChild(messageEl);

  // Auto remove after 4 seconds
  setTimeout(() => {
    if (messageEl.parentElement) {
      messageEl.remove();
    }
  }, 4000);
}
