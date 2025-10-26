import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define uploads directory (LOCAL - relative to your project root)
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists (creates it if missing)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log("Created uploads directory:", UPLOADS_DIR);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Validate user session
      if (!req.session.user) {
        return cb(new Error("User not authenticated"));
      }

      const userId = req.session.user.user_id || req.session.user.customer_id;
      console.log("Upload action using user ID:", userId);
      const productId = req.body.product_id;

      if (!productId) {
        return cb(new Error("Product ID is required"));
      }

      // Create user and product directories
      // Structure: uploads/u{userId}/p{productId}/
      const userDir = path.join(UPLOADS_DIR, `u${userId}`);
      const productDir = path.join(userDir, `p${productId}`);

      // Create directories if they don't exist
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log("Created user directory:", userDir);
      }
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
        console.log("Created product directory:", productDir);
      }

      // Security check - verify path is within uploads directory
      const resolvedPath = path.resolve(productDir);
      const resolvedUploadsPath = path.resolve(UPLOADS_DIR);

      if (!resolvedPath.startsWith(resolvedUploadsPath)) {
        return cb(new Error("Invalid upload path - security violation"));
      }

      cb(null, productDir);
    } catch (error) {
      console.error("Destination error:", error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname).toLowerCase();

      // Validate file extension
      const allowedExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
      if (!allowedExtensions.includes(ext)) {
        return cb(
          new Error(
            "Invalid file type. Only PNG, JPG, JPEG, GIF, and WebP are allowed"
          )
        );
      }

      const filename = `image_${timestamp}_${randomSuffix}${ext}`;
      console.log("Generated filename:", filename);
      cb(null, filename);
    } catch (error) {
      console.error("Filename error:", error);
      cb(error);
    }
  },
});

// File filter for additional validation
const fileFilter = (req, file, cb) => {
  console.log("Filtering file:", file.originalname, "Type:", file.mimetype);

  // Check file type
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files per upload
  },
});

// Upload route
router.post("/", upload.array("product_images", 5), async (req, res) => {
  try {
    console.log("Upload request received");
    console.log("Session user:", req.session.user?.user_id);
    console.log("Product ID:", req.body.product_id);
    console.log("Files:", req.files?.length || 0);

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

    // Validate product ID
    const { product_id } = req.body;
    if (!product_id || isNaN(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required",
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    // Process uploaded files
    const uploadedFiles = req.files.map((file) => {
      // Create relative path for database storage
      const userId = req.session.user.user_id;
      const relativePath = `uploads/u${userId}/p${product_id}/${file.filename}`;

      console.log("Processed file:", file.filename, "at", relativePath);

      return {
        originalName: file.originalname,
        filename: file.filename,
        path: relativePath,
        size: file.size,
        mimetype: file.mimetype,
      };
    });

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Upload product image action error:", error);

    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log("Cleaned up file:", file.path);
        }
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

    res.status(500).json({
      success: false,
      message: "Failed to upload images",
    });
  }
});

export default router;
