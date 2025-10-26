import Brand from "../model/brandClass.js";

// Add brand controller - handles multiple categories
export async function addBrandCtr({ brand_name, category_ids, created_by }) {
  if (!brand_name || brand_name.trim().length === 0) {
    throw new Error("Brand name is required");
  }

  if (brand_name.length > 100) {
    throw new Error("Brand name must be less than 100 characters");
  }

  if (
    !category_ids ||
    !Array.isArray(category_ids) ||
    category_ids.length === 0
  ) {
    throw new Error("At least one category must be selected");
  }

  if (brand_name.trim().length < 2) {
    throw new Error("Brand name must be at least 2 characters long");
  }

  // Create brand in multiple categories
  const createdBrands = await Brand.addBrandToMultipleCategories(
    brand_name.trim(),
    category_ids,
    created_by
  );

  return createdBrands;
}

// Get brands controller
export async function getBrandsCtr(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  return await Brand.getBrandsByUser(userId);
}

export async function getAllBrandsCtr() {
  return await Brand.getAllBrands();
}

// Update brand controller - only name is editable
export async function updateBrandCtr(brandId, userId, { brand_name }) {
  if (!brandId || !userId) {
    throw new Error("Brand ID and User ID are required");
  }

  if (!brand_name || brand_name.trim().length === 0) {
    throw new Error("Brand name is required");
  }

  if (brand_name.length > 100) {
    throw new Error("Brand name must be less than 100 characters");
  }

  if (brand_name.trim().length < 2) {
    throw new Error("Brand name must be at least 2 characters long");
  }

  // Update brand
  const updatedBrand = await Brand.updateBrand(
    brandId,
    brand_name.trim(),
    userId
  );

  if (!updatedBrand) {
    throw new Error(
      "Brand not found or you don't have permission to update it"
    );
  }

  return updatedBrand;
}

// Delete brand controller
export async function deleteBrandCtr(brandId, userId) {
  if (!brandId || !userId) {
    throw new Error("Brand ID and User ID are required");
  }

  // Delete brand
  const deleted = await Brand.deleteBrand(brandId, userId);

  if (!deleted) {
    throw new Error("Brand not found or Permission denied");
  }

  return deleted;
}
