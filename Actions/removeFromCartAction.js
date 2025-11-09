import express from "express";
import cartController from "../controllers/cartController.js";

const router = express.Router();

/**
 * Remove product from cart
 * DELETE /api/cart/remove/:productId
 */
router.delete("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    // Get cart identifier from middleware
    const { sessionId, customerId } = req.cartIdentifier;

    // Validate request
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Call controller method
    const result = await cartController.removeFromCartCtr(
      sessionId,
      customerId,
      parseInt(productId)
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Remove from cart action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing from cart",
    });
  }
});

export default router;
