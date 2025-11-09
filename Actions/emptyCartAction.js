import express from "express";
import cartController from "../controllers/cartController.js";

const router = express.Router();

/**
 * Empty entire cart
 * DELETE /api/cart/empty
 */
router.delete("/", async (req, res) => {
  try {
    // Get cart identifier from middleware
    const { sessionId, customerId } = req.cartIdentifier;

    // Call controller method
    const result = await cartController.emptyCartCtr(sessionId, customerId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Empty cart action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while emptying cart",
    });
  }
});

export default router;
