import express from "express";
import { deleteProductCtr } from "../controllers/productController.js";

const router = express.Router();

router.delete("/", async (req, res) => {
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

    // Validate request body
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (isNaN(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Delete the product
    const result = await deleteProductCtr(parseInt(product_id));

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Delete product action error:", error);

    // Handle specific error types
    if (error.message === "Product not found") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (error.message.includes("Failed to delete")) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete product",
      });
    }

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
});

export default router;
