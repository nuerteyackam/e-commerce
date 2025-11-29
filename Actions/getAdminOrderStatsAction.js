import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Get order statistics for admin dashboard
 * GET /api/admin/order-stats
 */
router.get("/", async (req, res) => {
  try {
    // Check admin authorization
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    console.log("Admin fetching order statistics");

    const result = await orderController.getOrderStatsCtr();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Order stats action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving order statistics",
    });
  }
});

export default router;
