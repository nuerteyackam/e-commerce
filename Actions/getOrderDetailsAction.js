import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Get order details with products
 * GET /get-order-details/:orderId
 */
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get customer ID from middleware
    const { customerId } = req.cartIdentifier;

    // Validate request
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer must be logged in to view order details",
      });
    }

    // Call controller method
    const result = await orderController.getOrderDetailsCtr(
      parseInt(orderId),
      customerId
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Get order details action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving order details",
    });
  }
});

export default router;
