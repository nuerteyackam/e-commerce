import express from "express";
import { deleteBrandCtr } from "../controllers/brandController.js";

const router = express.Router();

router.delete("/", async (req, res) => {
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

    const { brand_id } = req.body;
    const userId = req.session.user.customer_id;

    // Delete brand using controller
    await deleteBrandCtr(brand_id, userId);

    res.json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (err) {
    console.error("Delete brand error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
