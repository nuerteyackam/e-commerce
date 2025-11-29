import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

// Get orders count
router.get("/orders-count", async (req, res) => {
  try {
    console.log("=== GET ORDERS COUNT ===");

    const query = `SELECT COUNT(*) as count FROM orders WHERE order_id IS NOT NULL`;
    const result = await pool.query(query);

    const count = result.rows[0].count;
    console.log("Total orders:", count);

    res.json({
      success: true,
      data: { count: parseInt(count) },
      message: "Orders count retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting orders count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get orders count",
      error: error.message,
    });
  }
});

// Get users count
router.get("/users-count", async (req, res) => {
  try {
    console.log("=== GET USERS COUNT ===");

    const query = `SELECT COUNT(*) as count FROM customer WHERE customer_id IS NOT NULL`;
    const result = await pool.query(query);

    const count = result.rows[0].count;
    console.log("Total users:", count);

    res.json({
      success: true,
      data: { count: parseInt(count) },
      message: "Users count retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting users count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get users count",
      error: error.message,
    });
  }
});

// Get recent orders (last 5)
router.get("/recent-orders", async (req, res) => {
  try {
    console.log("=== GET RECENT ORDERS ===");

    const query = `
      SELECT 
        o.order_id,
        o.order_total,
        o.order_date,
        c.customer_name
      FROM orders o
      LEFT JOIN customer c ON o.customer_id = c.customer_id
      WHERE o.order_id IS NOT NULL
      ORDER BY o.order_date DESC
      LIMIT 5
    `;

    const result = await pool.query(query);
    console.log("Recent orders found:", result.rows.length);

    res.json({
      success: true,
      data: result.rows,
      message: "Recent orders retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting recent orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recent orders",
      error: error.message,
      data: [],
    });
  }
});

export default router;
