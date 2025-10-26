import express from "express";
import { updateBrandCtr } from "../controllers/brandController.js";

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
        .json({ success: false, message: "Admin access required" });
    }

    const { brand_id, brand_name } = req.body;
    const userId = req.session.user.customer_id;

    // Update brand using controller
    const updatedBrand = await updateBrandCtr(brand_id, userId, {
      brand_name,
    });

    res.json({
      success: true,
      message: "Brand updated successfully",
      brand: updatedBrand,
    });
  } catch (err) {
    console.error("Update brand error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
