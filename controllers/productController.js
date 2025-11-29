import Product from "../model/productClass.js";

// Add product controller
export async function addProductCtr(productData) {
  try {
    // Validate required fields
    const { product_cat, product_brand, product_title, product_price } =
      productData;

    if (!product_cat || !product_brand || !product_title || !product_price) {
      throw new Error("Category, brand, title, and price are required");
    }

    // Validate title length
    if (product_title.length < 3 || product_title.length > 200) {
      throw new Error("Product title must be between 3 and 200 characters");
    }

    // Validate price
    if (product_price <= 0) {
      throw new Error("Product price must be greater than 0");
    }

    // Validate quantity
    if (productData.product_qty !== undefined && productData.product_qty < 0) {
      throw new Error("Product quantity cannot be negative");
    }

    // Check if product with same title exists in same category
    const exists = await Product.checkProductExists(product_title, product_cat);
    if (exists) {
      throw new Error(
        "A product with this title already exists in this category"
      );
    }

    // Add the product
    const newProduct = await Product.addProduct(productData);
    return newProduct;
  } catch (error) {
    console.error("Add product controller error:", error);
    throw error;
  }
}

// Get all products controller
export async function getProductsCtr() {
  try {
    const products = await Product.getAllProducts();
    return products;
  } catch (error) {
    console.error("Get products controller error:", error);
    throw error;
  }
}

// Get Featured Product
export async function getFeaturedProductCtr(limit = 1) {
  try {
    console.log("=== CONTROLLER: GET FEATURED PRODUCTS ===");
    console.log("Limit requested:", limit);

    // Validate limit parameter
    if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
      throw new Error("Limit must be a number between 1 and 100");
    }

    // Call the model method
    const result = await Product.getFeaturedProducts(parseInt(limit));

    console.log("Featured products retrieved:", result.count);

    // Check if any featured products were found
    if (!result || result.count === 0) {
      return {
        success: false,
        message: "No featured products available",
        data: {
          products: [],
          count: 0,
        },
      };
    }

    return {
      success: true,
      data: {
        products: result.products,
        count: result.count,
      },
      message: `${result.count} featured product${
        result.count > 1 ? "s" : ""
      } retrieved successfully`,
    };
  } catch (error) {
    console.error("Get featured products controller error:", error);
    throw error;
  }
}

// Get product by ID controller
export async function getProductByIdCtr(productId) {
  try {
    if (!productId || isNaN(productId)) {
      throw new Error("Valid product ID is required");
    }

    const product = await Product.getProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  } catch (error) {
    console.error("Get product by ID controller error:", error);
    throw error;
  }
}

// Update product controller
export async function updateProductCtr(productId, productData) {
  try {
    // Validate product ID
    if (!productId || isNaN(productId)) {
      throw new Error("Valid product ID is required");
    }

    // Validate required fields
    const { product_cat, product_brand, product_title, product_price } =
      productData;

    if (!product_cat || !product_brand || !product_title || !product_price) {
      throw new Error("Category, brand, title, and price are required");
    }

    // Validate title length
    if (product_title.length < 3 || product_title.length > 200) {
      throw new Error("Product title must be between 3 and 200 characters");
    }

    // Validate price
    if (product_price <= 0) {
      throw new Error("Product price must be greater than 0");
    }

    // Validate quantity
    if (productData.product_qty !== undefined && productData.product_qty < 0) {
      throw new Error("Product quantity cannot be negative");
    }

    // Check if product with same title exists in same category (excluding current product)
    const exists = await Product.checkProductExists(
      product_title,
      product_cat,
      productId
    );
    if (exists) {
      throw new Error(
        "A product with this title already exists in this category"
      );
    }

    // Update the product
    const updatedProduct = await Product.updateProduct(productId, productData);
    if (!updatedProduct) {
      throw new Error("Product not found or update failed");
    }

    return updatedProduct;
  } catch (error) {
    console.error("Update product controller error:", error);
    throw error;
  }
}

// Delete product controller
export async function deleteProductCtr(productId) {
  try {
    if (!productId || isNaN(productId)) {
      throw new Error("Valid product ID is required");
    }

    // Check if product exists first
    const product = await Product.getProductById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Delete the product
    const deleted = await Product.deleteProduct(productId);
    if (!deleted) {
      throw new Error("Failed to delete product");
    }

    return {
      success: true,
      message: `Product "${product.product_title}" deleted successfully`,
    };
  } catch (error) {
    console.error("Delete product controller error:", error);
    throw error;
  }
}

// Get products by category controller
export async function getProductsByCategoryCtr(categoryId) {
  try {
    if (!categoryId || isNaN(categoryId)) {
      throw new Error("Valid category ID is required");
    }

    const products = await Product.getProductsByCategory(categoryId);
    return products;
  } catch (error) {
    console.error("Get products by category controller error:", error);
    throw error;
  }
}

// Get brands for category controller (for dropdown population)
export async function getBrandsForCategoryCtr(categoryId) {
  try {
    if (!categoryId || isNaN(categoryId)) {
      throw new Error("Valid category ID is required");
    }

    const brands = await Product.getBrandsForCategory(categoryId);
    return brands;
  } catch (error) {
    console.error("Get brands for category controller error:", error);
    throw error;
  }
}

// Check stock controller
export async function checkStockCtr(productId, requestedQty = 1) {
  try {
    if (!productId || isNaN(productId)) {
      throw new Error("Valid product ID is required");
    }

    if (requestedQty <= 0) {
      throw new Error("Requested quantity must be greater than 0");
    }

    const stockInfo = await Product.checkStock(productId, requestedQty);
    return stockInfo;
  } catch (error) {
    console.error("Check stock controller error:", error);
    throw error;
  }
}

// Update stock controller (for purchases)
export async function updateStockCtr(productId, quantity) {
  try {
    if (!productId || isNaN(productId)) {
      throw new Error("Valid product ID is required");
    }

    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Check stock availability first
    const stockCheck = await Product.checkStock(productId, quantity);
    if (!stockCheck.available) {
      throw new Error(
        `Insufficient stock. Only ${stockCheck.currentStock} available`
      );
    }

    // Update the stock
    const updatedProduct = await Product.updateStock(productId, quantity);
    return updatedProduct;
  } catch (error) {
    console.error("Update stock controller error:", error);
    throw error;
  }
}
