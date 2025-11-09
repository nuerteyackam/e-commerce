// Check if user is logged in and is admin when page loads
document.addEventListener("DOMContentLoaded", async () => {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    window.location.href = "/pages/login.html";
    return;
  }

  const isUserAdmin = await isAdmin();
  if (!isUserAdmin) {
    alert("Admin access required");
    window.location.href = "/";
    return;
  }

  // Load categories and products when page loads
  await loadCategories();
  await loadProducts();

  console.log("Initial setup completed");
});

// Global variables
let productsData = [];
let editingProductId = null;
let imagesToUpload = [];
let isSubmitting = false;

// Get DOM elements
const addProductBtn = document.getElementById("addProductBtn");
const productFormContainer = document.getElementById("productFormContainer");
const productForm = document.getElementById("productForm");
const cancelBtn = document.getElementById("cancelBtn");
const submitBtn = document.getElementById("submitBtn");
const productsContainer = document.getElementById("productsContainer");
const messageContainer = document.getElementById("messageContainer");
const productCategory = document.getElementById("productCategory");
const productBrand = document.getElementById("productBrand");
const imageUploadArea = document.getElementById("imageUploadArea");
const productImagesInput = document.getElementById("productImages");
const imagePreview = document.getElementById("imagePreview");
const deleteModal = document.getElementById("deleteModal");
const closeDeleteModal = document.getElementById("closeDeleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const deleteProductName = document.getElementById("deleteProductName");

// Event listeners - Set up only once when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("=== SETTING UP EVENT LISTENERS ===");

  // Basic event listeners
  addProductBtn?.addEventListener("click", showAddProductForm);
  cancelBtn?.addEventListener("click", hideProductForm);
  productCategory?.addEventListener("change", handleCategoryChange);

  // Image upload event listeners
  imageUploadArea?.addEventListener("click", () => productImagesInput.click());
  imageUploadArea?.addEventListener("dragover", handleDragOver);
  imageUploadArea?.addEventListener("dragleave", handleDragLeave);
  imageUploadArea?.addEventListener("drop", handleDrop);
  productImagesInput?.addEventListener("change", handleImageSelect);

  // Delete modal event listeners
  closeDeleteModal?.addEventListener("click", closeDeleteModalHandler);
  cancelDeleteBtn?.addEventListener("click", closeDeleteModalHandler);
  confirmDeleteBtn?.addEventListener("click", handleDeleteProduct);

  // Products container event listener for edit/delete buttons
  productsContainer?.addEventListener("click", handleProductActions);

  // Handle image removal
  imagePreview?.addEventListener("click", (e) => {
    if (e.target.classList.contains("image-remove")) {
      const index = parseInt(e.target.dataset.index);
      imagesToUpload.splice(index, 1);
      displayImagePreview();
    }
  });

  // FORM SUBMISSION - Only set up once
  if (productForm && !productForm._hasListener) {
    console.log("Setting up form submission listener");
    productForm.addEventListener("submit", handleProductSubmit);
    productForm._hasListener = true;
  } else if (productForm?._hasListener) {
    console.log("Form listener already exists");
  }

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
      closeDeleteModalHandler();
    }
  });

  console.log("=== EVENT LISTENERS SETUP COMPLETE ===");
});

// Utility function to show messages
function showMessage(type, text) {
  messageContainer.innerHTML = `<div class="${type}-message">${text}</div>`;
  setTimeout(() => {
    messageContainer.innerHTML = "";
  }, 5000);
}

// Load categories for dropdown
async function loadCategories() {
  try {
    const response = await fetch("/fetch-categories");
    const data = await response.json();

    productCategory.innerHTML = `<option value="">Select Category</option>`;

    if (data.success && data.categories && data.categories.length > 0) {
      data.categories.forEach((category) => {
        productCategory.innerHTML += `<option value="${category.cat_id}">${category.cat_name}</option>`;
      });
    }
  } catch (error) {
    console.error("Error loading categories:", error);
    showMessage("error", "Failed to load categories");
  }
}

// Load brands for selected category
async function loadBrands(categoryId) {
  if (!categoryId) {
    productBrand.innerHTML = `<option value="">Select Category First</option>`;
    productBrand.disabled = true;
    return;
  }

  try {
    productBrand.innerHTML = `<option value="">Loading brands...</option>`;
    productBrand.disabled = true;

    const response = await fetch(`/fetch-brands-by-category/${categoryId}`);
    const data = await response.json();

    productBrand.innerHTML = `<option value="">Select Brand</option>`;

    if (data.success && data.brands && data.brands.length > 0) {
      data.brands.forEach((brand) => {
        productBrand.innerHTML += `<option value="${brand.brand_id}">${brand.brand_name}</option>`;
      });
      productBrand.disabled = false;
    } else {
      productBrand.innerHTML = `<option value="">No brands found</option>`;
    }
  } catch (error) {
    console.error("Error loading brands:", error);
    productBrand.innerHTML = `<option value="">Error loading brands</option>`;
    showMessage("error", "Failed to load brands");
  }
}

// Load and display products
async function loadProducts() {
  try {
    productsContainer.innerHTML = `<div class="loading">Loading products...</div>`;

    const response = await fetch("/fetch-products");
    const data = await response.json();

    if (data.success) {
      productsData = data.products || [];
      renderProducts(data.organized || {});
    } else {
      productsContainer.innerHTML = `<div class="no-products">Failed to load products</div>`;
      showMessage("error", data.message || "Failed to load products");
    }
  } catch (error) {
    console.error("Error loading products:", error);
    productsContainer.innerHTML = `<div class="no-products">Error loading products</div>`;
    showMessage("error", "Failed to load products");
  }
}

// Render products grouped by category and brand
function renderProducts(organized) {
  if (!organized || Object.keys(organized).length === 0) {
    productsContainer.innerHTML = `<div class="no-products">No products found. Add your first product above.</div>`;
    return;
  }

  let html = "";

  Object.values(organized).forEach((category) => {
    html += `<div class="category-section">
      <div class="category-header">${category.cat_name}</div>`;

    Object.values(category.brands).forEach((brand) => {
      html += `<div class="brand-section">
        <div class="brand-header">${brand.brand_name}</div>
        <div class="products-grid">`;

      brand.products.forEach((product) => {
        const stockClass = product.product_qty < 5 ? " low-stock" : "";
        const stockText =
          product.product_qty === 0
            ? "Out of Stock"
            : `Stock: ${product.product_qty}`;

        // USE product_images ARRAY FROM SERVER
        let imageCarousel = "";
        let productImages = product.product_images || [];

        console.log(
          `Product ${product.product_id} has ${productImages.length} images:`,
          productImages
        );

        if (productImages.length > 0) {
          imageCarousel = `
            <div class="product-image-carousel" data-product-id="${
              product.product_id
            }">
              <div class="carousel-container">
                <div class="carousel-images">
                  ${productImages
                    .map(
                      (imagePath, index) => `
                    <img src="/${imagePath}" 
                         alt="${product.product_title}" 
                         class="carousel-image ${index === 0 ? "active" : ""}"
                         onerror="this.style.display='none'; console.error('Failed to load: ${imagePath}');">
                  `
                    )
                    .join("")}
                </div>
                ${
                  productImages.length > 1
                    ? `
                  <button class="carousel-btn carousel-prev" data-direction="prev">‹</button>
                  <button class="carousel-btn carousel-next" data-direction="next">›</button>
                  <div class="carousel-indicators">
                    ${productImages
                      .map(
                        (_, index) => `
                      <span class="indicator ${
                        index === 0 ? "active" : ""
                      }" data-index="${index}"></span>
                    `
                      )
                      .join("")}
                  </div>
                `
                    : ""
                }
              </div>
            </div>`;
        } else {
          imageCarousel = `
            <div class="product-image no-image">
              <span>No Image</span>
            </div>`;
        }

        html += `<div class="product-card">
          ${imageCarousel}
          <div class="product-info">
            <div class="product-title">${product.product_title}</div>
            <div class="product-price">$${parseFloat(
              product.product_price
            ).toFixed(2)}</div>
            <div class="product-stock${stockClass}">${stockText}</div>
            ${
              product.product_desc
                ? `<div class="product-desc">${product.product_desc.substring(
                    0,
                    100
                  )}${product.product_desc.length > 100 ? "..." : ""}</div>`
                : ""
            }
            ${
              product.product_keywords
                ? `<div class="product-keywords">Tags: ${product.product_keywords}</div>`
                : ""
            }
            ${
              productImages.length > 1
                ? `<div class="product-image-count">${productImages.length} images</div>`
                : ""
            }
            <div class="product-actions">
              <button class="btn btn-sm btn-edit" data-action="edit" data-id="${
                product.product_id
              }">Edit</button>
              <button class="btn btn-sm btn-delete" data-action="delete" data-id="${
                product.product_id
              }" data-title="${product.product_title}">Delete</button>
            </div>
          </div>
        </div>`;
      });

      html += `</div></div>`;
    });

    html += `</div>`;
  });

  productsContainer.innerHTML = html;
  initializeCarousels();
}

// Initialize image carousels
function initializeCarousels() {
  const carousels = document.querySelectorAll(".product-image-carousel");

  carousels.forEach((carousel) => {
    const productId = carousel.dataset.productId;
    const images = carousel.querySelectorAll(".carousel-image");
    const indicators = carousel.querySelectorAll(".indicator");
    const prevBtn = carousel.querySelector(".carousel-prev");
    const nextBtn = carousel.querySelector(".carousel-next");

    let currentIndex = 0;

    function showImage(index) {
      images.forEach((img) => img.classList.remove("active"));
      indicators.forEach((ind) => ind.classList.remove("active"));

      if (images[index]) {
        images[index].classList.add("active");
      }
      if (indicators[index]) {
        indicators[index].classList.add("active");
      }

      currentIndex = index;
    }

    function nextImage() {
      const nextIndex = (currentIndex + 1) % images.length;
      showImage(nextIndex);
    }

    function prevImage() {
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      showImage(prevIndex);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        prevImage();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        nextImage();
      });
    }

    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", (e) => {
        e.stopPropagation();
        showImage(index);
      });
    });

    let autoSlideInterval;

    function startAutoSlide() {
      if (images.length > 1) {
        autoSlideInterval = setInterval(nextImage, 4000);
      }
    }

    function stopAutoSlide() {
      clearInterval(autoSlideInterval);
    }

    carousel.addEventListener("mouseenter", stopAutoSlide);
    carousel.addEventListener("mouseleave", startAutoSlide);

    startAutoSlide();
  });
}

// Show add product form
function showAddProductForm() {
  editingProductId = null;
  productForm.reset();
  productFormContainer.style.display = "block";
  document.getElementById("formTitle").textContent = "Add New Product";
  submitBtn.textContent = "Add Product";
  productBrand.disabled = true;
  productBrand.innerHTML = `<option value="">Select Category First</option>`;
  clearImagePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Hide product form
function hideProductForm() {
  productFormContainer.style.display = "none";
  editingProductId = null;
  productForm.reset();
  clearImagePreview();
}

// Handle category change
function handleCategoryChange(e) {
  const categoryId = e.target.value;
  loadBrands(categoryId);
}

// ENHANCED FORM SUBMISSION HANDLER
async function handleProductSubmit(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const timestamp = new Date().toISOString();
  console.log("=== FORM SUBMISSION ATTEMPT ===");
  console.log("Timestamp:", timestamp);
  console.log("isSubmitting flag:", isSubmitting);
  console.log("Event type:", e.type);
  console.log("===============================");

  //  PREVENT DOUBLE SUBMISSION
  if (isSubmitting) {
    console.log("DUPLICATE SUBMISSION BLOCKED at:", timestamp);
    return false;
  }

  console.log("STARTING NEW SUBMISSION at:", timestamp);
  isSubmitting = true;

  // Add small delay to catch rapid double clicks
  await new Promise((resolve) => setTimeout(resolve, 100));

  try {
    console.log("=== FORM SUBMISSION DEBUG ===");
    console.log("Form submission started:", timestamp);
    console.log("Editing product ID:", editingProductId);
    console.log("Images to upload:", imagesToUpload?.length || 0);

    // Log each image
    if (imagesToUpload) {
      imagesToUpload.forEach((file, index) => {
        console.log(`Image ${index + 1}:`, file.name, `(${file.size} bytes)`);
      });
    }

    const formData = new FormData(productForm);

    if (formData.has("product_images")) {
      formData.delete("product_images");
      console.log("Removed pre-populated product_images from FormData");
    }

    // Add images
    if (imagesToUpload) {
      imagesToUpload.forEach((file) => {
        formData.append("product_images", file);
        console.log("Added to FormData:", file.name);
      });
    }

    const isEditing = editingProductId !== null;
    const url = isEditing ? "/update-product" : "/add-product";
    const method = isEditing ? "PUT" : "POST";

    if (isEditing) {
      formData.append("product_id", editingProductId);
      console.log("Adding product_id to form:", editingProductId);
    }

    // Log final FormData
    console.log("Sending FormData with:");
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: [File] ${value.name}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    console.log(`Making ${method} request to ${url}`);

    const response = await fetch(url, {
      method: method,
      body: formData,
    });

    const data = await response.json();
    console.log("Server response:", data);

    if (data.success) {
      showMessage("success", data.message);
      hideProductForm();
      await loadProducts();
    } else {
      showMessage("error", data.message || "Failed to save product");
    }
  } catch (error) {
    console.error("Submission error:", error);
    showMessage("error", "Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingProductId ? "Update Product" : "Add Product";

    // Add delay before resetting flag
    setTimeout(() => {
      console.log("RESETTING isSubmitting flag at:", new Date().toISOString());
      isSubmitting = false;
    }, 500);
  }

  return false;
}

// Handle product actions (edit/delete)
async function handleProductActions(e) {
  if (!e.target.dataset.action) return;

  const action = e.target.dataset.action;
  const productId = e.target.dataset.id;

  if (action === "edit") {
    await handleEditProduct(productId);
  } else if (action === "delete") {
    const productTitle = e.target.dataset.title;
    openDeleteModal(productId, productTitle);
  }
}

// Handle edit product
async function handleEditProduct(productId) {
  try {
    const response = await fetch(`/update-product/${productId}`);
    const data = await response.json();

    if (data.success && data.product) {
      const product = data.product;

      editingProductId = product.product_id;
      productFormContainer.style.display = "block";
      document.getElementById("formTitle").textContent = "Edit Product";
      submitBtn.textContent = "Update Product";

      document.getElementById("productId").value = product.product_id;
      document.getElementById("productTitle").value = product.product_title;
      document.getElementById("productPrice").value = product.product_price;
      document.getElementById("productQty").value = product.product_qty;
      document.getElementById("productDesc").value = product.product_desc || "";
      document.getElementById("productKeywords").value =
        product.product_keywords || "";

      await loadCategories();
      productCategory.value = product.product_cat;

      await loadBrands(product.product_cat);
      productBrand.value = product.product_brand;

      clearImagePreview();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      showMessage("error", "Failed to load product details");
    }
  } catch (error) {
    console.error("Error loading product:", error);
    showMessage("error", "Failed to load product details");
  }
}

// Open delete modal
function openDeleteModal(productId, productTitle) {
  deleteProductName.textContent = productTitle;
  confirmDeleteBtn.dataset.id = productId;
  deleteModal.style.display = "block";
}

// Close delete modal
function closeDeleteModalHandler() {
  deleteModal.style.display = "none";
}

// Handle delete product
async function handleDeleteProduct() {
  const productId = confirmDeleteBtn.dataset.id;

  try {
    const response = await fetch("/delete-product", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_id: parseInt(productId) }),
    });

    const data = await response.json();

    if (data.success) {
      showMessage("success", data.message);
      await loadProducts();
    } else {
      showMessage("error", data.message || "Failed to delete product");
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    showMessage("error", "Something went wrong. Please try again.");
  }

  closeDeleteModalHandler();
}

// Image upload handlers
function handleDragOver(e) {
  e.preventDefault();
  imageUploadArea.classList.add("dragover");
}

function handleDragLeave() {
  imageUploadArea.classList.remove("dragover");
}

function handleDrop(e) {
  e.preventDefault();
  imageUploadArea.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files);
  handleImageFiles(files);
}

function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  handleImageFiles(files);
}

function handleImageFiles(files) {
  const imageFiles = files
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, 5);

  if (imageFiles.length !== files.length) {
    showMessage("error", "Only image files are allowed");
  }

  if (files.length > 5) {
    showMessage("error", "Maximum 5 images allowed");
  }

  imagesToUpload = imageFiles;
  displayImagePreview();
}

function displayImagePreview() {
  imagePreview.innerHTML = "";

  imagesToUpload.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewItem = document.createElement("div");
      previewItem.className = "image-preview-item";
      previewItem.innerHTML = `
        <img src="${e.target.result}" alt="Preview ${index + 1}" />
        <button type="button" class="image-remove" data-index="${index}">&times;</button>
      `;
      imagePreview.appendChild(previewItem);
    };
    reader.readAsDataURL(file);
  });
}

function clearImagePreview() {
  imagesToUpload = [];
  imagePreview.innerHTML = "";
  productImagesInput.value = "";
}
