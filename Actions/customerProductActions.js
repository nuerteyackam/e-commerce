import express from "express";
import {
  getAllProductsCtr,
  getSingleProductCtr,
  searchProductsCtr,
  filterProductsByCategoryCtr,
  filterProductsByBrandCtr,
  advancedSearchCtr,
} from "../controllers/customerProductController.js";

const router = express.Router();

// GET /products - All products with optional pagination
router.get("/", async (req, res) => {
  try {
    console.log("=== GET ALL PRODUCTS ===");
    console.log("Query params:", req.query);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Show 12 products per page for grid layout

    console.log(`Fetching products: page ${page}, limit ${limit}`);

    const result = await getAllProductsCtr(page, limit);

    console.log(`Found ${result.products.length} products`);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
});

// GET /products/search - Search products
router.get("/search", async (req, res) => {
  try {
    console.log("=== SEARCH PRODUCTS ===");
    console.log("Query params:", req.query);

    const { q: searchQuery } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    if (!searchQuery || searchQuery.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    console.log(
      `Searching for: "${searchQuery}", page ${page}, limit ${limit}`
    );

    const result = await searchProductsCtr(searchQuery, page, limit);

    console.log(`Found ${result.products.length} search results`);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search products",
      error: error.message,
    });
  }
});

// GET /products/category/:categoryId - Filter by category
router.get("/category/:categoryId", async (req, res) => {
  try {
    console.log("=== FILTER BY CATEGORY ===");
    console.log("Category ID:", req.params.categoryId);
    console.log("Query params:", req.query);

    const categoryId = parseInt(req.params.categoryId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    if (!categoryId || categoryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required",
      });
    }

    console.log(
      `Filtering by category ${categoryId}: page ${page}, limit ${limit}`
    );

    const result = await filterProductsByCategoryCtr(categoryId, page, limit);

    console.log(`Found ${result.products.length} products in category`);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error filtering by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to filter products by category",
      error: error.message,
    });
  }
});

// GET /products/brand/:brandId - Filter by brand
router.get("/brand/:brandId", async (req, res) => {
  try {
    console.log("=== FILTER BY BRAND ===");
    console.log("Brand ID:", req.params.brandId);
    console.log("Query params:", req.query);

    const brandId = parseInt(req.params.brandId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    if (!brandId || brandId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid brand ID is required",
      });
    }

    console.log(`Filtering by brand ${brandId}: page ${page}, limit ${limit}`);

    const result = await filterProductsByBrandCtr(brandId, page, limit);

    console.log(`Found ${result.products.length} products for brand`);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error filtering by brand:", error);
    res.status(500).json({
      success: false,
      message: "Failed to filter products by brand",
      error: error.message,
    });
  }
});

// GET /products/advanced-search - Advanced search with filters
router.get("/advanced-search", async (req, res) => {
  try {
    console.log("=== ADVANCED SEARCH ===");
    console.log("Query params:", req.query);

    const { q: searchQuery, category: categoryId, brand: brandId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    console.log(
      `Advanced search: query="${searchQuery}", category=${categoryId}, brand=${brandId}`
    );

    const result = await advancedSearchCtr(
      searchQuery,
      categoryId ? parseInt(categoryId) : null,
      brandId ? parseInt(brandId) : null,
      page,
      limit
    );

    console.log(`Found ${result.products.length} results`);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error in advanced search:", error);
    res.status(500).json({
      success: false,
      message: "Failed to perform advanced search",
      error: error.message,
    });
  }
});

// GET /products/:productId - Single product view
router.get("/:productId", async (req, res) => {
  try {
    console.log("=== GET SINGLE PRODUCT ===");
    console.log("Product ID:", req.params.productId);

    const productId = parseInt(req.params.productId);

    if (!productId || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    console.log(`Fetching product ${productId}`);

    const product = await getSingleProductCtr(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log(`Found product: ${product.product_title}`);

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error fetching single product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
});

export default router;
