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

  // Load categories and brands when page loads
  loadCategories();
  loadBrands();
});

// Form submission handlers
document
  .getElementById("addBrandForm")
  .addEventListener("submit", handleAddBrand);
document
  .getElementById("saveUpdateBtn")
  .addEventListener("click", handleUpdateBrand);
document
  .getElementById("confirmDeleteBtn")
  .addEventListener("click", handleDeleteBrand);

// Modal handlers
document
  .getElementById("updateModalClose")
  .addEventListener("click", closeUpdateModal);
document
  .getElementById("cancelUpdateBtn")
  .addEventListener("click", closeUpdateModal);
document
  .getElementById("deleteModalClose")
  .addEventListener("click", closeDeleteModal);
document
  .getElementById("cancelDeleteBtn")
  .addEventListener("click", closeDeleteModal);

// Load categories for pill selection
async function loadCategories() {
  try {
    const response = await fetch("/fetch-categories?userOnly=true");
    const data = await response.json();

    if (data.success && data.categories.length > 0) {
      renderCategoryPills(data.categories, "categoryPills", "selectedCount");
    } else {
      document.getElementById("categoryPills").innerHTML =
        '<div class="no-categories">No categories available</div>';
    }
  } catch (error) {
    console.error("Error loading categories:", error);
    document.getElementById("categoryPills").innerHTML =
      '<div class="no-categories">Error loading categories</div>';
  }
}

// Render category pills
function renderCategoryPills(categories, containerId, counterId) {
  const container = document.getElementById(containerId);

  let html = "";
  categories.forEach((category) => {
    html += `
      <div class="category-pill" 
           data-category-id="${category.cat_id}" 
           onclick="toggleCategoryPill(this, '${counterId}')">
        ${category.cat_name}
      </div>
    `;
  });

  container.innerHTML = html;
}

// Toggle category pill selection
function toggleCategoryPill(pillElement, counterId) {
  pillElement.classList.toggle("selected");
  updateSelectedCount(counterId);
}

// Update selected count display
function updateSelectedCount(counterId) {
  const container = document.getElementById(counterId).closest(".form-group");
  const selectedPills = container.querySelectorAll(".category-pill.selected");
  const countElement = document.getElementById(counterId);

  if (selectedPills.length > 0) {
    countElement.style.display = "inline-block";
    countElement.textContent = `${selectedPills.length} selected`;
  } else {
    countElement.style.display = "none";
  }
}

// Get selected category IDs
function getSelectedCategoryIds(containerId) {
  const container = document.getElementById(containerId);
  const selectedPills = container.querySelectorAll(".category-pill.selected");
  return Array.from(selectedPills).map((pill) =>
    parseInt(pill.dataset.categoryId)
  );
}

// Add brand function
async function handleAddBrand(e) {
  e.preventDefault();

  const form = e.target;
  const brandName = form.brand_name.value.trim();
  const categoryIds = getSelectedCategoryIds("categoryPills");

  // Validation
  if (!brandName) {
    alert("Brand name is required");
    return;
  }

  if (brandName.length > 100) {
    alert("Brand name must be less than 100 characters");
    return;
  }

  if (categoryIds.length === 0) {
    alert("Please select at least one category");
    return;
  }

  try {
    const response = await fetch("/add-brand", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brand_name: brandName,
        category_ids: categoryIds,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      form.reset();

      // Clear selected pills
      document
        .querySelectorAll("#categoryPills .category-pill")
        .forEach((pill) => {
          pill.classList.remove("selected");
        });
      updateSelectedCount("selectedCount");

      loadBrands(); // Reload brands
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error adding brand:", error);
    alert("Something went wrong. Please try again.");
  }
}

// Load and display brands
async function loadBrands() {
  try {
    const response = await fetch("/fetch-brands?userOnly=true");
    const data = await response.json();

    const container = document.getElementById("brandsContainer");

    if (data.success && data.brands.length > 0) {
      container.innerHTML =
        '<div class="brands-grid">' +
        data.brands
          .map(
            (brand) => `
              <div class="brand-card">
                <h4>${brand.brand_name}</h4>
                <div class="brand-categories-display">
                  <span class="category-tag">${brand.cat_name}</span>
                </div>
                <div class="brand-actions">
                  <button class="btn-edit" onclick="openUpdateModal(${brand.brand_id}, '${brand.brand_name}')">Edit</button>
                  <button class="btn-delete" onclick="openDeleteModal(${brand.brand_id}, '${brand.brand_name}', '${brand.cat_name}')">Delete</button>
                </div>
              </div>
            `
          )
          .join("") +
        "</div>";
    } else {
      container.innerHTML =
        '<p class="no-data">No brands found. Add your first brand above.</p>';
    }
  } catch (error) {
    console.error("Error loading brands:", error);
    document.getElementById("brandsContainer").innerHTML =
      '<p class="loading">Error loading brands.</p>';
  }
}

// Open update modal
function openUpdateModal(brandId, brandName) {
  document.getElementById("updateBrandIds").value = brandId;
  document.getElementById("updateBrandName").value = brandName;
  document.getElementById("updateModal").style.display = "block";
}

// Close update modal
function closeUpdateModal() {
  document.getElementById("updateModal").style.display = "none";
}

// Handle update brand
async function handleUpdateBrand() {
  const brandId = document.getElementById("updateBrandIds").value;
  const brandName = document.getElementById("updateBrandName").value.trim();

  // Validation
  if (!brandName) {
    alert("Brand name is required");
    return;
  }

  if (brandName.length > 100) {
    alert("Brand name must be less than 100 characters");
    return;
  }

  try {
    const response = await fetch("/update-brand", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brand_id: parseInt(brandId),
        brand_name: brandName,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      closeUpdateModal();
      loadBrands(); // Reload brands
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error updating brand:", error);
    alert("Something went wrong. Please try again.");
  }
}

// Open delete modal
function openDeleteModal(brandId, brandName, categoryName) {
  document
    .getElementById("confirmDeleteBtn")
    .setAttribute("data-brand-id", brandId);
  document.getElementById("deleteBrandName").textContent = brandName;
  document.getElementById(
    "deleteBrandCategories"
  ).innerHTML = `<span class="category-tag">${categoryName}</span>`;
  document.getElementById("deleteModal").style.display = "block";
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
}

// Handle delete brand
async function handleDeleteBrand() {
  const brandId = document
    .getElementById("confirmDeleteBtn")
    .getAttribute("data-brand-id");

  try {
    const response = await fetch("/delete-brand", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ brand_id: parseInt(brandId) }),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      closeDeleteModal();
      loadBrands(); // Reload brands
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error deleting brand:", error);
    alert("Something went wrong. Please try again.");
  }
}

// Close modals when clicking outside
window.addEventListener("click", (e) => {
  const updateModal = document.getElementById("updateModal");
  const deleteModal = document.getElementById("deleteModal");

  if (e.target === updateModal) {
    closeUpdateModal();
  }

  if (e.target === deleteModal) {
    closeDeleteModal();
  }
});
