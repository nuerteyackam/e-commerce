import express from "express";
import orderController from "../controllers/orderController.js";

const router = express.Router();

/**
 * Process checkout - Create order from cart
 * POST /process-checkout
 */
router.post("/", async (req, res) => {
  try {
    console.log("Session check - SessionID:", req.sessionID);
    console.log("Session user:", req.session.user);
    console.log("Cart identifier:", req.cartIdentifier);

    // Check if user is logged in
    if (!req.session.user) {
      console.log("No user session found");
      return res.status(401).json({
        success: false,
        message: "Please login to continue with checkout",
      });
    }

    // Check if cart identifier middleware ran
    if (!req.cartIdentifier) {
      console.log("Cart identifier middleware missing");
      return res.status(400).json({
        success: false,
        message: "Cart session error. Please try again.",
      });
    }

    // Extract correct properties based on user type
    let sessionId = null;
    let customerId = null;

    if (req.cartIdentifier.type === "customer") {
      customerId = req.cartIdentifier.customerId;
    } else if (req.cartIdentifier.type === "guest") {
      sessionId = req.cartIdentifier.sessionId;
    }

    console.log("Proceeding with checkout:", {
      sessionId,
      customerId,
      type: req.cartIdentifier.type,
    });

    // Call controller method
    const result = await orderController.processCheckoutCtr(
      sessionId,
      customerId
    );

    console.log("Checkout result:", result);

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
