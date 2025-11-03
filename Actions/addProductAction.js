import express from "express";
import { addProductCtr } from "../controllers/productController.js";
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
    if (!req.session || !req.session.user) {
      console.error("No session or user in multer destination");
      return cb(new Error("User not authenticated"));
    }

    const userId = req.session.user.user_id || req.session.user.customer_id;
    console.log("Multer resolved user ID:", userId);

    if (!userId) {
      console.error("Cannot determine user ID from session in multer");
      return cb(new Error("Cannot determine user ID from session"));
    }

    const userDir = path.join(UPLOADS_DIR, `u${userId}`);

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

router.post("/", upload.array("product_images", 5), async (req, res) => {
 


  try {
    console.log("=== ADD PRODUCT DEBUG ===");
    console.log("Session user:", req.session.user?.customer_name);
    console.log("Request body:", req.body);
    console.log("Files:", req.files?.length || 0);
    console.log("========================");

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
      product_cat,
      product_brand,
      product_title,
      product_price,
      product_desc,
      product_keywords,
      product_qty,
    } = req.body;

    console.log("Parsed data:", {
      product_cat,
      product_brand,
      product_title,
      product_price,
      product_qty,
    });

    // Basic validation
    if (!product_cat || !product_brand || !product_title || !product_price) {
      return res.status(400).json({
        success: false,
        message: "Category, brand, title, and price are required",
      });
    }

    // Prepare product data
    const productData = {
      product_cat: parseInt(product_cat),
      product_brand: parseInt(product_brand),
      product_title: product_title.trim(),
      product_price: parseFloat(product_price),
      product_desc: product_desc ? product_desc.trim() : null,
      product_image: null, // Will be updated if images are uploaded
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

    // Add the product first
    console.log("Calling addProductCtr...");
    const newProduct = await addProductCtr(productData);
    console.log("Product added:", newProduct);

    // Handle uploaded images if any
    let imagesPaths = [];
    if (req.files && req.files.length > 0) {
      console.log("Processing images...");

      const userId = req.session.user.user_id || req.session.user.customer_id;
      console.log("Using user ID for path:", userId);

      const productId = newProduct.product_id;

      // Create product-specific directory
      const productDir = path.join(UPLOADS_DIR, `u${userId}`, `p${productId}`);
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }

      // Move files to product directory and create paths array
      imagesPaths = req.files.map((file) => {
        const newPath = path.join(productDir, file.filename);
        fs.renameSync(file.path, newPath);
        return `uploads/u${userId}/p${productId}/${file.filename}`;
      });

      // Store images as JSON array in product_image column
      if (imagesPaths.length > 0) {
        const imagesJson = JSON.stringify(imagesPaths);

        try {
          const Product = (await import("../model/productClass.js")).default;

          // Call the static method with correct parameters
          await Product.updateProduct(newProduct.product_id, {
            product_cat: parseInt(product_cat),
            product_brand: parseInt(product_brand),
            product_title: product_title.trim(),
            product_price: parseFloat(product_price),
            product_desc: product_desc ? product_desc.trim() : null,
            product_image: imagesJson, // Store JSON array of image paths
            product_keywords: product_keywords ? product_keywords.trim() : null,
            product_qty: product_qty ? parseInt(product_qty) : 0,
          });

          console.log("Product updated with images:", imagesJson);

          // Update the response object
          newProduct.product_image = imagesJson;
        } catch (updateError) {
          console.error("Error updating product with images:", updateError);
          // Product was created but images weren't stored - log but don't fail
          console.log("Product created successfully, but image update failed");
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
      images: imagesPaths,
    });
  } catch (error) {
    console.error("Add product action error:", error);

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

export default router;
