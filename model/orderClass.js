import pool from "../config/db.js";

class OrderClass {
  constructor() {
    this.ordersTable = "orders";
    this.orderDetailsTable = "orderdetails";
    this.paymentTable = "payment";
  }

  /**
   * Create a new order 
   * @param {number} customerId - Customer ID
   * @param {string} orderReference - Unique order reference
   * @param {number} orderTotal - Total amount
   * @returns {Object} Result with order ID
   */
  async createOrder(customerId, orderReference, orderTotal) {
    try {
      const query = `
        INSERT INTO ${this.ordersTable} 
        (customer_id, order_date, order_status, order_reference, order_total)
        VALUES ($1, CURRENT_DATE, $2, $3, $4)
        RETURNING order_id, order_reference
      `;

      const values = [customerId, "pending", orderReference, orderTotal];
      const result = await pool.query(query, values);

      if (result.rows.length > 0) {
        return {
          success: true,
          data: {
            orderId: result.rows[0].order_id,
            orderReference: result.rows[0].order_reference,
            total: orderTotal,
          },
          message: "Order created successfully",
        };
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      return {
        success: false,
        message: "Failed to create order",
        error: error.message,
      };
    }
  }

  /**
   * Add order details (product items)
   * @param {number} orderId - Order ID
   * @param {Array} cartItems - Array of cart items
   * @returns {Object} Result of adding order details
   */
  async addOrderDetails(orderId, cartItems) {
    try {
      const orderDetailsQuery = `
        INSERT INTO ${this.orderDetailsTable} 
        (order_id, product_id, qty, price)
        VALUES ($1, $2, $3, $4)
      `;

      const results = [];

      // Insert each cart item as an order detail
      for (const item of cartItems) {
        const values = [
          orderId,
          item.product_id,
          item.qty,
          parseFloat(item.product_price),
        ];

        const result = await pool.query(orderDetailsQuery, values);
        results.push(result);
      }

      return {
        success: true,
        data: {
          orderId: orderId,
          itemsAdded: results.length,
        },
        message: "Order details added successfully",
      };
    } catch (error) {
      console.error("Error adding order details:", error);
      return {
        success: false,
        message: "Failed to add order details",
        error: error.message,
      };
    }
  }

  /**
   * Record payment and generate invoice number (after payment)
   * @param {number} customerId - Customer ID
   * @param {number} orderId - Order ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency code
   * @returns {Object} Result of payment recording
   */
  async recordPayment(customerId, orderId, amount, currency = "USD") {
    try {
      // Generate invoice number NOW (after payment)
      const invoiceNo = this.generateInvoiceNumber();

      // 1. Update order with invoice number and status
      const updateOrderQuery = `
        UPDATE ${this.ordersTable}
        SET invoice_no = $1, order_status = $2
        WHERE order_id = $3
        RETURNING order_reference
      `;
      const orderResult = await pool.query(updateOrderQuery, [
        invoiceNo,
        "confirmed",
        orderId,
      ]);

      // 2. Record payment
      const paymentQuery = `
        INSERT INTO ${this.paymentTable}
        (amt, customer_id, order_id, currency, payment_date, payment_status, payment_method)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6)
        RETURNING pay_id
      `;

      const values = [
        parseFloat(amount),
        customerId,
        orderId,
        currency,
        "completed",
        "simulated",
      ];

      const paymentResult = await pool.query(paymentQuery, values);

      if (paymentResult.rows.length > 0) {
        return {
          success: true,
          data: {
            paymentId: paymentResult.rows[0].pay_id,
            orderId: orderId,
            invoiceNo: invoiceNo,
            orderReference: orderResult.rows[0]?.order_reference,
            amount: amount,
            currency: currency,
          },
          message: "Payment recorded successfully",
        };
      } else {
        throw new Error("Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      return {
        success: false,
        message: "Failed to record payment",
        error: error.message,
      };
    }
  }

  /**
   * Update order status
   * @param {number} orderId - Order ID
   * @param {string} status - New status
   * @returns {Object} Result of status update
   */
  async updateOrderStatus(orderId, status) {
    try {
      const query = `
        UPDATE ${this.ordersTable}
        SET order_status = $1
        WHERE order_id = $2
        RETURNING order_id, order_status
      `;

      const result = await pool.query(query, [status, orderId]);

      return {
        success: true,
        data: { orderId, status },
        message: "Order status updated successfully",
      };
    } catch (error) {
      console.error("Error updating order status:", error);
      return {
        success: false,
        message: "Failed to update order status",
        error: error.message,
      };
    }
  }

  /**
   * Get past orders for a customer
   * @param {number} customerId - Customer ID
   * @returns {Object} Customer's order history
   */
  async getCustomerOrders(customerId) {
    try {
      const query = `
        SELECT 
          o.order_id,
          o.order_reference,
          o.invoice_no,
          o.order_date,
          o.order_status,
          o.order_total,
          p.pay_id,
          p.amt as payment_amount,
          p.currency,
          p.payment_date,
          p.payment_status,
          p.payment_method
        FROM ${this.ordersTable} o
        LEFT JOIN ${this.paymentTable} p ON o.order_id = p.order_id
        WHERE o.customer_id = $1
        ORDER BY o.order_date DESC, o.order_id DESC
      `;

      const result = await pool.query(query, [customerId]);

      return {
        success: true,
        data: {
          orders: result.rows,
          totalOrders: result.rows.length,
        },
        message: "Customer orders retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting customer orders:", error);
      return {
        success: false,
        message: "Failed to retrieve customer orders",
        error: error.message,
      };
    }
  }

  /**
   * Get order details with products
   * @param {number} orderId - Order ID
   * @returns {Object} Order details with product information
   */
  async getOrderDetails(orderId) {
    try {
      const query = `
        SELECT 
          od.order_id,
          od.product_id,
          od.qty,
          od.price,
          p.product_title,
          p.product_image,
          c.cat_name,
          b.brand_name,
          (od.qty * od.price) as item_total
        FROM ${this.orderDetailsTable} od
        JOIN products p ON od.product_id = p.product_id
        JOIN categories c ON p.product_cat = c.cat_id
        JOIN brands b ON p.product_brand = b.brand_id
        WHERE od.order_id = $1
        ORDER BY p.product_title
      `;

      const result = await pool.query(query, [orderId]);

      return {
        success: true,
        data: {
          orderId: orderId,
          items: result.rows,
          itemCount: result.rows.length,
        },
        message: "Order details retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting order details:", error);
      return {
        success: false,
        message: "Failed to retrieve order details",
        error: error.message,
      };
    }
  }

  /**
   * Generate unique order reference (customer-facing)
   * @returns {string} Unique order reference
   */
  generateOrderReference() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `ORD-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate invoice number (accounting/legal document)
   * @returns {number} Sequential invoice number
   */
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    // Create a number using year + last 6 digits of timestamp
    return parseInt(`${year}${timestamp.toString().slice(-6)}`);
  }

  /**
   * Verify order belongs to customer (security check)
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Object} Verification result
   */
  async verifyOrderOwnership(orderId, customerId) {
    try {
      const query = `
        SELECT order_id, order_reference, customer_id
        FROM ${this.ordersTable}
        WHERE order_id = $1 AND customer_id = $2
      `;

      const result = await pool.query(query, [orderId, customerId]);

      return {
        success: result.rows.length > 0,
        data: result.rows[0] || null,
        message:
          result.rows.length > 0
            ? "Order verified"
            : "Order not found or access denied",
      };
    } catch (error) {
      console.error("Error verifying order ownership:", error);
      return {
        success: false,
        message: "Failed to verify order ownership",
        error: error.message,
      };
    }
  }

  /**
   * Validate stock availability for order items
   * @param {Array} orderItems - Array of order items to validate
   * @returns {Object} Validation result
   */
  async validateStockAvailability(orderItems) {
    try {
      console.log("Validating stock for", orderItems.length, "items...");

      for (const item of orderItems) {
        const stockQuery = `
          SELECT product_qty, product_title 
          FROM products 
          WHERE product_id = $1
        `;

        const result = await pool.query(stockQuery, [item.product_id]);

        if (result.rows.length === 0) {
          return {
            success: false,
            message: `Product not found: ${
              item.product_title || "Unknown Product"
            }`,
          };
        }

        const currentStock = result.rows[0].product_qty;
        const requestedQty = parseInt(item.qty);

        if (currentStock < requestedQty) {
          return {
            success: false,
            message: `Insufficient stock for "${result.rows[0].product_title}". Available: ${currentStock}, Requested: ${requestedQty}`,
          };
        }

        console.log(
          `Stock OK for "${result.rows[0].product_title}": ${requestedQty} requested, ${currentStock} available`
        );
      }

      return {
        success: true,
        message: "All items have sufficient stock",
      };
    } catch (error) {
      console.error("Error validating stock:", error);
      return {
        success: false,
        message: "Error validating stock availability",
        error: error.message,
      };
    }
  }

  /**
   * Reduce product stock after successful payment
   * @param {Array} orderItems - Array of order items
   * @returns {Object} Result of stock reduction
   */
  async reduceProductStock(orderItems) {
    try {
      console.log(
        "Starting stock reduction for",
        orderItems.length,
        "items..."
      );

      const stockUpdates = [];

      for (const item of orderItems) {
        const updateQuery = `
          UPDATE products 
          SET product_qty = product_qty - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2 AND product_qty >= $1
          RETURNING product_qty, product_title, product_id
        `;

        const requestedQty = parseInt(item.qty);
        const productId = parseInt(item.product_id);

        const result = await pool.query(updateQuery, [requestedQty, productId]);

        if (result.rows.length === 0) {
          throw new Error(
            `Failed to reduce stock for product ID ${productId}. Insufficient stock or product not found.`
          );
        }

        const updatedProduct = result.rows[0];
        stockUpdates.push({
          productId: updatedProduct.product_id,
          productTitle: updatedProduct.product_title,
          quantityReduced: requestedQty,
          remainingStock: updatedProduct.product_qty,
        });

        console.log(
          `Stock reduced for "${updatedProduct.product_title}": -${requestedQty} (remaining: ${updatedProduct.product_qty})`
        );
      }

      return {
        success: true,
        message: "Product stock reduced successfully",
        data: {
          updatedProducts: stockUpdates,
          totalItemsProcessed: stockUpdates.length,
        },
      };
    } catch (error) {
      console.error("Error reducing product stock:", error);
      return {
        success: false,
        message: error.message || "Failed to reduce product stock",
        error: error.message,
      };
    }
  }

  /**
   * Get order items with product details for stock operations
   * @param {number} orderId - Order ID
   * @returns {Object} Order items with product information
   */
  async getOrderItemsWithProductDetails(orderId) {
    try {
      const query = `
        SELECT 
          od.order_id,
          od.product_id,
          od.qty,
          od.price,
          p.product_title,
          p.product_qty as current_stock,
          p.product_image,
          c.cat_name as category_name,
          b.brand_name
        FROM ${this.orderDetailsTable} od
        JOIN products p ON od.product_id = p.product_id
        JOIN categories c ON p.product_cat = c.cat_id
        JOIN brands b ON p.product_brand = b.brand_id
        WHERE od.order_id = $1
        ORDER BY p.product_title
      `;

      const result = await pool.query(query, [orderId]);

      return {
        success: true,
        data: {
          orderId: orderId,
          items: result.rows,
          itemCount: result.rows.length,
        },
        message: "Order items retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting order items with product details:", error);
      return {
        success: false,
        message: "Failed to retrieve order items",
        error: error.message,
      };
    }
  }

  /**
   * Process complete order fulfillment (validate stock + reduce stock)
   * @param {number} orderId - Order ID
   * @returns {Object} Result of order fulfillment
   */
  async processOrderFulfillment(orderId) {
    try {
      console.log("Processing order fulfillment for order:", orderId);

      // 1. Get order items with current product details
      const orderItemsResult = await this.getOrderItemsWithProductDetails(
        orderId
      );
      if (!orderItemsResult.success) {
        throw new Error("Failed to retrieve order items");
      }

      const orderItems = orderItemsResult.data.items;

      // 2. Validate stock availability
      const stockValidation = await this.validateStockAvailability(orderItems);
      if (!stockValidation.success) {
        return {
          success: false,
          message: `Stock validation failed: ${stockValidation.message}`,
          data: { validationFailed: true },
        };
      }

      // 3. Reduce product stock
      const stockReduction = await this.reduceProductStock(orderItems);
      if (!stockReduction.success) {
        return {
          success: false,
          message: `Stock reduction failed: ${stockReduction.message}`,
          data: { reductionFailed: true },
        };
      }

      return {
        success: true,
        message: "Order fulfillment completed successfully",
        data: {
          orderId: orderId,
          itemsProcessed: stockReduction.data.totalItemsProcessed,
          stockUpdates: stockReduction.data.updatedProducts,
        },
      };
    } catch (error) {
      console.error(" Error processing order fulfillment:", error);
      return {
        success: false,
        message: error.message || "Failed to process order fulfillment",
        error: error.message,
      };
    }
  }

  /**
   * Restore product stock (for order cancellation)
   * @param {number} orderId - Order ID to restore stock for
   * @returns {Object} Result of stock restoration
   */
  async restoreProductStock(orderId) {
    try {
      console.log("Restoring stock for cancelled order:", orderId);

      const orderItemsResult = await this.getOrderItemsWithProductDetails(
        orderId
      );
      if (!orderItemsResult.success) {
        throw new Error("Failed to retrieve order items");
      }

      const orderItems = orderItemsResult.data.items;
      const restoredItems = [];

      for (const item of orderItems) {
        const restoreQuery = `
          UPDATE products 
          SET product_qty = product_qty + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2
          RETURNING product_qty, product_title
        `;

        const result = await pool.query(restoreQuery, [
          parseInt(item.qty),
          parseInt(item.product_id),
        ]);

        if (result.rows.length > 0) {
          restoredItems.push({
            productId: item.product_id,
            productTitle: result.rows[0].product_title,
            quantityRestored: parseInt(item.qty),
            newStock: result.rows[0].product_qty,
          });

          console.log(
            `Stock restored for "${result.rows[0].product_title}": +${item.qty} (new total: ${result.rows[0].product_qty})`
          );
        }
      }

      return {
        success: true,
        message: "Product stock restored successfully",
        data: {
          orderId: orderId,
          restoredItems: restoredItems,
        },
      };
    } catch (error) {
      console.error("Error restoring product stock:", error);
      return {
        success: false,
        message: "Failed to restore product stock",
        error: error.message,
      };
    }
  }

  /**
   * Get order with tracking information for customer
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID for security
   * @returns {Object} Order with tracking details
   */
  async getOrderWithTracking(orderId, customerId) {
    try {
      const query = `
      SELECT 
        o.order_id,
        o.order_reference,
        o.invoice_no,
        o.order_date,
        o.order_status,
        o.order_total,
        o.tracking_notes,
        o.updated_at,
        p.amt as payment_amount,
        p.currency,
        p.payment_date,
        p.payment_status,
        p.payment_method
      FROM ${this.ordersTable} o
      LEFT JOIN ${this.paymentTable} p ON o.order_id = p.order_id
      WHERE o.order_id = $1 AND o.customer_id = $2
    `;

      const orderResult = await pool.query(query, [orderId, customerId]);

      if (orderResult.rows.length === 0) {
        return {
          success: false,
          message: "Order not found or access denied",
        };
      }

      // Get order items
      const itemsResult = await this.getOrderDetails(orderId);

      return {
        success: true,
        data: {
          order: orderResult.rows[0],
          items: itemsResult.data?.items || [],
          itemCount: itemsResult.data?.itemCount || 0,
        },
        message: "Order tracking retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getOrderWithTracking:", error);
      return {
        success: false,
        message: "Failed to retrieve order tracking",
        error: error.message,
      };
    }
  }

  /**
   * Get all customer orders with tracking info
   * @param {number} customerId - Customer ID
   * @param {number} limit - Maximum number of orders to return
   * @returns {Object} Customer orders with tracking
   */
  async getCustomerOrdersWithTracking(customerId, limit = 10) {
    try {
      const query = `
      SELECT 
        o.order_id,
        o.order_reference,
        o.invoice_no,
        o.order_date,
        o.order_status,
        o.order_total,
        o.tracking_notes,
        o.updated_at,
        p.payment_status,
        p.payment_method,
        COUNT(od.order_id) as item_count
      FROM ${this.ordersTable} o
      LEFT JOIN ${this.paymentTable} p ON o.order_id = p.order_id
      LEFT JOIN ${this.orderDetailsTable} od ON o.order_id = od.order_id
      WHERE o.customer_id = $1
      GROUP BY o.order_id, o.order_reference, o.invoice_no, o.order_date, 
               o.order_status, o.order_total, o.tracking_notes, o.updated_at,
               p.payment_status, p.payment_method
      ORDER BY o.order_date DESC, o.order_id DESC
      LIMIT $2
    `;

      const result = await pool.query(query, [customerId, limit]);

      return {
        success: true,
        data: {
          orders: result.rows,
          totalOrders: result.rows.length,
        },
        message: "Customer orders with tracking retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getCustomerOrdersWithTracking:", error);
      return {
        success: false,
        message: "Failed to retrieve customer orders",
        error: error.message,
      };
    }
  }

  /**
   * Update order tracking status and notes (Admin function)
   * @param {number} orderId - Order ID
   * @param {string} trackingStatus - New order status
   * @param {string} trackingNotes - Optional tracking notes
   * @returns {Object} Updated order result
   */
  async updateOrderTracking(orderId, trackingStatus, trackingNotes = null) {
    try {
      const query = `
      UPDATE ${this.ordersTable}
      SET 
        order_status = $2,
        tracking_notes = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1
      RETURNING order_id, order_reference, order_status, tracking_notes, updated_at
    `;

      const result = await pool.query(query, [
        orderId,
        trackingStatus,
        trackingNotes,
      ]);

      if (result.rows.length === 0) {
        return {
          success: false,
          message: "Order not found",
        };
      }

      return {
        success: true,
        data: result.rows[0],
        message: "Order tracking updated successfully",
      };
    } catch (error) {
      console.error("Database error in updateOrderTracking:", error);
      return {
        success: false,
        message: "Failed to update order tracking",
        error: error.message,
      };
    }
  }

  /**
   * Get order receipt data for PDF generation
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID for security
   * @returns {Object} Complete order receipt data
   */
  async getOrderReceiptData(orderId, customerId) {
    try {
      // Get order and customer info
      const orderQuery = `
      SELECT 
        o.*,
        c.customer_name,
        c.customer_email,
        c.customer_city,
        c.customer_country,
        p.amt as payment_amount,
        p.currency,
        p.payment_date,
        p.payment_status,
        p.payment_method
      FROM ${this.ordersTable} o
      JOIN customer c ON o.customer_id = c.customer_id
      LEFT JOIN ${this.paymentTable} p ON o.order_id = p.order_id
      WHERE o.order_id = $1 AND o.customer_id = $2
    `;

      const orderResult = await pool.query(orderQuery, [orderId, customerId]);

      if (orderResult.rows.length === 0) {
        return {
          success: false,
          message: "Order not found or access denied",
        };
      }

      // Get order items with product details
      const itemsQuery = `
      SELECT 
        od.*,
        p.product_title,
        p.product_image,
        c.cat_name as category,
        b.brand_name,
        (od.qty * od.price) as line_total
      FROM ${this.orderDetailsTable} od
      JOIN products p ON od.product_id = p.product_id
      JOIN categories c ON p.product_cat = c.cat_id
      JOIN brands b ON p.product_brand = b.brand_id
      WHERE od.order_id = $1
      ORDER BY p.product_title
    `;

      const itemsResult = await pool.query(itemsQuery, [orderId]);

      return {
        success: true,
        data: {
          order: orderResult.rows[0],
          items: itemsResult.rows,
          itemCount: itemsResult.rows.length,
        },
        message: "Order receipt data retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getOrderReceiptData:", error);
      return {
        success: false,
        message: "Failed to retrieve order receipt data",
        error: error.message,
      };
    }
  }

  /**
   * Get order status timeline/history
   * @param {number} orderId - Order ID
   * @returns {Object} Order status timeline
   */
  getOrderStatusTimeline(orderStatus, orderDate, updatedAt) {
    try {
      const statusSteps = [
        { status: "pending", label: "Order Placed", icon: "📝" },
        { status: "confirmed", label: "Payment Confirmed", icon: "✅" },
        { status: "processing", label: "Processing", icon: "⚙️" },
        { status: "shipped", label: "Shipped", icon: "📦" },
        { status: "out_for_delivery", label: "Out for Delivery", icon: "🚚" },
        { status: "delivered", label: "Delivered", icon: "✅" },
        { status: "cancelled", label: "Cancelled", icon: "❌" },
      ];

      const timeline = statusSteps.map((step) => {
        let isCompleted = false;
        let timestamp = null;

        // Determine if this step is completed
        switch (step.status) {
          case "pending":
            isCompleted = true;
            timestamp = orderDate;
            break;
          case "confirmed":
            isCompleted = [
              "confirmed",
              "processing",
              "shipped",
              "out_for_delivery",
              "delivered",
            ].includes(orderStatus);
            timestamp = isCompleted ? updatedAt || orderDate : null;
            break;
          case "processing":
            isCompleted = [
              "processing",
              "shipped",
              "out_for_delivery",
              "delivered",
            ].includes(orderStatus);
            timestamp = isCompleted ? updatedAt : null;
            break;
          case "shipped":
            isCompleted = ["shipped", "out_for_delivery", "delivered"].includes(
              orderStatus
            );
            timestamp = isCompleted ? updatedAt : null;
            break;
          case "out_for_delivery":
            isCompleted = ["out_for_delivery", "delivered"].includes(
              orderStatus
            );
            timestamp = isCompleted ? updatedAt : null;
            break;
          case "delivered":
            isCompleted = orderStatus === "delivered";
            timestamp = isCompleted ? updatedAt : null;
            break;
          case "cancelled":
            isCompleted = orderStatus === "cancelled";
            timestamp = isCompleted ? updatedAt : null;
            break;
        }

        return {
          ...step,
          isCompleted,
          isCurrent: orderStatus === step.status,
          timestamp,
        };
      });

      return {
        success: true,
        data: timeline,
        currentStatus: orderStatus,
      };
    } catch (error) {
      console.error("Error generating order timeline:", error);
      return {
        success: false,
        message: "Failed to generate order timeline",
      };
    }
  }

  /**
   * Get all orders for admin with customer details
   * @param {number} limit - Maximum number of orders
   * @returns {Object} All orders with customer info
   */
  async getAllOrdersForAdmin(limit = 100) {
    try {
      const query = `
      SELECT 
        o.order_id,
        o.order_reference,
        o.invoice_no,
        o.order_date,
        o.order_status,
        o.order_total,
        o.tracking_notes,
        o.updated_at,
        c.customer_name,
        c.customer_email,
        c.customer_city,
        c.customer_country,
        p.payment_status,
        p.payment_method,
        COUNT(od.order_id) as item_count
      FROM ${this.ordersTable} o
      LEFT JOIN customer c ON o.customer_id = c.customer_id
      LEFT JOIN ${this.paymentTable} p ON o.order_id = p.order_id
      LEFT JOIN ${this.orderDetailsTable} od ON o.order_id = od.order_id
      GROUP BY o.order_id, o.order_reference, o.invoice_no, o.order_date, 
               o.order_status, o.order_total, o.tracking_notes, o.updated_at,
               c.customer_name, c.customer_email, c.customer_city, c.customer_country,
               p.payment_status, p.payment_method
      ORDER BY o.order_date DESC, o.order_id DESC
      LIMIT $1
    `;

      const result = await pool.query(query, [limit]);

      return {
        success: true,
        data: {
          orders: result.rows,
          totalOrders: result.rows.length,
        },
        message: "Admin orders retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getAllOrdersForAdmin:", error);
      return {
        success: false,
        message: "Failed to retrieve orders for admin",
        error: error.message,
      };
    }
  }

  /**
   * Get detailed order information for admin
   * @param {number} orderId - Order ID
   * @returns {Object} Complete order details for admin
   */
  async getAdminOrderDetails(orderId) {
    try {
      // Get order with customer info
      const orderQuery = `
      SELECT 
        o.*,
        c.customer_name,
        c.customer_email,
        c.customer_city,
        c.customer_country,
        c.customer_contact,
        p.amt as payment_amount,
        p.currency,
        p.payment_date,
        p.payment_status,
        p.payment_method
      FROM ${this.ordersTable} o
      LEFT JOIN customer c ON o.customer_id = c.customer_id
      LEFT JOIN ${this.paymentTable} p ON o.order_id = p.order_id
      WHERE o.order_id = $1
    `;

      const orderResult = await pool.query(orderQuery, [orderId]);

      if (orderResult.rows.length === 0) {
        return {
          success: false,
          message: "Order not found",
        };
      }

      // Get order items with product details
      const itemsQuery = `
      SELECT 
        od.*,
        p.product_title,
        p.product_image,
        c.cat_name as category,
        b.brand_name as brand,
        (od.qty * od.price) as line_total
      FROM ${this.orderDetailsTable} od
      JOIN products p ON od.product_id = p.product_id
      LEFT JOIN categories c ON p.product_cat = c.cat_id
      LEFT JOIN brands b ON p.product_brand = b.brand_id
      WHERE od.order_id = $1
      ORDER BY p.product_title
    `;

      const itemsResult = await pool.query(itemsQuery, [orderId]);

      return {
        success: true,
        data: {
          order: orderResult.rows[0],
          items: itemsResult.rows,
          itemCount: itemsResult.rows.length,
        },
        message: "Admin order details retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getAdminOrderDetails:", error);
      return {
        success: false,
        message: "Failed to retrieve admin order details",
        error: error.message,
      };
    }
  }

  /**
   * Get order statistics for admin dashboard
   * @returns {Object} Order statistics by status
   */
  async getOrderStatistics() {
    try {
      const query = `
      SELECT 
        order_status,
        COUNT(*) as count,
        SUM(order_total) as total_value
      FROM ${this.ordersTable}
      GROUP BY order_status
      ORDER BY order_status
    `;

      const result = await pool.query(query);

      // Initialize all statuses to 0
      const stats = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };

      const values = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      };

      // Fill in actual values
      result.rows.forEach((row) => {
        if (stats.hasOwnProperty(row.order_status)) {
          stats[row.order_status] = parseInt(row.count);
          values[row.order_status] = parseFloat(row.total_value || 0);
        }
      });

      return {
        success: true,
        data: {
          stats: stats,
          values: values,
        },
        message: "Order statistics retrieved successfully",
      };
    } catch (error) {
      console.error("Database error in getOrderStatistics:", error);
      return {
        success: false,
        message: "Failed to retrieve order statistics",
        error: error.message,
      };
    }
  }
}

export default OrderClass;
