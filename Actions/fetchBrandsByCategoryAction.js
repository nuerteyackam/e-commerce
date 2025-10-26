import express from "express";
import { getBrandsForCategoryCtr } from "../controllers/productController.js";

const router = express.Router();

router.get("/:categoryId", async (req, res) => {
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

    // Validate category ID
    const { categoryId } = req.params;

    if (!categoryId || isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required",
      });
    }

    // Fetch brands for the category
    const brands = await getBrandsForCategoryCtr(parseInt(categoryId));

    res.json({
      success: true,
      message: "Brands fetched successfully",
      brands: brands,
      total: brands.length,
    });
  } catch (error) {
    console.error("Fetch brands by category action error:", error);

    if (
      error.message.includes("Category") &&
      error.message.includes("required")
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid category ID is required",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
    });
  }
});

export default router;
