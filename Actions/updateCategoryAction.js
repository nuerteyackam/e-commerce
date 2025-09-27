import express from "express";
import { updateCategoryCtr } from "../controllers/categoryController.js";

const router = express.Router();

router.put("/", async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please log in first" });
    }

    // Check if user is admin (user_role = 1)
    if (req.session.user.user_role !== 1) {
      return res
        .status(403)
        .json({ success: false, message: "Admin privileges required" });
    }

    const { cat_id, cat_name } = req.body;
    const userId = req.session.user.customer_id;

    // Validate input
    if (!cat_id) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID is required" });
    }

    if (!cat_name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    const updatedCategory = await updateCategoryCtr(cat_id, userId, {
      cat_name,
    });
    res.json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (err) {
    console.error("Update category error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
