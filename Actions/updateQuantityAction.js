import express from "express";
import cartController from "../controllers/cartController.js";

const router = express.Router();

/**
 * Update cart item quantity
 * PUT /api/cart/update
 * Body: { productId: number, quantity: number }
 */
router.put("/", async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Get cart identifier from middleware
    const { sessionId, customerId } = req.cartIdentifier;

    // Validate request
    if (!productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
    }

    // Call controller method
    const result = await cartController.updateCartItemCtr(
      sessionId,
      customerId,
      parseInt(productId),
      parseInt(quantity)
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Update quantity action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating quantity",
    });
  }
});

export default router;
