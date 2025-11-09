// middleware/cartSession.js
import crypto from "crypto";

export function ensureCartSession(req, res, next) {
  // If user is logged in, use customer ID for cart
  if (req.session.user && req.session.user.customer_id) {
    req.cartIdentifier = {
      type: "customer",
      customerId: req.session.user.customer_id,
    };
  } else {
    // For guest users, ensure cart session ID exists
    if (!req.session.cartSessionId) {
      req.session.cartSessionId = crypto.randomBytes(32).toString("hex");
    }
    req.cartIdentifier = {
      type: "guest",
      sessionId: req.session.cartSessionId,
    };
  }
  next();
}
