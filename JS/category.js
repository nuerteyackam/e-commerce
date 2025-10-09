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

  // Load categories when page loads
  loadCategories();
});

// Form submission handlers
document
  .getElementById("addCategoryForm")
  .addEventListener("submit", handleAddCategory);
document
  .getElementById("saveUpdateBtn")
  .addEventListener("click", handleUpdateCategory);
document
  .getElementById("confirmDeleteBtn")
  .addEventListener("click", handleDeleteCategory);

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

// Add category function
async function handleAddCategory(e) {
  e.preventDefault();

  const form = e.target;
  const catName = form.cat_name.value.trim();

  // Validation
  if (!catName) {
    alert("Category name is required");
    return;
  }

  if (catName.length > 100) {
    alert("Category name must be less than 100 characters");
    return;
  }

  try {
    const response = await fetch("/add-category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cat_name: catName }),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      form.reset();
      loadCategories(); // Reload categories
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error adding category:", error);
    alert("Something went wrong. Please try again.");
  }
}

// Load and display categories
async function loadCategories() {
  try {
    const response = await fetch("/fetch-categories");
    const data = await response.json();

    const container = document.getElementById("categoriesContainer");

    if (data.success && data.categories.length > 0) {
      container.innerHTML = data.categories
        .map(
          (category) => `
                <div class="category-item clickable" onclick="viewCategory(${category.cat_id}, '${category.cat_name}')">
                    <span class="category-name">${category.cat_name}</span>
                    <div class="category-actions" onclick="event.stopPropagation()">
                        <button class="btn secondary" onclick="openUpdateModal(${category.cat_id}, '${category.cat_name}')">Edit</button>
                        <button class="btn danger" onclick="openDeleteModal(${category.cat_id}, '${category.cat_name}')">Delete</button>
                    </div>
                </div>
            `
        )
        .join("");
    } else {
      container.innerHTML =
        '<p class="no-categories">No categories found. Add your first category above.</p>';
    }
  } catch (error) {
    console.error("Error loading categories:", error);
    document.getElementById("categoriesContainer").innerHTML =
      '<p class="loading">Error loading categories.</p>';
  }
}

// Open update modal
function openUpdateModal(catId, catName) {
  document.getElementById("updateCategoryId").value = catId;
  document.getElementById("updateCategoryName").value = catName;
  document.getElementById("updateModal").style.display = "block";
}

// Close update modal
function closeUpdateModal() {
  document.getElementById("updateModal").style.display = "none";
}

// Handle update category
async function handleUpdateCategory() {
  const catId = document.getElementById("updateCategoryId").value;
  const catName = document.getElementById("updateCategoryName").value.trim();

  // Validation
  if (!catName) {
    alert("Category name is required");
    return;
  }

  if (catName.length > 100) {
    alert("Category name must be less than 100 characters");
    return;
  }

  try {
    const response = await fetch("/update-category", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cat_id: catId, cat_name: catName }),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      closeUpdateModal();
      loadCategories(); // Reload categories
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error updating category:", error);
    alert("Something went wrong. Please try again.");
  }
}

// Open delete modal
function openDeleteModal(catId, catName) {
  document
    .getElementById("confirmDeleteBtn")
    .setAttribute("data-cat-id", catId);
  document.getElementById("deleteCategoryName").textContent = catName;
  document.getElementById("deleteModal").style.display = "block";
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
}

// Handle delete category
async function handleDeleteCategory() {
  const catId = document
    .getElementById("confirmDeleteBtn")
    .getAttribute("data-cat-id");

  try {
    const response = await fetch("/delete-category", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cat_id: catId }),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      closeDeleteModal();
      loadCategories(); // Reload categories
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error deleting category:", error);
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

function viewCategory(catId, catName) {
  window.location.href = `/category/${catId}`;
}
