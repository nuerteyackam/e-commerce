import express from "express";
import { addCategoryCtr } from "../controllers/categoryController.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, message: "Please log in first" });
    }

    if (req.session.user.user_role !== 1) {
      return res
        .status(403)
        .json({ success: false, message: "Admin access required" });
    }

    const { cat_name } = req.body;
    const created_by = req.session.user.customer_id;

    if (!cat_name) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }

    const category = await addCategoryCtr({ cat_name, created_by });
    res.json({
      success: true,
      message: "category added successfully",
      category,
    });
  } catch (err) {
    console.error("Add category error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
