import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Update order status (Admin only)
 * PUT /api/admin/orders/:orderId/status
 */
router.put("/:orderId/status", async (req, res) => {
  try {
    // Check admin authorization
    if (!req.session.user || req.session.user.user_role !== 1) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { orderId } = req.params;
    const { status, notes } = req.body;

    // Validate orderId
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({
        success: false,
        message: "Valid order ID is required",
      });
    }

    // Validate status
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Order status is required",
      });
    }

    // Validate status value
    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid order status. Valid statuses: " + validStatuses.join(", "),
      });
    }

    const userRole = req.session.user.user_role;

    console.log(`Admin updating order ${orderId} status to: ${status}`);

    const result = await orderController.updateOrderStatusCtr(
      parseInt(orderId),
      status,
      notes,
      userRole
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Update order status action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
    });
  }
});

export default router;
