import Category from "../model/category.js";

// Add category controller
export async function addCategoryCtr({ cat_name, created_by }) {
  if (await Category.checkCategoryExists(cat_name, created_by)) {
    throw new Error("Category name already exists");
  }

  if (!cat_name || cat_name.trim().length === 0) {
    throw new Error("Category name is required");
  }

  if (cat_name.length > 100) {
    throw new Error("Category name must be less than 100 characters");
  }

  return await Category.addCategory({ cat_name: cat_name.trim(), created_by });
}

// Get Categories controller
export async function getCategoriesCtr(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  return await Category.getCategoriesByUser(userId);
}

export async function getAllCategoriesCtr() {
  return await Category.getAllCategories();
}

export async function updateCategoryCtr(catId, userId, { cat_name }) {
  if (!catId || !userId) {
    throw new Error("Category Id and User Id required");
  }

  if (!cat_name || cat_name.trim().length === 0) {
    throw new Error("Category name is required");
  }

  if (cat_name.length > 100) {
    throw new Error("Category name must be less than 100 characters");
  }

  // Check if new name already exists (excluding current category)
  const existingCategory = await Category.checkCategoryExists(
    cat_name.trim(),
    userId
  );
  if (existingCategory) {
    throw new Error("Category name already exists");
  }

  const updatedCategory = await Category.updateCategory(catId, userId, {
    cat_name: cat_name.trim(),
  });

  if (!updatedCategory) {
    throw new Error(
      "Category not found or you don't have permission to update it"
    );
  }

  return updatedCategory;
}

export async function deleteCategoryCtr(catId, userId) {
  if (!catId || !userId) {
    throw new Error("Category Id and User Id are required");
  }

  const deletedCategory = await Category.deleteCategory(catId, userId);

  if (!deletedCategory) {
    throw new Error("Category not found or Permission denied");
  }

  return deletedCategory;
}
