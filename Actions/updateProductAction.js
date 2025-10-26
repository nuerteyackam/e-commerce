import express from "express";
import {
  updateProductCtr,
  getProductByIdCtr,
} from "../controllers/productController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for handling multipart/form-data (files + form fields)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log("Created uploads directory:", UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("=== MULTER DESTINATION DEBUG ===");
    console.log("Session exists:", !!req.session);
    console.log("User exists:", !!req.session?.user);
    console.log("Customer ID:", req.session?.user?.customer_id);
    console.log("User ID:", req.session?.user?.user_id);
    console.log("================================");

    // Check authentication first
    if (!req.session.user) {
      return cb(new Error("User not authenticated"));
    }

    const userId = req.session.user.user_id || req.session.user.customer_id;
    console.log("Multer using user ID:", userId); //

    if (!userId) {
      console.error("Cannot determine user ID from session in multer");
      return cb(new Error("Cannot determine user ID from session"));
    }
    const userDir = path.join(UPLOADS_DIR, `u${userId}`);
    console.log("Creating directory:", userDir);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      console.log("Created user directory:", userDir);
    }

    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();

    const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
    if (!allowedExtensions.includes(ext)) {
      return cb(
        new Error(
          "Invalid file type. Only PNG, JPG, JPEG, GIF, and WebP are allowed"
        )
      );
    }

    const filename = `image_${timestamp}_${randomSuffix}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files per upload
  },
});

router.put("/", upload.array("product_images", 5), async (req, res) => {
  try {
    console.log("=== UPDATE PRODUCT DEBUG ===");
    console.log("Session user object:", req.session.user); //
    console.log("User ID:", req.session.user?.user_id); //
    console.log("Customer ID:", req.session.user?.customer_id);
    console.log("Session user:", req.session.user?.customer_name);
    console.log("Request body:", req.body);
    console.log("Files:", req.files?.length || 0);
    console.log("============================");

    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    // Check if user is admin
    if (req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Validate request body
    const {
      product_id,
      product_cat,
      product_brand,
      product_title,
      product_price,
      product_desc,
      product_keywords,
      product_qty,
    } = req.body;

    console.log("Parsed update data:", {
      product_id,
      product_cat,
      product_brand,
      product_title,
      product_price,
      product_qty,
    });

    // Basic validation
    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (!product_cat || !product_brand || !product_title || !product_price) {
      return res.status(400).json({
        success: false,
        message: "Category, brand, title, and price are required",
      });
    }

    // Check if product exists and get current data
    let currentProduct;
    try {
      currentProduct = await getProductByIdCtr(parseInt(product_id));
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }
      throw error;
    }

    // Prepare product data (start with current images)
    let currentImages = [];
    if (currentProduct.product_image) {
      try {
        currentImages = JSON.parse(currentProduct.product_image);
      } catch (e) {
        currentImages = currentProduct.product_image
          ? [currentProduct.product_image]
          : [];
      }
    }

    const productData = {
      product_cat: parseInt(product_cat),
      product_brand: parseInt(product_brand),
      product_title: product_title.trim(),
      product_price: parseFloat(product_price),
      product_desc: product_desc ? product_desc.trim() : null,
      product_image: currentProduct.product_image, // Keep existing images initially
      product_keywords: product_keywords ? product_keywords.trim() : null,
      product_qty: product_qty ? parseInt(product_qty) : 0,
    };

    // Validate parsed data
    if (isNaN(productData.product_cat) || isNaN(productData.product_brand)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category or brand ID",
      });
    }

    if (isNaN(productData.product_price) || productData.product_price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid price value",
      });
    }

    if (isNaN(productData.product_qty) || productData.product_qty < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity value",
      });
    }

    // Handle new uploaded images if any
    let newImagesPaths = [];
    if (req.files && req.files.length > 0) {
      console.log("Processing new images...");

      const userId = req.session.user.user_id || req.session.user.customer_id;
      console.log("Using user ID for path:", userId);

      if (!userId) {
        throw new Error("Cannot determine user ID from session");
      }

      const productId = Array.isArray(product_id)
        ? parseInt(product_id[0])
        : parseInt(product_id);
      console.log("Using product ID:", productId);

      // Create product-specific directory
      const productDir = path.join(UPLOADS_DIR, `u${userId}`, `p${productId}`);
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }

      // Move files to product directory and create paths array
      newImagesPaths = req.files.map((file) => {
        const newPath = path.join(productDir, file.filename);
        fs.renameSync(file.path, newPath);
        return `uploads/u${userId}/p${productId}/${file.filename}`;
      });

      // Combine existing images with new images
      const allImages = [...currentImages, ...newImagesPaths];
      const imagesJson = JSON.stringify(allImages);

      // Update product data with new images
      productData.product_image = imagesJson;

      console.log("Updated images:", allImages);
    }

    // Update the product
    const updatedProduct = await updateProductCtr(
      parseInt(product_id),
      productData
    );

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
      newImages: newImagesPaths,
    });
  } catch (error) {
    console.error("Update product action error:", error);

    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log("Cleaned up file:", file.path);
        }
      });
    }

    // Handle specific error types
    if (error.message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes("Invalid file type")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes("File too large")) {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum 5MB per file.",
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.includes("required") ||
      error.message.includes("must be") ||
      error.message.includes("cannot be")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
      error: error.message,
    });
  }
});

// GET route to fetch a single product for editing
router.get("/:id", async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in first",
      });
    }

    // Check if user is admin
    if (req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    // Fetch the product
    const product = await getProductByIdCtr(parseInt(id));

    // Parse images for editing
    let parsedImages = [];
    if (product.product_image) {
      try {
        parsedImages = JSON.parse(product.product_image);
      } catch (e) {
        parsedImages = product.product_image ? [product.product_image] : [];
      }
    }

    // Add parsed images to response
    const productWithImages = {
      ...product,
      product_images: parsedImages,
      image_count: parsedImages.length,
    };

    res.json({
      success: true,
      message: "Product fetched successfully",
      product: productWithImages,
    });
  } catch (error) {
    console.error("Get product for edit action error:", error);

    if (error.message === "Product not found") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
});

export default router;
