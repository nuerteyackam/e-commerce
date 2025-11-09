import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Process simulated payment
 * POST /process-payment
 * Body: { orderId: number, amount: number, currency?: string }
 */
router.post("/", async (req, res) => {
  try {
    const { orderId, amount, currency = "USD" } = req.body;

    // Get customer ID from middleware
    const { customerId } = req.cartIdentifier;

    // Validate request
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Order ID and amount are required",
      });
    }

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Customer must be logged in to process payment",
      });
    }

    // Call controller method
    const result = await orderController.processPaymentCtr(
      parseInt(orderId),
      customerId,
      parseFloat(amount),
      currency
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Process payment action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing payment",
    });
  }
});

export default router;
