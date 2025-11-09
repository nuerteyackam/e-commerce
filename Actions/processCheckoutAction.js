import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Process checkout - Create order from cart
 * POST /process-checkout
 */
router.post("/", async (req, res) => {
  try {
    // Get cart identifier from middleware
    const { sessionId, customerId } = req.cartIdentifier;

    // Call controller method
    const result = await orderController.processCheckoutCtr(
      sessionId,
      customerId
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Process checkout action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing checkout",
    });
  }
});

export default router;
