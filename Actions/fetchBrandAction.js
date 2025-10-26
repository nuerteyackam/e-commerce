import express from "express";
import {
  getBrandsCtr,
  getAllBrandsCtr,
} from "../controllers/brandController.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Check if this is for admin management (requires login)
    if (req.query.userOnly === "true") {
      // Admin access - requires login and admin role
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

      const userId = req.session.user.customer_id;
      const brands = await getBrandsCtr(userId);

      res.json({
        success: true,
        message: "Brands fetched successfully",
        brands,
      });
    } else {
      // Public access - get ALL brands for customer browsing
      const brands = await getAllBrandsCtr();

      res.json({
        success: true,
        message: "Brands fetched successfully",
        brands,
      });
    }
  } catch (err) {
    console.error("Fetch brands error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
