import express from "express";
import { addBrandCtr } from "../controllers/brandController.js";

const router = express.Router();

router.post("/", async (req, res) => {
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
        .json({ success: false, message: "Admin access required" });
    }

    const { brand_name, category_ids } = req.body;
    const userId = req.session.user.customer_id;

    // Add brand using controller
    const createdBrands = await addBrandCtr({
      brand_name,
      category_ids,
      created_by: userId,
    });

    res.json({
      success: true,
      message: `${brand_name} created in ${category_ids.length} categories`,
      brands: createdBrands,
    });
  } catch (err) {
    console.error("Add brand error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
