import express from "express";
import cartController from "../controllers/cartController.js";

const router = express.Router();

/**
 * Get cart items
 * GET /get-cart
 */
router.get("/", async (req, res) => {
  try {
    // Get cart identifier from middleware
    const { sessionId, customerId } = req.cartIdentifier;

    // Get cart items from controller (already includes cartCount)
    const result = await cartController.getUserCartCtr(sessionId, customerId);

    if (result.success) {
      // Add itemCount as an alias for cartCount for consistency
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          items: result.data.items,
          totals: result.data.totals,
          cartCount: result.data.cartCount, // Already provided by controller
          itemCount: result.data.cartCount, // Add as alias
        },
      });
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
 * GET /get-cart/count
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
      res.status(400).json({
        success: false,
        message: "Failed to get cart count",
        data: { totalQuantity: 0, itemCount: 0 },
      });
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
