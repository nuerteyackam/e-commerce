import express from "express";
import { getProductsCtr } from "../controllers/productController.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    // Check if user is admin (for product management page)
    if (req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Fetch all products
    const products = await getProductsCtr();

    const processedProducts = products.map((product) => {
      // Parse product_image if it's a JSON string
      let parsedImages = [];
      if (product.product_image) {
        try {
          // Try to parse as JSON array
          parsedImages = JSON.parse(product.product_image);
          console.log(
            `Product ${product.product_id} parsed images:`,
            parsedImages
          );
        } catch (e) {
          // If not JSON, treat as single image path
          parsedImages = [product.product_image];
          console.log(
            `Product ${product.product_id} single image:`,
            parsedImages
          );
        }
      }

      return {
        ...product,
        product_images: parsedImages, // Add parsed array for display
        image_count: parsedImages.length,
      };
    });

    console.log("Total products processed:", processedProducts.length);

    // Organize products by category and brand for better display
    const organizedProducts = organizeProductsForDisplay(processedProducts);

    res.json({
      success: true,
      message: "Products fetched successfully",
      products: processedProducts, //Send processed products with parsed images
      organized: organizedProducts,
      total: processedProducts.length,
    });
  } catch (error) {
    console.error("Fetch products action error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message, //  Added for debugging
    });
  }
});

// Helper function to organize products by category and brand
function organizeProductsForDisplay(products) {
  const organized = {};

  products.forEach((product) => {
    const categoryName = product.cat_name;
    const brandName = product.brand_name;

    // Create category if it doesn't exist
    if (!organized[categoryName]) {
      organized[categoryName] = {
        cat_id: product.cat_id,
        cat_name: categoryName,
        brands: {},
      };
    }

    // Create brand within category if it doesn't exist
    if (!organized[categoryName].brands[brandName]) {
      organized[categoryName].brands[brandName] = {
        brand_id: product.brand_id,
        brand_name: brandName,
        products: [],
      };
    }

    // Add product to the brand WITH PARSED IMAGES
    organized[categoryName].brands[brandName].products.push({
      product_id: product.product_id,
      product_title: product.product_title,
      product_price: product.product_price,
      product_desc: product.product_desc,
      product_image: product.product_image,
      product_images: product.product_images,
      image_count: product.image_count,
      product_keywords: product.product_keywords,
      product_qty: product.product_qty,
      created_at: product.created_at,
    });
  });

  return organized;
}

export default router;
