console.log("Loading single-product.js at:", new Date().toISOString());

// Global variables
let currentProduct = null;
let currentImageIndex = 0;
let productImages = [];
let selectedQuantity = 1;

// Review-related global variables
let currentProductReviews = [];
let currentProductStats = null;
let userExistingReview = null;
let selectedReviewRating = 0;

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

  // Update cart count on page load
  await updateCartCountDisplay();

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

      // Initialize reviews after product loads
      await Promise.all([initializeReviews(productId), updateUserInfo()]);
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
                
                <div class="product-price">₵${parseFloat(
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
                        <input type="number" id="quantityInput" class="qty-input" 
                               value="1" min="1" max="${product.product_qty}" 
                               onchange="updateQuantity(this.value)">
                        <button type="button" class="quantity-btn" id="quantityPlusBtn" 
                                onclick="changeQuantity(1)">+</button>
                    </div>
                    
                    <button type="button" class="btn-cart-single" id="addToCartBtn"
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
                <div class="product-price">₵${parseFloat(
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

// Add product to cart
async function addToCart(productId) {
  try {
    console.log(
      "Adding product to cart:",
      productId,
      "Quantity:",
      selectedQuantity
    );

    // Disable button during request
    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = "Adding...";
    }

    const response = await fetch("/add-to-cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        productId: productId,
        quantity: selectedQuantity,
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Show success message with actual quantity
      showCartMessage("success", `${selectedQuantity} item(s) added to cart!`);

      // Update cart count in navigation
      await updateCartCountDisplay();

      console.log("Item added to cart successfully");
    } else {
      // Show error message
      showCartMessage("error", data.message || "Failed to add item to cart");
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    showCartMessage("error", "Failed to add item to cart. Please try again.");
  } finally {
    // Re-enable button
    if (addToCartBtn) {
      addToCartBtn.disabled = currentProduct?.product_qty === 0;
      addToCartBtn.textContent =
        currentProduct?.product_qty === 0 ? "Out of Stock" : "Add to Cart";
    }
  }
}

// Update cart count display
async function updateCartCountDisplay() {
  try {
    const response = await fetch("/get-cart/count", {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      const cartCount = data.data.itemCount || 0;
      const cartCountEl = document.getElementById("nav-cart-count");
      if (cartCountEl) {
        cartCountEl.textContent = cartCount;
      }
    }
  } catch (error) {
    console.error("Error updating cart count:", error);
  }
}

// Initialize quantity when product loads
function initializeQuantity() {
  selectedQuantity = 1;
  if (quantityInput) {
    quantityInput.value = 1;
  }
  updateQuantityButtons();
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

// Initialize reviews when product loads
async function initializeReviews(productId) {
  console.log(`Initializing reviews for product ${productId}...`);

  try {
    // Load product reviews and check user's review status
    await Promise.all([
      loadProductReviews(productId),
      checkUserExistingReview(productId),
    ]);

    setupReviewEventListeners();
  } catch (error) {
    console.error("Error initializing reviews:", error);
  }
}

// Load product reviews and statistics
async function loadProductReviews(productId) {
  try {
    console.log(`Loading reviews for product ${productId}...`);

    const response = await fetch(`/reviews/product/${productId}`);
    const data = await response.json();

    if (data.success) {
      currentProductReviews = data.data.reviews || [];
      currentProductStats = data.data.stats || {};

      console.log("Reviews loaded:", currentProductReviews.length);
      console.log("Stats:", currentProductStats);

      displayReviewsOverview();
      displayReviewsStats();
      displayReviewsList();
    } else {
      console.log("No reviews found for this product");
      displayNoReviews();
    }
  } catch (error) {
    console.error("Error loading reviews:", error);
    displayReviewsError();
  }
}

// Check user's existing review for this product
async function checkUserExistingReview(productId) {
  try {
    // Use existing core.js function
    const loggedIn = await isLoggedIn();

    if (!loggedIn) {
      showLoginPrompt();
      return;
    }

    // User is logged in, check for existing review
    const reviewResponse = await fetch(`/reviews/customer/${productId}`, {
      credentials: "include",
    });

    const reviewData = await reviewResponse.json();

    if (reviewData.success && reviewData.data) {
      // User has already reviewed this product
      userExistingReview = reviewData.data;
      showExistingReview();
    } else {
      // User hasn't reviewed this product yet
      userExistingReview = null;
      showWriteReviewPrompt();
    }
  } catch (error) {
    console.error("Error checking user review:", error);
    showLoginPrompt();
  }
}

// Display reviews overview (rating summary)
function displayReviewsOverview() {
  const overallRating = document.getElementById("overallRating");
  const overallStars = document.getElementById("overallStars");
  const ratingAverage = document.getElementById("ratingAverage");
  const totalReviews = document.getElementById("totalReviews");

  if (currentProductStats && currentProductStats.total_reviews > 0) {
    const avgRating = parseFloat(currentProductStats.average_rating) || 0;
    const totalCount = parseInt(currentProductStats.total_reviews) || 0;

    // Display star rating
    if (overallStars) {
      overallStars.innerHTML = generateStarDisplay(avgRating);
    }

    // Display average rating
    if (ratingAverage) {
      ratingAverage.textContent = avgRating.toFixed(1);
    }

    // Display total reviews
    if (totalReviews) {
      totalReviews.textContent = `${totalCount} review${
        totalCount !== 1 ? "s" : ""
      }`;
    }
  } else {
    // No reviews yet
    if (overallStars) {
      overallStars.innerHTML = generateStarDisplay(0);
    }
    if (ratingAverage) {
      ratingAverage.textContent = "0.0";
    }
    if (totalReviews) {
      totalReviews.textContent = "No reviews yet";
    }
  }
}

// Display rating statistics (breakdown)
function displayReviewsStats() {
  if (!currentProductStats || currentProductStats.total_reviews === 0) {
    // Hide stats section if no reviews
    const statsSection = document.getElementById("reviewsStats");
    if (statsSection) {
      statsSection.style.display = "none";
    }
    return;
  }

  const totalReviews = parseInt(currentProductStats.total_reviews);
  const stats = {
    5: parseInt(currentProductStats.five_star) || 0,
    4: parseInt(currentProductStats.four_star) || 0,
    3: parseInt(currentProductStats.three_star) || 0,
    2: parseInt(currentProductStats.two_star) || 0,
    1: parseInt(currentProductStats.one_star) || 0,
  };

  // Update each rating bar
  for (let rating = 1; rating <= 5; rating++) {
    const count = stats[rating];
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

    const progressBar = document.getElementById(`progress-${rating}`);
    const countElement = document.getElementById(`count-${rating}`);

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    if (countElement) {
      countElement.textContent = count;
    }
  }

  // Show stats section
  const statsSection = document.getElementById("reviewsStats");
  if (statsSection) {
    statsSection.style.display = "block";
  }
}

// Display list of individual reviews
function displayReviewsList() {
  const reviewsContainer = document.getElementById("reviewsContainer");
  const reviewsLoading = document.getElementById("reviewsLoading");
  const noReviews = document.getElementById("noReviews");

  // Hide loading
  if (reviewsLoading) {
    reviewsLoading.style.display = "none";
  }

  if (!currentProductReviews || currentProductReviews.length === 0) {
    if (noReviews) {
      noReviews.style.display = "block";
    }
    if (reviewsContainer) {
      reviewsContainer.innerHTML = "";
    }
    return;
  }

  // Hide no reviews message
  if (noReviews) {
    noReviews.style.display = "none";
  }

  // Generate reviews HTML
  const reviewsHTML = currentProductReviews
    .map((review) => {
      const reviewDate = new Date(review.created_at).toLocaleDateString();
      const customerName = review.customer_name || "Anonymous";

      return `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-name">${customerName}</div>
            <div class="review-date">${reviewDate}</div>
            ${
              review.is_verified_purchase
                ? '<span class="verified-badge">✓ Verified Purchase</span>'
                : ""
            }
          </div>
          <div class="review-rating">
            ${generateStarDisplay(review.rating)}
          </div>
        </div>
        
        <div class="review-content">
          <h4 class="review-title">${review.review_title}</h4>
          ${
            review.review_text
              ? `<p class="review-text">${review.review_text}</p>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  if (reviewsContainer) {
    reviewsContainer.innerHTML = reviewsHTML;
  }
}

// Generate star display HTML
function generateStarDisplay(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHTML = "";

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHTML += "⭐";
  }

  // Half star
  if (hasHalfStar) {
    starsHTML += "⯪";
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += "☆";
  }

  return `<span class="stars-display">${starsHTML}</span>`;
}

// Show login prompt
function showLoginPrompt() {
  const writeReviewSection = document.getElementById("writeReviewSection");
  const reviewPrompt = document.getElementById("reviewPrompt");
  const loginPrompt = document.getElementById("loginPrompt");

  if (reviewPrompt) reviewPrompt.style.display = "none";
  if (loginPrompt) loginPrompt.style.display = "block";
}

// Show write review prompt
function showWriteReviewPrompt() {
  const reviewPrompt = document.getElementById("reviewPrompt");
  const loginPrompt = document.getElementById("loginPrompt");
  const existingReview = document.getElementById("existingReview");

  if (reviewPrompt) reviewPrompt.style.display = "block";
  if (loginPrompt) loginPrompt.style.display = "none";
  if (existingReview) existingReview.style.display = "none";
}

// Show existing review
function showExistingReview() {
  const reviewPrompt = document.getElementById("reviewPrompt");
  const loginPrompt = document.getElementById("loginPrompt");
  const existingReview = document.getElementById("existingReview");
  const userReviewCard = document.getElementById("userReviewCard");

  if (reviewPrompt) reviewPrompt.style.display = "none";
  if (loginPrompt) loginPrompt.style.display = "none";
  if (existingReview) existingReview.style.display = "block";

  if (userExistingReview && userReviewCard) {
    const reviewDate = new Date(
      userExistingReview.created_at
    ).toLocaleDateString();

    userReviewCard.innerHTML = `
      <div class="review-header">
        <div class="review-rating">
          ${generateStarDisplay(userExistingReview.rating)}
        </div>
        <div class="review-date">${reviewDate}</div>
      </div>
      <div class="review-content">
        <h4 class="review-title">${userExistingReview.review_title}</h4>
        ${
          userExistingReview.review_text
            ? `<p class="review-text">${userExistingReview.review_text}</p>`
            : ""
        }
      </div>
    `;
  }
}

// Setup review event listeners
function setupReviewEventListeners() {
  // Star rating input
  const starInputs = document.querySelectorAll("#starRatingInput .star");
  starInputs.forEach((star, index) => {
    star.addEventListener("click", () => selectRating(index + 1));
    star.addEventListener("mouseenter", () => highlightStars(index + 1));
  });

  // Star rating container mouse leave
  const starContainer = document.getElementById("starRatingInput");
  if (starContainer) {
    starContainer.addEventListener("mouseleave", () =>
      highlightStars(selectedReviewRating)
    );
  }

  // Review form submission
  const reviewForm = document.getElementById("submitReviewForm");
  if (reviewForm) {
    reviewForm.addEventListener("submit", submitReview);
  }

  // Character counter for review text
  const reviewText = document.getElementById("reviewText");
  if (reviewText) {
    reviewText.addEventListener("input", updateCharacterCount);
  }
}

// Select rating
function selectRating(rating) {
  selectedReviewRating = rating;
  document.getElementById("selectedRating").value = rating;
  highlightStars(rating);
}

// Highlight stars
function highlightStars(count) {
  const stars = document.querySelectorAll("#starRatingInput .star");
  stars.forEach((star, index) => {
    if (index < count) {
      star.style.color = "#ffd700"; // Gold color for selected
      star.style.filter = "none";
    } else {
      star.style.color = "#ddd"; // Gray color for unselected
      star.style.filter = "grayscale(100%)";
    }
  });
}

// Show review form
function showReviewForm() {
  const reviewPrompt = document.getElementById("reviewPrompt");
  const reviewForm = document.getElementById("reviewForm");

  if (reviewPrompt) reviewPrompt.style.display = "none";
  if (reviewForm) reviewForm.style.display = "block";

  // Reset form
  resetReviewForm();
}

// Hide review form
function hideReviewForm() {
  const reviewPrompt = document.getElementById("reviewPrompt");
  const reviewForm = document.getElementById("reviewForm");

  if (reviewPrompt) reviewPrompt.style.display = "block";
  if (reviewForm) reviewForm.style.display = "none";

  // Reset form
  resetReviewForm();
}

// Reset review form
function resetReviewForm() {
  selectedReviewRating = 0;
  document.getElementById("selectedRating").value = "";
  document.getElementById("reviewTitle").value = "";
  document.getElementById("reviewText").value = "";
  highlightStars(0);
  updateCharacterCount();
}

// Update character count
function updateCharacterCount() {
  const reviewText = document.getElementById("reviewText");
  const charCount = document.querySelector(".char-count");

  if (reviewText && charCount) {
    const currentLength = reviewText.value.length;
    charCount.textContent = `${currentLength} / 1000 characters`;
  }
}

// Submit review
// Submit review
async function submitReview(event) {
  event.preventDefault();

  const productId = getProductIdFromUrl();
  if (!productId) {
    showMessageModal("error", "Invalid product ID");
    return;
  }

  // Get form data
  const rating = selectedReviewRating;
  const title = document.getElementById("reviewTitle").value.trim();
  const text = document.getElementById("reviewText").value.trim();

  // Validation
  if (!rating || rating < 1 || rating > 5) {
    showMessageModal("error", "Please select a rating");
    return;
  }

  if (!title) {
    showMessageModal("error", "Please enter a review title");
    return;
  }

  try {
    // Show loading state
    const submitBtn = document.querySelector(
      '#submitReviewForm button[type="submit"]'
    );
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    let response, data;

    if (userExistingReview && userExistingReview.review_id) {
      console.log("Updating existing review:", userExistingReview.review_id);

      // UPDATE existing review
      response = await fetch(`/reviews/${userExistingReview.review_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          rating: rating,
          review_title: title,
          review_text: text,
        }),
      });
    } else {
      console.log("Adding new review for product:", productId);

      // ADD new review
      response = await fetch("/reviews/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          product_id: productId,
          rating: rating,
          review_title: title,
          review_text: text,
        }),
      });
    }

    data = await response.json();

    if (data.success) {
      const message = userExistingReview
        ? "Review updated successfully!"
        : "Review submitted successfully!";
      showMessageModal("success", message);

      // Hide form and refresh reviews
      hideReviewForm();
      await loadProductReviews(productId);
      await checkUserExistingReview(productId);
    } else {
      showMessageModal("error", data.message || "Failed to submit review");
    }
  } catch (error) {
    console.error("Error submitting review:", error);
    showMessageModal("error", "Failed to submit review. Please try again.");
  } finally {
    // Reset submit button
    const submitBtn = document.querySelector(
      '#submitReviewForm button[type="submit"]'
    );
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "📝 Submit Review";
    }
  }
}

// Edit existing review
function editExistingReview() {
  // Pre-fill form with existing data
  if (userExistingReview) {
    selectedReviewRating = userExistingReview.rating;
    document.getElementById("selectedRating").value = userExistingReview.rating;
    document.getElementById("reviewTitle").value =
      userExistingReview.review_title;
    document.getElementById("reviewText").value =
      userExistingReview.review_text || "";
    highlightStars(userExistingReview.rating);
    updateCharacterCount();
  }

  // Show form
  const existingReview = document.getElementById("existingReview");
  const reviewForm = document.getElementById("reviewForm");

  if (existingReview) existingReview.style.display = "none";
  if (reviewForm) reviewForm.style.display = "block";

  // Change submit button text
  const submitBtn = document.querySelector(
    '#submitReviewForm button[type="submit"]'
  );
  if (submitBtn) {
    submitBtn.textContent = "✏️ Update Review";
  }
}

// Delete existing review
async function deleteExistingReview() {
  if (
    !userExistingReview ||
    !confirm("Are you sure you want to delete your review?")
  ) {
    return;
  }

  try {
    const response = await fetch(`/reviews/${userExistingReview.review_id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      showMessageModal("success", "Review deleted successfully");

      // Refresh reviews and user status
      const productId = getProductIdFromUrl();
      await loadProductReviews(productId);
      await checkUserExistingReview(productId);
    } else {
      showMessageModal("error", data.message || "Failed to delete review");
    }
  } catch (error) {
    console.error("Error deleting review:", error);
    showMessageModal("error", "Failed to delete review. Please try again.");
  }
}

// Display no reviews state
function displayNoReviews() {
  const reviewsLoading = document.getElementById("reviewsLoading");
  const noReviews = document.getElementById("noReviews");
  const reviewsContainer = document.getElementById("reviewsContainer");

  if (reviewsLoading) reviewsLoading.style.display = "none";
  if (noReviews) noReviews.style.display = "block";
  if (reviewsContainer) reviewsContainer.innerHTML = "";

  // Hide stats section
  const statsSection = document.getElementById("reviewsStats");
  if (statsSection) statsSection.style.display = "none";

  displayReviewsOverview(); // Still show 0.0 rating
}

// Display reviews error
function displayReviewsError() {
  const reviewsLoading = document.getElementById("reviewsLoading");
  const reviewsContainer = document.getElementById("reviewsContainer");

  if (reviewsLoading) reviewsLoading.style.display = "none";

  if (reviewsContainer) {
    reviewsContainer.innerHTML = `
      <div class="reviews-error">
        <p>Failed to load reviews. Please refresh the page.</p>
      </div>
    `;
  }
}

// Show message modal
function showMessageModal(type, message) {
  const modal = document.getElementById("messageModal");
  const icon = document.getElementById("messageIcon");
  const text = document.getElementById("messageText");

  if (!modal || !icon || !text) return;

  // Set icon based on type
  if (type === "success") {
    icon.textContent = "✅";
    icon.style.color = "#10B981";
  } else if (type === "error") {
    icon.textContent = "❌";
    icon.style.color = "#EF4444";
  }

  text.textContent = message;
  modal.style.display = "flex";

  // Auto-hide after 3 seconds
  setTimeout(() => {
    modal.style.display = "none";
  }, 3000);
}

// Close message modal
function closeMessageModal() {
  const modal = document.getElementById("messageModal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function updateUserInfo() {
  console.log("=== SINGLE PRODUCT USER INFO UPDATE ===");

  const loggedIn = await isLoggedIn();
  console.log("Is logged in:", loggedIn);

  if (!loggedIn) {
    console.log("User not logged in, showing login/register links");
    // Not logged in - show login/register
    document.getElementById("userInfo").innerHTML =
      '<a href="/pages/login.html" class="nav-link">Login</a><a href="/pages/register.html" class="nav-link">Register</a>';
  } else {
    // User is logged in
    console.log("User is logged in, getting user data...");

    const response = await getCurrentUser();
    console.log("getCurrentUser full response:", response);

    const currentUser = response?.data;
    console.log("Current user from data:", currentUser);

    if (currentUser && currentUser.name) {
      console.log("User data found, updating UI...");

      // Show user info and logout - same as home.html
      document.getElementById(
        "userInfo"
      ).innerHTML = `<span class="nav-user">Hi, ${currentUser.name}</span><button id="logoutBtn" class="nav-logout-btn">Logout</button>`;

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
          try {
            console.log("Logging out...");
            const res = await fetch("/logout", { method: "POST" });
            const data = await res.json();
            if (data.success) {
              console.log("Logout successful");
              window.location.href = "/pages/login.html";
            } else {
              console.log("Logout failed:", data);
              alert("Logout failed. Try again.");
            }
          } catch (err) {
            console.error("Error logging out:", err);
            alert("Something went wrong.");
          }
        });
      }
    } else {
      console.log("No user data found or invalid structure");
      console.log("Response structure:", response);

      // Fallback - show login/register links
      document.getElementById("userInfo").innerHTML =
        '<a href="/pages/login.html" class="nav-link">Login</a><a href="/pages/register.html" class="nav-link">Register</a>';
    }
  }
}
