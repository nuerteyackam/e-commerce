import Product from "../model/productClass.js";

// Helper function to process product images
function processProductImages(products) {
  return products.map((product) => {
    // Parse product_image JSON string to array
    let productImages = [];
    if (product.product_image) {
      try {
        productImages =
          typeof product.product_image === "string"
            ? JSON.parse(product.product_image)
            : product.product_image;

        // Ensure it's an array
        if (!Array.isArray(productImages)) {
          productImages = [productImages];
        }
      } catch (error) {
        console.error(
          `Error parsing images for product ${product.product_id}:`,
          error
        );
        productImages = [];
      }
    }

    return {
      ...product,
      product_images: productImages,
      // Keep original for backward compatibility
      product_image: product.product_image,
    };
  });
}

// Get all products with pagination
export async function getAllProductsCtr(page = 1, limit = 12) {
  try {
    const result = await Product.viewAllProducts(page, limit);

    // Process images for all products
    const processedProducts = processProductImages(result.products);

    return {
      ...result,
      products: processedProducts,
    };
  } catch (error) {
    console.error("Controller error:", error);
    throw error;
  }
}

// Search products
export async function searchProductsCtr(searchQuery, page = 1, limit = 12) {
  try {
    const result = await Product.searchProducts(searchQuery, page, limit);

    // Process images for search results
    const processedProducts = processProductImages(result.products);

    return {
      ...result,
      products: processedProducts,
    };
  } catch (error) {
    console.error("Controller error:", error);
    throw error;
  }
}

// Filter products by category
export async function filterProductsByCategoryCtr(
  categoryId,
  page = 1,
  limit = 12
) {
  try {
    const result = await Product.filterProductsByCategory(
      categoryId,
      page,
      limit
    );

    // Process images for filtered products
    const processedProducts = processProductImages(result.products);

    return {
      ...result,
      products: processedProducts,
    };
  } catch (error) {
    console.error("Controller error:", error);
    throw error;
  }
}

// Filter products by brand
export async function filterProductsByBrandCtr(brandId, page = 1, limit = 12) {
  try {
    const result = await Product.filterProductsByBrand(brandId, page, limit);

    // Process images for filtered products
    const processedProducts = processProductImages(result.products);

    return {
      ...result,
      products: processedProducts,
    };
  } catch (error) {
    console.error("Controller error:", error);
    throw error;
  }
}

// Advanced search with filters
export async function advancedSearchCtr(
  searchQuery,
  categoryId = null,
  brandId = null,
  page = 1,
  limit = 12
) {
  try {
    const result = await Product.advancedSearch(
      searchQuery,
      categoryId,
      brandId,
      page,
      limit
    );

    // Process images for search results
    const processedProducts = processProductImages(result.products);

    return {
      ...result,
      products: processedProducts,
    };
  } catch (error) {
    console.error("Controller error:", error);
    throw error;
  }
}

// Get single product
export async function getSingleProductCtr(productId) {
  try {
    const product = await Product.viewSingleProduct(productId);

    if (!product) {
      return null;
    }

    // Process images for single product
    const processedProducts = processProductImages([product]);

    return processedProducts[0];
  } catch (error) {
    console.error("Controller error:", error);
    throw error;
  }
}
