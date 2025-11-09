import express from "express";
import cartController from "../controllers/cartController.js";

const router = express.Router();

/**
 * Add product to cart
 * POST /api/cart/add
 * Body: { productId: number, quantity: number }
 */
router.post("/", async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

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
    const result = await cartController.addToCartCtr(
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
    console.error("Add to cart action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding to cart",
    });
  }
});

export default router;
