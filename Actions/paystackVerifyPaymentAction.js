import express from "express";
import { verifyTransaction, convertFromPesewas } from "../config/paystack.js";
import pool from "../config/db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { reference } = req.body;

    if (!reference) {
      return res.json({
        success: false,
        message: "Payment reference is required",
      });
    }

    // Log verification attempt
    console.log(`Verifying payment reference: ${reference}`);

    // Verify transaction with Paystack
    const verification = await verifyTransaction(reference);

    // Log verification result
    console.log(`Paystack verification result:`, {
      status: verification.status,
      data_status: verification.data?.status,
      amount: verification.data?.amount,
      currency: verification.data?.currency,
    });

    if (!verification.status || verification.data.status !== "success") {
      await client.query("ROLLBACK");
      console.error(
        `Payment verification failed for ${reference}:`,
        verification.message
      );
      return res.json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const paymentData = verification.data;

    // Better metadata handling
    const orderId =
      paymentData.metadata?.orderId || paymentData.metadata?.order_id;

    if (!orderId) {
      await client.query("ROLLBACK");
      console.error(
        `No order ID in metadata for ${reference}:`,
        paymentData.metadata
      );
      return res.json({
        success: false,
        message: "Invalid payment metadata",
      });
    }

    // Log order lookup
    console.log(`Looking up order: ${orderId}`);

    // Get order details - remove customer filter
    const orderQuery = `
      SELECT o.*, 
             (SELECT COALESCE(SUM(od.price * od.qty), 0) 
              FROM orderdetails od WHERE od.order_id = o.order_id) as calculated_total
      FROM orders o 
      WHERE o.order_id = $1
    `;

    const orderResult = await client.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      console.error(`Order not found: ${orderId}`);
      return res.json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orderResult.rows[0];
    const customerId = order.customer_id; // Get customer ID from order
    const paidAmount = convertFromPesewas(paymentData.amount);
    const orderAmount = parseFloat(order.order_total);

    // Log amount comparison
    console.log(`Amount verification:`, {
      paid: paidAmount,
      expected: orderAmount,
      currency: paymentData.currency,
    });

    // Validate payment amount
    if (Math.abs(paidAmount - orderAmount) > 0.01) {
      await client.query("ROLLBACK");
      console.error(
        `Amount mismatch - Paid: ${paidAmount}, Expected: ${orderAmount}`
      );
      return res.json({
        success: false,
        message: "Payment amount mismatch",
      });
    }

    // Check if payment already recorded
    const existingPaymentQuery = `
      SELECT pay_id FROM payment 
      WHERE order_id = $1 OR transaction_ref = $2
    `;

    const existingPayment = await client.query(existingPaymentQuery, [
      orderId,
      reference,
    ]);

    if (existingPayment.rows.length > 0) {
      await client.query("ROLLBACK");
      console.warn(
        `Payment already processed for order ${orderId}, reference ${reference}`
      );
      return res.json({
        success: false,
        message: "Payment already processed",
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Log payment recording
    console.log(
      `Recording payment for order ${orderId}, amount ${paidAmount} GHS`
    );

    const paymentQuery = `
      INSERT INTO payment (
        order_id, amt, customer_id, currency, payment_date, 
        payment_status, payment_method, transaction_ref, authorization_code, payment_channel
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9) 
      RETURNING pay_id
    `;

    const paymentValues = [
      orderId,
      paidAmount,
      customerId,
      "GHS",
      "completed",
      "paystack",
      reference,
      paymentData.authorization?.authorization_code || null,
      paymentData.channel || "card",
    ];

    const paymentResult = await client.query(paymentQuery, paymentValues);
    const paymentId = paymentResult.rows[0].pay_id;

    // Update order status and invoice
    const updateOrderQuery = `
      UPDATE orders 
      SET order_status = 'confirmed', invoice_no = $1 
      WHERE order_id = $2
    `;

    await client.query(updateOrderQuery, [invoiceNumber, orderId]);

    // Clear customer cart
    await client.query("DELETE FROM cart WHERE c_id = $1", [customerId]);

    await client.query("COMMIT");

    // Log successful completion
    console.log(`Payment completed successfully:`, {
      orderId,
      invoiceNumber,
      amount: paidAmount,
      paymentId,
      reference,
    });

    res.json({
      success: true,
      message: "Payment verified and order confirmed",
      data: {
        orderReference: order.order_reference,
        invoiceNo: invoiceNumber,
        amount: paidAmount,
        paymentId: paymentId,
        transactionRef: reference,
        paymentMethod: "Paystack",
        authorizationCode: paymentData.authorization?.authorization_code,
        paymentChannel: paymentData.channel,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    // Better error logging
    console.error("Payment verification error:", {
      error: error.message,
      reference: req.body.reference,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    res.json({
      success: false,
      message: "Payment verification failed. Please contact support.",
    });
  } finally {
    client.release();
  }
});

export default router;
