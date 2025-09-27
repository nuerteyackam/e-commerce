import express from "express";
import { deleteCategoryCtr } from "../controllers/categoryController.js";

const router = express.Router();

router.delete("/", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please log in first" });
    }

    if (req.session.user.user_role !== 1) {
      return res
        .status(403)
        .json({ success: false, message: "Admin privileges required" });
    }
    const { cat_id } = req.body;
    const userId = req.session.user.customer_id;

    if (!cat_id) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID is required" });
    }

    const deletedCategory = await deleteCategoryCtr(cat_id, userId);
    res.json({
      success: true,
      message: "Category successfully deleted",
      category: deletedCategory,
    });
  } catch (err) {
    console.error("Delete category error", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
