import express from "express";
import cartController from "../controllers/cartController.js";

const router = express.Router();

/**
 * Get cart items
 * GET /api/cart
 */
router.get("/", async (req, res) => {
  try {
    // Get cart identifier from middleware
    const { sessionId, customerId } = req.cartIdentifier;

    // Call controller method
    const result = await cartController.getUserCartCtr(sessionId, customerId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Get cart action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving cart",
    });
  }
});

/**
 * Get cart count only (for navigation)
 * GET /api/cart/count
 */
router.get("/count", async (req, res) => {
  try {
    // Get cart identifier from middleware
    const { sessionId, customerId } = req.cartIdentifier;

    // Call controller method
    const result = await cartController.getCartCountCtr(sessionId, customerId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Get cart count action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while getting cart count",
      data: { totalQuantity: 0, itemCount: 0 },
    });
  }
});

export default router;
