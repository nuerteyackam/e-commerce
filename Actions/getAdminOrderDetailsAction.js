import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Get detailed order information for admin
 * GET /api/admin/orders/:orderId
 */
router.get("/:orderId", async (req, res) => {
  try {
    // Check admin authorization
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { orderId } = req.params;

    // Validate orderId
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({
        success: false,
        message: "Valid order ID is required",
      });
    }

    console.log(`Admin fetching details for order: ${orderId}`);

    const result = await orderController.getAdminOrderDetailsCtr(
      parseInt(orderId)
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Admin order details action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving admin order details",
    });
  }
});

export default router;
