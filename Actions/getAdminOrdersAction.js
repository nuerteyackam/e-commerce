import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Get all orders for admin with customer details
 * GET /api/admin/orders
 * Query parameters:
 *   - limit: number - Maximum number of orders to return (default: 100)
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

    const limit = parseInt(req.query.limit) || 100;
    console.log(`Admin fetching orders with limit: ${limit}`);

    const result = await orderController.getAllOrdersForAdminCtr(limit);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Admin orders action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving admin orders",
    });
  }
});

export default router;
