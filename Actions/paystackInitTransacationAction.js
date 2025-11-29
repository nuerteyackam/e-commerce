// Actions/paystackInitTransactionAction.js
import express from "express";
import {
  initializeTransaction,
  generateTransactionReference,
} from "../config/paystack.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { orderId, amount, email, orderReference } = req.body;

    // Validate required fields
    if (!orderId || !amount || !email) {
      return res.json({
        success: false,
        message: "Missing required fields: orderId, amount, email",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Generate transaction reference
    const reference = generateTransactionReference(orderId);

    // Prepare metadata
    const metadata = {
      orderId,
      orderReference,
      customerId: req.session.user?.customer_id || "guest",
      customerName: req.session.user?.customer_name || "Guest Customer",
    };

    // Initialize Paystack transaction
    const paystackResponse = await initializeTransaction(
      email,
      amount,
      reference,
      metadata
    );

    if (paystackResponse.status) {
      // Store transaction reference in session for verification
      req.session.paymentReference = reference;
      req.session.paymentOrderId = orderId;

      res.json({
        success: true,
        message: "Transaction initialized successfully",
        data: {
          authorization_url: paystackResponse.data.authorization_url,
          access_code: paystackResponse.data.access_code,
          reference: reference,
        },
      });
    } else {
      res.json({
        success: false,
        message: paystackResponse.message || "Failed to initialize transaction",
      });
    }
  } catch (error) {
    console.error("Paystack initialization error:", error);
    res.json({
      success: false,
      message: "Payment initialization failed. Please try again.",
    });
  }
});

export default router;
