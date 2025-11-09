import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Get customer order history
 * GET /get-orders
 */
router.get("/", async (req, res) => {
  try {
    // Get customer ID from middleware
    const { customerId } = req.cartIdentifier;

    // Validate customer is logged in
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer must be logged in to view orders",
      });
    }

    // Call controller method
    const result = await orderController.getCustomerOrdersCtr(customerId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Get orders action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving orders",
    });
  }
});

export default router;
