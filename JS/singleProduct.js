console.log("Loading single-product.js at:", new Date().toISOString());

// Global variables
let currentProduct = null;
let currentImageIndex = 0;
let productImages = [];
let selectedQuantity = 1;

// DOM elements
let productContent, breadcrumb, imageModal, modalImage, modalClose;
let mainImage, thumbnailContainer, quantityInput, addToCartBtn;
let quantityMinusBtn, quantityPlusBtn;

// Get product ID from URL
function getProductIdFromUrl() {
  const pathParts = window.location.pathname.split("/");
  const productIndex = pathParts.indexOf("product");
  if (productIndex !== -1 && pathParts[productIndex + 1]) {
    return parseInt(pathParts[productIndex + 1]);
  }
  return null;
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Loading single product page...");

  // Get DOM elements
  initializeElements();

  // Set up event listeners
  setupEventListeners();

  // Get product ID from URL
  const productId = getProductIdFromUrl();

  if (!productId) {
    showError("Invalid product ID");
    return;
  }

  // Load product data
  await loadProduct(productId);

  console.log("Single product page initialized");
});

// Initialize DOM elements
function initializeElements() {
  productContent = document.getElementById("productContent");
  breadcrumb = document.getElementById("breadcrumb");
  imageModal = document.getElementById("imageModal");
  modalImage = document.getElementById("modalImage");
  modalClose = document.getElementById("modalClose");
}

// Set up event listeners
function setupEventListeners() {
  // Image modal
  modalClose?.addEventListener("click", closeImageModal);
  imageModal?.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      closeImageModal();
    }
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageModal?.style.display === "flex") {
      closeImageModal();
    }
  });
}

// Load product data
async function loadProduct(productId) {
  try {
    console.log(`Loading product ${productId}...`);

    // Show loading
    showLoading();

    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();

    console.log("Product data:", data);

    if (data.success && data.product) {
      currentProduct = data.product;
      displayProduct(data.product);
      updateBreadcrumb(data.product);
    } else {
      showError(data.message || "Product not found");
    }
  } catch (error) {
    console.error("Error loading product:", error);
    showError("Failed to load product. Please try again.");
  }
}

// Display product information
function displayProduct(product) {
  if (!productContent) return;

  // Process product images
  productImages = [];
  if (product.product_images && product.product_images.length > 0) {
    productImages = product.product_images;
  } else if (product.product_image) {
    try {
      const parsed =
        typeof product.product_image === "string"
          ? JSON.parse(product.product_image)
          : product.product_image;
      productImages = Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error("Error parsing product images:", error);
      productImages = [];
    }
  }

  // Default image if none available
  if (productImages.length === 0) {
    productImages = ["/images/no-image.png"];
  }

  // Get stock status
  const stockStatus = getStockStatus(product.product_qty);

  // Process keywords
  const keywords = product.product_keywords
    ? product.product_keywords.split(",").map((k) => k.trim())
    : [];

  // Create product HTML
  const productHtml = `
        <div class="product-details">
            <!-- Product Images -->
            <div class="product-images">
                <div class="main-image-container">
                    <img src="/${productImages[0]}" alt="${
    product.product_title
  }" 
                         class="main-image" id="mainImage"
                         onerror="this.src='/images/no-image.png'"
                         onclick="openImageModal('/${productImages[0]}')">
                    <div class="image-zoom" onclick="openImageModal('/${
                      productImages[0]
                    }')">
                        Click to zoom
                    </div>
                </div>
                
                ${
                  productImages.length > 1
                    ? `
                    <div class="thumbnail-container" id="thumbnailContainer">
                        ${productImages
                          .map(
                            (image, index) => `
                            <img src="/${image}" alt="${product.product_title}" 
                                 class="thumbnail ${
                                   index === 0 ? "active" : ""
                                 }"
                                 onerror="this.src='/images/no-image.png'"
                                 onclick="changeMainImage(${index}, '/${image}')">
                        `
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
            </div>
            
            <!-- Product Information -->
            <div class="product-info">
                <div class="product-meta">
                    <div class="product-category">${product.cat_name}</div>
                    <div class="product-brand">${product.brand_name}</div>
                </div>
                
                <h1 class="product-title">${product.product_title}</h1>
                
                <div class="product-price">$${parseFloat(
                  product.product_price
                ).toFixed(2)}</div>
                
                <div class="product-stock ${stockStatus.class}">
                    ${stockStatus.text}
                </div>
                
                <div class="product-description">
                    <p>${
                      product.product_desc || "No description available."
                    }</p>
                </div>
                
                ${
                  keywords.length > 0
                    ? `
                    <div class="product-keywords">
                        <h4>Tags</h4>
                        <div class="keywords-list">
                            ${keywords
                              .map(
                                (keyword) => `
                                <span class="keyword-tag">${keyword}</span>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                `
                    : ""
                }
                
                <div class="product-actions">
                    <div class="quantity-selector">
                        <label for="quantityInput">Quantity:</label>
                        <button type="button" class="quantity-btn" id="quantityMinusBtn" 
                                onclick="changeQuantity(-1)">−</button>
                        <input type="number" id="quantityInput" class="quantity-input" 
                               value="1" min="1" max="${product.product_qty}" 
                               onchange="updateQuantity(this.value)">
                        <button type="button" class="quantity-btn" id="quantityPlusBtn" 
                                onclick="changeQuantity(1)">+</button>
                    </div>
                    
                    <button type="button" class="btn-add-cart" id="addToCartBtn"
                            ${product.product_qty === 0 ? "disabled" : ""}
                            onclick="addToCart(${product.product_id})">
                        ${
                          product.product_qty === 0
                            ? "Out of Stock"
                            : "Add to Cart"
                        }
                    </button>
                    
                    <a href="/all-products" class="btn-back">← Back to Products</a>
                </div>
            </div>
        </div>
        
        <div class="related-products">
            <h3>Related Products</h3>
            <div id="relatedProductsGrid">
                <!-- Related products will be loaded here -->
            </div>
        </div>
    `;

  productContent.innerHTML = productHtml;

  // Update DOM element references
  updateDOMReferences();

  // Load related products
  loadRelatedProducts(product.product_cat, product.product_id);
}

// Update DOM element references after content is created
function updateDOMReferences() {
  mainImage = document.getElementById("mainImage");
  thumbnailContainer = document.getElementById("thumbnailContainer");
  quantityInput = document.getElementById("quantityInput");
  addToCartBtn = document.getElementById("addToCartBtn");
  quantityMinusBtn = document.getElementById("quantityMinusBtn");
  quantityPlusBtn = document.getElementById("quantityPlusBtn");
}

// Get stock status information
function getStockStatus(quantity) {
  if (quantity === 0) {
    return {
      class: "out-of-stock",
      text: "Out of Stock",
    };
  } else if (quantity < 5) {
    return {
      class: "low-stock",
      text: `Only ${quantity} left in stock`,
    };
  } else {
    return {
      class: "in-stock",
      text: `In Stock (${quantity} available)`,
    };
  }
}

// Update breadcrumb
function updateBreadcrumb(product) {
  if (!breadcrumb) return;

  breadcrumb.innerHTML = `
        <a href="/">Home</a> > 
        <a href="/all-products">All Products</a> > 
        <a href="/all-products?category=${product.product_cat}">${product.cat_name}</a> > 
        <span>${product.product_title}</span>
    `;
}

// Change main image
function changeMainImage(index, imageSrc) {
  if (!mainImage) return;

  currentImageIndex = index;
  mainImage.src = imageSrc;
  mainImage.onclick = () => openImageModal(imageSrc);

  // Update zoom button
  const zoomBtn = document.querySelector(".image-zoom");
  if (zoomBtn) {
    zoomBtn.onclick = () => openImageModal(imageSrc);
  }

  // Update thumbnail active state
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumb, i) => {
    thumb.classList.toggle("active", i === index);
  });
}

// Open image modal
function openImageModal(imageSrc) {
  if (!imageModal || !modalImage) return;

  modalImage.src = imageSrc;
  imageModal.style.display = "flex";
  document.body.style.overflow = "hidden"; // Prevent background scroll
}

// Close image modal
function closeImageModal() {
  if (!imageModal) return;

  imageModal.style.display = "none";
  document.body.style.overflow = "auto"; // Restore scroll
}

// Change quantity
function changeQuantity(delta) {
  if (!quantityInput || !currentProduct) return;

  const currentValue = parseInt(quantityInput.value) || 1;
  const newValue = Math.max(
    1,
    Math.min(currentProduct.product_qty, currentValue + delta)
  );

  quantityInput.value = newValue;
  selectedQuantity = newValue;

  // Update button states
  updateQuantityButtons();
}

// Update quantity from input
function updateQuantity(value) {
  if (!currentProduct) return;

  const numValue = parseInt(value) || 1;
  const clampedValue = Math.max(
    1,
    Math.min(currentProduct.product_qty, numValue)
  );

  selectedQuantity = clampedValue;

  if (quantityInput) {
    quantityInput.value = clampedValue;
  }

  updateQuantityButtons();
}

// Update quantity button states
function updateQuantityButtons() {
  if (!quantityMinusBtn || !quantityPlusBtn || !currentProduct) return;

  quantityMinusBtn.disabled = selectedQuantity <= 1;
  quantityPlusBtn.disabled = selectedQuantity >= currentProduct.product_qty;
}

// Load related products
async function loadRelatedProducts(categoryId, excludeProductId) {
  try {
    console.log(`Loading related products for category ${categoryId}...`);

    const response = await fetch(
      `/api/products/category/${categoryId}?limit=4`
    );
    const data = await response.json();

    if (data.success && data.products) {
      // Filter out current product
      const relatedProducts = data.products.filter(
        (p) => p.product_id !== excludeProductId
      );
      displayRelatedProducts(relatedProducts.slice(0, 4)); // Show max 4
    }
  } catch (error) {
    console.error("Error loading related products:", error);
  }
}

// Display related products
function displayRelatedProducts(products) {
  const relatedGrid = document.getElementById("relatedProductsGrid");
  if (!relatedGrid) return;

  if (!products || products.length === 0) {
    relatedGrid.innerHTML = "<p>No related products found.</p>";
    return;
  }

  const relatedHtml = `
        <div class="products-grid customer">
            ${products
              .map((product) => createRelatedProductCard(product))
              .join("")}
        </div>
    `;

  relatedGrid.innerHTML = relatedHtml;
}

// Create related product card (simplified version)
function createRelatedProductCard(product) {
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
            </div>
            <div class="product-info">
                <div class="product-category">${product.cat_name}</div>
                <div class="product-title">${product.product_title}</div>
                <div class="product-brand">${product.brand_name}</div>
                <div class="product-price">$${parseFloat(
                  product.product_price
                ).toFixed(2)}</div>
                <div class="product-actions">
                    <a href="/product/${
                      product.product_id
                    }" class="btn-view">View Details</a>
                </div>
            </div>
        </div>
    `;
}

// Show loading state
function showLoading() {
  if (productContent) {
    productContent.innerHTML = `
            <div class="loading">
                <p>Loading product details...</p>
            </div>
        `;
  }
}

// Show error state
function showError(message) {
  if (productContent) {
    productContent.innerHTML = `
            <div class="error-message">
                <h3>Product Not Found</h3>
                <p>${message}</p>
                <a href="/all-products" class="btn-view">Browse All Products</a>
            </div>
        `;
  }
}

// Add to cart function (placeholder for now)
function addToCart(productId) {
  if (!currentProduct || currentProduct.product_qty === 0) {
    alert("This product is out of stock");
    return;
  }

  alert(
    `Add to Cart functionality coming soon!\nProduct: ${currentProduct.product_title}\nQuantity: ${selectedQuantity}`
  );
  console.log("Adding to cart:", {
    productId: productId,
    quantity: selectedQuantity,
    product: currentProduct,
  });
}

// Initialize quantity when product loads
function initializeQuantity() {
  selectedQuantity = 1;
  if (quantityInput) {
    quantityInput.value = 1;
  }
  updateQuantityButtons();
}
